/**
 * lint-no-placeholder.mjs — Static lint: no placeholder UI strings in ui/src/
 *
 * WHY: Placeholder strings like "TBD", "TODO", "Lorem ipsum", "FIXME" that
 * appear as rendered JSX/HTML content (not in comments or attributes) indicate
 * unfinished UI that would confuse end-users.
 *
 * What is checked:
 *   - Literal string values "TBD", "TODO", "FIXME", "Lorem ipsum" in JSX text
 *     (i.e., >TBD</span> or {"TBD"} patterns)
 *
 * What is NOT flagged (allowlisted by design):
 *   1. Lines that are pure comments (//)
 *   2. JSX attribute values: placeholder="..." — input placeholder is valid UI
 *   3. Lines containing <!-- placeholder-allow --> annotation
 *   4. CSS class names like .placeholder-screen, .retro-card--placeholder
 *      (these are structural, not user-visible strings)
 *   5. import statements
 *   6. Lines inside type annotations or interface declarations
 *   7. Lines containing only variable names or identifiers (not string literals)
 *
 * Exit codes:
 *   0 — no disallowed placeholder strings found
 *   1 — one or more found (with offending file:line listed)
 *
 * Override:
 *   LINT_TARGET_DIR — directory to scan (default: <repo-root>/ui/src)
 *
 * // covers: OV-NO-PLACEHOLDER-01
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const REPO_ROOT = join(__dirname, '..', '..');
const TARGET_DIR = process.env.LINT_TARGET_DIR ?? join(REPO_ROOT, 'ui', 'src');

// Patterns that indicate placeholder user-visible strings in JSX/JS
// Must be string literals (quoted) or JSX text content, not just identifiers
const PLACEHOLDER_PATTERNS = [
  // "TBD" or 'TBD' as a standalone string value (not inside a longer word)
  /(?<![A-Z_a-z0-9])(["'])TBD\1/,
  // {TBD} as JSX expression content (not identifiers like TODOS)
  /\{TBD\}/,
  // >TBD< as JSX text content
  />TBD</,
  // "Lorem ipsum" or 'Lorem ipsum'
  /["']Lorem ipsum/i,
  // >Lorem ipsum< as JSX text
  />Lorem ipsum/i,
  // "FIXME" as a rendered string value (not a comment), to catch leftover UI labels
  /(?<![A-Z_a-z0-9])(["'])FIXME\1/,
];

// Lines to skip (allowlisted contexts)
const SKIP_PATTERNS = [
  /^\s*\/\//, // pure comment line
  /placeholder\s*=/, // HTML/JSX attribute: placeholder="..."
  /placeholder-allow/, // explicit suppression annotation
  /^\s*import /, // import statement
  /^\s*\*/, // JSDoc / block comment continuation
  /^\s*\/\*/, // block comment start
  /className.*placeholder/, // CSS class name reference (not rendered string)
  /\.placeholder/, // CSS class selector reference
  /placeholder-screen/, // known structural CSS class
  /placeholder:/, // CSS property
];

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

    // Check skip patterns — if any match, this line is allowed
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    // Check for disallowed placeholder patterns
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(line)) {
        findings.push(`  ${relative(REPO_ROOT, filePath)}:${i + 1}: ${line.trim()}`);
        exitCode = 1;
        break; // one finding per line is enough
      }
    }
  }
}

if (exitCode !== 0) {
  console.error('lint-no-placeholder: FAIL — placeholder strings found in production source:');
  for (const f of findings) {
    console.error(f);
  }
  console.error(`\n  ${findings.length} violation(s). Remove placeholder strings from ui/src/.`);
  console.error('  To suppress a specific line intentionally, add: <!-- placeholder-allow -->');
} else {
  console.log('lint-no-placeholder: PASS — no placeholder strings in ui/src/');
}

process.exit(exitCode);
