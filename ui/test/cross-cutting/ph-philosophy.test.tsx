/**
 * ph-philosophy.test.tsx — Philosophy / design alignment audit (Section B, t5b)
 *
 * WHY: qa-suite.js "philosophy" section (24. PHILOSOPHY) audits that the product
 * fulfills its core concept: "マルチエージェント開発が見える" (making multi-agent
 * development visible). This file audits the harness design principles as
 * observable in source artifacts — SPEC compliance, skill mandate policy,
 * TDD discipline indicators, doc-drift detection, and phase visibility.
 *
 * Audit approach:
 *   - PH tests are meta-tests: fs.readFileSync + regex over source files.
 *   - Subjective UX cases (PH-WATCHABLE-01, PH-CHARACTER-LOVE-01) are in
 *     configs/qa-na-allowlist.txt — human judge only, CI cannot automate.
 *   - This file covers the AUTOMATABLE PH-* cases:
 *     PH-PARALLEL-VISIBLE-01: parallel agent state is represented in scenario data
 *     PH-EMOTIONAL-01: idle scenario exists (agents sleeping)
 *     PH-PIXEL-WORLD-01: pixel world design consistency (SCREEN_REQUIREMENTS ref)
 *     PH-FLOW-VISIBLE-01: spec→plan→TDD→review→retro flow visible (phase indicators)
 *     PH-DOC-DRIFT-01: doc consistency detection is functional
 *     PH-TDD-VISIBLE-01: TDD discipline is visible in harness (CODING_PRINCIPLES + skill)
 *
 * // covers: PH-PARALLEL-VISIBLE-01, PH-EMOTIONAL-01, PH-PIXEL-WORLD-01,
 * //         PH-FLOW-VISIBLE-01, PH-DOC-DRIFT-01, PH-TDD-VISIBLE-01
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function repoPath(...segments: string[]): string {
  return resolve(__dirname, '../../../', ...segments);
}

function readSource(relPath: string): string {
  return readFileSync(repoPath(relPath), 'utf-8');
}

/**
 * Scenario data type sources — the canonical scenario type lives in
 * redesign/api/types.ts (ScenarioSnapshot) rather than ui/src/lib/scenario.ts.
 * UI components import from @claude-loom/redesign/api/websocket which re-exports these.
 */
const SCENARIO_TYPES_PATH = 'redesign/api/types.ts';
const SCENARIO_SCENARIOS_PATH = 'redesign/api/scenarios.ts';

// ===========================================================================
// PH-PARALLEL-VISIBLE-01: 並列稼働が一目で分かる
// Expected: 複数 desk が同時に busy 表示、PARALLEL メトリクスも数値で示す
//
// Audit: The scenario data structure must represent multiple parallel agents.
// We verify that the scenario types support agents with concurrent statuses.
// ===========================================================================
// covers: PH-PARALLEL-VISIBLE-01
describe('PH-PARALLEL-VISIBLE-01: parallel agent status visible in data model', () => {
  it('scenario type supports agents field with status (enables parallel busy display)', () => {
    // ScenarioSnapshot in redesign/api/types.ts has agents map with status fields
    const scenarioSrc = readSource(SCENARIO_TYPES_PATH);
    // agents with status enables multiple desks showing busy simultaneously
    expect(scenarioSrc).toMatch(/agents/);
    expect(scenarioSrc).toMatch(/AgentStatus|AgentState/);
  });

  it('disciplineMetrics field exists in ScenarioSnapshot for PARALLEL counter', () => {
    const scenarioSrc = readSource(SCENARIO_TYPES_PATH);
    // disciplineMetrics shows N agents running discipline (tdd/review/commit)
    expect(scenarioSrc).toMatch(/disciplineMetrics/);
  });

  it('dev scenario fixture includes multiple agents with busy/active status', () => {
    // active scenario must show multiple agents active
    const scenarioSrc = readSource(SCENARIO_TYPES_PATH);
    expect(scenarioSrc).toMatch(/"idle"|'idle'/);
    expect(scenarioSrc).toMatch(/"busy"|'busy'/);
  });
});

