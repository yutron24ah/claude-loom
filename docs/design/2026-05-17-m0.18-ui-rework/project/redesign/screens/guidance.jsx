// screens/guidance.jsx — learned-guidance audit trail with filter, source jump, diff
(function () {
  const { useScenario, ROSTER, CatSprite } = window;
  const React = window.React;
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function GuidanceScreen() {
    const sc = useScenario();
    const all = (sc.guidance || []).map(g => {
      // Back-fill keyKind / keyPath / writePermission for older fixtures.
      if (g.keyKind) return g;
      const skillMap = {
        "rev":            { keyKind: "skill", keyPath: "skills/loom-review/strategies/single" },
        "rev-code":       { keyKind: "skill", keyPath: "skills/loom-review/strategies/trio/code" },
        "rev-sec":        { keyKind: "skill", keyPath: "skills/loom-review/strategies/trio/security" },
        "rev-test":       { keyKind: "skill", keyPath: "skills/loom-review/strategies/trio/test" },
        "retro-pj":       { keyKind: "skill", keyPath: "skills/loom-retro/lenses/pj-axis" },
        "retro-proc":     { keyKind: "skill", keyPath: "skills/loom-retro/lenses/process-axis" },
        "retro-meta":     { keyKind: "skill", keyPath: "skills/loom-retro/lenses/meta-axis" },
        "retro-research": { keyKind: "skill", keyPath: "skills/loom-retro/lenses/researcher" },
        "retro-counter":  { keyKind: "skill", keyPath: "skills/loom-retro/stages/counter-arguer" },
        "retro-agg":      { keyKind: "skill", keyPath: "skills/loom-retro/stages/aggregator", writePermission: true },
      };
      const persistMap = {
        "pm":       "agents/loom-pm",
        "dev":      "agents/loom-developer",
        "retro-pm": "agents/loom-retro-pm",
      };
      if (persistMap[g.agentId]) return { ...g, keyKind: "agent", keyPath: persistMap[g.agentId] };
      if (skillMap[g.agentId])   return { ...g, ...skillMap[g.agentId] };
      return { ...g, keyKind: "agent", keyPath: `agents/${g.agentId}` };
    });
    const by = ROSTER_BY();
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [scopeFilter, setScopeFilter] = React.useState("all"); // all | agents | loom-review | loom-retro
    const [agentFilter, setAgentFilter] = React.useState("all");
    const [q, setQ] = React.useState("");
    const [diffOpen, setDiffOpen] = React.useState(null);

    const list = all.filter(g => {
      if (activeOnly && !g.active) return false;
      if (agentFilter !== "all" && g.agentId !== agentFilter) return false;
      if (q && !g.text.toLowerCase().includes(q.toLowerCase())) return false;
      if (scopeFilter === "agents")      return g.keyKind === "agent";
      if (scopeFilter === "loom-review") return g.keyPath && g.keyPath.startsWith("skills/loom-review");
      if (scopeFilter === "loom-retro")  return g.keyPath && g.keyPath.startsWith("skills/loom-retro");
      return true;
    });

    const agentIds = Array.from(new Set(all.map(g => g.agentId)));
    const scopeCounts = {
      all: all.length,
      agents: all.filter(g => g.keyKind === "agent").length,
      "loom-review": all.filter(g => g.keyPath?.startsWith("skills/loom-review")).length,
      "loom-retro":  all.filter(g => g.keyPath?.startsWith("skills/loom-retro")).length,
    };

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>❉ GUIDANCE — learned-guidance.md 監査 (PR#18)</div>
          <div style={{ flex: 1 }} />
          <span className="chip">{list.length} / {all.length} entries</span>
        </div>

        {/* scope hierarchy filter — agents (3) vs skill-keyed (10 sub-scope) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, padding: 6,
          background: "var(--p-paper)", border: "2px solid var(--p-border)", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em",
            padding: "3px 6px", borderRight: "1px dashed var(--p-border)" }}>
            SCOPE
          </span>
          {[
            { id: "all", label: "all" },
            { id: "agents", label: "Agents (3)" },
            { id: "loom-review", label: "loom-review" },
            { id: "loom-retro",  label: "loom-retro" },
          ].map(s => (
            <button key={s.id} onClick={() => setScopeFilter(s.id)}
              style={{ all: "unset", cursor: "pointer", padding: "3px 8px", fontSize: 9,
                fontFamily: "ui-monospace, monospace", fontWeight: 700,
                background: scopeFilter === s.id ? "var(--p-accent)" : "var(--p-tint)",
                color: scopeFilter === s.id ? "white" : "var(--p-text)",
                border: "1.5px solid var(--p-border)" }}>
              {s.label} <span style={{ opacity: 0.7 }}>({scopeCounts[s.id]})</span>
            </button>
          ))}
        </div>

        {/* search + agent + active filter */}
        <div style={{ display: "flex", gap: 8, padding: 8, marginBottom: 12,
          background: "var(--p-paper)", border: "2px solid var(--p-border)", alignItems: "center", flexWrap: "wrap" }}>
          <input type="text" placeholder="🔍 search guidance text…"
            value={q} onChange={e => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: "4px 8px", fontSize: 10,
              border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
            style={{ padding: "4px 6px", fontSize: 10, border: "1.5px solid var(--p-border)", background: "var(--p-tint)" }}>
            <option value="all">全 entity</option>
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
                  <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{a?.name || g.agentId}</span>
                    <span style={{ fontSize: 8, padding: "1px 5px",
                      background: g.keyKind === "agent" ? "var(--p-success)" : "var(--p-accent-soft)",
                      color: g.keyKind === "agent" ? "white" : "var(--p-accent)",
                      border: "1px solid var(--p-border)", fontFamily: "ui-monospace, monospace",
                      fontWeight: 700, letterSpacing: "0.04em" }}>
                      {g.keyKind === "agent" ? "AGENT" : "SKILL"}
                    </span>
                    {g.writePermission && (
                      <span style={{ fontSize: 8, padding: "1px 5px", background: "var(--p-warn)",
                        color: "white", border: "1px solid var(--p-border)", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                        WRITE
                      </span>
                    )}
                    <span style={{ fontSize: 8, padding: "1px 5px", background: "var(--p-tint)",
                      border: "1px dashed var(--p-border)", fontFamily: "ui-monospace, monospace",
                      color: "var(--p-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                      {g.keyPath}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>
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
