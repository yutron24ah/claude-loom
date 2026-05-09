// screens/agent-detail.jsx — drawer overlay invoked from RoomView click
// Renders as a fixed right-side drawer with the agent's full timeline.
(function () {
  const { useScenario, ROSTER, CatSprite, STATUS_COLOR } = window;
  const React = window.React;
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function AgentDetailDrawer({ agentId, onClose }) {
    const sc = useScenario();
    if (!agentId) return null;
    const a = ROSTER_BY()[agentId];
    const state = sc.agents[agentId] || {};
    const guidance = (sc.guidance || []).filter(g => g.agentId === agentId);
    const ganttRows = (sc.gantt?.rows || []).filter(r => r.agentId === agentId);
    const streamForAgent = (sc.stream || []).filter(s => s.who === a?.name);

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "auto" }}>
        <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420,
          background: "var(--p-paper)", borderLeft: "3px solid var(--p-border)",
          boxShadow: "-4px 0 0 0 var(--p-shadow)", display: "flex", flexDirection: "column" }}>
          {/* header */}
          <div style={{ padding: "10px 14px", borderBottom: "2px solid var(--p-border)",
            display: "flex", alignItems: "center", gap: 10, background: "var(--p-tint)" }}>
            {a && <CatSprite size={36} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{a?.name || agentId}</div>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>{agentId}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", border: "1.5px solid var(--p-border)",
              background: STATUS_COLOR[state.status] || "var(--p-stone)", color: "white",
              textTransform: "uppercase", letterSpacing: "0.06em" }}>{state.status || "—"}</span>
            <button onClick={onClose} className="btn-px ghost" style={{ fontSize: 12, padding: "2px 8px" }}>✕</button>
          </div>

          {/* body */}
          <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
            {/* current */}
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>NOW</div>
            <div style={{ padding: 10, background: "var(--p-bg-sky)", border: "1.5px solid var(--p-border)", marginBottom: 14, fontSize: 11 }}>
              {state.currentTool && <div style={{ marginBottom: 4 }}>
                <span style={{ background: "var(--p-warn)", color: "white", padding: "1px 5px", fontSize: 8, fontWeight: 700, marginRight: 4 }}>TOOL</span>
                <code>{state.currentTool}</code>
              </div>}
              {state.currentReasoning && <div style={{ fontStyle: "italic", color: "var(--p-text)", lineHeight: 1.5 }}>"{state.currentReasoning}"</div>}
              {!state.currentTool && !state.currentReasoning && <div style={{ color: "var(--p-text-muted)" }}>idle. last seen: {state.lastSeenAt}</div>}
            </div>

            {/* gantt history */}
            {ganttRows.length > 0 && <>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>RECENT DISPATCHES</div>
              <div style={{ marginBottom: 14 }}>
                {ganttRows.map((r,i) => (
                  <div key={i} style={{ padding: "5px 8px", border: "1px solid var(--p-border)",
                    background: "var(--p-bg-sky)", fontSize: 10, marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>⌗{r.worktree}</span>
                      <span style={{ flex: 1 }}>{r.label}</span>
                      {r.live && <span style={{ color: "var(--p-success)", fontWeight: 700, fontSize: 9 }}>● LIVE</span>}
                    </div>
                    <div style={{ position: "relative", height: 6, marginTop: 4, background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
                      {r.bars.map((b,j) => (
                        <div key={j} style={{ position: "absolute", left: `${b.s}%`, width: `${b.e-b.s}%`,
                          top: 0, bottom: 0, background: b.kind === "fail" ? "var(--p-error)" :
                          b.kind === "review" ? "var(--p-accent)" : b.kind === "tdd" ? "var(--p-warn)" : "var(--p-success)" }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>}

            {/* stream tail */}
            {streamForAgent.length > 0 && <>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>STREAM TAIL</div>
              <div style={{ marginBottom: 14, background: "var(--p-bg-sky)", border: "1.5px solid var(--p-border)", padding: 8 }}>
                {streamForAgent.map((s,i) => (
                  <div key={i} style={{ fontSize: 10, padding: "3px 0", borderBottom: i < streamForAgent.length-1 ? "1px dashed var(--p-border)" : "none" }}>
                    <span style={{ color: "var(--p-text-muted)", fontSize: 8, marginRight: 4, fontFamily: "ui-monospace, monospace" }}>{s.ts}</span>
                    {s.tool && <span style={{ background: "var(--p-warn)", color: "white", padding: "0 4px", fontSize: 8, fontWeight: 700, marginRight: 4 }}>{s.tool}</span>}
                    <span style={{ fontStyle: s.kind === "reason" ? "italic" : "normal" }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </>}

            {/* guidance */}
            {guidance.length > 0 && <>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>LEARNED GUIDANCE ({guidance.length})</div>
              <div>
                {guidance.map((g,i) => (
                  <div key={i} style={{ padding: 8, marginBottom: 4, fontSize: 10,
                    background: "var(--p-bg-sky)", border: "1.5px solid var(--p-border)",
                    opacity: g.active ? 1 : 0.5, lineHeight: 1.4 }}>
                    <div style={{ fontSize: 8, color: "var(--p-text-muted)", marginBottom: 2 }}>
                      {g.addedAt} · {g.category} · used {g.useCount}×
                    </div>
                    {g.text}
                  </div>
                ))}
              </div>
            </>}
          </div>
        </div>
      </div>
    );
  }
  window.AgentDetailDrawer = AgentDetailDrawer;
})();
