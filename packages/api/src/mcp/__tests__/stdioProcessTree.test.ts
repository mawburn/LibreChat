import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
  collectDescendantProcs,
  terminateProcs,
  readProcHandle,
  captureStdioProcessTree,
  parseProcStat,
} from '../stdioProcessTree';

const LINUX = process.platform === 'linux';
/** The reaper is Linux-only, so real-process work reports a visible skip elsewhere. */
const linuxDescribe = LINUX ? describe : describe.skip;
/** Only a non-Linux host can stand in for "claims Linux, `/proc` unreadable". */
const noProcDescribe = LINUX ? describe.skip : describe;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Real node boots are slow on a contended CI runner, so poll against a deadline. */
const DISCOVERY_BUDGET_MS = 5000;
const POLL_MS = 25;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid: number): Promise<void> {
  const deadline = Date.now() + DISCOVERY_BUDGET_MS;
  while (Date.now() < deadline && alive(pid)) {
    await sleep(POLL_MS);
  }
}

function kill(pid: number | undefined): void {
  if (!pid || !alive(pid)) return;
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* gone */
  }
}

function spawnIdle(): ChildProcess {
  return spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 30000)'], { stdio: 'ignore' });
}

/** Spawn a parent that spawns a long-lived grandchild, mimicking `npx` -> real server. */
function spawnParentWithGrandchild(): ChildProcess {
  const code = `
    const { spawn } = require('node:child_process');
    spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 30000)'], { stdio: 'ignore' });
    setTimeout(() => {}, 30000);
  `;
  return spawn(process.execPath, ['-e', code], { stdio: 'ignore' });
}

async function discoverGrandchildren(parentPid: number | undefined): Promise<number[]> {
  const deadline = Date.now() + DISCOVERY_BUDGET_MS;
  let descendants: number[] = [];
  while (descendants.length === 0 && Date.now() < deadline) {
    await sleep(POLL_MS);
    descendants = (await collectDescendantProcs(parentPid)).map((p) => p.pid);
  }
  return descendants;
}

/** Registers the reaping afterEach; every spawn in a suite must be pushed here. */
function trackSpawned(): ChildProcess[] {
  const spawned: ChildProcess[] = [];
  afterEach(async () => {
    for (const p of spawned) {
      if (!p.pid) continue;
      for (const descendant of await collectDescendantProcs(p.pid)) {
        kill(descendant.pid);
      }
      kill(p.pid);
    }
    spawned.length = 0;
  });
  return spawned;
}

