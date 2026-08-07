import { logger } from '@librechat/data-schemas';
import { readdir, readFile } from 'node:fs/promises';

/**
 * Reap leftover descendants of a spawned stdio MCP subprocess on disconnect.
 *
 * The MCP SDK spawns the server command without `detached`, and its `close()`
 * signals only the direct child PID. With `npx -y <pkg>` that child is the npx
 * wrapper and the real server is a grandchild, so closing the wrapper leaves the
 * grandchild running, reparented to PID 1, invisible to a child-process walk yet
 * still counted against the container memory limit. Enough respawns and the
 * container is killed.
 *
 * The tree is snapshotted before `close()` while ppid links are intact, then
 * survivors are killed after. Kills are scoped to that captured set, and every
 * PID is stamped with its start-time (`/proc/<pid>/stat` field 22) and
 * re-verified before signalling, so a recycled PID is never hit.
 *
 * Linux only, and every entry point is a no-op elsewhere. The failure being
 * fixed is a container cgroup OOM, and the start-time stamp that makes killing
 * safe only exists in `/proc`; a handle is held for the life of a connection, so
 * without that stamp it could name a recycled PID by the time it is used.
 *
 * Not covered: processes the server spawns after the connect-time snapshot are
 * lost if the wrapper then crashes (`transport.pid` is already null by
 * disconnect), and a crash during connect leaves nothing captured at all.
 */

const IS_LINUX = process.platform === 'linux';

/** A captured process: its PID plus a start-time stamp that identifies the instance. */
export type ProcHandle = { pid: number; startTime: string | null };

type ProcInfo = { ppid: number; startTime: string | null };

/**
 * Extract `{ ppid, startTime }` from a `/proc/<pid>/stat` line, or null.
 *
 * `comm` is parenthesised and may itself contain spaces and `)`, so fields are
 * read after the LAST `)`: index 1 is ppid, index 19 is starttime.
 */
export function parseProcStat(statLine: string): { ppid: number; startTime: string } | null {
  const rparen = statLine.lastIndexOf(')');
  if (rparen < 0) return null;
  const after = statLine
    .slice(rparen + 1)
    .trim()
    .split(/\s+/);
  const ppid = Number(after[1]);
  const startTime = after[19];
  if (!Number.isInteger(ppid) || !startTime) return null;
  return { ppid, startTime };
}

/** Empty when `/proc` is unreadable: reaping is skipped rather than done unstamped. */
async function readProcTable(): Promise<Map<number, ProcInfo>> {
  const table = new Map<number, ProcInfo>();
  let entries: string[];
  try {
    entries = await readdir('/proc');
  } catch (err) {
    logger.debug('[MCP][stdioProcessTree] /proc is unreadable, skipping orphan reap:', err);
    return table;
  }
  await Promise.all(
    entries.map(async (name) => {
      const pid = Number(name);
      if (!Number.isInteger(pid) || pid <= 0) return;
      let stat: string;
      try {
        stat = await readFile(`/proc/${pid}/stat`, 'utf8');
      } catch {
        return; // process exited between readdir and read, or is unreadable
      }
      const parsed = parseProcStat(stat);
      if (!parsed) return;
      table.set(pid, { ppid: parsed.ppid, startTime: parsed.startTime });
    }),
  );
  return table;
}

async function readStartTime(pid: number): Promise<string | null> {
  if (!IS_LINUX) return null;
  try {
    return parseProcStat(await readFile(`/proc/${pid}/stat`, 'utf8'))?.startTime ?? null;
  } catch {
    return null;
  }
}

export async function readProcHandle(pid: number | null | undefined): Promise<ProcHandle | null> {
  if (!IS_LINUX || !pid || pid <= 1) return null;
  if (!isAlive(pid)) return null;
  return { pid, startTime: await readStartTime(pid) };
}

function walkDescendants(table: Map<number, ProcInfo>, rootPid: number): number[] {
  const childrenOf = new Map<number, number[]>();
  for (const [pid, info] of table) {
    const bucket = childrenOf.get(info.ppid);
    if (bucket) {
      bucket.push(pid);
    } else {
      childrenOf.set(info.ppid, [pid]);
    }
  }
  const out: number[] = [];
  const stack = [rootPid];
  const seen = new Set<number>([rootPid]);
  while (stack.length > 0) {
    const current = stack.pop() as number;
    const kids = childrenOf.get(current);
    if (!kids) continue;
    for (const kid of kids) {
      if (seen.has(kid)) continue;
      seen.add(kid);
      out.push(kid);
      stack.push(kid);
    }
  }
  return out;
}

/**
 * Every descendant of `rootPid` (excluding itself) as identity-stamped handles,
 * so each instance can be verified before it is killed later. Best-effort: [] if
 * the table cannot be read or `rootPid` is invalid.
 */
export async function collectDescendantProcs(
  rootPid: number | null | undefined,
): Promise<ProcHandle[]> {
  if (!IS_LINUX || !rootPid || rootPid <= 1) return [];
  const table = await readProcTable();
  return walkDescendants(table, rootPid).map((pid) => ({
    pid,
    startTime: table.get(pid)?.startTime ?? null,
  }));
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH => gone. EPERM => alive but not signallable by us, so the kill below
    // will fail harmlessly and the process is not counted as reaped.
    return (err as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

/**
 * SIGKILL each captured handle whose live identity still matches, and return how
 * many were signalled. A handle must present the same start-time it was stamped
 * with, so an unstamped handle is never killed.
 */
export async function terminateProcs(handles: ProcHandle[]): Promise<number> {
  if (!IS_LINUX) return 0;
  let stopped = 0;
  const seen = new Set<number>();
  for (const handle of handles) {
    if (!handle || !handle.pid || handle.pid <= 1 || seen.has(handle.pid)) continue;
    seen.add(handle.pid);
    if (!isAlive(handle.pid)) continue;
    // Unreadable or absent start-time skips too: better than killing a recycled PID.
    if (handle.startTime == null || (await readStartTime(handle.pid)) !== handle.startTime)
      continue;
    try {
      process.kill(handle.pid, 'SIGKILL');
      stopped++;
    } catch {
      /* already gone or not permitted */
    }
  }
  return stopped;
}

/**
 * Snapshot the stdio process tree so `cleanup()` can reap survivors after
 * `close()` and report how many it killed.
 *
 * `liveRootPid` must be currently live (e.g. `transport.pid`) or null: it is the
 * only PID the tree is walked from, because walking from a stale or reused PID
 * would enumerate an unrelated tree. `extraHandles` folds in handles captured
 * earlier (at connect, before the wrapper could crash) so survivors are still
 * reaped once `liveRootPid` is null.
 */
export async function captureStdioProcessTree(
  liveRootPid: number | null | undefined,
  extraHandles: ProcHandle[] = [],
): Promise<{ cleanup: () => Promise<number> }> {
  if (!IS_LINUX) {
    return { cleanup: async () => 0 };
  }
  const handles: ProcHandle[] = [];
  if (liveRootPid && liveRootPid > 1) {
    const wrapper = await readProcHandle(liveRootPid);
    if (wrapper) handles.push(wrapper);
    handles.push(...(await collectDescendantProcs(liveRootPid)));
  }
  handles.push(...extraHandles);
  return {
    cleanup: () => terminateProcs(handles),
  };
}