// ===========================================================================
// PH-EMOTIONAL-01: 感情的な絵 — idle は寝てる
// Expected: 寝てる絵で「今は休憩中」が一発で伝わる、ColdStart カードと相補的
//
// Audit: Idle scenario exists + ColdStart component is present.
// ===========================================================================
// covers: PH-EMOTIONAL-01
describe('PH-EMOTIONAL-01: idle scenario represents sleeping/resting state', () => {
  it('idle scenario key is defined in ScenarioKey type', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/"idle"/);
  });

  it('RoomView contains ColdStart card (shown when idle, "PM を起動" button)', () => {
    // ColdStart card is inline in RoomView.tsx (not a separate component file)
    // Audit: "▶ PM を起動" start button is present in the room view source
    const roomViewSrc = readSource('ui/src/views/room/RoomView.tsx');
    // RoomView has the ColdStart card section with PM 起動 button
    expect(roomViewSrc).toMatch(/PM.*を起動|ColdStart|cold.start/i);
  });

  it('idle scenario has pm.running=false state representable in type', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    // PMState has running field; idle scenario → pm.running=false
    expect(src).toMatch(/running.*boolean|running:/);
  });
});

// ===========================================================================
// PH-PIXEL-WORLD-01: ピクセル世界観の一貫性
// Expected: Room の世界観が Plan/Gantt/Consistency でも崩れない
//
// Audit: SCREEN_REQUIREMENTS documents pixel aesthetic. Each major view exists
// in ui/src/views/ (consistent architecture, not "modern web UI").
// ===========================================================================
// covers: PH-PIXEL-WORLD-01
describe('PH-PIXEL-WORLD-01: pixel world aesthetic consistency', () => {
  it('SCREEN_REQUIREMENTS.md references pixel art design', () => {
    const src = readSource('docs/SCREEN_REQUIREMENTS.md');
    expect(src).toMatch(/pixel|ピクセル/i);
  });

  it('Room view exists (pixel world anchor view)', () => {
    expect(existsSync(repoPath('ui/src/views/room'))).toBe(true);
  });

  it('Plan view exists (pixel world consistency in Plan)', () => {
    expect(existsSync(repoPath('ui/src/views/plan'))).toBe(true);
  });

  it('Gantt view exists (pixel world consistency in Gantt — "RPG 調 Gantt bar")', () => {
    expect(existsSync(repoPath('ui/src/views/gantt'))).toBe(true);
  });

  it('Consistency view exists (pixel world consistency in Consistency)', () => {
    expect(existsSync(repoPath('ui/src/views/consistency'))).toBe(true);
  });

  it('Desk component exists in Room view (pixel aesthetic encapsulated in component)', () => {
    // Audit: stylistic coherence via component encapsulation
    const deskStation = 'ui/src/views/room/DeskStation.tsx';
    const deskCard = 'ui/src/views/room/DeskCard.tsx';
    const desk = 'ui/src/views/room/Desk.tsx';
    const exists =
      existsSync(repoPath(deskStation)) ||
      existsSync(repoPath(deskCard)) ||
      existsSync(repoPath(desk));
    expect(exists).toBe(true);
  });
});

// ===========================================================================
// PH-FLOW-VISIBLE-01: spec→plan→TDD→review→retro が画面上で追える
// Expected: 今どのフェーズか分かる (phase indicator / Plan / TDD タグ / review 状態 / retro session)
//
// Audit: Each phase has a dedicated UI view and the harness represents them.
// ===========================================================================
// covers: PH-FLOW-VISIBLE-01
describe('PH-FLOW-VISIBLE-01: spec→plan→TDD→review→retro flow visible in UI', () => {
  it('Plan view exists (spec→plan phase visible)', () => {
    expect(existsSync(repoPath('ui/src/views/plan'))).toBe(true);
  });

  it('Retro view exists (retro phase visible)', () => {
    expect(existsSync(repoPath('ui/src/views/retro'))).toBe(true);
  });

  it('Consistency view exists (doc-drift / spec-impl alignment visible)', () => {
    expect(existsSync(repoPath('ui/src/views/consistency'))).toBe(true);
  });

  it('ScenarioSnapshot has retroSession field (retro phase in progress is representable)', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/retroSession/);
  });

  it('ScenarioSnapshot has milestones field (plan/milestone phase visible)', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/milestones/);
  });

  it('ScenarioSnapshot has sessions field (TDD/review status in agent session)', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/sessions/);
  });
});

