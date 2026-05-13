// screens/gantt.jsx — full-page Gantt
// data: scenario.gantt = { windowLabel, nowPct, rows: [{worktree, agentId, label, bars, live}] }
// rows are grouped by worktree (collapsible). 1 row = 1 subagent dispatch.
(function () {
  const { useScenario, ROSTER, CatSprite, STATUS_COLOR } = window;
  const React = window.React;

  const KIND_COLOR = {
    busy:   "var(--p-success)",
    review: "var(--p-accent)",
    tdd:    "var(--p-warn)",
    fail:   "var(--p-error)",
  };
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function GanttScreen() {
    const sc = useScenario();
    const { gantt } = sc;
    const by = ROSTER_BY();
    const groups = {};
    gantt.rows.forEach(r => { (groups[r.worktree] ||= []).push(r); });
    const wts = Object.keys(groups);
    const [collapsed, setCollapsed] = React.useState({});
    const [zoom, setZoom] = React.useState("30m");

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>❖ GANTT — agent_history</div>
          <span className="chip">{gantt.windowLabel}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", border: "2px solid var(--p-border)" }}>
            {["30m","1h","4h","all"].map(z => (
              <button key={z} onClick={() => setZoom(z)}
                style={{ all: "unset", cursor: "pointer", padding: "3px 10px", fontSize: 9, fontWeight: 700,
                  background: z === zoom ? "var(--p-accent)" : "var(--p-tint)",
                  color: z === zoom ? "white" : "var(--p-text)",
                  borderRight: "1px solid var(--p-border)" }}>{z}</button>
            ))}
          </div>
        </div>

        {/* time axis */}
        <div style={{ display: "flex", paddingLeft: 200, marginBottom: 6, fontSize: 9, color: "var(--p-text-muted)" }}>
          {["-30m","-22m","-15m","-7m","now"].map((t,i,a) => (
            <div key={t} style={{ width: `${100/(a.length-1)}%`, textAlign: i===0?"left":"center" }}>{t}</div>
          ))}
        </div>

        {wts.map(wt => {
          const isCol = collapsed[wt];
          const rows = groups[wt];
          return (
            <div key={wt} style={{ marginBottom: 8, border: "2px solid var(--p-border)", background: "var(--p-paper)" }}>
              {/* worktree header */}
              <div onClick={() => setCollapsed(c => ({ ...c, [wt]: !c[wt] }))}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  background: "var(--p-tint)", borderBottom: "1px solid var(--p-border)",
                  cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>
                <span style={{ width: 10 }}>{isCol ? "▸" : "▾"}</span>
                <span>⌗ {wt}</span>
                <span style={{ color: "var(--p-text-muted)", fontWeight: 400 }}>({rows.length} subagent{rows.length>1?"s":""})</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--p-text-muted)" }}>
                  {rows.some(r => r.live) ? "● LIVE" : "—"}
                </span>
              </div>
              {/* rows */}
              {!isCol && rows.map((r,i) => {
                const a = by[r.agentId];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", height: 36,
                    borderTop: i ? "1px dashed var(--p-border)" : "none" }}>
                    <div style={{ width: 200, display: "flex", alignItems: "center", gap: 6, padding: "0 10px" }}>
                      {a && <CatSprite size={22} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700 }}>{a?.name || r.agentId}</div>
                        <div style={{ fontSize: 8, color: "var(--p-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                      </div>
                    </div>
                    <div style={{ position: "relative", flex: 1, height: 24, background: "var(--p-tint)",
                      border: "1px solid var(--p-border)", marginRight: 16 }}>
                      {[25,50,75].map(p => <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "var(--p-border)", opacity: 0.3 }} />)}
                      {r.bars.map((b,j) => (
                        <div key={j} title={`${r.label} (${b.kind})`} style={{
                          position: "absolute", left: `${b.s}%`, width: `${b.e-b.s}%`, top: 4, bottom: 4,
                          background: KIND_COLOR[b.kind] || "var(--p-stone)",
                          border: "1px solid var(--p-border)",
                          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 3px, transparent 3px 6px)",
                          display: "flex", alignItems: "center", paddingLeft: 4,
                          fontSize: 8, color: "white", fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap",
                        }}>{b.kind}</div>
                      ))}
                      {r.live && (
                        <span style={{ position: "absolute", right: `${100-gantt.nowPct}%`, top: -4 }}>
                          <CatSprite size={22} fur={a?.fur||"#aaa"} hat={a?.hat} pose="walk" />
                        </span>
                      )}
                      <div style={{ position: "absolute", left: `${gantt.nowPct}%`, top: -2, bottom: -2, width: 2, background: "var(--p-error)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ marginTop: 12, padding: "8px 12px", fontSize: 9, color: "var(--p-text-muted)",
          background: "var(--p-paper)", border: "2px dashed var(--p-border)", lineHeight: 1.5 }}>
          ◆ <b>F-12 解決</b>: row = 1 subagent dispatch、worktree は折りたたみグループ。SPEC §3.6.5 の subagent-row 流儀に統一。<br />
          ◆ live 中の dispatch には歩く猫 🐈 を bar の右端に重ねて、stream/poster と視線を一致させる。
        </div>
      </div>
    );
  }
  window.GanttScreen = GanttScreen;
})();
