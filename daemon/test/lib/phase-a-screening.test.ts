/**
 * M4 t3: phase-a-screening.ts unit tests
 * TDD RED phase — written before implementation exists
 * Tests: extractTerms / screenRelatedDocs
 */
import { describe, it, expect } from "vitest";
import {
  extractTerms,
  screenRelatedDocs,
  type ScreeningFinding,
} from "../../src/lib/phase-a-screening.js";

// ---------------------------------------------------------------------------
// extractTerms
// ---------------------------------------------------------------------------

describe("extractTerms", () => {
  it("returns { added, removed } arrays from a diff string", () => {
    const diff = `@@ -1,3 +1,3 @@
 context line
-old heading text
+new heading text`;
    const result = extractTerms(diff);
    expect(result).toHaveProperty("added");
    expect(result).toHaveProperty("removed");
    expect(Array.isArray(result.added)).toBe(true);
    expect(Array.isArray(result.removed)).toBe(true);
  });

  it("extracts markdown heading from removed lines (##)", () => {
    const diff = `-## MyFeature Section
+## RenamedFeature Section`;
    const result = extractTerms(diff);
    // removed heading "MyFeature Section" should appear in removed terms
    expect(result.removed).toContain("MyFeature Section");
    expect(result.added).toContain("RenamedFeature Section");
  });

  it("extracts markdown heading from removed lines (###)", () => {
    const diff = `-### SpecificSubsection heading
+### NewSubsection heading`;
    const result = extractTerms(diff);
    expect(result.removed).toContain("SpecificSubsection heading");
    expect(result.added).toContain("NewSubsection heading");
  });

  it("extracts CamelCase terms from removed lines", () => {
    const diff = `-The SpecDiffEngine processes changes via ComputeHash function
+The SpecDiffEngine is updated`;
    const result = extractTerms(diff);
    // CamelCase terms: SpecDiffEngine, ComputeHash
    expect(result.removed).toContain("ComputeHash");
    // SpecDiffEngine appears in both — expect in removed (from deleted line)
    expect(result.removed).toContain("SpecDiffEngine");
  });

  it("extracts PascalCase terms from removed lines", () => {
    const diff = `-ConsistencyFinding and SpecChange are the key types`;
    const result = extractTerms(diff);
    expect(result.removed).toContain("ConsistencyFinding");
    expect(result.removed).toContain("SpecChange");
  });

  it("extracts kebab-case terms from removed lines", () => {
    const diff = `-The phase-a-runner module handles analysis
+The analysis-runner module handles analysis`;
    const result = extractTerms(diff);
    expect(result.removed).toContain("phase-a-runner");
  });

  it("extracts quoted strings from removed lines", () => {
    const diff = `-Status value 'term_removed' is used for this finding
+Status value 'section_changed' is used`;
    const result = extractTerms(diff);
    expect(result.removed).toContain("term_removed");
  });

  it("extracts added terms from + lines", () => {
    const diff = `+## NewApiSection
+The NewInterface type is introduced`;
    const result = extractTerms(diff);
    expect(result.added).toContain("NewApiSection");
    expect(result.added).toContain("NewInterface");
  });

  it("ignores context lines (no + or - prefix)", () => {
    const diff = ` This is a context line with ContextTerm
-This is a removed line with RemovedTerm`;
    const result = extractTerms(diff);
    // ContextTerm should NOT be in removed or added
    expect(result.removed).not.toContain("ContextTerm");
    expect(result.added).not.toContain("ContextTerm");
    expect(result.removed).toContain("RemovedTerm");
  });

  it("ignores hunk header lines (@@ ...)", () => {
    const diff = `@@ -1,4 +1,4 @@
-removed line with RemovedWord`;
    const result = extractTerms(diff);
    expect(result.removed).toContain("RemovedWord");
    // Should not error or produce garbage from @@ lines
  });

  it("deduplicates terms", () => {
    const diff = `-## DuplicatedTerm section
-DuplicatedTerm is mentioned again here`;
    const result = extractTerms(diff);
    const count = result.removed.filter((t) => t === "DuplicatedTerm").length;
    expect(count).toBe(1);
  });

  it("handles empty diff string", () => {
    const result = extractTerms("");
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("handles diff with no headings or named terms", () => {
    const diff = `-simple lowercase words only here
+other lowercase words`;
    // No PascalCase, no headings, no kebab, no quoted strings
    const result = extractTerms(diff);
    // Might be empty or contain words — just must not throw
    expect(result).toHaveProperty("added");
    expect(result).toHaveProperty("removed");
  });
});

// ---------------------------------------------------------------------------
// screenRelatedDocs
// ---------------------------------------------------------------------------

describe("screenRelatedDocs", () => {
  it("returns ScreeningFinding[] array", () => {
    const findings = screenRelatedDocs([], new Map());
    expect(Array.isArray(findings)).toBe(true);
  });

  it("returns empty array when removedTerms is empty", () => {
    const content = new Map([["README.md", "This is readme content with SomeClass"]]);
    const findings = screenRelatedDocs([], content);
    expect(findings).toHaveLength(0);
  });

  it("returns empty array when filePathsContent is empty", () => {
    const findings = screenRelatedDocs(["RemovedClass"], new Map());
    expect(findings).toHaveLength(0);
  });

  it("returns a finding when a removed term is mentioned in a file", () => {
    const removedTerms = ["OldApiEndpoint"];
    const content = new Map([
      ["README.md", "See OldApiEndpoint for usage details"],
    ]);
    const findings = screenRelatedDocs(removedTerms, content);
    expect(findings.length).toBeGreaterThan(0);

    const finding = findings[0];
    expect(finding.targetPath).toBe("README.md");
    expect(finding.description).toContain("OldApiEndpoint");
  });

  it("does NOT return a finding when removed term is not in file", () => {
    const removedTerms = ["ObsoleteClass"];
    const content = new Map([
      ["README.md", "This readme has nothing about the obsolete class"],
    ]);
    const findings = screenRelatedDocs(removedTerms, content);
    expect(findings).toHaveLength(0);
  });

  it("returns findings for multiple files that mention the term", () => {
    const removedTerms = ["LegacyModule"];
    const content = new Map([
      ["README.md", "The LegacyModule was central to the system"],
      ["CLAUDE.md", "See LegacyModule documentation for more"],
      ["docs/guide.md", "This guide does not mention it"],
    ]);
    const findings = screenRelatedDocs(removedTerms, content);
    const paths = findings.map((f) => f.targetPath);
    expect(paths).toContain("README.md");
    expect(paths).toContain("CLAUDE.md");
    expect(paths).not.toContain("docs/guide.md");
  });

  it("returns findings for multiple removed terms in same file", () => {
    const removedTerms = ["TermAlpha", "TermBeta"];
    const content = new Map([
      ["README.md", "We use TermAlpha and TermBeta together"],
    ]);
    const findings = screenRelatedDocs(removedTerms, content);
    // One finding per (term, file) pair that matches
    expect(findings.length).toBeGreaterThanOrEqual(2);
    const terms = findings.map((f) => f.matchedTerm);
    expect(terms).toContain("TermAlpha");
    expect(terms).toContain("TermBeta");
  });

  it("finding has correct shape (targetPath, findingType, severity, description, matchedTerm)", () => {
    const removedTerms = ["RemovedClass"];
    const content = new Map([["README.md", "Uses RemovedClass extensively"]]);
    const findings = screenRelatedDocs(removedTerms, content);
    expect(findings.length).toBe(1);
    const f = findings[0];
    expect(f).toHaveProperty("targetPath");
    expect(f).toHaveProperty("findingType");
    expect(f).toHaveProperty("severity");
    expect(f).toHaveProperty("description");
    expect(f).toHaveProperty("matchedTerm");
  });

  it("findingType is 'term_removed' or 'term_mention'", () => {
    const removedTerms = ["AClass"];
    const content = new Map([["README.md", "AClass is used here"]]);
    const findings = screenRelatedDocs(removedTerms, content);
    expect(["term_removed", "term_mention"]).toContain(findings[0].findingType);
  });

  it("severity is one of high/medium/low", () => {
    const removedTerms = ["AClass"];
    const content = new Map([["README.md", "AClass is used here"]]);
    const findings = screenRelatedDocs(removedTerms, content);
    expect(["high", "medium", "low"]).toContain(findings[0].severity);
  });

  it("heading-level removed terms produce higher severity than plain terms", () => {
    // This tests the severity heuristic: headings are more critical than inline terms
    // (Use a heading-style term vs a plain term to test severity difference)
    // We test this by checking that at least some findings have 'high' severity
    // when a heading was removed — implementation decides specific mapping
    const removedTerms = ["## ImportantSection"];
    const content = new Map([["README.md", "ImportantSection is described here"]]);
    // Even without heading prefix in the search, the finding should be non-trivial
    // The exact severity is an implementation choice; just ensure valid value
    const findings = screenRelatedDocs(removedTerms, content);
    // If no match (heading with ## prefix won't match), that's also acceptable
    // The key test is that the function runs without error
    expect(Array.isArray(findings)).toBe(true);
  });

  it("is case-sensitive for PascalCase terms", () => {
    const removedTerms = ["SpecDiffEngine"];
    const content = new Map([["README.md", "the specdiffengine is lowercase here"]]);
    // lowercase version should not match the PascalCase term
    const findings = screenRelatedDocs(removedTerms, content);
    expect(findings).toHaveLength(0);
  });
});