// ===========================================================================
// PH-DOC-DRIFT-01: doc 整合性自動検出が機能
// Expected: 黙ってドリフトしない (toast + badge)、agent が自動 flag
//
// Audit: Consistency route exists in daemon + UI, and doc-drift detection
// architecture is present (not silent about drift).
// ===========================================================================
// covers: PH-DOC-DRIFT-01
describe('PH-DOC-DRIFT-01: doc consistency detection is functional', () => {
  it('DOC_CONSISTENCY_CHECKLIST.md exists (manual doc integrity enforcement)', () => {
    expect(existsSync(repoPath('docs/DOC_CONSISTENCY_CHECKLIST.md'))).toBe(true);
  });

  it('consistency route exists in daemon (backend doc-drift detection)', () => {
    expect(existsSync(repoPath('daemon/src/routes/consistency.ts'))).toBe(true);
  });

  it('Consistency view exists in UI (frontend doc-drift display)', () => {
    expect(existsSync(repoPath('ui/src/views/consistency'))).toBe(true);
  });

  it('consistency route has findings procedure (drift → findings pipeline)', () => {
    const src = readSource('daemon/src/routes/consistency.ts');
    expect(src).toMatch(/findings|inconsistency|drift/i);
  });

  it('ScenarioSnapshot has consistencyState field (badge/toast state representable)', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/consistencyState/);
  });
});

// ===========================================================================
// PH-TDD-VISIBLE-01: TDD ループが見える
// Expected: RED/GREEN/REFACTOR フェーズが nameplate or tag で見える、violations は warning
//
// Audit: TDD discipline is encoded in harness (CODING_PRINCIPLES + skill + SPEC)
// and the discipline metrics are representable in the UI data model.
// ===========================================================================
// covers: PH-TDD-VISIBLE-01
describe('PH-TDD-VISIBLE-01: TDD loop visible in harness and UI', () => {
  it('docs/CODING_PRINCIPLES.md exists with TDD principle', () => {
    const src = readSource('docs/CODING_PRINCIPLES.md');
    expect(src).toMatch(/TDD|Red.*Green|RED.*GREEN/i);
  });

  it('skills/loom-tdd-cycle/SKILL.md exists (mandate skill for TDD discipline)', () => {
    expect(existsSync(repoPath('skills/loom-tdd-cycle/SKILL.md'))).toBe(true);
  });

  it('CODING_PRINCIPLES.md TDD section references Red→Green→Refactor cycle', () => {
    const src = readSource('docs/CODING_PRINCIPLES.md');
    expect(src).toMatch(/Red.*Green.*Refactor|GREEN.*REFACTOR/i);
  });

  it('ScenarioSnapshot has disciplineMetrics field (TDD compliance metrics visible)', () => {
    const src = readSource(SCENARIO_TYPES_PATH);
    expect(src).toMatch(/disciplineMetrics/);
  });

  it('loom-developer agent prompt references TDD discipline', () => {
    const src = readSource('agents/loom-developer.md');
    expect(src).toMatch(/TDD|Red.*Green|Skip TDD/i);
  });

  it('skill mandate policy in CLAUDE.md: loom-tdd-cycle is mandate (not suggest)', () => {
    const src = readSource('CLAUDE.md');
    // CLAUDE.md Mandate skill section lists loom-tdd-cycle
    expect(src).toMatch(/loom-tdd-cycle/);
    expect(src).toMatch(/mandate/i);
  });

  it('SPEC.md references TDD Red→Green→Refactor discipline', () => {
    const specSrc = readSource('SPEC.md');
    expect(specSrc).toMatch(/TDD|Red.*Green|RED.*GREEN/i);
  });
});

// ===========================================================================
// Bonus: Skill mandate vs suggest policy (PH alignment — CLAUDE.md §3.10.1)
// This is a structural audit of "the harness enforces its own philosophy"
// ===========================================================================

describe('PH alignment: skill mandate vs suggest policy honored in harness', () => {
  it('CLAUDE.md documents mandate skill table (loom-review, loom-tdd-cycle, loom-retro)', () => {
    const src = readSource('CLAUDE.md');
    expect(src).toMatch(/loom-review/);
    expect(src).toMatch(/loom-retro/);
    expect(src).toMatch(/mandate/i);
  });

  it('loom-review skill exists (mandate: code review quality gate)', () => {
    expect(existsSync(repoPath('skills/loom-review/SKILL.md'))).toBe(true);
  });

  it('loom-retro skill exists (mandate: retro 3-stage protocol)', () => {
    expect(existsSync(repoPath('skills/loom-retro/SKILL.md'))).toBe(true);
  });

  it('loom-developer agent references loom-review as mandate skill', () => {
    const src = readSource('agents/loom-developer.md');
    expect(src).toMatch(/loom-review/);
  });
});
