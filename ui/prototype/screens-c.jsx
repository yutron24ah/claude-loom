// New screens — Consistency findings (§3.4) + Customization Layer (§3.8)

const { CatSprite: SCcat, ROSTER: SCroster } = window;

// ============================================================
// CONSISTENCY — SPEC 変更検知 + finding 管理 (§3.4)
// ============================================================
const ConsistencyView = ({ width = 920 }) => {
  const sevColor = { high: "var(--p-error)", medium: "var(--p-warn)", low: "var(--p-stone)" };
  const findings = [
    {
      id: "F-12", sev: "high", file: "docs/SCREEN_REQUIREMENTS.md", lines: "L284-L298",
      title: "§3.6 ガント の縦軸定義が SPEC §3.6.5 と矛盾",
      detail: "SCREEN_REQUIREMENTS は subagent 1 体 = 1 bar。SPEC は worktree 単位を想定。",
      suggest: "SPEC §3.6.5 を SubagentRow ベースに修正、worktree グループ化を §3.9 へ移管",
      status: "open", source: "spec_diff (4 hours ago)",
    },
    {
      id: "F-11", sev: "high", file: "agents/loom-developer.md", lines: "L42-L51",
      title: "Developer の TDD red 順序定義が CODING_PRINCIPLES と乖離",
      detail: "developer は test → impl → refactor の3段。原則は test → impl → refactor → review の4段。",
      suggest: "agent prompt に review 段階を追加し、reviewer dispatch 規定を明示",
      status: "ack", source: "spec_diff (yesterday)",
    },
    {
      id: "F-10", sev: "medium", file: "docs/RETRO_GUIDE.md", lines: "L88",
      title: "retro lens 名称が SPEC §3.7 と微妙に違う（counter-arguer vs counter-argument）",
      detail: "用語ゆらぎ。codebase 全体 grep で 7 箇所。",
      suggest: "用語を counter-arguer に統一",
      status: "fixed", source: "spec_diff (2 days ago)",
    },
    {
      id: "F-09", sev: "low", file: "skills/loom-worktree/SKILL.md", lines: "L120",
      title: "worktree 5 用途のうち 1 つ (hotfix) の例が古い CLI 引数を使用",
      detail: "`--branch` は v0.8 で `--from` にリネーム済み",
      suggest: "サンプル更新",
      status: "open", source: "manual (you)",
    },
  ];

  return (
    <div className="rpg-frame pixel" style={{ width, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>📜 整合性 — Consistency Findings</div>
        <span className="chip" style={{ background: "var(--p-error)", color: "white", borderColor: "var(--p-error)" }}>NEW 2</span>
        <span className="chip">since: 2 hours ago</span>
        <div style={{ flex: 1 }} />
        <button className="btn-px primary">▶ チェック実行</button>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { lbl: "OPEN",     n: 2, c: "var(--p-error)" },
          { lbl: "ACK",      n: 1, c: "var(--p-warn)" },
          { lbl: "FIXED",    n: 7, c: "var(--p-success)" },
          { lbl: "DISMISSED",n: 3, c: "var(--p-stone)" },
        ].map(s => (
          <div key={s.lbl} style={{ background: "var(--p-tint)", border: "2px solid var(--p-border)", padding: 10 }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em" }}>{s.lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: 'ui-monospace, monospace' }}>{s.n}</div>
          </div>
        ))}
      </div>

      {/* Severity distribution */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 11 }}>
        <span className="rpg-label">SEVERITY</span>
        <span style={{ display: "inline-block", height: 10, width: 80, background: "var(--p-error)" }} />
        <span>high <b>2</b></span>
        <span style={{ display: "inline-block", height: 10, width: 60, background: "var(--p-warn)" }} />
        <span>medium <b>3</b></span>
        <span style={{ display: "inline-block", height: 10, width: 30, background: "var(--p-stone)" }} />
        <span>low <b>4</b></span>
      </div>

      {/* Finding cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {findings.map(f => (
          <div key={f.id} style={{
            background: "var(--p-paper)", border: "2px solid var(--p-border)",
            padding: 12, position: "relative",
            opacity: f.status === "fixed" ? 0.55 : 1,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", marginTop: 2,
                background: sevColor[f.sev], color: "white", border: "2px solid var(--p-border)",
                textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
              }}>{f.sev}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: "var(--p-text-muted)" }}>{f.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</span>
                  {f.status === "ack"   && <span className="chip" style={{ background: "var(--p-warn)", color: "white", borderColor: "var(--p-warn)" }}>ACK</span>}
                  {f.status === "fixed" && <span className="chip" style={{ background: "var(--p-success)", color: "white", borderColor: "var(--p-success)" }}>✓ FIXED</span>}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: "var(--p-accent)", marginBottom: 4 }}>
                  {f.file} <span style={{ color: "var(--p-text-muted)" }}>{f.lines}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--p-text)", lineHeight: 1.5, marginBottom: 6 }}>{f.detail}</div>
                <div style={{ fontSize: 10, padding: "6px 8px", background: "var(--p-tint)", border: "1px dashed var(--p-border)", color: "var(--p-text)" }}>
                  <span style={{ fontWeight: 700, color: "var(--p-success)" }}>提案 ▶</span> {f.suggest}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
                  {f.status === "open" && (<>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px" }}>📂 Open in Editor</button>
                    <button className="btn-px primary" style={{ fontSize: 9, padding: "3px 6px" }}>📌 Acknowledge</button>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px" }}>✓ Mark Fixed</button>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px", color: "var(--p-text-muted)" }}>✕ Dismiss</button>
                  </>)}
                  {f.status === "ack" && (<>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px" }}>📂 Open in Editor</button>
                    <button className="btn-px primary" style={{ fontSize: 9, padding: "3px 6px" }}>✓ Mark Fixed</button>
                    <span style={{ fontSize: 9, color: "var(--p-text-muted)", marginLeft: "auto" }}>→ plan_items に転記済</span>
                  </>)}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--p-text-muted)" }}>{f.source}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// CUSTOMIZATION LAYER — 13 agent × model + personality (§3.8)
// ============================================================
const CustomizationView = ({ width = 920 }) => {
  const presets = [
    { id: "default",         name: "Default",         emoji: "😌", desc: "標準。プロンプトは原型のまま。" },
    { id: "friendly-mentor", name: "Friendly Mentor", emoji: "🌱", desc: "やさしく褒める。初学者向け。" },
    { id: "strict-drill",    name: "Strict Drill",    emoji: "💪", desc: "厳しく指摘、根拠重視。" },
    { id: "detective",       name: "Detective",       emoji: "🔍", desc: "問いで深掘り。仮説検証型。" },
  ];
  const models = [
    { id: "opus",   name: "opus",   color: "var(--p-accent)" },
    { id: "sonnet", name: "sonnet", color: "var(--p-success)" },
    { id: "haiku",  name: "haiku",  color: "var(--p-stone)" },
  ];

  // Per-agent demo settings (fake state)
  const settings = {
    "pm":            { model: "opus",   preset: "default",         scope: "user",    custom: "" },
    "dev":           { model: "sonnet", preset: "friendly-mentor", scope: "project", custom: "TDD red 順序の遵守を最優先で。" },
    "rev":           { model: "sonnet", preset: "default",         scope: "user",    custom: "" },
    "rev-code":      { model: "sonnet", preset: "strict-drill",    scope: "project", custom: "" },
    "rev-sec":       { model: "opus",   preset: "detective",       scope: "user",    custom: "OWASP top 10 を必ず根拠に。" },
    "rev-test":      { model: "haiku",  preset: "default",         scope: "user",    custom: "" },
    "retro-pm":      { model: "opus",   preset: "default",         scope: "user",    custom: "" },
    "retro-counter": { model: "opus",   preset: "strict-drill",    scope: "user",    custom: "" },
    "retro-meta":    { model: "opus",   preset: "detective",       scope: "user",    custom: "" },
    "retro-pj":      { model: "sonnet", preset: "default",         scope: "user",    custom: "" },
    "retro-research":{ model: "sonnet", preset: "default",         scope: "user",    custom: "" },
    "retro-proc":    { model: "sonnet", preset: "default",         scope: "user",    custom: "" },
    "retro-agg":     { model: "opus",   preset: "default",         scope: "user",    custom: "" },
  };

  return (
    <div className="rpg-frame pixel" style={{ width, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>⚙ Customization Layer — 13 agent</div>
        <span className="chip">scope: <b style={{ marginLeft: 4 }}>user-prefs</b> / project override 4件</span>
        <div style={{ flex: 1 }} />
        <button className="btn-px ghost">Reset to defaults</button>
      </div>

      {/* Preset legend */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        {presets.map(p => (
          <div key={p.id} style={{ background: "var(--p-tint)", border: "2px solid var(--p-border)", padding: "8px 10px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{p.emoji} {p.name}</div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", lineHeight: 1.4 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Agent table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1.4fr 80px", gap: 8, padding: "6px 10px", fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", borderBottom: "2px solid var(--p-border)" }}>
          <span>AGENT</span>
          <span>MODEL</span>
          <span>PERSONALITY</span>
          <span>SCOPE</span>
        </div>
        {SCroster.map(a => {
          const s = settings[a.id] || { model: "sonnet", preset: "default", scope: "user", custom: "" };
          const preset = presets.find(p => p.id === s.preset);
          return (
            <div key={a.id} style={{
              display: "grid", gridTemplateColumns: "180px 1fr 1.4fr 80px",
              gap: 8, padding: "8px 10px", alignItems: "center",
              background: "var(--p-paper)", borderBottom: "1px solid var(--p-border)",
            }}>
              {/* agent identity */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SCcat size={28} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 8, color: "var(--p-text-muted)" }}>{a.role}</div>
                </div>
              </div>
              {/* model — segmented */}
              <div style={{ display: "flex", border: "2px solid var(--p-border)", overflow: "hidden", width: "fit-content" }}>
                {models.map(m => (
                  <div key={m.id} style={{
                    padding: "4px 10px", fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                    background: s.model === m.id ? m.color : "transparent",
                    color: s.model === m.id ? "white" : "var(--p-text-muted)",
                    borderRight: "1px solid var(--p-border)", cursor: "pointer",
                  }}>{m.name}</div>
                ))}
              </div>
              {/* personality */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="chip" style={{ background: "var(--p-tint)" }}>{preset?.emoji} {preset?.name}</span>
                  {s.custom && <span style={{ fontSize: 9, color: "var(--p-text-muted)" }}>+ custom override</span>}
                </div>
                {s.custom && (
                  <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: "var(--p-text)", padding: "4px 6px", background: "var(--p-tint)", borderLeft: "3px solid var(--p-accent)" }}>
                    {s.custom}
                  </div>
                )}
              </div>
              {/* scope */}
              <div>
                {s.scope === "project"
                  ? <span className="chip" style={{ background: "var(--p-warn)", color: "white", borderColor: "var(--p-warn)" }}>project</span>
                  : <span className="chip">user</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ marginTop: 12, padding: "8px 12px", fontSize: 10, color: "var(--p-text-muted)", background: "var(--p-tint)", border: "2px dashed var(--p-border)", lineHeight: 1.5 }}>
        ◆ <b>scope</b>：user-prefs はすべての PJ に適用 / project は当 PJ のみ override。<br />
        ◆ custom override は preset の上に重ねがけされ、最終 prompt は両方を結合して agent に渡される。
      </div>
    </div>
  );
};

// ============================================================
// LEARNED GUIDANCE — agent ごとの注入 guidance (§3.10)
// ============================================================
const LearnedGuidanceView = ({ width = 920 }) => {
  const guidance = [
    {
      agent: "サバ", agentId: "dev", active: true,
      category: "tdd", from: "retro-2026-04-25",
      text: "RED フェーズで test を書く前に impl を触らない。エディタを別 tab に分けて誤操作を防ぐ。",
      addedAt: "2026-04-25", useCount: 12, ttl: "永続",
      scope: "user",
    },
    {
      agent: "ペン", agentId: "rev-code", active: true,
      category: "review", from: "retro-2026-04-22",
      text: "verdict には必ず参照行番号 (file:Lxx) を含める。曖昧な指摘は reject する。",
      addedAt: "2026-04-22", useCount: 8, ttl: "permanent",
      scope: "project",
    },
    {
      agent: "シマ", agentId: "rev-sec", active: true,
      category: "security", from: "finding-F-08",
      text: "OAuth callback URL の検証は exact match のみ受理。prefix match は禁止。",
      addedAt: "2026-04-20", useCount: 3, ttl: "permanent",
      scope: "project",
    },
    {
      agent: "メメ", agentId: "rev-test", active: false,
      category: "test", from: "retro-2026-04-15",
      text: "coverage 90% 未満は verdict 出さない。",
      addedAt: "2026-04-15", useCount: 5, ttl: "expired",
      scope: "user",
    },
    {
      agent: "ニケ", agentId: "pm", active: true,
      category: "process", from: "retro-2026-04-25",
      text: "並列発射可能な dispatch は必ず単一 Task call に同梱する。逐次発射は violation 扱い。",
      addedAt: "2026-04-25", useCount: 19, ttl: "permanent",
      scope: "user",
    },
  ];

  const catColor = { tdd: "var(--p-warn)", review: "var(--p-accent)", security: "var(--p-error)", test: "var(--p-success)", process: "var(--p-stone)" };

  return (
    <div className="rpg-frame pixel" style={{ width, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>📜 Learned Guidance — agent に注入された学習</div>
        <span className="chip">active <b style={{ marginLeft: 4 }}>4</b> / total 5</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "var(--p-text-muted)" }}>retro / finding 由来は監査履歴あり</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {guidance.map((g, i) => {
          const agent = SCroster.find(a => a.id === g.agentId);
          return (
            <div key={i} style={{
              background: "var(--p-paper)", border: "2px solid var(--p-border)",
              padding: "10px 12px", display: "flex", gap: 12, alignItems: "flex-start",
              opacity: g.active ? 1 : 0.5,
            }}>
              {/* agent + scroll icon */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <SCcat size={36} fur={agent?.fur || "#aaa"} cheek={agent?.cheek || "#fda"} hat={agent?.hat} pose="sit" scroll={g.active} />
              </div>
              {/* body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{g.agent}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px",
                    background: catColor[g.category], color: "white", border: "1px solid var(--p-border)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{g.category}</span>
                  <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: "var(--p-text-muted)" }}>from: {g.from}</span>
                  <span className="chip" style={{ background: g.scope === "project" ? "var(--p-warn)" : "transparent", color: g.scope === "project" ? "white" : "var(--p-text)", borderColor: g.scope === "project" ? "var(--p-warn)" : "var(--p-border)" }}>{g.scope}</span>
                  {!g.active && <span className="chip" style={{ color: "var(--p-text-muted)" }}>inactive</span>}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--p-text)", padding: "6px 8px", background: "var(--p-tint)", borderLeft: "3px solid var(--p-accent)" }}>
                  {g.text}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace', alignItems: "center" }}>
                  <span>added: {g.addedAt}</span>
                  <span>use_count: {g.useCount}</span>
                  <span>ttl: {g.ttl}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px" }}>{g.active ? "🔕 deactivate" : "🔔 activate"}</button>
                    <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px", color: "var(--p-error)" }}>🗑 削除</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: "var(--p-text-muted)", padding: "8px 12px", background: "var(--p-tint)", border: "2px dashed var(--p-border)", lineHeight: 1.5 }}>
        ◆ guidance は agent の system prompt に append される。<br />
        ◆ 重複や矛盾は次 retro でレビュー候補としてマークされる（Phase 2）
      </div>
    </div>
  );
};

window.ConsistencyView = ConsistencyView;
window.CustomizationView = CustomizationView;
window.LearnedGuidanceView = LearnedGuidanceView;
