// screens/guidance.jsx — learned-guidance audit trail with filter, source jump, diff
(function () {
  const { useScenario, ROSTER, CatSprite } = window;
  const React = window.React;
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function GuidanceScreen() {
    const sc = useScenario();
    const all = sc.guidance || [];
    const by = ROSTER_BY();
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [agentFilter, setAgentFilter] = React.useState("all");
    const [q, setQ] = React.useState("");
    const [diffOpen, setDiffOpen] = React.useState(null);

    const list = all.filter(g =>
      (activeOnly ? g.active : true) &&
      (agentFilter === "all" || g.agentId === agentFilter) &&
      (q === "" || g.text.toLowerCase().includes(q.toLowerCase()))
    );

    const agentIds = Array.from(new Set(all.map(g => g.agentId)));

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>❉ GUIDANCE — learned-guidance.md 監査</div>
          <div style={{ flex: 1 }} />
          <span className="chip">{list.length} / {all.length} entries</span>
        </div>

        {/* filter bar */}
        <div style={{ display: "flex", gap: 8, padding: 8, marginBottom: 12,
          background: "var(--p-paper)", border: "2px solid var(--p-border)", alignItems: "center", flexWrap: "wrap" }}>
          <input type="text" placeholder="🔍 search guidance text…"
            value={q} onChange={e => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: "4px 8px", fontSize: 10,
              border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
            style={{ padding: "4px 6px", fontSize: 10, border: "1.5px solid var(--p-border)", background: "var(--p-tint)" }}>
            <option value="all">全 agent</option>
            {agentIds.map(id => <option key={id} value={id}>{by[id]?.name || id}</option>)}
          </select>
          <label style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} /> active のみ
          </label>
        </div>

        {/* timeline */}
        {list.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", border: "2px dashed var(--p-border)",
            background: "var(--p-paper)", fontSize: 10, color: "var(--p-text-muted)" }}>
            条件にマッチする guidance はありません
          </div>
        )}
        {list.map((g, i) => {
          const a = by[g.agentId];
          return (
            <div key={i} style={{ marginBottom: 10, background: "var(--p-paper)",
              border: "2px solid var(--p-border)", padding: 10, opacity: g.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                {a && <CatSprite size={26} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{a?.name || g.agentId}</div>
                  <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>
                    {g.addedAt} · category: {g.category} · scope: <b>{g.scope}</b> · used {g.useCount}× · ttl: {g.ttl}
                  </div>
                </div>
                {!g.active && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px",
                  background: "var(--p-stone)", color: "white", border: "1px solid var(--p-border)" }}>EXPIRED</span>}
              </div>
              <div style={{ fontSize: 11, padding: 8, background: "var(--p-tint)",
                border: "1.5px solid var(--p-border)", lineHeight: 1.5, marginBottom: 6 }}>
                {g.text}
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 9, alignItems: "center" }}>
                <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px" }}>
                  ↗ source: {g.from}
                </button>
                {g.diff && (
                  <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px" }}
                    onClick={() => setDiffOpen(o => o === i ? null : i)}>
                    {diffOpen === i ? "▾" : "▸"} 前 version との diff
                  </button>
                )}
                <span style={{ flex: 1 }} />
                {g.active && <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px", color: "var(--p-text-muted)" }}>retire</button>}
              </div>
              {diffOpen === i && g.diff && (
                <div style={{ marginTop: 8, fontSize: 10, fontFamily: "ui-monospace, monospace" }}>
                  <div style={{ padding: 6, background: "rgba(220,80,80,0.12)", border: "1px solid var(--p-error)", marginBottom: 4 }}>
                    <span style={{ color: "var(--p-error)", fontWeight: 700 }}>− </span>{g.diff.before}
                  </div>
                  <div style={{ padding: 6, background: "rgba(80,180,120,0.12)", border: "1px solid var(--p-success)" }}>
                    <span style={{ color: "var(--p-success)", fontWeight: 700 }}>+ </span>{g.diff.after}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  window.GuidanceScreen = GuidanceScreen;
})();
