// Plan, Retro, Worktree screens

const { CatSprite, ROSTER } = window;

// --------------------------------------------------------------
// PLAN — short-term Todo + long-term plan_items tree
// --------------------------------------------------------------
const PlanView = ({ width = 920 }) => {
  const todos = [
    { s: "in_progress", t: "user.service.test.ts を GREEN にする" },
    { s: "pending",     t: "freee OAuth callback の error path 確認" },
    { s: "pending",     t: "整合性 finding #12 を ack" },
    { s: "completed",   t: "PR #41 verdict 提出" },
    { s: "completed",   t: "spec §3.6.5 反映" },
  ];
  const plan = [
    { lvl: 0, t: "M0.13 — Process Discipline", st: "in_progress", count: "3/7" },
    { lvl: 1, t: "discipline metrics 4種を header に表示", st: "completed" },
    { lvl: 1, t: "TDD 順序 violation 検出 hook", st: "in_progress" },
    { lvl: 1, t: "retro 統合（履歴 drill-down）", st: "pending" },
    { lvl: 0, t: "M0.14 — Atrium 画面（Phase2 候補）", st: "pending", count: "0/4" },
    { lvl: 1, t: "全 PJ 並列俯瞰レイアウト", st: "pending" },
  ];
  const stColor = s => ({
    in_progress: "var(--p-warn)", pending: "var(--p-stone)", completed: "var(--p-success)",
  }[s]);
  return (
    <div className="pixel" style={{ width, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {/* short-term */}
      <div className="rpg-frame" style={{ padding: 16 }}>
        <div className="rpg-title">📒 短期 — TodoWrite (read-only)</div>
        <div className="rpg-label" style={{ marginTop: 2, marginBottom: 10 }}>session: pm-2026-04-30-am</div>
        {todos.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--p-border)", fontSize: 11 }}>
            <span style={{ width: 12, height: 12, marginTop: 2, background: stColor(t.s), border: "1px solid var(--p-border)" }} />
            <span style={{ flex: 1, textDecoration: t.s === "completed" ? "line-through" : "none", color: t.s === "completed" ? "var(--p-text-muted)" : "var(--p-text)" }}>{t.t}</span>
            <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace' }}>{t.s}</span>
          </div>
        ))}
      </div>
      {/* long-term */}
      <div className="rpg-frame" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="rpg-title">🗺 長期 — plan_items ツリー</div>
          <button className="btn-px primary">+ 追加</button>
        </div>
        <div className="rpg-label" style={{ marginTop: 2, marginBottom: 10 }}>編集可 · ファイル直編集と双方向同期</div>
        {plan.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", paddingLeft: p.lvl * 18, fontSize: 11, borderBottom: i < plan.length - 1 ? "1px dashed var(--p-border)" : "none" }}>
            <span style={{ color: "var(--p-text-muted)" }}>{p.lvl === 0 ? "▸" : "└"}</span>
            <span style={{ width: 10, height: 10, marginTop: 3, background: stColor(p.st), border: "1px solid var(--p-border)" }} />
            <span style={{ flex: 1, fontWeight: p.lvl === 0 ? 700 : 400 }}>{p.t}</span>
            {p.count && <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace' }}>{p.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --------------------------------------------------------------
// RETRO — 4 lens findings + action plan
// --------------------------------------------------------------
const RetroView = ({ width = 920 }) => {
  const lenses = [
    { id: "pj",     name: "リケ", role: "PJ Judge",     fur: "#e8d6b3", hat: "wizard", count: 3, severity: ["high", "med", "low"] },
    { id: "proc",   name: "リズ", role: "Process Judge",fur: "#d8a86a", hat: "wizard", count: 2, severity: ["high", "med"] },
    { id: "meta",   name: "オウル",role: "Meta Judge",  fur: "#efe6d4", hat: "wizard", count: 1, severity: ["med"] },
    { id: "user",   name: "あなた",role: "User Lens",   fur: "#9c8266", hat: "cap",    count: 2, severity: ["high", "low"], isUser: true },
  ];
  const findings = [
    { lens: "proc", sev: "high", title: "TDD red 順序が 1 commit 飛んでいる", target: "auth.test.ts:42", status: "open" },
    { lens: "pj",   sev: "high", title: "PR #42 の verdict 証拠が薄い",        target: "PR #42",          status: "open" },
    { lens: "user", sev: "high", title: "並列度がここ 3 日で 60% → 40%",       target: "metrics",         status: "open" },
    { lens: "meta", sev: "med",  title: "reviewer の personality が混ざっている", target: "config",       status: "deferred" },
  ];
  const sevColor = s => ({ high: "var(--p-error)", med: "var(--p-warn)", low: "var(--p-stone)" }[s]);
  return (
    <div className="rpg-frame pixel" style={{ width, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div className="rpg-title">🔮 Retro #M0.12 — 2026-04-29</div>
          <div className="rpg-label" style={{ marginTop: 2 }}>finding 8 件 · counter-arguer verdict: PASS · aggregator: action plan 確定</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-px ghost">archive を開く</button>
          <button className="btn-px primary">+ 新 retro 起動</button>
        </div>
      </div>

      {/* 4 lens summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {lenses.map(l => (
          <div key={l.id} className="rpg-frame-tight" style={{ padding: 10, position: "relative", background: l.isUser ? "var(--p-accent-soft)" : "var(--p-paper)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CatSprite size={32} fur={l.fur} hat={l.hat} pose="sit" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{l.name}</div>
                <div className="rpg-label">{l.role}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {l.severity.map((s, i) => (
                <span key={i} style={{ width: 14, height: 14, background: sevColor(s), border: "1px solid var(--p-border)" }} />
              ))}
              <span style={{ fontSize: 10, fontWeight: 700, marginLeft: "auto" }}>{l.count} 件</span>
            </div>
          </div>
        ))}
      </div>

      {/* findings list */}
      <div className="rpg-label" style={{ marginBottom: 6 }}>FINDINGS — 1-click action</div>
      {findings.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px", background: i % 2 === 0 ? "var(--p-tint)" : "transparent", borderBottom: "1px solid var(--p-border)" }}>
          <span style={{ width: 8, height: 28, background: sevColor(f.sev) }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{f.title}</div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace' }}>
              {f.lens} · {f.target} · {f.status}
            </div>
          </div>
          <button className="btn-px success" style={{ padding: "6px 8px" }}>accept</button>
          <button className="btn-px ghost"   style={{ padding: "6px 8px" }}>reject</button>
          <button className="btn-px ghost"   style={{ padding: "6px 8px" }}>defer</button>
          <button className="btn-px primary" style={{ padding: "6px 8px" }}>discuss</button>
        </div>
      ))}

      {/* action plan classification */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        {[
          { label: "IMMEDIATE", count: 3, color: "var(--p-error)" },
          { label: "MILESTONE", count: 4, color: "var(--p-warn)" },
          { label: "DEFERRED",  count: 1, color: "var(--p-stone)" },
        ].map(b => (
          <div key={b.label} style={{ padding: 10, border: "2px solid var(--p-border)", background: "var(--p-paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{b.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.count}</span>
            </div>
            <div className="exp-bar" style={{ marginTop: 4 }}><i style={{ width: `${b.count * 25}%`, background: b.color }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --------------------------------------------------------------
// WORKTREE — sub-rooms
// --------------------------------------------------------------
const WorktreeView = ({ width = 920 }) => {
  const trees = [
    { branch: "main",                use: "parallel dev", path: "~/work/loom",        cats: [ROSTER.find(r => r.id === "pm"), ROSTER.find(r => r.id === "dev")], lock: false, max: false },
    { branch: "feat/m0.13-discipline", use: "parallel dev", path: "~/wt/m0.13",      cats: [ROSTER.find(r => r.id === "rev-code"), ROSTER.find(r => r.id === "rev-test")], lock: false, max: false },
    { branch: "exp/retro-ui-redesign", use: "安全実験",     path: "~/wt/retro-redesign",cats: [ROSTER.find(r => r.id === "retro-pj")], lock: true, max: false },
    { branch: "hotfix/secret-scan",    use: "hotfix",      path: "~/wt/hotfix-sec",    cats: [ROSTER.find(r => r.id === "rev-sec")], lock: false, max: false },
  ];
  return (
    <div className="rpg-frame pixel" style={{ width, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="rpg-title">🏠 Worktree — サブルーム配置</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="chip">4 / 5 active</span>
          <button className="btn-px primary">+ 新規 worktree</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {trees.map((t, i) => (
          <div key={i} style={{ padding: 12, background: "var(--p-tint)", border: "2px solid var(--p-border)", position: "relative" }}>
            {/* mini-room background */}
            <div style={{ height: 70, background: "var(--p-bg-floor)", border: "2px solid var(--p-border)", position: "relative", overflow: "hidden", marginBottom: 8 }}>
              {/* floor lines */}
              {[0,1,2,3,4].map(j => <div key={j} style={{ position: "absolute", top: 0, bottom: 0, left: `${j * 20}%`, width: 1, background: "var(--p-bg-floor-2)" }} />)}
              {/* desk */}
              <div style={{ position: "absolute", bottom: 6, left: 16, right: 16, height: 6, background: "var(--p-wood)", border: "2px solid var(--p-border)" }} />
              {/* cats */}
              <div style={{ position: "absolute", bottom: 12, left: 24, display: "flex", gap: 6 }}>
                {t.cats.map(c => <CatSprite key={c.id} size={36} fur={c.fur} hat={c.hat} pose="work" />)}
              </div>
              {t.lock && (
                <div style={{ position: "absolute", top: 4, right: 4, padding: "2px 5px", background: "var(--p-warn)", color: "white", fontSize: 9, fontWeight: 700, border: "1px solid var(--p-border)" }}>🔒 LOCK</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{t.branch}</div>
                <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace' }}>{t.path}</div>
              </div>
              <span className="chip">{t.use}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.PlanView = PlanView;
window.RetroView = RetroView;
window.WorktreeView = WorktreeView;
