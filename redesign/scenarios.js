// =============================================================
// scenarios.js — design-time data contract + fixtures
// =============================================================
// This file is the SHARED source of truth for the redesign mock.
// Each screen file consumes a slice of it via `useScenario()`.
//
// In production, `useScenario()` is replaced by a real hook that
// reduces the daemon WS event stream into the same shape:
//
//   agents             ← agent.change events  (daemon/src/events/types.ts)
//   todos              ← todo.change          (TodoWrite tool)
//   milestones         ← plan.change          (PLAN.md plan_items)
//   findings           ← finding.new          (consistency_check skill output)
//   worktrees          ← worktree.change + git worktree list scan
//   stream             ← merged tail: assistant text + PreToolUse / PostToolUse hooks
//   gantt              ← derived from agent_history (start/end of each dispatch)
//   retroSession       ← retro/<id>/session.jsonl
//   guidance           ← agents/<id>/learned-guidance.md
//   customization      ← user_prefs.json + project.json overrides
//   disciplineMetrics  ← derived from agent_history (parallel%, TDD violations…)
//
// Plain JS, no Babel — loaded via <script src> so all screens see it.
// =============================================================

(function () {
  const STATUS_COLOR = {
    idle:      "var(--p-stone)",
    busy:      "var(--p-success)",
    review:    "var(--p-accent)",
    failed:    "var(--p-error)",
    completed: "var(--p-success)",
  };

  // Compact ROSTER reference. Full per-agent metadata lives in cat.jsx (window.ROSTER).
  // We re-key it here for quick lookup by id.
  function indexRoster() {
    const r = window.ROSTER || [];
    const by = {};
    r.forEach(a => { by[a.id] = a; });
    return by;
  }

  // -----------------------------------------------------------
  // Shared milestones / todos / findings (used by multiple screens)
  // -----------------------------------------------------------
  const MILESTONES_BASE = [
    { id: "M0.13", title: "Process Discipline metrics", progress: 0.55, count: "3/7", status: "doing",
      children: [
        { t: "discipline metrics 4種を header に表示", st: "completed" },
        { t: "TDD 順序 violation 検出 hook",          st: "in_progress" },
        { t: "retro 統合(履歴 drill-down)",           st: "pending" },
        { t: "consistency JSON tail watcher",         st: "pending" },
      ]},
    { id: "M0.14", title: "Phase 2 Entry Checklist",    progress: 0.0,  count: "0/4", status: "todo",
      children: [
        { t: "全 PJ 並列俯瞰レイアウト (Atrium)", st: "pending" },
        { t: "session archive 検索 UX",          st: "pending" },
        { t: "guidance ttl/decay",               st: "pending" },
        { t: "Phase 2 entry verdict",            st: "pending" },
      ]},
    { id: "M1.0",  title: "Phase 2 Kickoff",            progress: 0.0,  count: "0/12", status: "todo", children: [] },
  ];

  const FINDINGS_BASE = [
    { id: "F-12", sev: "high",   status: "open",
      file: "docs/SCREEN_REQUIREMENTS.md", lines: "L284-L298",
      title: "§3.6 ガント縦軸定義が SPEC §3.6.5 と矛盾",
      detail: "SCREEN_REQUIREMENTS は subagent 1 体 = 1 bar。SPEC は worktree 単位を想定。",
      suggest: "SPEC §3.6.5 を SubagentRow ベースに修正、worktree グループ化を §3.9 へ移管",
      source: "spec_diff (4h ago)" },
    { id: "F-11", sev: "high",   status: "ack",
      file: "agents/loom-developer.md", lines: "L42-L51",
      title: "Developer の TDD red 順序定義が CODING_PRINCIPLES と乖離",
      detail: "developer は test → impl → refactor の 3 段。原則は test → impl → refactor → review の 4 段。",
      suggest: "agent prompt に review 段階を追加し、reviewer dispatch 規定を明示",
      source: "spec_diff (yesterday)" },
    { id: "F-13", sev: "medium", status: "open",
      file: "hooks/post_tool.sh", lines: "L18",
      title: "post_tool hook が古い env var を参照",
      detail: "`CLAUDE_TOOL_NAME` は v0.11 で `CLAUDE_HOOK_TOOL` にリネーム済。",
      suggest: "env 名更新、または compat layer を skill 側で吸収",
      source: "spec_diff (1h ago)" },
    { id: "F-10", sev: "medium", status: "fixed",
      file: "docs/RETRO_GUIDE.md", lines: "L88",
      title: "retro lens 名称ゆらぎ (counter-arguer vs counter-argument)",
      detail: "用語ゆらぎ。codebase 全体 grep で 7 箇所。",
      suggest: "用語を counter-arguer に統一",
      source: "spec_diff (2d ago)" },
    { id: "F-09", sev: "low",    status: "dismissed",
      file: "skills/loom-worktree/SKILL.md", lines: "L120",
      title: "worktree 5用途のうち1つ (hotfix) のサンプルが古い CLI 引数",
      detail: "`--branch` は v0.8 で `--from` にリネーム済。",
      suggest: "サンプル更新",
      source: "manual (you)" },
  ];

  const TODOS_BASE = [
    { status: "completed",   text: "M0.13 §3.6 ガント仕様確定" },
    { status: "in_progress", text: "TodoWrite mirror UI 結線" },
    { status: "pending",     text: "consistency JSON tail watcher" },
    { status: "pending",     text: "freee OAuth callback の error path 確認" },
  ];

  // -----------------------------------------------------------
  // Gantt — agent_history を 30min 窓で抜いたもの。
  // 1 row = 1 subagent dispatch (= 1 Task tool call の lifetime)
  // -----------------------------------------------------------
  // pct は now=100% を基準とした相対位置。
  const GANTT_BASE = {
    windowLabel: "直近 30min",
    nowPct: 96,
    rows: [
      // worktree-grouped, but each row is still 1 subagent
      { worktree: "main",            agentId: "pm",       label: "PM session",    bars: [{ s: 5, e: 96, kind: "busy" }], live: true },
      { worktree: "feat/oauth",      agentId: "dev",      label: "auth: spec",    bars: [{ s: 12, e: 38, kind: "busy" }, { s: 44, e: 74, kind: "tdd" }, { s: 76, e: 96, kind: "busy" }], live: true },
      { worktree: "feat/oauth",      agentId: "rev-code", label: "review PR #42", bars: [{ s: 40, e: 56, kind: "review" }, { s: 70, e: 84, kind: "fail" }] },
      { worktree: "feat/oauth",      agentId: "rev-sec",  label: "secret scan",   bars: [{ s: 18, e: 34, kind: "review" }] },
      { worktree: "fix/test-flake",  agentId: "rev-test", label: "coverage",      bars: [{ s: 22, e: 48, kind: "review" }, { s: 60, e: 80, kind: "review" }] },
      { worktree: "main",            agentId: "retro-agg",label: "retro summary", bars: [{ s: 86, e: 96, kind: "busy" }], live: true },
    ],
  };

  // -----------------------------------------------------------
  // Retro session — multi-turn AI playback artifact
  // -----------------------------------------------------------
  const RETRO_SESSION_BASE = {
    id: "retro-2026-04-29",
    title: "Retro #M0.12 — 2026-04-29",
    startedAt: "2026-04-29T17:30:00+09:00",
    durationSec: 1820,
    verdict: "PASS",
    actionPlan: { immediate: 3, milestone: 4, deferred: 1 },
    // 4 lens cards
    lenses: [
      { id: "retro-pj",      lensName: "PJ Judge",      count: 3, sev: ["high", "med", "low"] },
      { id: "retro-proc",    lensName: "Process Judge", count: 2, sev: ["high", "med"] },
      { id: "retro-meta",    lensName: "Meta Judge",    count: 1, sev: ["med"] },
      { id: "user",          lensName: "User Lens",     count: 2, sev: ["high", "low"], isUser: true },
    ],
    // session.jsonl のサンプル — judge 発言 + 反論 + 集約
    transcript: [
      { ts: 0,    who: "retro-pm",      kind: "intro",   text: "M0.12 振り返り、開始しまーす。" },
      { ts: 45,   who: "retro-research", kind: "report", text: "発射回数 14 件、並列度 47%、verdict pass 率 82%、tdd 違反 1 件。" },
      { ts: 120,  who: "retro-pj",      kind: "finding", refId: "R-3", sev: "high", text: "PR #42 の verdict が証拠不足。reviewer の出典が agent prompt 由来のみ。" },
      { ts: 180,  who: "retro-proc",    kind: "finding", refId: "R-1", sev: "high", text: "TDD red 順序が auth.test.ts:42 で 1 commit 飛んでる。" },
      { ts: 240,  who: "retro-counter", kind: "rebuttal", text: "R-1 は誤検知の可能性。post-merge の squash で順序が消えてるだけかも。" },
      { ts: 300,  who: "retro-meta",    kind: "finding", refId: "R-2", sev: "med", text: "reviewer の personality が project と user で混ざってる。" },
      { ts: 380,  who: "user",          kind: "finding", refId: "R-4", sev: "high", text: "並列度がここ 3 日で 60% → 40%。Task tool の dispatch が逐次化してる。" },
      { ts: 440,  who: "retro-counter", kind: "rebuttal", text: "R-3 の証拠不足は reviewer prompt の問題ではなく PR 側の diff 提示の問題では?" },
      { ts: 510,  who: "retro-agg",     kind: "verdict", text: "verdict: PASS。R-1, R-3, R-4 は IMMEDIATE。R-2 は MILESTONE。" },
    ],
    // findings = retro が産出した artifacts
    findings: [
      { id: "R-1", sev: "high", lens: "retro-proc", title: "TDD red 順序が 1 commit 飛んでる", target: "auth.test.ts:42", status: "open", category: "process" },
      { id: "R-3", sev: "high", lens: "retro-pj",   title: "PR #42 の verdict 証拠が薄い",      target: "PR #42",          status: "open", category: "review" },
      { id: "R-4", sev: "high", lens: "user",       title: "並列度が 3 日で 60% → 40%",         target: "metrics",         status: "open", category: "process" },
      { id: "R-2", sev: "med",  lens: "retro-meta", title: "reviewer personality が混ざってる", target: "config",          status: "deferred", category: "meta" },
    ],
  };

  // -----------------------------------------------------------
  // Guidance — agent ごとの学習記録
  // -----------------------------------------------------------
  const GUIDANCE_BASE = [
    { agentId: "dev",      active: true,  category: "tdd",      from: "retro-2026-04-25", scope: "user",
      text: "RED フェーズで test を書く前に impl を触らない。エディタを別 tab に分けて誤操作を防ぐ。",
      addedAt: "2026-04-25", useCount: 12, ttl: "permanent",
      diff: { before: "RED フェーズの test を書く。", after: "RED フェーズで test を書く前に impl を触らない。エディタを別 tab に分けて誤操作を防ぐ。" } },
    { agentId: "rev-code", active: true,  category: "review",   from: "retro-2026-04-22", scope: "project",
      text: "verdict には必ず参照行番号 (file:Lxx) を含める。曖昧な指摘は reject する。",
      addedAt: "2026-04-22", useCount: 8, ttl: "permanent" },
    { agentId: "rev-sec",  active: true,  category: "security", from: "finding-F-08",     scope: "project",
      text: "OAuth callback URL の検証は exact match のみ受理。prefix match は禁止。",
      addedAt: "2026-04-20", useCount: 3, ttl: "permanent" },
    { agentId: "rev-test", active: false, category: "test",     from: "retro-2026-04-15", scope: "user",
      text: "coverage 90% 未満は verdict 出さない。",
      addedAt: "2026-04-15", useCount: 5, ttl: "expired" },
    { agentId: "pm",       active: true,  category: "process",  from: "retro-2026-04-25", scope: "user",
      text: "並列発射可能な dispatch は必ず単一 Task call に同梱する。逐次発射は violation 扱い。",
      addedAt: "2026-04-25", useCount: 19, ttl: "permanent" },
  ];

  // -----------------------------------------------------------
  // Customization — per-agent model + personality
  // -----------------------------------------------------------
  const PRESETS = [
    { id: "default",         emoji: "😌", name: "Default",         desc: "標準。プロンプトは原型のまま。" },
    { id: "friendly-mentor", emoji: "🌱", name: "Friendly Mentor", desc: "やさしく褒める。初学者向け。" },
    { id: "strict-drill",    emoji: "💪", name: "Strict Drill",    desc: "厳しく指摘、根拠重視。" },
    { id: "detective",       emoji: "🔍", name: "Detective",       desc: "問いで深掘り。仮説検証型。" },
  ];
  const MODELS = [
    { id: "opus",   color: "var(--p-accent)" },
    { id: "sonnet", color: "var(--p-success)" },
    { id: "haiku",  color: "var(--p-stone)" },
  ];
  // For each agent: effective settings + the override chain that produced it.
  // chain order = user-default → user-prefs → project override → effective.
  const CUSTOMIZATION_BASE = {
    pm:             { effective: { model: "opus",   preset: "default" },         chain: [{ scope: "default", model: "opus", preset: "default" }] },
    dev:            { effective: { model: "sonnet", preset: "friendly-mentor" }, chain: [
                       { scope: "default",  model: "sonnet", preset: "default" },
                       { scope: "project",  preset: "friendly-mentor", note: "TDD red 順序の遵守を最優先で。" },
                     ]},
    rev:            { effective: { model: "sonnet", preset: "default" },         chain: [{ scope: "default", model: "sonnet", preset: "default" }] },
    "rev-code":     { effective: { model: "sonnet", preset: "strict-drill" },    chain: [
                       { scope: "default", model: "sonnet", preset: "default" },
                       { scope: "project", preset: "strict-drill" },
                     ]},
    "rev-sec":      { effective: { model: "opus",   preset: "detective" },       chain: [
                       { scope: "default", model: "sonnet", preset: "default" },
                       { scope: "user",    model: "opus",   preset: "detective", note: "OWASP top 10 を必ず根拠に。" },
                     ]},
    "rev-test":     { effective: { model: "haiku",  preset: "default" },         chain: [{ scope: "default", model: "sonnet", preset: "default" }, { scope: "user", model: "haiku" }] },
    "retro-pm":     { effective: { model: "opus",   preset: "default" },         chain: [{ scope: "default", model: "opus", preset: "default" }] },
    "retro-counter":{ effective: { model: "opus",   preset: "strict-drill" },    chain: [{ scope: "default", model: "opus", preset: "default" }, { scope: "user", preset: "strict-drill" }] },
    "retro-meta":   { effective: { model: "opus",   preset: "detective" },       chain: [{ scope: "default", model: "opus", preset: "default" }, { scope: "user", preset: "detective" }] },
    "retro-pj":     { effective: { model: "sonnet", preset: "default" },         chain: [{ scope: "default", model: "sonnet", preset: "default" }] },
    "retro-research":{ effective: { model: "sonnet", preset: "default" },        chain: [{ scope: "default", model: "sonnet", preset: "default" }] },
    "retro-proc":   { effective: { model: "sonnet", preset: "default" },         chain: [{ scope: "default", model: "sonnet", preset: "default" }] },
    "retro-agg":    { effective: { model: "opus",   preset: "default" },         chain: [{ scope: "default", model: "opus", preset: "default" }] },
  };

  // -----------------------------------------------------------
  // Worktrees — fuller record for the Worktree management screen
  // -----------------------------------------------------------
  const WORKTREES_BASE = [
    { branch: "main",                  path: "~/work/loom",         use: "primary",  status: "busy",   parentAgent: "pm",       diskMB: 612, locked: false, createdAt: "2026-03-10", lastCommit: "feat: add discipline header" },
    { branch: "feat/oauth",            path: "~/wt/feat-oauth",     use: "parallel", status: "busy",   parentAgent: "dev",      diskMB: 480, locked: false, createdAt: "2026-04-28", lastCommit: "test: add duplicate email rejection" },
    { branch: "fix/test-flake",        path: "~/wt/fix-flake",      use: "parallel", status: "review", parentAgent: "rev-test", diskMB: 470, locked: false, createdAt: "2026-04-29", lastCommit: "wip: investigate flaky test" },
    { branch: "exp/retro-ui-redesign", path: "~/wt/exp-retro-ui",   use: "experiment",status: "idle",  parentAgent: "rev-code", diskMB: 502, locked: true,  createdAt: "2026-04-26", lastCommit: "wip: gantt vertical axis tweak" },
    { branch: "hotfix/secret-scan",    path: "~/wt/hotfix-sec",     use: "hotfix",   status: "idle",   parentAgent: "rev-sec",  diskMB: 489, locked: false, createdAt: "2026-04-29", lastCommit: "fix: prefix match in oauth callback" },
  ];

  // -----------------------------------------------------------
  // Sessions archive — past claude session jsonl files
  // -----------------------------------------------------------
  const SESSIONS_BASE = [
    { id: "s-2026-04-29-1721", startedAt: "2026-04-29 17:21", durationSec: 1820, agentRoot: "pm", turns: 38, verdict: "PASS",
      filesTouched: ["src/services/user.service.ts", "src/services/user.service.test.ts", "PR #42"],
      relatedFindings: ["F-12"], relatedRetro: "retro-2026-04-29",
      summary: "M0.13 §3.6 ガント定義の議論 + auth 重複メール拒否 TDD" },
    { id: "s-2026-04-29-1402", startedAt: "2026-04-29 14:02", durationSec: 940, agentRoot: "dev", turns: 22, verdict: "PASS",
      filesTouched: ["src/services/auth.ts", "src/services/auth.test.ts"],
      relatedFindings: [], summary: "OAuth callback の prefix match 修正" },
    { id: "s-2026-04-29-1031", startedAt: "2026-04-29 10:31", durationSec: 2200, agentRoot: "rev-sec", turns: 14, verdict: "FAIL",
      filesTouched: ["src/services/auth.ts"], relatedFindings: ["F-08"], summary: "secret scan で 1件 high。verdict FAIL で diff 戻し" },
    { id: "s-2026-04-28-1645", startedAt: "2026-04-28 16:45", durationSec: 1500, agentRoot: "pm", turns: 31, verdict: "PASS",
      filesTouched: ["docs/SPEC.md", "agents/loom-developer.md"], relatedFindings: ["F-11"],
      summary: "TDD 4段階の SPEC 更新議論" },
    { id: "s-2026-04-28-0955", startedAt: "2026-04-28 09:55", durationSec: 720, agentRoot: "dev", turns: 12, verdict: "PASS",
      filesTouched: ["src/cli/index.ts"], relatedFindings: [], summary: "CLI flag rename: --branch → --from" },
    { id: "s-2026-04-26-1820", startedAt: "2026-04-26 18:20", durationSec: 1100, agentRoot: "rev-code", turns: 18, verdict: "PASS",
      filesTouched: ["PR #38"], relatedFindings: [], relatedRetro: "retro-2026-04-26",
      summary: "PR #38 (gantt vertical axis) review" },
    { id: "s-2026-04-25-1130", startedAt: "2026-04-25 11:30", durationSec: 1640, agentRoot: "pm", turns: 27, verdict: "PASS",
      filesTouched: ["plan_items.json"], relatedFindings: [], relatedRetro: "retro-2026-04-25",
      summary: "M0.12 retro + M0.13 計画" },
  ];

  // -----------------------------------------------------------
  // Tokens — usage + cost analytics
  // -----------------------------------------------------------
  // Anthropic pricing (USD per MTok), fetched in prod from /v1/models or pricing API.
  const PRICING = {
    opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
    sonnet: { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
    haiku:  { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
  };
  // helper to compute USD from token tuple given a model
  function costOf(t, modelId) {
    const p = PRICING[modelId] || PRICING.sonnet;
    return (t.input*p.input + t.output*p.output + t.cacheWrite*p.cacheWrite + t.cacheRead*p.cacheRead) / 1_000_000;
  }
  const TOKENS_BASE = {
    period: "直近 7 days",
    // per-agent rollup
    byAgent: [
      { agentId: "pm",       model: "opus",   input: 142_000, output:  38_000, cacheWrite: 28_000, cacheRead: 920_000 },
      { agentId: "dev",      model: "sonnet", input: 380_000, output:  92_000, cacheWrite: 64_000, cacheRead: 2_400_000 },
      { agentId: "rev-code", model: "sonnet", input: 220_000, output:  44_000, cacheWrite: 18_000, cacheRead: 1_200_000 },
      { agentId: "rev-sec",  model: "opus",   input:  88_000, output:  21_000, cacheWrite: 12_000, cacheRead:   680_000 },
      { agentId: "rev-test", model: "haiku",  input: 110_000, output:  18_000, cacheWrite:  6_000, cacheRead:   720_000 },
      { agentId: "retro-pm", model: "opus",   input:  46_000, output:  14_000, cacheWrite:  4_000, cacheRead:   180_000 },
    ],
    // 7-day daily bars (USD)
    daily: [
      { day: "Wed", cost: 2.10, cacheRatio: 0.78 },
      { day: "Thu", cost: 3.40, cacheRatio: 0.81 },
      { day: "Fri", cost: 1.95, cacheRatio: 0.74 },
      { day: "Sat", cost: 0.42, cacheRatio: 0.62 },
      { day: "Sun", cost: 0.88, cacheRatio: 0.71 },
      { day: "Mon", cost: 4.20, cacheRatio: 0.83 },
      { day: "Tue", cost: 3.80, cacheRatio: 0.85 },
    ],
  };

  // -----------------------------------------------------------
  // Project settings — small, opinionated
  // -----------------------------------------------------------
  const SETTINGS_BASE = {
    daemonPort:        5757,
    worktreeBase:      "~/wt",
    retroSchedule:     { enabled: true, cron: "0 17 * * 5", label: "毎週金曜 17:00" },
    consistencyScope:  ["docs/**", "agents/**", "skills/**"],
    hooks:             { preToolUse: true, postToolUse: true, subagentStop: true },
    logRetention:      { days: 30 },
    defaultReviewers:  ["rev-code", "rev-test"],
    parallelLimit:     4,
  };

  // -----------------------------------------------------------
  // Scenarios — three frozen-in-time states of the whole world.
  // -----------------------------------------------------------
  function makeScenarios() {
    // ---- IDLE ---------------------------------------------------
    const idle = {
      key: "idle",
      label: "全員 idle (寝てる)",
      now: "14:23",
      conn: "connected",
      project: "freee-mcp",
      branch: "main",
      agents: {
        pm:         { status: "idle", lastSeenAt: "13分前" },
        dev:        { status: "idle", lastSeenAt: "8分前" },
        "rev-code": { status: "idle", lastSeenAt: "21分前" },
        "rev-test": { status: "idle", lastSeenAt: "21分前" },
        "rev-sec":  { status: "idle", lastSeenAt: "—" },
      },
      todos: TODOS_BASE,
      todosUpdatedAt: "13:42",
      milestones: MILESTONES_BASE.map(m => ({ ...m })),
      findings: FINDINGS_BASE.filter(f => f.status === "open" || f.status === "ack"),
      worktrees: WORKTREES_BASE.map(w => ({ ...w, status: "idle" })),
      stream: [],
      gantt: { ...GANTT_BASE, rows: GANTT_BASE.rows.map(r => ({ ...r, live: false })) },
      retroSession: RETRO_SESSION_BASE,
      guidance: GUIDANCE_BASE,
      customization: CUSTOMIZATION_BASE,
      disciplineMetrics: { parallel: 0.0, taskTool: "ok", taskToolLabel: "OK", tddViolations: 0, verdict: "PASS" },
      consistencyState: "has-findings",
      sessions: SESSIONS_BASE, tokens: TOKENS_BASE, settings: SETTINGS_BASE, pricing: PRICING,
      pm: { running: false, messages: [], pendingApprovals: [] },
    };

    // ---- ACTIVE -------------------------------------------------
    const active = {
      key: "active",
      label: "Dev サブエージェント実行中",
      now: "14:23",
      conn: "connected",
      project: "freee-mcp",
      branch: "main",
      agents: {
        pm:         { status: "busy",   currentReasoning: "spec §3.6 を読み返してる…", lastSeenAt: "now" },
        dev:        { status: "busy",   currentTool: "Edit", currentReasoning: "user.service.test.ts に GREEN ケース追加", lastSeenAt: "now", walkTo: "rev-code" },
        "rev-code": { status: "review", currentTool: "Read", currentReasoning: "diff の error path を確認", lastSeenAt: "now" },
        "rev-test": { status: "busy",   currentTool: "Bash", currentReasoning: "vitest run --coverage", lastSeenAt: "now" },
        "rev-sec":  { status: "idle",   lastSeenAt: "21分前" },
      },
      todos: TODOS_BASE,
      todosUpdatedAt: "now",
      milestones: MILESTONES_BASE.map(m => m.id === "M0.13" ? { ...m, progress: 0.62, count: "4/7" } : m),
      findings: FINDINGS_BASE,
      worktrees: WORKTREES_BASE,
      stream: [
        { ts: "14:23:08", who: "サバ",   kind: "reason", text: "user.service.test.ts は user 作成時の唯一性チェックが先" },
        { ts: "14:23:09", who: "サバ",   kind: "tool",   tool: "Read",  text: "src/services/user.service.test.ts" },
        { ts: "14:23:11", who: "サバ",   kind: "reason", text: "重複メールで failOnDuplicate を expect する case を追加" },
        { ts: "14:23:13", who: "サバ",   kind: "tool",   tool: "Edit",  text: "+ it('rejects duplicate email', …" },
        { ts: "14:23:14", who: "ハカセ", kind: "reason", text: "diff の new branch 分岐が err を握ってないか" },
        { ts: "14:23:15", who: "メメ",   kind: "tool",   tool: "Bash",  text: "pnpm vitest run user.service" },
        { ts: "14:23:18", who: "ニケ",   kind: "reason", text: "PR が SPEC §3.6 と整合してるか確認" },
      ],
      gantt: GANTT_BASE,
      retroSession: RETRO_SESSION_BASE,
      guidance: GUIDANCE_BASE,
      customization: CUSTOMIZATION_BASE,
      disciplineMetrics: { parallel: 0.62, taskTool: "ok", taskToolLabel: "OK", tddViolations: 0, verdict: "PASS" },
      consistencyState: "has-findings",
      sessions: SESSIONS_BASE, tokens: TOKENS_BASE, settings: SETTINGS_BASE, pricing: PRICING,
      pm: { running: true, messages: [
        { who: "user", ts: "14:18", text: "M0.13 のガント縦軸、subagent 1体 = 1 bar の方向で進めて" },
        { who: "pm",   ts: "14:18", text: "了解。SPEC §3.6.5 に統一し、worktree グループを §3.9 へ移管します。dev に diff 案を作らせる前に確認しますね。" },
        { who: "user", ts: "14:21", text: "OK 進めて" },
        { who: "pm",   ts: "14:22", text: "サバ (dev) を dispatch しました。auth 重複メールの TDD と並列で進行中。" },
      ], pendingApprovals: [
        { id: "ap-1", tool: "Bash", args: "git push origin main --force", risk: "high", from: "dev" },
      ]},
    };

    // ---- FAILED -------------------------------------------------
    const failed = {
      key: "failed",
      label: "Dev fail / consistency burst",
      now: "14:31",
      conn: "connected",
      project: "freee-mcp",
      branch: "main",
      agents: {
        pm:         { status: "busy",   currentReasoning: "F-12 の影響範囲を仕分け", lastSeenAt: "now" },
        dev:        { status: "failed", currentTool: "Bash", currentReasoning: "test runner がクラッシュ", lastSeenAt: "now" },
        "rev-code": { status: "idle",   lastSeenAt: "5分前" },
        "rev-test": { status: "review", currentReasoning: "verdict 草稿 (no_evidence)", lastSeenAt: "now" },
        "rev-sec":  { status: "idle",   lastSeenAt: "21分前" },
      },
      todos: TODOS_BASE,
      todosUpdatedAt: "now",
      milestones: MILESTONES_BASE.map(m => m.id === "M0.13" ? { ...m, progress: 0.62, count: "4/7" } : m),
      findings: FINDINGS_BASE.concat([
        { id: "F-14", sev: "medium", status: "open",
          file: "README.md", lines: "L18-L22",
          title: "README install.sh 同期",
          detail: "install.sh は v0.13 で path 変更済。README の手順が古い。",
          suggest: "README の install 章を SKILL.md から再生成", source: "spec_diff (now)" },
      ]),
      worktrees: WORKTREES_BASE.map(w => w.branch === "feat/oauth" ? { ...w, status: "failed" } : w),
      stream: [
        { ts: "14:31:02", who: "サバ",   kind: "tool",   tool: "Bash",  text: "pnpm vitest run" },
        { ts: "14:31:05", who: "サバ",   kind: "reason", text: "TypeError: Cannot read property 'session' of undefined" },
        { ts: "14:31:06", who: "system", kind: "fail",   text: "subagent.failed (exit 1) — Task tool dispatch aborted" },
      ],
      gantt: { ...GANTT_BASE, rows: GANTT_BASE.rows.map(r => r.agentId === "dev" ? { ...r, bars: [{ s: 12, e: 38, kind: "busy" }, { s: 44, e: 96, kind: "fail" }], live: true } : r) },
      retroSession: RETRO_SESSION_BASE,
      guidance: GUIDANCE_BASE,
      customization: CUSTOMIZATION_BASE,
      disciplineMetrics: { parallel: 0.4, taskTool: "warn", taskToolLabel: "DEGRADED", tddViolations: 2, verdict: "FAIL" },
      consistencyState: "has-findings",
      sessions: SESSIONS_BASE, tokens: TOKENS_BASE, settings: SETTINGS_BASE, pricing: PRICING,
      pm: { running: true, messages: [
        { who: "user", ts: "14:30", text: "test runner クラッシュしてる、状況教えて" },
        { who: "pm",   ts: "14:31", text: "サバの dispatch が exit 1 で落ちました。session 引数の undefined access が原因。修正する? それとも一旦 revert する?" },
      ], pendingApprovals: [] },
    };

    return { idle, active, failed };
  }

  // -----------------------------------------------------------
  // Tiny pub/sub store + React hook
  // -----------------------------------------------------------
  function createStore() {
    const SCENARIOS = makeScenarios();
    let key = "idle";
    const subs = new Set();
    return {
      SCENARIOS,
      get: () => key,
      set: (k) => { if (SCENARIOS[k]) { key = k; subs.forEach(fn => fn()); } },
      sub: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    };
  }
  const store = createStore();

  function useScenario() {
    const React = window.React;
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => store.sub(force), []);
    const key = store.get();
    return store.SCENARIOS[key];
  }
  function useScenarioKey() {
    const React = window.React;
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => store.sub(force), []);
    return [store.get(), store.set];
  }

  // -----------------------------------------------------------
  // ScenarioPicker — small dev panel, used in shell
  // -----------------------------------------------------------
  function ScenarioPicker({ style }) {
    const React = window.React;
    const [key, setKey] = useScenarioKey();
    const keys = Object.keys(store.SCENARIOS);
    return React.createElement("div", { className: "scenario-picker", style },
      React.createElement("span", { className: "scenario-picker__label" }, "SCENARIO"),
      ...keys.map(k =>
        React.createElement("button", {
          key: k,
          className: "scenario-picker__btn" + (k === key ? " on" : ""),
          onClick: () => setKey(k),
        }, k)
      ),
    );
  }

  // =============================================================
  // BACKEND INTEGRATION NOTES — read this when wiring to claude code
  // =============================================================
  // 各画面 mock がどう実 backend に載るかの feasibility メモ。
  // すべて「既存の claude code 機能 + 単純な daemon」で実現可能。
  //
  // [全画面共通]
  //   - read:  daemon が WS server (127.0.0.1:5757) を立て、後述 event を push
  //   - write: daemon が REST 受けて副作用 (file 書き換え or claude CLI dispatch)
  //   - frontend: useScenario() を useWebSocket() に差し替え → reducer 経由で同じ shape
  //
  // -----------------------------------------------------------
  // ① ROOM (cats + posters + stream rail)  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read event:
  //   agent.change { id, status, currentTool?, currentReasoning?, lastSeenAt }
  //     ← claude --output-format stream-json の assistant text 1文目を抽出
  //     ← PreToolUse / PostToolUse hook で currentTool を set/clear
  //   stream.append { who, kind, tool?, text, ts }
  //     ← assistant message + hook events を merge tail (ring buffer 200件)
  //   todo.change ← TodoWrite tool の引数を hook で intercept
  //   plan.change ← plan_items.json の fs.watch
  // write API:
  //   POST /pm/dispatch { task } — `claude` CLI 起動 (PM session)
  //
  // -----------------------------------------------------------
  // ② GANTT  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: agent_history.jsonl (1 dispatch = 1 行: { agentId, worktree, label, startedAt, endedAt, kind })
  //   ← daemon が SubagentStop hook + Task tool 起動を観測して append
  // 30min 窓は frontend 側で filter。worktree group は単純な groupBy。
  //
  // -----------------------------------------------------------
  // ③ PLAN  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: plan_items.json (PM が編集するファイル)
  //   ← daemon が fs.watch、変更で plan.change を broadcast
  // todos = TodoWrite tool の最新 snapshot (hook で daemon に push)
  // write: PUT /plan_items (PM が編集 → file 書き戻し)
  //
  // -----------------------------------------------------------
  // ④ CONSISTENCY  ★ 動く確信: 中
  // -----------------------------------------------------------
  // read: consistency_findings.jsonl (consistency_check skill の出力)
  //   ← skill 側で行追記、daemon が tail で finding.new event 化
  // write: POST /findings/:id/{ack,fix,dismiss} — file の status 列更新
  // 「▶ チェック実行」ボタン: POST /consistency/run → daemon が claude CLI を
  //   `/consistency-check` で起動するだけ。出力は同じ jsonl に流れる。
  //
  // -----------------------------------------------------------
  // ⑤ RETRO  ★ 動く確信: 中
  // -----------------------------------------------------------
  // read: retro/<id>/session.jsonl (lens 4体 + counter + agg の発話 log)
  //   ← retro skill 内で各 lens dispatch 結果を行追記
  //   ← daemon が tail で transcript.append event 化、frontend が cursor で再生
  // findings は同 dir の findings.json (verdict 確定後に書き出される artifact)
  // write: POST /findings/:id/{accept,defer,dismiss} — ④と同じ endpoint
  //
  // -----------------------------------------------------------
  // ⑥ WORKTREE  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: `git worktree list --porcelain` を 5sec interval で scan
  //   + .git/worktrees/<name>/CONFIG (use, locked, parentAgent は別 metadata file)
  // write:
  //   POST /worktree { branch, use } → `git worktree add` shell-out
  //   DELETE /worktree/:branch       → `git worktree remove`
  //   POST /worktree/:branch/lock    → `git worktree lock` + metadata 更新
  //
  // -----------------------------------------------------------
  // ⑦ CUSTOMIZATION  ★ 動く確信: 高 (←user が一番不安だった所)
  // -----------------------------------------------------------
  // 仕組みは単純な「JSON 重ね合わせ」だけ。難しい技術は何も無い:
  //
  //   ~/.claude/loom/user-prefs.json    ← user スコープ
  //   <project>/.claude/loom/project.json ← project スコープ
  //
  //   effective[agentId] = {
  //     ...defaults[agentId],     // ROSTER 側にハードコードされた既定
  //     ...userPrefs[agentId],    // user が変えたぶん
  //     ...projectPrefs[agentId], // project ごとの override
  //   }
  //
  // dispatch 時の挙動:
  //   - daemon が `claude` CLI 起動する直前に、effective[agentId] を解決
  //   - --model フラグ        ← effective.model     ("opus" | "sonnet" | "haiku")
  //   - system prompt の末尾  ← preset の prompt 追記文字列
  //                             (PRESETS に対応する文字列を agent prompt 末尾に concat)
  //
  // つまり「customization 画面で保存 = json file を書く」だけ。
  // claude CLI 側に persistent state を持たせる必要なし。
  // chain detail も 3つの json 重ね順を表示してるだけで完全に決定論的。
  //
  // write API:
  //   PUT /customization/:agentId { model?, preset?, scope: "user"|"project" }
  //     → 該当 json file を read-modify-write
  //     → 即 customization.change event broadcast
  //
  // -----------------------------------------------------------
  // ⑧ GUIDANCE  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: agents/<id>/learned-guidance.md (YAML frontmatter + body)
  //   ← retro skill が verdict 確定時に append
  //   ← daemon が fs.watch
  // dispatch 時: agent prompt の末尾に active な guidance を全部 concat する
  //   (CUSTOMIZATION の preset と同じ仕組み、追記する文字列の出処が違うだけ)
  // write: DELETE /guidance/:id (retire), useCount は dispatch のたびに +1
  //
  // -----------------------------------------------------------
  // ⑨ AGENT DETAIL DRAWER  ★ 動く確信: 高
  // -----------------------------------------------------------
  // 既存の event を agentId で filter してるだけ、新しい backend 仕事ゼロ。
  //
  // -----------------------------------------------------------
  // ⑩ SESSIONS  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: ~/.claude/projects/<pj>/*.jsonl の dir watch + each file の head 数行 parse
  //   ← startedAt / agentRoot / turns / verdict は jsonl の先頭/末尾から抽出
  //   ← filesTouched は Edit/Write tool 引数を grep
  //   ← relatedRetro / relatedFindings は別 metadata file で逆引き保存
  // write: なし (read-only archive)
  // transcript replay は Retro と同じ player を流用 (jsonl → transcript[] の reducer 共通化)
  //
  // -----------------------------------------------------------
  // ⑪ TOKENS  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read: claude --output-format stream-json の usage block を session ごとに集計
  //   { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }
  //   ← session.jsonl の最終 message から取得 (or hook で逐次累積)
  // pricing: prod では Anthropic の pricing API or models endpoint を fetch、
  //   fallback でこのファイル内の PRICING 定数。1h cache 価格を使用。
  // 効率分析 (cache-hit, opus over-spec) は frontend 側 rule-based でゼロ追加 backend。
  //
  // -----------------------------------------------------------
  // ⑫ PROJECT SETTINGS  ★ 動く確信: 高
  // -----------------------------------------------------------
  // read/write: <project>/.claude/loom/project.json をそのまま read-modify-write
  //   ← daemon が fs.watch、変更で settings.change broadcast
  // 一部の項目 (daemonPort, hooks の有効化) は daemon の再起動が要る → 保存時に
  //   "再起動が必要" toast を出す。daemon は SIGHUP で reload する規約にする。
  // user-prefs.json は GUI からは触らず CLI のみ — 意図的にスコープ外。
  //
  // =============================================================
  // =============================================================
  // - claude CLI の stream-json は assistant message の delta が来る形式。
  //   "今の reasoning を 1 文" は最初の sentence-end まで buffer 必要。
  //   ハカセが「考え中…」を出すには小さい NLP (or 単に最初の "。" まで) が要る。
  // - PreToolUse hook は同期実行なので、daemon に POST する shell は速くしないと
  //   tool 起動が遅くなる。net-cat or 軽量 daemon に直書きが安全。
  // - retro session.jsonl は lens 4体並列実行なので、行 ordering が前後する。
  //   timestamp で sort、frontend に渡す前に daemon 側で並べ替え。
  // - 全 event の ordering は (ts, agentId) tuple で決定論にできる。
  //   不整合が出たら frontend reducer で再 sort。
  //
  // 全画面とも「既存 file の watch + 単純な REST」で破綻なく実装可能。
  // -----------------------------------------------------------
  // ⑬ PM CHAT (Room 中央)  ★ 動く確信: 高 — claude code 公式機能のみで実装可
  // -----------------------------------------------------------
  // PM = 永続 claude session (subagent と違って投げっぱなしじゃない)
  //
  // read events:
  //   pm.message { who: "user"|"pm", text, ts }
  //     ← daemon が PM の `claude --output-format stream-json` の stdout を tail
  //   pm.permission_request { id, tool, args, risk: "low"|"med"|"high", from }
  //     ← PreToolUse hook が exit code 2 で block する時、reason を json で stderr に出す
  //     ← daemon の hook script がそれを WS broadcast、reqId は uuid
  //   pm.permission_resolved { id }
  //     ← ユーザー回答後、hook script が exit 0/2 で返す前に broadcast
  //
  // write APIs:
  //   POST /pm/start                            — claude を spawn (永続)
  //   POST /pm/say { text }                     — PM の stdin に書く
  //   POST /pm/permission/:reqId { allow: bool} — hook script に signal
  //   POST /pm/stop                             — SIGTERM
  //
  // risk 判定 (frontend rule-based + agent prompt 側 hint):
  //   high: rm -rf / git push --force / DELETE / DROP / curl piped to sh
  //   med:  Write to outside cwd / Bash で sudo / network call
  //   low:  Read / Edit (cwd内) / TodoWrite / Task / known-safe Bash
  //
  // UX:
  //   - Room 中央のチャットパネル (coldstart 位置) — メッセージ log + input
  //   - high risk approval → 中央モーダルでブロック (誤クリック防止)
  //   - med/low → 右上トースト
  //   - PM 未起動時は「▶ PM を起動」ボタン (= /pm/start)
  // -----------------------------------------------------------
  
  // -----------------------------------------------------------
  window.ScenarioStore = store;
  window.useScenario = useScenario;
  window.useScenarioKey = useScenarioKey;
  window.ScenarioPicker = ScenarioPicker;
  window.STATUS_COLOR = STATUS_COLOR;
  window.PRESETS = PRESETS;
  window.MODELS = MODELS;
  window.PRICING = PRICING;
  window.costOf = costOf;
  window.indexRoster = indexRoster;
})();

// =============================================================
// ESM exports — production app (Vite + TypeScript) imports the same
// fixture without duplicating it. The IIFE above already attached
// the same values to window.* for the prototype <script type=module>
// loader, so both consumers share one source of truth.
//
// NOTE: useScenario / useScenarioKey / ScenarioPicker are tied to
// React via window.React, so they only work inside the prototype HTML.
// Production code should import { ScenarioStore, SCENARIOS } here and
// build its own React hook on top (see redesign/api/websocket.ts).
// =============================================================
export const ScenarioStore = window.ScenarioStore;
export const SCENARIOS = window.ScenarioStore.SCENARIOS;
export const useScenario = window.useScenario;
export const useScenarioKey = window.useScenarioKey;
export const ScenarioPicker = window.ScenarioPicker;
export const STATUS_COLOR = window.STATUS_COLOR;
export const PRESETS = window.PRESETS;
export const MODELS = window.MODELS;
export const PRICING = window.PRICING;
export const costOf = window.costOf;
export const indexRoster = window.indexRoster;
