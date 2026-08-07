/**
 * Unit tests for the stdio orphan-process reaper seam in MCPConnection.disconnect().
 *
 * These assert the disconnect-time ordering (snapshot the subprocess tree BEFORE
 * client.close() while ppid links are intact, then reap survivors AFTER) and that
 * the reaper only engages for stdio transports.
 */

import { logger } from '@librechat/data-schemas';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPConnection } from '~/mcp/connection';

jest.mock('@librechat/data-schemas', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('~/auth', () => ({
  createSSRFSafeUndiciConnect: jest.fn(() => undefined),
  isOAuthUrlAllowed: jest.fn(() => false),
  isSSRFTarget: jest.fn(() => false),
  resolveHostnameSSRF: jest.fn(async () => false),
}));

jest.mock('~/mcp/mcpConfig', () => ({
  mcpConfig: {
    CONNECTION_CHECK_TTL: 0,
    TOOLS_LIST_MAX_PAGES: 50,
    TOOLS_LIST_MAX_TOOLS: 1000,
    TOOLS_LIST_MAX_BYTES: 5 * 1024 * 1024,
    TOOLS_LIST_TIMEOUT_MS: 30000,
  },
}));

const mockOrder: string[] = [];
let mockReapCount = 0;
const mockCleanup = jest.fn(async () => {
  mockOrder.push('cleanup');
  return mockReapCount;
});
const mockCaptureStdioProcessTree = jest.fn(async (..._args: unknown[]) => {
  mockOrder.push('capture');
  return { cleanup: mockCleanup };
});
const mockCollectDescendantProcs = jest.fn(async (..._args: unknown[]) => [] as unknown[]);
const mockReadProcHandle = jest.fn(async (..._args: unknown[]) => null as unknown);

jest.mock('../stdioProcessTree', () => ({
  captureStdioProcessTree: (...args: unknown[]) => mockCaptureStdioProcessTree(...args),
  collectDescendantProcs: (...args: unknown[]) => mockCollectDescendantProcs(...args),
  readProcHandle: (...args: unknown[]) => mockReadProcHandle(...args),
}));

function newStdioConnection(): MCPConnection {
  return new MCPConnection({
    serverName: 'test',
    serverConfig: { type: 'stdio', command: 'node', args: [] },
    useSSRFProtection: false,
  });
}

function spyClose(conn: MCPConnection): void {
  jest
    .spyOn((conn as unknown as { client: { close: () => Promise<void> } }).client, 'close')
    .mockImplementation(async () => {
      mockOrder.push('close');
    });
}

describe('MCPConnection stdio reaper seam', () => {
  beforeEach(() => {
    mockOrder.length = 0;
    mockCaptureStdioProcessTree.mockClear();
    mockCleanup.mockClear();
    mockReapCount = 0;
    (logger.debug as jest.Mock).mockClear();
    mockCollectDescendantProcs.mockReset();
    mockCollectDescendantProcs.mockResolvedValue([]);
    mockReadProcHandle.mockReset();
    mockReadProcHandle.mockResolvedValue(null);
  });

  it('captures the subprocess tree before close() and reaps after, for a stdio transport', async () => {
    const conn = newStdioConnection();
    spyClose(conn);

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 4242 };
    (conn as unknown as { transport: unknown }).transport = fakeTransport;

    await conn.disconnect(true, true);

    expect(mockOrder).toEqual(['capture', 'close', 'cleanup']);
    expect(mockCaptureStdioProcessTree).toHaveBeenCalledTimes(1);
    expect(mockCaptureStdioProcessTree.mock.calls[0][0]).toBe(4242);
    expect((conn as unknown as { transport: unknown }).transport).toBeNull();
  });

  it('folds the connect-time handles into the disconnect reap set when the wrapper crashed (transport.pid null)', async () => {
    const wrapperHandle = { pid: 111, startTime: 'A' };
    const descendantHandle = { pid: 222, startTime: 'B' };
    mockReadProcHandle.mockResolvedValue(wrapperHandle);
    mockCollectDescendantProcs.mockResolvedValue([descendantHandle]);

    const conn = newStdioConnection();
    spyClose(conn);
    jest.spyOn(conn, 'isConnected').mockResolvedValue(true);

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 5555 };
    jest.spyOn(conn, 'connectClient').mockImplementation(async () => {
      (conn as unknown as { transport: unknown }).transport = fakeTransport;
    });

    await conn.connect();

    // Wrapper crashes mid-session: the SDK nulls _process so transport.pid is now null.
    (fakeTransport as { _process: unknown })._process = undefined;

    await conn.disconnect();

    expect(mockCaptureStdioProcessTree).toHaveBeenCalledTimes(1);
    expect(mockCaptureStdioProcessTree.mock.calls[0][0]).toBeNull();
    const extraHandles = mockCaptureStdioProcessTree.mock.calls[0][1] as Array<{ pid: number }>;
    expect(extraHandles).toEqual(expect.arrayContaining([wrapperHandle, descendantHandle]));
  });

  it('does not capture at connect when the connection was never established', async () => {
    const conn = newStdioConnection();
    jest.spyOn(conn, 'isConnected').mockResolvedValue(false);

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 5555 };
    jest.spyOn(conn, 'connectClient').mockImplementation(async () => {
      (conn as unknown as { transport: unknown }).transport = fakeTransport;
    });

    await expect(conn.connect()).rejects.toThrow('Connection not established');

    expect(mockReadProcHandle).not.toHaveBeenCalled();
    expect(mockCollectDescendantProcs).not.toHaveBeenCalled();
  });

  it('reaps even when close() throws, and leaves the transport for the retry', async () => {
    const conn = newStdioConnection();
    jest
      .spyOn((conn as unknown as { client: { close: () => Promise<void> } }).client, 'close')
      .mockImplementation(async () => {
        mockOrder.push('close');
        throw new Error('close failed');
      });

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 4242 };
    (conn as unknown as { transport: unknown }).transport = fakeTransport;

    await expect(conn.disconnect(true, true)).rejects.toThrow('close failed');

    expect(mockOrder).toEqual(['capture', 'close', 'cleanup']);
    expect((conn as unknown as { transport: unknown }).transport).toBe(fakeTransport);
  });

  it('logs how many orphans were reaped', async () => {
    mockReapCount = 3;
    const conn = newStdioConnection();
    spyClose(conn);

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 4242 };
    (conn as unknown as { transport: unknown }).transport = fakeTransport;

    await conn.disconnect(true, true);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Reaped 3 orphaned stdio'));
  });

  it('does not log a reap count when nothing was orphaned', async () => {
    const conn = newStdioConnection();
    spyClose(conn);

    const fakeTransport = Object.create(StdioClientTransport.prototype);
    (fakeTransport as { _process: unknown })._process = { pid: 4242 };
    (conn as unknown as { transport: unknown }).transport = fakeTransport;

    await conn.disconnect(true, true);

    expect(logger.debug).not.toHaveBeenCalledWith(expect.stringContaining('Reaped'));
  });

  it('does not capture for a non-stdio transport but still closes', async () => {
    const conn = newStdioConnection();
    spyClose(conn);

    (conn as unknown as { transport: unknown }).transport = { some: 'transport' };

    await conn.disconnect(true, true);

    expect(mockCaptureStdioProcessTree).not.toHaveBeenCalled();
    expect(mockOrder).toEqual(['close']);
    expect((conn as unknown as { transport: unknown }).transport).toBeNull();
  });
});
