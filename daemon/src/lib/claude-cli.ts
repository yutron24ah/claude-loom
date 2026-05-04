/**
 * claude-cli.ts — Phase B subprocess wrapper for `claude -p` CLI
 * SPEC §7.4, §6.10
 *
 * WHY spawn (not exec/shell): command injection prevention — prompt is passed as a
 * separate args array element, never interpolated via bash -c (§3.6.10 / task spec).
 *
 * WHY graceful error union return (not throw): callers need to distinguish between
 * "CLI absent" (degraded mode → Phase A only) and "transient errors" (log + skip).
 * Throwing forces callers to wrap every call in try/catch for control flow, which
 * is an anti-pattern for expected failure modes (SPEC §7.4 degraded mode).
 */
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Constants (SSoT — §3.6.10)
// ---------------------------------------------------------------------------

/** Default timeout for claude -p subprocess in milliseconds. */
export const DEFAULT_CLAUDE_TIMEOUT = 30000;

/** Default claude CLI command name. Override via config.consistency.claude_cmd. */
export const DEFAULT_CLAUDE_CMD = "claude";

/** CLI args format: claude -p "<prompt>" --output-format json */
const CLI_OUTPUT_FORMAT = "--output-format";
const CLI_OUTPUT_FORMAT_VALUE = "json";
const CLI_PROMPT_FLAG = "-p";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ClaudeCLISuccess = {
  ok: true;
  output: unknown;
};

export type ClaudeCLIFailure = {
  ok: false;
  reason: "cli_not_found" | "timeout" | "parse_error" | "subprocess_error";
  error?: string;
};

export type ClaudeCLIResult = ClaudeCLISuccess | ClaudeCLIFailure;

// ---------------------------------------------------------------------------
// runClaudeCLI
// ---------------------------------------------------------------------------

/**
 * Invoke `claude -p "<prompt>" --output-format json` as a subprocess.
 *
 * WHY spawn args array (not shell string): prevents shell injection — the prompt
 * content is never interpolated via bash -c. spawn() treats each array element
 * as a distinct argv entry, so special characters in prompt are safe.
 *
 * @param prompt  The full prompt to pass to claude -p
 * @param options.cmd      Override the claude command path (default: 'claude')
 * @param options.timeout  Subprocess timeout in ms (default: DEFAULT_CLAUDE_TIMEOUT)
 */
export async function runClaudeCLI(
  prompt: string,
  options: { cmd?: string; timeout?: number },
): Promise<ClaudeCLIResult> {
  const cmd = options.cmd ?? DEFAULT_CLAUDE_CMD;
  const timeoutMs = options.timeout ?? DEFAULT_CLAUDE_TIMEOUT;

  return new Promise<ClaudeCLIResult>((resolve) => {
    let stdoutChunks: Buffer[] = [];
    let stderrChunks: Buffer[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function settle(result: ClaudeCLIResult) {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve(result);
    }

    // WHY spawn with args array: safe against prompt content with quotes/special chars
    const child = spawn(cmd, [CLI_PROMPT_FLAG, prompt, CLI_OUTPUT_FORMAT, CLI_OUTPUT_FORMAT_VALUE], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Timeout guard
    timer = setTimeout(() => {
      child.kill();
      settle({ ok: false, reason: "timeout" });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        settle({ ok: false, reason: "cli_not_found" });
      } else {
        settle({
          ok: false,
          reason: "subprocess_error",
          error: err.message,
        });
      }
    });

    child.on("close", (code: number | null) => {
      if (settled) return;

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
        settle({
          ok: false,
          reason: "subprocess_error",
          error: stderr || `Process exited with code ${code}`,
        });
        return;
      }

      const rawOutput = Buffer.concat(stdoutChunks).toString("utf-8").trim();
      try {
        const parsed = JSON.parse(rawOutput);
        settle({ ok: true, output: parsed });
      } catch {
        settle({
          ok: false,
          reason: "parse_error",
          error: `Failed to parse JSON output: ${rawOutput.slice(0, 200)}`,
        });
      }
    });
  });
}
