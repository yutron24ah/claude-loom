// covers: (this file tests the audit script itself — no qa-suite.js case ID)
// REQ: scripts/audit-qa-coverage.sh behavior verification via fixture-driven tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// Absolute path to the audit script from repo root
// __dirname = ui/test/scripts → up 3 levels → repo root
const REPO_ROOT = resolve(__dirname, '../../../');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/audit-qa-coverage.sh');

/**
 * Build a minimal qa-suite.js with the given case IDs.
 * Matches the real format: id: 'XXX-YY-NN'
 */
function buildQaSuiteJs(ids: string[]): string {
  const cases = ids
    .map(
      (id) => `  { id: '${id}', label: 'Test case ${id}', pri: 0, layers: ['ui'] },`
    )
    .join('\n');
  return `export const qaSuite = [\n${cases}\n];\n`;
}

/**
 * Build a test file that covers the given IDs via // covers: comment.
 * Supports comma-separated multiple IDs on one line.
 */
function buildTestFile(coverIds: string[]): string {
  if (coverIds.length === 0) return `// no covers\ndescribe('empty', () => {});\n`;
  const coversLine = `// covers: ${coverIds.join(', ')}`;
  return `${coversLine}\ndescribe('fixture test', () => {\n  it('passes', () => {});\n});\n`;
}

interface FixtureOptions {
  qaIds: string[];
  // Map from filename → list of covered IDs in that file
  coveredFiles: Record<string, string[]>;
  // Optional N/A allowlist entries (ID only, justification auto-added)
  naIds?: string[];
}

interface Fixture {
  dir: string;
  qaSuiteFile: string;
  testDir: string;
  naAllowlistFile: string;
  configsDir: string;
}

function createFixture(opts: FixtureOptions): Fixture {
  const dir = mkdtempSync(join(tmpdir(), 'qa-audit-test-'));

  // Create fixture qa-suite.js (placed at a known relative path)
  const qaSuiteFile = join(dir, 'qa-suite.js');
  writeFileSync(qaSuiteFile, buildQaSuiteJs(opts.qaIds));

  // Create test directory: ui/test/ (script searches here for // covers:)
  const testDir = join(dir, 'ui', 'test');
  mkdirSync(testDir, { recursive: true });
  for (const [filename, ids] of Object.entries(opts.coveredFiles)) {
    writeFileSync(join(testDir, filename), buildTestFile(ids));
  }

  // Create configs/ directory with qa-na-allowlist.txt
  const configsDir = join(dir, 'configs');
  mkdirSync(configsDir, { recursive: true });
  const naAllowlistFile = join(configsDir, 'qa-na-allowlist.txt');
  const naContent =
    `# QA Suite N/A allowlist\n` +
    `# Format: <CASE-ID>  # <justification>\n` +
    (opts.naIds ?? []).map((id) => `${id}  # test fixture N/A entry`).join('\n') +
    '\n';
  writeFileSync(naAllowlistFile, naContent);

  return { dir, qaSuiteFile, testDir, naAllowlistFile, configsDir };
}

function runScript(fixture: Fixture): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', [SCRIPT_PATH], {
    env: {
      ...process.env,
      // Override paths for fixture isolation
      QA_SUITE_PATH: fixture.qaSuiteFile,
      TEST_SEARCH_DIRS: fixture.testDir,
      NA_ALLOWLIST_PATH: fixture.naAllowlistFile,
    },
    encoding: 'utf-8',
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('audit-qa-coverage.sh', () => {
  let fixture: Fixture | null = null;

  afterEach(() => {
    if (fixture) {
      rmSync(fixture.dir, { recursive: true, force: true });
      fixture = null;
    }
  });

  // ── Scenario A: All cases covered → exit 0 ──────────────────────
  describe('Scenario A: all cases covered', () => {
    it('exits 0 when every qa-suite case ID has a // covers: ref', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02', 'EF-GH-01'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'AB-CD-02'],
          'test-b.ts': ['EF-GH-01'],
        },
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(0);
    });

    it('outputs a success summary when all cases are covered', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01'],
        coveredFiles: { 'test.ts': ['AB-CD-01'] },
      });
      const { exitCode, stdout } = runScript(fixture);
      expect(exitCode).toBe(0);
      // Should mention coverage count or "OK" / "pass" / "all"
      expect(stdout.toLowerCase()).toMatch(/all|pass|ok|covered/);
    });
  });

  // ── Scenario B: Partial coverage → exit 1 + missing listed ─────
  describe('Scenario B: partial coverage — exit 1 + missing IDs listed', () => {
    it('exits 1 when some cases are not covered', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02', 'AB-CD-03'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01'],
          // AB-CD-02, AB-CD-03 not covered
        },
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(1);
    });

    it('lists uncovered case IDs in output', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02', 'AB-CD-03'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01'],
        },
      });
      const { stdout } = runScript(fixture);
      expect(stdout).toContain('AB-CD-02');
      expect(stdout).toContain('AB-CD-03');
    });

    it('does NOT list covered cases as missing', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01'],
          // AB-CD-02 missing
        },
      });
      const { stdout } = runScript(fixture);
      expect(stdout).not.toContain('AB-CD-01');
    });

    it('excludes N/A allowlisted cases from the missing list', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02', 'AB-CD-03'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01'],
          // AB-CD-02 is N/A, AB-CD-03 is genuinely missing
        },
        naIds: ['AB-CD-02'],
      });
      const { exitCode, stdout } = runScript(fixture);
      // AB-CD-03 is still missing → fail
      expect(exitCode).toBe(1);
      expect(stdout).toContain('AB-CD-03');
      expect(stdout).not.toContain('AB-CD-02');
    });

    it('exits 0 when all uncovered cases are in N/A allowlist', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01'],
        },
        naIds: ['AB-CD-02'],
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(0);
    });
  });

  // ── Scenario C: Orphan covers (ID not in qa-suite) → exit 1 ────
  describe('Scenario C: orphan // covers: refs → exit 1 + orphans listed', () => {
    it('exits 1 when a test file references a non-existent case ID', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'TYPO-CASE-99'], // TYPO-CASE-99 not in qa-suite.js
        },
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(1);
    });

    it('lists orphan case IDs in output', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'TYPO-CASE-99'],
        },
      });
      const { stdout } = runScript(fixture);
      expect(stdout).toContain('TYPO-CASE-99');
    });

    it('does not list valid covers as orphans', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'TYPO-CASE-99'],
        },
      });
      const { stdout } = runScript(fixture);
      expect(stdout).not.toContain('AB-CD-01');
    });

    it('exits 1 on orphan even if all qa-suite cases are otherwise covered', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'AB-CD-02', 'OLD-REMOVED-01'],
        },
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(1);
    });
  });

  // ── Edge: multi-ID covers line ───────────────────────────────────
  describe('multi-ID covers on a single line', () => {
    it('handles comma-separated IDs on one covers line', () => {
      fixture = createFixture({
        qaIds: ['AB-CD-01', 'AB-CD-02', 'AB-CD-03'],
        coveredFiles: {
          'test-a.ts': ['AB-CD-01', 'AB-CD-02', 'AB-CD-03'], // all on one line via buildTestFile
        },
      });
      const { exitCode } = runScript(fixture);
      expect(exitCode).toBe(0);
    });
  });
});
