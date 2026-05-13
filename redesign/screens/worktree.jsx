// screens/worktree.jsx — worktree management (NOT layout/posters; that's in Room)
(function () {
  const { useScenario, ROSTER, CatSprite } = window;
  const React = window.React;
  const USE_COLOR = {
    primary:    "var(--p-accent)",
    parallel:   "var(--p-success)",
    experiment: "var(--p-warn)",
    hotfix:     "var(--p-error)",
  };
  const ST_COLOR = {
    busy:   "var(--p-success)",
    review: "var(--p-accent)",
    failed: "var(--p-error)",
    idle:   "var(--p-stone)",
  };
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function WorktreeScreen() {
    const sc = useScenario();
    const wts = sc.worktrees || [];
    const by = ROSTER_BY();
    const totalDisk = wts.reduce((a,w) => a + w.diskMB, 0);
    const [showCreate, setShowCreate] = React.useState(false);

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>⌗ WORKTREES — git worktree 管理</div>
          <span className="chip">{wts.length} active</span>
          <span className="chip">{(totalDisk/1024).toFixed(1)} GB on disk</span>
          <div style={{ flex: 1 }} />
          <button className="btn-px primary" style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setShowCreate(true)}>+ 新 worktree</button>
        </div>

        {/* branch graph (simplified) */}
        <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>BRANCH GRAPH (relative to main)</div>
          <div style={{ position: "relative", paddingLeft: 80, fontFamily: "ui-monospace, monospace", fontSize: 10 }}>
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "var(--p-accent)" }} />
            {wts.map((w,i) => {
              const isMain = w.branch === "main";
              return (
                <div key={w.branch} style={{ position: "relative", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ position: "absolute", left: -76, width: 16, height: 16, top: "50%", marginTop: -8,
                    background: USE_COLOR[w.use] || "var(--p-stone)", border: "2px solid var(--p-border)" }} />
                  {!isMain && <span style={{ position: "absolute", left: -60, top: "50%", width: 50, height: 2, background: "var(--p-border)" }} />}
                  <span style={{ fontWeight: 700 }}>{w.branch}</span>
                  <span style={{ color: "var(--p-text-muted)" }}>· {w.lastCommit}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* table */}
        <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 1fr 1.2fr 80px 80px",
            fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em",
            padding: "6px 10px", borderBottom: "2px solid var(--p-border)", background: "var(--p-tint)" }}>
            <span>BRANCH / PATH</span><span>USE</span><span>PARENT AGENT</span><span>LAST COMMIT</span><span style={{ textAlign: "right" }}>DISK</span><span style={{ textAlign: "right" }}>ACTIONS</span>
          </div>
          {wts.map(w => {
            const a = by[w.parentAgent];
            return (
              <div key={w.branch} style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 1fr 1.2fr 80px 80px",
                alignItems: "center", padding: "8px 10px", borderBottom: "1px dashed var(--p-border)",
                fontSize: 10, gap: 6 }}>
                <div style={{ minWidth: 0, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ width: 7, height: 7, background: ST_COLOR[w.status] || "var(--p-stone)",
                    border: "1px solid var(--p-border)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {w.branch} {w.locked && <span title="locked" style={{ marginLeft: 4 }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: 8, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.path}</div>
                  </div>
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", display: "inline-block",
                  background: USE_COLOR[w.use] || "var(--p-stone)", color: "white",
                  border: "1.5px solid var(--p-border)", textTransform: "uppercase", letterSpacing: "0.04em",
                  width: "fit-content" }}>{w.use}</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {a && <CatSprite size={18} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                  <span style={{ fontSize: 10 }}>{a?.name || w.parentAgent}</span>
                </div>
                <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.lastCommit}</span>
                <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", textAlign: "right", color: "var(--p-text-muted)" }}>
                  {w.diskMB} MB
                </span>
                <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                  <button className="btn-px ghost" title={w.locked ? "unlock" : "lock"} style={{ fontSize: 10, padding: "1px 4px" }}>{w.locked ? "🔓" : "🔒"}</button>
                  <button className="btn-px ghost" title="destroy" style={{ fontSize: 10, padding: "1px 4px", color: "var(--p-error)" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div style={{ marginTop: 10, padding: "8px 10px", fontSize: 9, color: "var(--p-text-muted)",
          background: "var(--p-paper)", border: "2px dashed var(--p-border)", lineHeight: 1.6 }}>
          ◆ <b>USE</b>: primary (本番), parallel (並列開発), experiment (実験), hotfix (緊急修正) — SKILL.md §5用途と一致<br />
          ◆ Room の poster 並びはここで管理する worktree から派生。Room 側は read-only な「並べ替え」のみ。
        </div>

        {/* create dialog */}
        {showCreate && (
          <div onClick={() => setShowCreate(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 100 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 380, padding: 16,
              background: "var(--p-paper)", border: "3px solid var(--p-border)", boxShadow: "5px 5px 0 0 var(--p-shadow)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>＋ 新 worktree</div>
              <div style={{ fontSize: 10, color: "var(--p-text-muted)", marginBottom: 6 }}>BRANCH NAME</div>
              <input type="text" placeholder="feat/something" style={{ width: "100%", padding: 6, fontSize: 11,
                border: "2px solid var(--p-border)", background: "var(--p-tint)", marginBottom: 10, fontFamily: "ui-monospace, monospace" }} />
              <div style={{ fontSize: 10, color: "var(--p-text-muted)", marginBottom: 6 }}>USE</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {Object.keys(USE_COLOR).map(u => (
                  <button key={u} className="btn-px ghost" style={{ fontSize: 9, padding: "3px 8px",
                    background: USE_COLOR[u], color: "white" }}>{u}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn-px ghost" onClick={() => setShowCreate(false)}>cancel</button>
                <button className="btn-px primary" onClick={() => setShowCreate(false)}>作成</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  window.WorktreeScreen = WorktreeScreen;
})();
