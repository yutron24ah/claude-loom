// screens/consistency.jsx — full findings page with empty/running/has-findings states
(function () {
  const { useScenario } = window;
  const React = window.React;
  const SEV = { high: "var(--p-error)", medium: "var(--p-warn)", low: "var(--p-stone)" };

  function ConsistencyScreen() {
    const sc = useScenario();
    const fs = sc.findings || [];
    const [filter, setFilter] = React.useState("all");
    const [running, setRunning] = React.useState(false);

    const list = filter === "all" ? fs : fs.filter(f => f.status === filter);
    const counts = {
      open: fs.filter(f => f.status === "open").length,
      ack: fs.filter(f => f.status === "ack").length,
      fixed: fs.filter(f => f.status === "fixed").length,
      dismissed: fs.filter(f => f.status === "dismissed").length,
    };

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📜 整合性 — Consistency Findings</div>
          <span className="chip">since: 2 hours ago</span>
          <div style={{ flex: 1 }} />
          <button className="btn-px primary" onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 1500); }}>
            {running ? "▶ 実行中…" : "▶ チェック実行"}
          </button>
        </div>

        {/* state: running */}
        {running && (
          <div style={{ padding: 14, border: "2px dashed var(--p-warn)", background: "var(--p-paper)", marginBottom: 12, fontSize: 11 }}>
            <b>spec_diff 実行中</b> — agents/ skills/ docs/ を scan 中…
            <div style={{ marginTop: 6, height: 6, background: "var(--p-tint)", border: "1px solid var(--p-border)", overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", background: "var(--p-warn)", animation: "pulse 1s infinite" }} />
            </div>
          </div>
        )}

        {/* state: empty */}
        {!running && fs.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", border: "2px solid var(--p-border)", background: "var(--p-paper)" }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📭</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>整合性違反は検出されていません</div>
            <div style={{ fontSize: 10, color: "var(--p-text-muted)" }}>
              SPEC.md と agent/skill prompts を最後に scan した結果。<br />
              新しい変更が入ると自動的に検出されます。
            </div>
          </div>
        )}

        {/* state: has-findings */}
        {!running && fs.length > 0 && (<>
          {/* summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {[
              { lbl: "OPEN", n: counts.open, c: "var(--p-error)" },
              { lbl: "ACK", n: counts.ack, c: "var(--p-warn)" },
              { lbl: "FIXED", n: counts.fixed, c: "var(--p-success)" },
              { lbl: "DISMISSED", n: counts.dismissed, c: "var(--p-stone)" },
            ].map(s => (
              <button key={s.lbl} onClick={() => setFilter(s.lbl.toLowerCase())}
                style={{ all: "unset", cursor: "pointer", padding: 10,
                  background: filter === s.lbl.toLowerCase() ? "var(--p-accent-soft)" : "var(--p-paper)",
                  border: "2px solid " + (filter === s.lbl.toLowerCase() ? "var(--p-accent)" : "var(--p-border)") }}>
                <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em" }}>{s.lbl}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: "ui-monospace, monospace" }}>{s.n}</div>
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 8, display: "flex", gap: 4 }}>
            <button className={"btn-px " + (filter === "all" ? "primary" : "ghost")} onClick={() => setFilter("all")} style={{ fontSize: 9, padding: "3px 8px" }}>all ({fs.length})</button>
          </div>

          {/* finding cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map(f => (
              <div key={f.id} style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)",
                padding: 12, opacity: f.status === "fixed" || f.status === "dismissed" ? 0.55 : 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px",
                    background: SEV[f.sev], color: "white", border: "2px solid var(--p-border)",
                    textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{f.sev}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{f.id}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</span>
                      {f.status !== "open" && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px",
                          background: f.status === "fixed" ? "var(--p-success)" : f.status === "ack" ? "var(--p-warn)" : "var(--p-stone)",
                          color: "white", border: "1px solid var(--p-border)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.status}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "var(--p-accent)", marginBottom: 4 }}>
                      {f.file} <span style={{ color: "var(--p-text-muted)" }}>{f.lines}</span>
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{f.detail}</div>
                    <div style={{ fontSize: 10, padding: "6px 8px", background: "var(--p-tint)",
                      border: "1px dashed var(--p-border)" }}>
                      <span style={{ fontWeight: 700, color: "var(--p-success)" }}>提案 ▶</span> {f.suggest}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
                      <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px" }}>📂 Open</button>
                      {f.status === "open" && <button className="btn-px primary" style={{ fontSize: 9, padding: "3px 6px" }}>📌 Acknowledge</button>}
                      {(f.status === "open" || f.status === "ack") && <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px" }}>✓ Mark Fixed</button>}
                      {f.status === "open" && <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 6px", color: "var(--p-text-muted)" }}>✕ Dismiss</button>}
                      <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--p-text-muted)" }}>{f.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    );
  }
  window.ConsistencyScreen = ConsistencyScreen;
})();
