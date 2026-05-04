/**
 * spec-diff.ts — Pure utility functions for SPEC change detection
 * WHY: M4 consistency engine needs hash comparison and unified diff generation
 * for spec_changes table. File IO is the caller's responsibility — these are
 * pure functions that operate on string content only (testable, composable).
 *
 * No external npm packages required: uses Node.js `crypto` for sha256
 * and a minimal LCS-based unified diff implementation.
 */
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Hash computation
// ---------------------------------------------------------------------------

/**
 * Compute sha256 hash of a string, returned as lowercase hex (64 chars).
 * Deterministic, pure function.
 */
export function computeHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Unified diff computation
// ---------------------------------------------------------------------------

export interface DiffResult {
  /** Unified diff string. Empty string when before === after. */
  diff: string;
  /** Number of added lines. */
  additions: number;
  /** Number of deleted lines. */
  deletions: number;
}

/**
 * Compute a unified diff between two strings.
 * Returns DiffResult with diff string, additions count, and deletions count.
 *
 * WHY minimal LCS impl instead of npm `diff`: avoids adding a new dependency
 * for a small utility. The `diff` package is not in package.json and installing
 * it is outside task scope (YAGNI / KISS).
 *
 * The output format is compatible with unified diff (context lines + @@ hunks).
 */
export function computeDiff(before: string, after: string): DiffResult {
  if (before === after) {
    return { diff: "", additions: 0, deletions: 0 };
  }

  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);

  const hunks = buildHunks(beforeLines, afterLines);

  let additions = 0;
  let deletions = 0;
  const diffLines: string[] = [];

  for (const hunk of hunks) {
    diffLines.push(hunk.header);
    for (const line of hunk.lines) {
      diffLines.push(line);
      if (line.startsWith("+")) additions++;
      else if (line.startsWith("-")) deletions++;
    }
  }

  return {
    diff: diffLines.join("\n"),
    additions,
    deletions,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Split a string into lines, preserving the newline semantics of diff.
 * A trailing newline does NOT produce an extra empty element. */
function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  // Remove trailing empty element caused by a final newline
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

interface Hunk {
  header: string;
  lines: string[];
}

const CONTEXT = 3; // standard unified diff context lines

/** Build unified diff hunks using Myers-style LCS edit script. */
function buildHunks(aLines: string[], bLines: string[]): Hunk[] {
  const edits = lcsEdits(aLines, bLines);
  if (edits.every((e) => e.type === "equal")) return [];

  // Group edits into hunks with CONTEXT lines
  const hunks: Hunk[] = [];
  const n = edits.length;
  let i = 0;

  while (i < n) {
    // Skip equal edits that aren't close to a change
    if (edits[i].type === "equal") {
      i++;
      continue;
    }

    // Start a hunk: include up to CONTEXT equal lines before the change
    const hunkStart = Math.max(0, i - CONTEXT);
    const hunk: Edit[] = edits.slice(hunkStart, i);

    // Consume until we have no more changes within CONTEXT range
    let lastChangeIdx = i;
    while (i < n) {
      if (edits[i].type !== "equal") {
        lastChangeIdx = i;
        hunk.push(edits[i]);
        i++;
      } else {
        // Equal run: include if within CONTEXT of next change
        const nextChange = findNextChange(edits, i);
        if (nextChange !== -1 && nextChange - i <= CONTEXT) {
          // Include these equal lines as context
          const run = edits.slice(i, Math.min(nextChange, i + CONTEXT));
          hunk.push(...run);
          i += run.length;
        } else {
          // End of hunk — include trailing CONTEXT lines
          const trailing = edits.slice(i, i + CONTEXT);
          hunk.push(...trailing);
          i += trailing.length;
          break;
        }
      }
    }

    hunks.push(buildHunkFromEdits(hunk));
  }

  return hunks;
}

function findNextChange(edits: Edit[], from: number): number {
  for (let i = from; i < edits.length; i++) {
    if (edits[i].type !== "equal") return i;
  }
  return -1;
}

interface Edit {
  type: "equal" | "insert" | "delete";
  aLine: number; // 0-based index in a
  bLine: number; // 0-based index in b
  content: string;
}

function buildHunkFromEdits(edits: Edit[]): Hunk {
  const aLines = edits.filter((e) => e.type !== "insert");
  const bLines = edits.filter((e) => e.type !== "delete");

  const aStart = aLines.length > 0 ? aLines[0].aLine + 1 : 1;
  const bStart = bLines.length > 0 ? bLines[0].bLine + 1 : 1;

  const header = `@@ -${aStart},${aLines.length} +${bStart},${bLines.length} @@`;

  const lines: string[] = edits.map((e) => {
    if (e.type === "equal") return ` ${e.content}`;
    if (e.type === "insert") return `+${e.content}`;
    return `-${e.content}`;
  });

  return { header, lines };
}

/**
 * Compute LCS-based edit script between two line arrays.
 * Uses dynamic programming (O(n*m) space — suitable for typical spec file sizes).
 */
function lcsEdits(a: string[], b: string[]): Edit[] {
  const n = a.length;
  const m = b.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build edits
  const edits: Edit[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      edits.unshift({ type: "equal", aLine: i - 1, bLine: j - 1, content: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.unshift({ type: "insert", aLine: i, bLine: j - 1, content: b[j - 1] });
      j--;
    } else {
      edits.unshift({ type: "delete", aLine: i - 1, bLine: j, content: a[i - 1] });
      i--;
    }
  }

  return edits;
}
