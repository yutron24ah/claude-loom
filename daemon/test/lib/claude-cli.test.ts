/**
 * M4 t4: claude-cli.ts tests (subprocess wrapper for claude -p)
 * TDD — subprocess mock via vi.mock('node:child_process')
 *
 * WHY vi.mock('child_process'): never spawn real claude CLI in tests
 * (CI has no claude / token cost / side effects).
 *
 * WHY vi.hoisted: mockSpawn must be initialised before vi.mock factory runs,
 * since vi.mock is hoisted to the top of the file at compile time.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChildProcess } from "node:child_process";

// ---------------------------------------------------------------------------
// Use vi.hoisted to initialise the mock BEFORE vi.mock factory runs
// ---------------------------------------------------------------------------
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

// Import module AFTER mock registration (dynamic import inside tests would also work)
import { runClaudeCLI, DEFAULT_CLAUDE_TIMEOUT } from "../../src/lib/claude-cli.js";

// ---------------------------------------------------------------------------
// Helper: build a minimal mock ChildProcess that fires events via setImmediate
// ---------------------------------------------------------------------------
function makeMockProcess(
  options: {
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    spawnError?: Error;
    neverClose?: boolean;
  } = {},
): ChildProcess {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  const on = (key: string, cb: (...args: unknown[]) => void) => {
    if (!handlers[key]) handlers[key] = [];
    handlers[key].push(cb);
  };

  const trigger = (key: string, ...args: unknown[]) => {
    (handlers[key] ?? []).forEach((cb) => cb(...args));
  };

  const mockStdout = {
    on: (event: string, cb: (...args: unknown[]) => void) => {
      on(`stdout:${event}`, cb);
      return mockStdout;
    },
  };
  const mockStderr = {
    on: (event: string, cb: (...args: unknown[]) => void) => {
      on(`stderr:${event}`, cb);
      return mockStderr;
    },
  };

  const proc = {
    stdout: mockStdout,
    stderr: mockStderr,
    on: (event: string, cb: (...args: unknown[]) => void) => {
      on(event, cb);
      return proc;
    },
    kill: vi.fn(),
  };

  setImmediate(() => {
    if (options.spawnError) {
      trigger("error", options.spawnError);
      return;
    }
    if (options.neverClose) return;
    if (options.stdout !== undefined) {
      trigger("stdout:data", Buffer.from(options.stdout));
    }
    if (options.stderr !== undefined) {
      trigger("stderr:data", Buffer.from(options.stderr));
    }
    trigger("close", options.exitCode ?? 0);
  });

  return proc as unknown as ChildProcess;
}

beforeEach(() => {
  mockSpawn.mockReset();
});

// ---------------------------------------------------------------------------
// Shape tests
// ---------------------------------------------------------------------------

describe("claude-cli module shape", () => {
  it("exports runClaudeCLI function", () => {
    expect(typeof runClaudeCLI).toBe("function");
  });

  it("exports DEFAULT_CLAUDE_TIMEOUT constant = 30000", () => {
    expect(typeof DEFAULT_CLAUDE_TIMEOUT).toBe("number");
    expect(DEFAULT_CLAUDE_TIMEOUT).toBe(30000);
  });
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe("runClaudeCLI — success path", () => {
  it("returns ok:true with parsed JSON output on success", async () => {
    const output = [{ finding_type: "semantic_drift", description: "test" }];
    mockSpawn.mockReturnValue(makeMockProcess({ stdout: JSON.stringify(output), exitCode: 0 }));

    const result = await runClaudeCLI("some prompt", {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toEqual(output);
    }
  });

  it("uses 'claude' as default command when cmd not specified", async () => {
    mockSpawn.mockReturnValue(makeMockProcess({ stdout: "[]", exitCode: 0 }));

    await runClaudeCLI("prompt", {});

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-p", expect.any(String), "--output-format", "json"]),
      expect.any(Object),
    );
  });

  it("uses custom cmd when specified", async () => {
    mockSpawn.mockReturnValue(makeMockProcess({ stdout: "[]", exitCode: 0 }));

    await runClaudeCLI("prompt", { cmd: "/usr/local/bin/claude" });

    expect(mockSpawn).toHaveBeenCalledWith(
      "/usr/local/bin/claude",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("passes prompt as separate args array element (not shell interpolation)", async () => {
    mockSpawn.mockReturnValue(makeMockProcess({ stdout: "[]", exitCode: 0 }));

    const prompt = 'prompt with "quotes" and $special chars';
    await runClaudeCLI(prompt, {});

    const spawnArgs = mockSpawn.mock.calls[0];
    // Should call spawn(cmd, [args...]) not spawn('bash', ['-c', '...'])
    expect(spawnArgs[0]).toBe("claude");
    // The prompt must appear as a separate element in the args array
    const args: string[] = spawnArgs[1];
    expect(args).toContain(prompt);
  });
});

// ---------------------------------------------------------------------------
// CLI not found path
// ---------------------------------------------------------------------------

describe("runClaudeCLI — CLI not found (ENOENT)", () => {
  it("returns ok:false with reason cli_not_found when spawn throws ENOENT", async () => {
    const err = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
    mockSpawn.mockReturnValue(makeMockProcess({ spawnError: err }));

    const result = await runClaudeCLI("prompt", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("cli_not_found");
    }
  });
});

// ---------------------------------------------------------------------------
// Timeout path
// ---------------------------------------------------------------------------

describe("runClaudeCLI — timeout", () => {
  it("returns ok:false with reason timeout when process exceeds timeout", async () => {
    // neverClose=true means the process never fires 'close' event
    mockSpawn.mockReturnValue(makeMockProcess({ neverClose: true }));

    const result = await runClaudeCLI("prompt", { timeout: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("timeout");
    }
  });
});

// ---------------------------------------------------------------------------
// Parse error path
// ---------------------------------------------------------------------------

describe("runClaudeCLI — parse error", () => {
  it("returns ok:false with reason parse_error for invalid JSON output", async () => {
    mockSpawn.mockReturnValue(
      makeMockProcess({ stdout: "not valid json {{{{", exitCode: 0 }),
    );

    const result = await runClaudeCLI("prompt", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("parse_error");
    }
  });
});

// ---------------------------------------------------------------------------
// Subprocess error path
// ---------------------------------------------------------------------------

describe("runClaudeCLI — subprocess error", () => {
  it("returns ok:false with reason subprocess_error for non-zero exit code", async () => {
    mockSpawn.mockReturnValue(
      makeMockProcess({ stdout: "", stderr: "some error", exitCode: 1 }),
    );

    const result = await runClaudeCLI("prompt", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("subprocess_error");
    }
  });

  it("includes error string in result for subprocess_error", async () => {
    mockSpawn.mockReturnValue(
      makeMockProcess({ stdout: "", stderr: "fatal error occurred", exitCode: 2 }),
    );

    const result = await runClaudeCLI("prompt", {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("fatal error occurred");
    }
  });
});
