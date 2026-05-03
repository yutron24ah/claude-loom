/**
 * phase-a-screening.ts — Phase A: mechanical vocabulary screening (SPEC §7.4)
 * WHY: Pure functions — no IO, no DB, no API calls. Deterministic, fast, testable.
 *
 * Two responsibilities (SRP per file pair):
 *   1. extractTerms — parse unified diff to extract added/removed vocabulary
 *   2. screenRelatedDocs — grep extracted terms against file contents, return findings
 */
import { FINDING_TYPE, FINDING_SEVERITY } from "../constants/consistency.js";
import type { FindingType, FindingSeverity } from "../constants/consistency.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TermSet {
  added: string[];
  removed: string[];
}

export interface ScreeningFinding {
  targetPath: string;
  findingType: FindingType;
  severity: FindingSeverity;
  description: string;
  matchedTerm: string;
}

// ---------------------------------------------------------------------------
// extractTerms
// ---------------------------------------------------------------------------

/**
 * Extract vocabulary terms (headings + named identifiers) from a unified diff string.
 *
 * WHY each pattern:
 *   - Markdown headings (##/###): section-level renames are high-signal changes
 *   - PascalCase / CamelCase: TypeScript types, class names, interface names
 *   - kebab-case (2+ segments): module names, route paths, command slugs
 *   - Single-quoted / double-quoted strings: string literal constants, status values
 *
 * Pure function — no IO, no side effects.
 */
export function extractTerms(diff: string): TermSet {
  const addedSet = new Set<string>();
  const removedSet = new Set<string>();

  for (const line of diff.split("\n")) {
    // Skip hunk headers and empty lines
    if (line.startsWith("@@") || line === "") continue;

    const isRemoved = line.startsWith("-");
    const isAdded = line.startsWith("+");
    if (!isRemoved && !isAdded) continue;

    // Strip the leading +/- marker
    const content = line.slice(1);
    const target = isRemoved ? removedSet : addedSet;

    // 1. Markdown headings: ## Heading Text or ### Heading Text
    const headingMatch = content.match(/^#{2,}\s+(.+)/);
    if (headingMatch) {
      target.add(headingMatch[1].trim());
    }

    // 2. PascalCase / CamelCase identifiers (at least 2 uppercase letters or an uppercase
    //    followed by lowercase-or-digit sequences)
    //    WHY: matches TypeScript class/interface/type names like ConsistencyFinding, runPhaseA
    const pascalKebabRe = /\b([A-Z][a-zA-Z0-9]*(?:[A-Z][a-z0-9]*)+)\b/g;
    let m: RegExpExecArray | null;
    while ((m = pascalKebabRe.exec(content)) !== null) {
      target.add(m[1]);
    }

    // 3. kebab-case identifiers: two or more lowercase-word segments separated by hyphens
    //    WHY: module names like phase-a-runner, finding-type
    const kebabRe = /\b([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+)\b/g;
    while ((m = kebabRe.exec(content)) !== null) {
      target.add(m[1]);
    }

    // 4. Single-quoted or double-quoted short strings (status values, literal constants)
    //    WHY: catches 'term_removed', "analyzed" etc. from SPEC prose
    const quotedRe = /['"]([a-zA-Z][a-zA-Z0-9_-]{1,39})['"]/g;
    while ((m = quotedRe.exec(content)) !== null) {
      target.add(m[1]);
    }
  }

  return {
    added: Array.from(addedSet),
    removed: Array.from(removedSet),
  };
}

// ---------------------------------------------------------------------------
// screenRelatedDocs
// ---------------------------------------------------------------------------

/**
 * Grep a set of removed terms against file contents.
 * Returns one ScreeningFinding per (term, file) pair where the term appears.
 *
 * WHY separate from extractTerms: file IO is the caller's concern — this function
 * only operates on pre-loaded content strings (Map<path, content>). Keeps it pure
 * and testable without mocking fs.
 */
export function screenRelatedDocs(
  removedTerms: string[],
  filePathsContent: Map<string, string>,
): ScreeningFinding[] {
  if (removedTerms.length === 0 || filePathsContent.size === 0) {
    return [];
  }

  const findings: ScreeningFinding[] = [];

  for (const [filePath, content] of filePathsContent) {
    for (const term of removedTerms) {
      if (!content.includes(term)) continue;

      findings.push({
        targetPath: filePath,
        findingType: FINDING_TYPE.TERM_REMOVED,
        severity: severityForTerm(term),
        description: `Removed term "${term}" is still mentioned in ${filePath}`,
        matchedTerm: term,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Severity heuristic
// ---------------------------------------------------------------------------

/**
 * Assign severity based on the term's nature.
 * WHY heuristics instead of fixed value: heading-level removals are more disruptive
 * (readers follow headings as navigation) than inline identifier removals.
 *
 * high:   markdown heading text (section was removed)
 * medium: PascalCase identifier (type/class/interface — likely referenced in multiple places)
 * low:    kebab-case module name or quoted literal
 */
function severityForTerm(term: string): FindingSeverity {
  // PascalCase or CamelCase (contains uppercase after first char)
  if (/[A-Z]/.test(term)) {
    return FINDING_SEVERITY.MEDIUM;
  }
  // kebab-case or quoted literal
  return FINDING_SEVERITY.LOW;
}
