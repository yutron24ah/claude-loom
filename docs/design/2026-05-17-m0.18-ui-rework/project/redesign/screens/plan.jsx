// screens/plan.jsx — plan editor + done archive (drill-down, NOT a poster duplicate)
(function () {
  const { useScenario } = window;
  const React = window.React;
  const ST_COLOR = { completed: "var(--p-success)", in_progress: "var(--p-warn)", pending: "var(--p-stone)" };
  const ST_GLYPH = { completed: "✓", in_progress: "◐", pending: "○" };

  function PlanScreen() {
    const sc = useScenario();
    const [tab, setTab] = React.useState("active");

    const ms = sc.milestones;
    const todos = sc.todos;
    const archive = ms.filter(m => m.progress >= 1);
    const activeMs = ms.filter(m => m.progress < 1);

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>≡ PLAN — plan_items.json + TodoWrite</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", border: "2px solid var(--p-border)" }}>
            {[["active","現行"],["done","完了 archive"],["edit","編集"]].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ all: "unset", cursor: "pointer", padding: "3px 10px", fontSize: 9, fontWeight: 700,
                  background: tab === k ? "var(--p-accent)" : "var(--p-tint)",
                  color: tab === k ? "white" : "var(--p-text)",
                  borderRight: "1px solid var(--p-border)" }}>{l}</button>
            ))}
          </div>
          <button className="btn-px primary" style={{ fontSize: 9, padding: "3px 8px" }}>+ milestone</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "flex-start" }}>
          {/* LEFT — milestones */}
          <div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>
              {tab === "done" ? "DONE ARCHIVE" : "ACTIVE MILESTONES"}
            </div>
            {(tab === "done" ? archive : activeMs).length === 0 && (
              <div style={{ padding: 30, textAlign: "center", border: "2px dashed var(--p-border)",
                background: "var(--p-paper)", fontSize: 10, color: "var(--p-text-muted)" }}>
                {tab === "done" ? "完了 milestone はまだありません" : "active な milestone はありません"}
              </div>
            )}
            {(tab === "done" ? archive : activeMs).map(m => (
              <div key={m.id} style={{ padding: 12, marginBottom: 8, background: "var(--p-paper)",
                border: "2px solid var(--p-border)", boxShadow: "3px 3px 0 0 var(--p-shadow)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{m.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{m.title}</span>
                  <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{m.count}</span>
                  {tab === "edit" && <button className="btn-px ghost" style={{ fontSize: 9, padding: "2px 6px" }}>edit</button>}
                </div>
                <div style={{ height: 6, background: "var(--p-tint)", border: "1px solid var(--p-border)", marginBottom: 8 }}>
                  <div style={{ width: `${m.progress*100}%`, height: "100%", background: m.progress >= 1 ? "var(--p-success)" : "var(--p-accent)" }} />
                </div>
                {m.children.map((c,i) => (
                  <div key={i} style={{ display: "flex", gap: 6, fontSize: 10, padding: "2px 0", alignItems: "center" }}>
                    <span style={{ color: ST_COLOR[c.st], fontFamily: "ui-monospace, monospace", width: 12 }}>{ST_GLYPH[c.st]}</span>
                    <span style={{ flex: 1, textDecoration: c.st === "completed" ? "line-through" : "none",
                      color: c.st === "completed" ? "var(--p-text-muted)" : "var(--p-text)" }}>{c.t}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* RIGHT — TodoWrite mirror */}
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 10,
            position: "sticky", top: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", flex: 1 }}>TODOS — TodoWrite mirror</div>
              <span style={{ fontSize: 8, color: "var(--p-text-muted)" }}>updated: {sc.todosUpdatedAt}</span>
            </div>
            {todos.map((t,i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, padding: "5px 0",
                borderBottom: i < todos.length-1 ? "1px dashed var(--p-border)" : "none", alignItems: "flex-start" }}>
                <span style={{ color: ST_COLOR[t.status], fontFamily: "ui-monospace, monospace",
                  width: 14, flexShrink: 0, paddingTop: 1 }}>{ST_GLYPH[t.status]}</span>
                <span style={{ flex: 1, lineHeight: 1.4,
                  textDecoration: t.status === "completed" ? "line-through" : "none",
                  color: t.status === "completed" ? "var(--p-text-muted)" : "var(--p-text)" }}>{t.text}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: 6, fontSize: 9, color: "var(--p-text-muted)",
              background: "var(--p-tint)", border: "1px dashed var(--p-border)", lineHeight: 1.5 }}>
              ◆ TodoWrite tool が呼ばれる度に上書き同期。<br />
              ◆ ここは read-only mirror、編集は milestone 側で。
            </div>
          </div>
        </div>
      </div>
    );
  }
  window.PlanScreen = PlanScreen;
})();
