/**
 * REQ-062: LiveScenarioStore reducer unit tests.
 *
 * WHY: Phase 2 screens consume aggregated state via useScenario() → LiveScenarioStore.
 * Each reducer transforms an incoming WS event payload into an immutable snapshot update.
 * These tests verify the reducer logic in isolation, without a real WebSocket connection.
 *
 * Pattern: LiveScenarioStore is instantiated with the SCENARIOS.idle fixture as seed,
 * then individual applyXxx() methods are called directly (bypassing the WS layer).
 *
 * Covers:
 *   - applyAgentChange (regression — t0 implementation)
 *   - applyTodoChange
 *   - applyPlanChange
 *   - applyWorktreeChange
 *   - applyLearnedGuidanceChange
 *   - applyDisciplineMetricUpdate
 *   - applyApprovalRequest
 *   - applySessionChange
 *   - applyFindingNew
 */
import { describe, it, expect, beforeEach } from 'vitest';

// LiveScenarioStore is exported (export { LiveScenarioStore }) from websocket.ts
import { LiveScenarioStore } from '../../../redesign/api/websocket';

// SCENARIOS is the read-only fixture; we import it to seed the store.
// NOTE: scenarios.js is plain IIFE JS — in vitest/jsdom we need to import
// the esm-compatible redesign/scenarios.js path. Since scenarios.js registers
// window.SCENARIOS and exports nothing (it was written for script-tag usage),
// we manually construct a minimal seed that satisfies the Scenario shape.
const SEED_SCENARIO = {
  key: 'idle' as const,
  label: 'test',
  now: '12:00',
  conn: 'connected' as const,
  project: 'test-project',
  branch: 'main',
  agents: {
    dev: { status: 'idle' as const, lastSeenAt: '1分前' },
    pm:  { status: 'idle' as const, lastSeenAt: '2分前' },
  },
  todos: [
    { status: 'pending' as const, text: 'existing todo' },
  ],
  todosUpdatedAt: '11:59',
  milestones: [
    {
      id: 'M0.13',
      title: 'Test Milestone',
      progress: 0.5,
      count: '2/4',
      status: 'doing' as const,
      children: [
        { t: 'child task', st: 'in_progress' as const },
      ],
    },
  ],
  findings: [
    {
      id: 'F-01',
      sev: 'medium' as const,
      status: 'open' as const,
      file: 'docs/test.md',
      lines: 'L1',
      title: 'existing finding',
      detail: '',
      suggest: '',
      source: 'test',
    },
  ],
  worktrees: [
    {
      branch: 'main',
      path: '~/work/test',
      use: 'primary' as const,
      status: 'idle' as const,
      parentAgent: 'pm',
      diskMB: 100,
      locked: false,
      createdAt: '2026-01-01',
      lastCommit: 'initial',
    },
  ],
  stream: [],
  gantt: {
    windowLabel: '直近30min',
    nowPct: 90,
    rows: [],
  },
  retroSession: {
    id: 'retro-test',
    title: 'Test Retro',
    startedAt: '2026-01-01T00:00:00+09:00',
    durationSec: 0,
    verdict: 'PASS' as const,
    actionPlan: { immediate: 0, milestone: 0, deferred: 0 },
    lenses: [],
    transcript: [],
    findings: [],
  },
  guidance: [
    {
      agentId: 'dev',
      active: true,
      category: 'tdd' as const,
      from: 'retro-test',
      scope: 'user' as const,
      text: 'test guidance',
      addedAt: '2026-01-01',
      useCount: 1,
      ttl: 'permanent' as const,
    },
  ],
  customization: {},
  disciplineMetrics: {
    parallel: 0.5,
    taskTool: 'ok' as const,
    taskToolLabel: 'OK',
    tddViolations: 0,
    verdict: 'PASS' as const,
  },
  consistencyState: 'empty' as const,
  sessions: [],
  tokens: {
    period: '直近7days',
    byAgent: [],
    daily: [],
  },
  settings: {
    daemonPort: 5757,
    worktreeBase: '~/wt',
    retroSchedule: { enabled: false, cron: '', label: '' },
    consistencyScope: [],
    hooks: { preToolUse: false, postToolUse: false, subagentStop: false },
    logRetention: { days: 30 },
    defaultReviewers: [],
    parallelLimit: 4,
  },
  pricing: {
    opus:   { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
    sonnet: { input: 3,  output: 15, cacheWrite: 3.75,  cacheRead: 0.3 },
    haiku:  { input: 0.8, output: 4, cacheWrite: 1,     cacheRead: 0.08 },
  },
  pm: {
    running: false,
    messages: [],
    pendingApprovals: [],
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('LiveScenarioStore reducers', () => {
  let store: LiveScenarioStore;

  beforeEach(() => {
    store = new LiveScenarioStore(SEED_SCENARIO);
  });

  // -------------------------------------------------------------------------
  // applyAgentChange — regression test (t0 动作維持)
  // -------------------------------------------------------------------------
  it('applyAgentChange — 既存 agent の status を更新する (regression test、t0 動作維持)', () => {
    store.applyAgentChange({
      agentId: 'dev',
      status: 'busy',
      metadata: { currentTool: 'Edit', currentReasoning: 'writing test', lastSeenAt: 'now' },
    });
    const snap = store.getSnapshot();
    expect(snap.agents['dev'].status).toBe('busy');
    expect(snap.agents['dev'].currentTool).toBe('Edit');
    expect(snap.agents['dev'].currentReasoning).toBe('writing test');
    expect(snap.agents['dev'].lastSeenAt).toBe('now');
  });

  // -------------------------------------------------------------------------
  // applyTodoChange
  // -------------------------------------------------------------------------
  it('applyTodoChange — snapshot.todos を payload.todos で置換し、todosUpdatedAt を更新する', () => {
    const newTodos = [
      { status: 'in_progress' as const, text: 'new task A' },
      { status: 'completed' as const,   text: 'new task B' },
    ];
    store.applyTodoChange({
      sessionId: 'sess-001',
      todos: newTodos,
    });
    const snap = store.getSnapshot();
    // todos replaced entirely (not merged)
    expect(snap.todos).toEqual(newTodos);
    expect(snap.todos).toHaveLength(2);
    // todosUpdatedAt updated
    expect(snap.todosUpdatedAt).toBe('now');
  });

  // -------------------------------------------------------------------------
  // applyPlanChange
  // -------------------------------------------------------------------------
  it('applyPlanChange — milestone children の status を更新する', () => {
    // The milestone M0.13 exists; update child "child task" via itemId match
    // Since the spec says: scan milestones[], id==itemId match → update status;
    // no match → append to milestones[0].children
    store.applyPlanChange({
      itemId: 'M0.13',
      projectId: 'test-project',
      status: 'done',
      title: 'Test Milestone',
    });
    const snap = store.getSnapshot();
    const m = snap.milestones.find(m => m.id === 'M0.13');
    expect(m).toBeDefined();
    expect(m?.status).toBe('done');
  });

  it('applyPlanChange — 該当 milestone なしの場合、milestones[0].children に append する', () => {
    const beforeChildCount = store.getSnapshot().milestones[0].children.length;
    store.applyPlanChange({
      itemId: 'NONEXISTENT',
      projectId: 'test-project',
      status: 'todo',
      title: 'New Child Task',
    });
    const snap = store.getSnapshot();
    const afterChildCount = snap.milestones[0].children.length;
    expect(afterChildCount).toBe(beforeChildCount + 1);
    const lastChild = snap.milestones[0].children[afterChildCount - 1];
    expect(lastChild.t).toBe('New Child Task');
    expect(lastChild.st).toBe('pending'); // todo → pending
  });

  // -------------------------------------------------------------------------
  // applyWorktreeChange
  // -------------------------------------------------------------------------
  it('applyWorktreeChange — created で worktree が増え、removed で減る', () => {
    const beforeCount = store.getSnapshot().worktrees.length;

    // created
    store.applyWorktreeChange({
      projectId: 'test-project',
      action: 'created',
      path: '~/wt/new-branch',
      branch: 'feat/new',
    });
    expect(store.getSnapshot().worktrees).toHaveLength(beforeCount + 1);
    const newWt = store.getSnapshot().worktrees.find(w => w.path === '~/wt/new-branch');
    expect(newWt).toBeDefined();
    expect(newWt?.branch).toBe('feat/new');
    expect(newWt?.locked).toBe(false);

    // removed
    store.applyWorktreeChange({
      projectId: 'test-project',
      action: 'removed',
      path: '~/wt/new-branch',
    });
    expect(store.getSnapshot().worktrees).toHaveLength(beforeCount);
    expect(store.getSnapshot().worktrees.find(w => w.path === '~/wt/new-branch')).toBeUndefined();
  });

  it('applyWorktreeChange — locked/unlocked で locked フラグが切り替わる', () => {
    // lock the primary worktree
    store.applyWorktreeChange({
      projectId: 'test-project',
      action: 'locked',
      path: '~/work/test',
    });
    expect(store.getSnapshot().worktrees.find(w => w.path === '~/work/test')?.locked).toBe(true);

    // unlock it
    store.applyWorktreeChange({
      projectId: 'test-project',
      action: 'unlocked',
      path: '~/work/test',
    });
    expect(store.getSnapshot().worktrees.find(w => w.path === '~/work/test')?.locked).toBe(false);
  });

  // -------------------------------------------------------------------------
  // applyLearnedGuidanceChange
  // -------------------------------------------------------------------------
  it('applyLearnedGuidanceChange — toggled / deleted の両 path で snapshot.guidance が変化する', () => {
    // seed has: agentId='dev', active=true, guidanceId needs to match id field
    // The spec says: match agentId==agentName AND id (guidanceId-derived id field) match
    // We need to add an id field to guidance. Let's check what the spec says about the id field.
    // The spec says: "snapshot.guidance[] の agentId==agentName かつ id (guidanceId 由来 id field) match"
    // GuidanceItem in types.ts doesn't have an id field. We need to add one.
    // For now, let's test the toggle path — toggling active on a guidance item
    // The guidance item in seed has no id field yet; we'll use the from field as id for matching
    // Actually, per the spec task: "id (guidanceId 由来 id field)" implies the reducer
    // needs to find a match using guidanceId against the item's id field.
    // Let's add a guidance item with a known id to test with.

    // The reducer needs a way to match. We'll test the deleted path by finding by agentName
    // and the toggled path. First let's check what the implementation will do.
    // Per spec: "snapshot.guidance[] の agentId==agentName かつ id (guidanceId 由来 id field) match"
    // This implies GuidanceItem has an optional id field (or we use a derived field).

    // For test purposes: let's call toggle with agentName='dev' and guidanceId='g-001'
    // The seed guidance item for 'dev' doesn't have an id; reducer should skip if no match.
    // Add a guidance item WITH an id to the store snapshot first.

    // We'll test the observable behavior:
    // 1) toggled with active=false → active becomes false
    // 2) deleted → guidance entry removed

    // Use a store with a guidance item that has an id
    const storeWithId = new LiveScenarioStore({
      ...SEED_SCENARIO,
      guidance: [
        {
          ...SEED_SCENARIO.guidance[0],
          // @ts-expect-error id is not in GuidanceItem type yet; reducer will add it
          id: 'g-001',
          agentId: 'dev',
          active: true,
        },
      ],
    });

    // toggled: active=false
    storeWithId.applyLearnedGuidanceChange({
      scope: 'user',
      agentName: 'dev',
      guidanceId: 'g-001',
      action: 'toggled',
      active: false,
    });
    const afterToggle = storeWithId.getSnapshot().guidance;
    expect(afterToggle).toHaveLength(1);
    expect(afterToggle[0].active).toBe(false);

    // deleted
    storeWithId.applyLearnedGuidanceChange({
      scope: 'user',
      agentName: 'dev',
      guidanceId: 'g-001',
      action: 'deleted',
    });
    expect(storeWithId.getSnapshot().guidance).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // applyDisciplineMetricUpdate
  // -------------------------------------------------------------------------
  it('applyDisciplineMetricUpdate — parallel / tddViolations の更新が反映され、unknown metric は無視される', () => {
    store.applyDisciplineMetricUpdate({
      projectId: 'test-project',
      metric: 'parallel',
      value: 0.75,
      timestamp: Date.now(),
    });
    expect(store.getSnapshot().disciplineMetrics.parallel).toBe(0.75);

    store.applyDisciplineMetricUpdate({
      projectId: 'test-project',
      metric: 'tddViolations',
      value: 3.7,  // should be integerized
      timestamp: Date.now(),
    });
    expect(store.getSnapshot().disciplineMetrics.tddViolations).toBe(3);  // Math.trunc(3.7)

    // unknown metric — snapshot unchanged
    const snapBefore = store.getSnapshot().disciplineMetrics;
    store.applyDisciplineMetricUpdate({
      projectId: 'test-project',
      metric: 'unknownMetric',
      value: 999,
      timestamp: Date.now(),
    });
    // disciplineMetrics object ref may change (immutable update) but values unchanged
    expect(store.getSnapshot().disciplineMetrics.parallel).toBe(0.75);
    expect(store.getSnapshot().disciplineMetrics.tddViolations).toBe(3);
  });

  // -------------------------------------------------------------------------
  // applyApprovalRequest
  // -------------------------------------------------------------------------
  it('applyApprovalRequest — pendingApprovals に append され、risk 判定が high / med / low に分岐する', () => {
    // high risk: git push --force
    store.applyApprovalRequest({
      eventId: 1,
      sessionId: 'sess-001',
      toolName: 'Bash',
      metadata: { args: 'git push origin main --force' },
    });
    const afterHigh = store.getSnapshot().pm.pendingApprovals;
    expect(afterHigh).toHaveLength(1);
    expect(afterHigh[0].risk).toBe('high');
    expect(afterHigh[0].tool).toBe('Bash');
    expect(afterHigh[0].id).toBe('1');

    // med risk: sudo
    store.applyApprovalRequest({
      eventId: 2,
      sessionId: 'sess-001',
      toolName: 'Bash',
      metadata: { args: 'sudo apt-get install something' },
    });
    const afterMed = store.getSnapshot().pm.pendingApprovals;
    expect(afterMed).toHaveLength(2);
    expect(afterMed[1].risk).toBe('med');

    // low risk: normal command
    store.applyApprovalRequest({
      eventId: 3,
      sessionId: 'sess-001',
      toolName: 'Read',
      metadata: { args: 'src/utils.ts' },
    });
    const afterLow = store.getSnapshot().pm.pendingApprovals;
    expect(afterLow).toHaveLength(3);
    expect(afterLow[2].risk).toBe('low');
  });

  // -------------------------------------------------------------------------
  // applySessionChange
  // -------------------------------------------------------------------------
  it('applySessionChange — started で session 増え、ended で verdict 更新される', () => {
    const beforeCount = store.getSnapshot().sessions.length;

    // started
    store.applySessionChange({
      sessionId: 'new-sess-001',
      action: 'started',
      projectId: 'test-project',
      role: 'dev',
    });
    const afterStart = store.getSnapshot().sessions;
    expect(afterStart).toHaveLength(beforeCount + 1);
    // new session appears at head
    expect(afterStart[0].id).toBe('new-sess-001');
    expect(afterStart[0].agentRoot).toBe('dev');
    expect(afterStart[0].verdict).toBe('PASS');

    // ended with status=failed → verdict becomes FAIL
    store.applySessionChange({
      sessionId: 'new-sess-001',
      action: 'ended',
      status: 'failed',
    });
    const afterEnd = store.getSnapshot().sessions;
    const found = afterEnd.find(s => s.id === 'new-sess-001');
    expect(found?.verdict).toBe('FAIL');
  });

  // -------------------------------------------------------------------------
  // applyFindingNew
  // -------------------------------------------------------------------------
  it('applyFindingNew — findings に append され、severity 順 sort される', () => {
    // seed has 1 medium finding. Add a high and a low to verify sort order.
    store.applyFindingNew({
      findingId: 'F-HIGH',
      severity: 'high',
      targetDoc: 'docs/SPEC.md',
      message: 'High severity finding',
    });
    store.applyFindingNew({
      findingId: 'F-LOW',
      severity: 'low',
      targetDoc: 'docs/README.md',
      message: 'Low severity finding',
    });

    const findings = store.getSnapshot().findings;
    // We now have: 1 original medium + 1 high + 1 low = 3
    expect(findings.length).toBeGreaterThanOrEqual(3);

    // Severity sort: high first, then medium, then low
    const severityOrder = { high: 0, medium: 1, low: 2 };
    for (let i = 0; i < findings.length - 1; i++) {
      expect(severityOrder[findings[i].sev]).toBeLessThanOrEqual(severityOrder[findings[i + 1].sev]);
    }

    // Check appended fields
    const highFinding = findings.find(f => f.id === 'F-HIGH');
    expect(highFinding).toBeDefined();
    expect(highFinding?.sev).toBe('high');
    expect(highFinding?.status).toBe('open');
    expect(highFinding?.title).toBe('High severity finding');
    expect(highFinding?.file).toBe('docs/SPEC.md');
    expect(highFinding?.source).toBe('ws.live (now)');
  });
});

// ============================================================================
// M0.15 t13 — REQ-074: PM chat reducers (applyPmMessage / applyPmPermissionRequest /
// applyPmPermissionResolved)
// ============================================================================

describe('applyPmMessage — M0.15 t13 REQ-074', () => {
  let store: LiveScenarioStore;

  beforeEach(() => {
    store = new LiveScenarioStore(SEED_SCENARIO);
  });

  it('appends a pm message to snapshot.pm.messages', () => {
    store.applyPmMessage({ who: 'pm', text: 'task を dispatch します', ts: '14:23' });
    const { pm } = store.getSnapshot();
    expect(pm.messages).toHaveLength(1);
    expect(pm.messages[0].who).toBe('pm');
    expect(pm.messages[0].text).toBe('task を dispatch します');
    expect(pm.messages[0].ts).toBe('14:23');
  });

  it('appends multiple messages in order', () => {
    store.applyPmMessage({ who: 'user', text: '実装お願いします', ts: '14:20' });
    store.applyPmMessage({ who: 'pm', text: '了解しました', ts: '14:21' });
    const { messages } = store.getSnapshot().pm;
    expect(messages).toHaveLength(2);
    expect(messages[0].who).toBe('user');
    expect(messages[1].who).toBe('pm');
  });

  it('does not mutate other pm fields when adding a message', () => {
    const before = store.getSnapshot().pm;
    store.applyPmMessage({ who: 'pm', text: 'hello', ts: '10:00' });
    const after = store.getSnapshot().pm;
    // running and pendingApprovals unchanged
    expect(after.running).toBe(before.running);
    expect(after.pendingApprovals).toEqual(before.pendingApprovals);
  });
});

describe('applyPmPermissionRequest — M0.15 t13 REQ-074', () => {
  let store: LiveScenarioStore;

  beforeEach(() => {
    store = new LiveScenarioStore(SEED_SCENARIO);
  });

  it('appends a permission request to snapshot.pm.pendingApprovals', () => {
    store.applyPmPermissionRequest({
      id: 'req-001',
      tool: 'Bash',
      args: 'git push --force',
      risk: 'high',
      from: 'loom-developer',
    });
    const { pendingApprovals } = store.getSnapshot().pm;
    expect(pendingApprovals).toHaveLength(1);
    expect(pendingApprovals[0].id).toBe('req-001');
    expect(pendingApprovals[0].tool).toBe('Bash');
    expect(pendingApprovals[0].risk).toBe('high');
    expect(pendingApprovals[0].from).toBe('loom-developer');
  });

  it('stacks multiple pending approvals (stackable toasts)', () => {
    store.applyPmPermissionRequest({ id: 'r1', tool: 'Read', args: 'file.ts', risk: 'low', from: 'dev' });
    store.applyPmPermissionRequest({ id: 'r2', tool: 'Bash', args: 'sudo apt', risk: 'med', from: 'dev' });
    expect(store.getSnapshot().pm.pendingApprovals).toHaveLength(2);
  });

  it('does not affect pm.messages when a permission request arrives', () => {
    const msgsBefore = store.getSnapshot().pm.messages.length;
    store.applyPmPermissionRequest({ id: 'r1', tool: 'Read', args: 'x', risk: 'low', from: 'dev' });
    expect(store.getSnapshot().pm.messages).toHaveLength(msgsBefore);
  });
});

describe('applyPmPermissionResolved — M0.15 t13 REQ-074', () => {
  let store: LiveScenarioStore;

  beforeEach(() => {
    // Seed with one pending approval already in the store
    store = new LiveScenarioStore({
      ...SEED_SCENARIO,
      pm: {
        running: true,
        messages: [],
        pendingApprovals: [
          { id: 'req-001', tool: 'Bash', args: 'rm -rf /tmp/test', risk: 'high', from: 'dev' },
          { id: 'req-002', tool: 'Read', args: 'src/main.ts', risk: 'low', from: 'dev' },
        ],
      },
    });
  });

  it('removes the resolved approval from pendingApprovals by id', () => {
    store.applyPmPermissionResolved({ id: 'req-001', allow: true });
    const { pendingApprovals } = store.getSnapshot().pm;
    expect(pendingApprovals).toHaveLength(1);
    expect(pendingApprovals[0].id).toBe('req-002');
  });

  it('removes rejected (allow=false) approval from pendingApprovals too', () => {
    store.applyPmPermissionResolved({ id: 'req-002', allow: false });
    const { pendingApprovals } = store.getSnapshot().pm;
    expect(pendingApprovals).toHaveLength(1);
    expect(pendingApprovals[0].id).toBe('req-001');
  });

  it('is a no-op when id does not match any pending approval', () => {
    store.applyPmPermissionResolved({ id: 'nonexistent', allow: true });
    expect(store.getSnapshot().pm.pendingApprovals).toHaveLength(2);
  });
});