describe('stdioProcessTree', () => {
  const spawned = trackSpawned();

  it('collectDescendantProcs returns [] for invalid roots', async () => {
    expect(await collectDescendantProcs(0)).toEqual([]);
    expect(await collectDescendantProcs(1)).toEqual([]);
    expect(await collectDescendantProcs(null)).toEqual([]);
    expect(await collectDescendantProcs(undefined)).toEqual([]);
  });

  it('captureStdioProcessTree is safe to call with a dead/invalid live root', async () => {
    expect(await (await captureStdioProcessTree(0, [])).cleanup()).toBe(0);
    expect(await (await captureStdioProcessTree(999999, [])).cleanup()).toBe(0);
  });

  it('never kills an unstamped handle, whatever the platform', async () => {
    const child = spawnIdle();
    spawned.push(child);
    expect(child.pid).toBeGreaterThan(1);

    const stopped = await terminateProcs([{ pid: child.pid!, startTime: null }]);

    expect(stopped).toBe(0);
    expect(alive(child.pid!)).toBe(true);
  });

  it('readProcHandle only produces a handle where start-times are readable', async () => {
    const child = spawnIdle();
    spawned.push(child);

    const handle = await readProcHandle(child.pid);

    if (LINUX) {
      expect(handle).toEqual({ pid: child.pid, startTime: expect.any(String) });
    } else {
      expect(handle).toBeNull();
    }
  });

  describe('parseProcStat', () => {
    it('reads ppid and starttime from a normal /proc/<pid>/stat line', () => {
      const line = '1234 (node) S 1 1234 1234 0 -1 4194304 100 200 0 0 10 5 0 0 20 0 1 0 987654';
      expect(parseProcStat(line)).toEqual({ ppid: 1, startTime: '987654' });
    });

    it('handles a comm containing spaces and parentheses', () => {
      const line = '42 (weird ) (name) S 7 42 42 0 -1 0 0 0 0 0 0 0 0 0 0 0 0 0 555';
      expect(parseProcStat(line)?.ppid).toBe(7);
      expect(parseProcStat(line)?.startTime).toBe('555');
    });

    it('returns null for unparseable lines', () => {
      expect(parseProcStat('')).toBeNull();
      expect(parseProcStat('no-paren-here 1 2 3')).toBeNull();
      expect(parseProcStat('99 (proc) S notanumber')).toBeNull();
      // ppid present but starttime field missing -> null
      expect(parseProcStat('99 (proc) S 7 99 99')).toBeNull();
    });
  });

  linuxDescribe('against real process trees', () => {
    const linuxSpawned = trackSpawned();

    it('collectDescendantProcs finds a grandchild process', async () => {
      const parent = spawnParentWithGrandchild();
      linuxSpawned.push(parent);
      expect(parent.pid).toBeGreaterThan(1);

      const descendants = await discoverGrandchildren(parent.pid);
      expect(descendants.length).toBeGreaterThanOrEqual(1);
      expect(descendants.every((pid) => Number.isInteger(pid) && pid > 1)).toBe(true);
    });

    it('collectDescendantProcs stamps descendants with a start-time', async () => {
      const parent = spawnParentWithGrandchild();
      linuxSpawned.push(parent);
      await discoverGrandchildren(parent.pid);

      const procs = await collectDescendantProcs(parent.pid);
      expect(procs.length).toBeGreaterThanOrEqual(1);
      expect(procs.every((p) => p.pid > 1 && typeof p.startTime === 'string')).toBe(true);
    });

    it('terminateProcs stops a live captured process and reports the count', async () => {
      const parent = spawnParentWithGrandchild();
      linuxSpawned.push(parent);

      const descendants = await discoverGrandchildren(parent.pid);
      expect(descendants.length).toBeGreaterThanOrEqual(1);
      const grandchild = descendants[0];
      expect(alive(grandchild)).toBe(true);

      const handle = await readProcHandle(grandchild);
      expect(handle?.startTime).toBeTruthy();
      expect(await terminateProcs([handle!])).toBe(1);

      await waitForExit(grandchild);
      expect(alive(grandchild)).toBe(false);
    });

    it('terminateProcs skips a PID whose start-time no longer matches (PID reuse)', async () => {
      const parent = spawnParentWithGrandchild();
      linuxSpawned.push(parent);
      const descendants = await discoverGrandchildren(parent.pid);
      const grandchild = descendants[0];
      expect(alive(grandchild)).toBe(true);

      const stopped = await terminateProcs([
        { pid: grandchild, startTime: 'DEFINITELY_NOT_THE_REAL_START_TIME' },
      ]);

      expect(stopped).toBe(0);
      expect(alive(grandchild)).toBe(true);
    });
  });

  // Stands in for a host that passes the platform gate but cannot stamp PIDs, the
  // one situation where a held handle could name a recycled process. Nothing may
  // be killed here.
  noProcDescribe('claims to be Linux but has no readable /proc', () => {
    const noProcSpawned = trackSpawned();
    const realPlatform = process.platform;

    /** The isolated registry has its own logger instance, so hand it back to spy on. */
    function loadAsLinux(): {
      mod: typeof import('../stdioProcessTree');
      logger: { debug: jest.Mock };
    } {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      let mod!: typeof import('../stdioProcessTree');
      let logger!: { debug: jest.Mock };
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require('../stdioProcessTree');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        logger = require('@librechat/data-schemas').logger;
      });
      return { mod, logger };
    }

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
    });

    it('produces unstamped handles and refuses to kill them', async () => {
      const { mod } = loadAsLinux();
      const child = spawnIdle();
      noProcSpawned.push(child);

      const handle = await mod.readProcHandle(child.pid);
      expect(handle).toEqual({ pid: child.pid, startTime: null });

      expect(await mod.terminateProcs([handle!])).toBe(0);
      expect(alive(child.pid!)).toBe(true);
    });

    it('reaps nothing rather than walking an unstamped tree', async () => {
      const { mod } = loadAsLinux();
      const child = spawnIdle();
      noProcSpawned.push(child);

      expect(await mod.collectDescendantProcs(child.pid)).toEqual([]);
      const captured = await mod.captureStdioProcessTree(child.pid);
      expect(await captured.cleanup()).toBe(0);
      expect(alive(child.pid!)).toBe(true);
    });

    it('says so instead of degrading silently', async () => {
      const { mod, logger } = loadAsLinux();
      const debug = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);

      await mod.collectDescendantProcs(process.pid);

      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining('/proc is unreadable'),
        expect.anything(),
      );
    });
  });
});
