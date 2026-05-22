/**
 * lint-no-alert.mjs — Static lint: no alert() in ui/src/
 *
 * WHY: alert() calls in production UI code are always placeholder/debug artifacts
 * that break UX in a Claude Code harness UI. This script enforces zero tolerance.
 *
 * Exit codes:
 *   0 — no alert() found
 *   1 — one or more alert() found (with offending file:line listed)
 *
 * Override:
 *   LINT_TARGET_DIR — directory to scan (default: <repo-root>/ui/src)
 *
 * // covers: OV-NO-ALERT-01
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Resolve target directory from env override or default
const REPO_ROOT = join(__dirname, '..', '..');
const TARGET_DIR = process.env.LINT_TARGET_DIR ?? join(REPO_ROOT, 'ui', 'src');

// Pattern: alert( — matches window.alert( too since the tail is the same
// Excludes lines that are pure comments (// ...) since those are doc references
const ALERT_PATTERN = /\balert\s*\(/;
const COMMENT_LINE_PATTERN = /^\s*\/\//;
// JSX block comment: {/* ... */} — entire line is a JSX comment
const JSX_COMMENT_LINE_PATTERN = /^\s*\{\/\*/;
// Block comment start or continuation: /* or *
const BLOCK_COMMENT_LINE_PATTERN = /^\s*(\*|\/\*)/;

/**
 * Recursively walk a directory, returning all .ts/.tsx/.js/.jsx files.
 * @param {string} dir
 * @returns {string[]}
 */
function walkFiles(dir) {
  /** @type {string[]} */
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

let exitCode = 0;
/** @type {string[]} */
const findings = [];

for (const filePath of walkFiles(TARGET_DIR)) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines — doc references, not production calls
    if (COMMENT_LINE_PATTERN.test(line)) continue;
    if (JSX_COMMENT_LINE_PATTERN.test(line)) continue;
    if (BLOCK_COMMENT_LINE_PATTERN.test(line)) continue;
    if (ALERT_PATTERN.test(line)) {
      findings.push(`  ${relative(REPO_ROOT, filePath)}:${i + 1}: ${line.trim()}`);
      exitCode = 1;
    }
  }
}

if (exitCode !== 0) {
  console.error('lint-no-alert: FAIL — alert() found in production source:');
  for (const f of findings) {
    console.error(f);
  }
  console.error(`\n  ${findings.length} violation(s). Remove alert() calls from ui/src/.`);
} else {
  console.log('lint-no-alert: PASS — no alert() in ui/src/');
}

process.exit(exitCode);
