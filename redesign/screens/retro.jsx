// screens/retro.jsx — retro session player
// data: scenario.retroSession = { id, title, transcript[], findings[], lenses[], actionPlan, verdict }
(function () {
  const { useScenario, ROSTER, CatSprite } = window;
  const React = window.React;
  const SEV = { high: "var(--p-error)", med: "var(--p-warn)", low: "var(--p-stone)" };
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function fmt(sec) { const m = Math.floor(sec/60), s = sec%60; return `${m}:${String(s).padStart(2,"0")}`; }

  function RetroScreen() {
    const sc = useScenario();
    const r = sc.retroSession;
    const by = ROSTER_BY();
    const [cursor, setCursor] = React.useState(r.transcript.length - 1);
    const visible = r.transcript.slice(0, cursor + 1);
    const dur = r.durationSec;

    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--p-bg-sky)", display: "grid",
        gridTemplateColumns: "1fr 360px", gap: 12, padding: 16, overflow: "hidden" }}>

        {/* LEFT — transcript player */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>🔮 {r.title}</div>
            <span className="chip">verdict: <b style={{ color: r.verdict === "PASS" ? "var(--p-success)" : "var(--p-error)" }}>{r.verdict}</b></span>
            <span className="chip">{Math.floor(dur/60)} min</span>
            <div style={{ flex: 1 }} />
            <button className="btn-px ghost">archive →</button>
            <button className="btn-px primary">+ 新 retro</button>
          </div>

          {/* lens summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
            {r.lenses.map(l => {
              const a = by[l.id];
              return (
                <div key={l.id} style={{ padding: 8, border: "2px solid var(--p-border)",
                  background: l.isUser ? "var(--p-accent-soft)" : "var(--p-paper)" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {a ? <CatSprite size={26} fur={a.fur} hat={a.hat} pose="sit" />
                       : <span style={{ fontSize: 18 }}>👤</span>}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.lensName}</div>
                      <div style={{ fontSize: 8, color: "var(--p-text-muted)" }}>{l.count} 件</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {l.sev.map((s,i) => (
                      <span key={i} style={{ width: 12, height: 12, background: SEV[s], border: "1px solid var(--p-border)" }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* transcript scroll */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "2px solid var(--p-border)",
            background: "var(--p-paper)", padding: 10 }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 8 }}>SESSION TRANSCRIPT (session.jsonl)</div>
            {visible.map((t,i) => {
              const a = by[t.who];
              const kindColor = t.kind === "finding" ? SEV[t.sev] || "var(--p-warn)"
                : t.kind === "verdict" ? "var(--p-success)"
                : t.kind === "rebuttal" ? "var(--p-accent)" : "var(--p-stone)";
              return (
                <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0",
                  borderBottom: "1px dashed var(--p-border)", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace", width: 36, flexShrink: 0 }}>{fmt(t.ts)}</span>
                  <div style={{ flexShrink: 0, width: 22 }}>
                    {a ? <CatSprite size={22} fur={a.fur} hat={a.hat} pose="sit" />
                       : <span style={{ fontSize: 14 }}>👤</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9 }}>
                      <b>{a?.name || t.who}</b>
                      <span style={{ marginLeft: 6, padding: "0 4px", background: kindColor, color: "white", fontSize: 8, fontWeight: 700, letterSpacing: "0.04em" }}>{t.kind}</span>
                      {t.refId && <span style={{ marginLeft: 6, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{t.refId}</span>}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>{t.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* timeline scrubber */}
          <div style={{ marginTop: 8, padding: "6px 10px", border: "2px solid var(--p-border)",
            background: "var(--p-paper)", display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-px ghost" onClick={() => setCursor(c => Math.max(0,c-1))}>◂</button>
            <input type="range" min="0" max={r.transcript.length-1} value={cursor}
              onChange={e => setCursor(+e.target.value)} style={{ flex: 1 }} />
            <button className="btn-px ghost" onClick={() => setCursor(c => Math.min(r.transcript.length-1,c+1))}>▸</button>
            <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>
              {cursor+1}/{r.transcript.length}
            </span>
          </div>
        </div>

        {/* RIGHT — findings + action plan */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 10 }}>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "2px solid var(--p-border)",
            background: "var(--p-paper)", padding: 10 }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 8 }}>
              FINDINGS — retro 産出物
            </div>
            {r.findings.map(f => (
              <div key={f.id} style={{ padding: 8, marginBottom: 6, border: "1.5px solid var(--p-border)",
                background: "var(--p-tint)" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ width: 8, height: 22, background: SEV[f.sev] }} />
                  <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{f.id}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>{f.title}</span>
                </div>
                <div style={{ fontSize: 9, color: "var(--p-text-muted)", marginBottom: 6, fontFamily: "ui-monospace, monospace" }}>
                  {f.lens} · {f.target} · {f.status}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-px success" style={{ fontSize: 8, padding: "2px 6px" }}>accept</button>
                  <button className="btn-px ghost" style={{ fontSize: 8, padding: "2px 6px" }}>defer</button>
                  <button className="btn-px ghost" style={{ fontSize: 8, padding: "2px 6px" }}>dismiss</button>
                </div>
              </div>
            ))}
          </div>
          {/* action plan summary */}
          <div style={{ border: "2px solid var(--p-border)", background: "var(--p-paper)", padding: 10 }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>
              ACTION PLAN — aggregator が確定
            </div>
            {[
              { lbl: "IMMEDIATE", n: r.actionPlan.immediate, c: "var(--p-error)" },
              { lbl: "MILESTONE", n: r.actionPlan.milestone, c: "var(--p-warn)" },
              { lbl: "DEFERRED",  n: r.actionPlan.deferred,  c: "var(--p-stone)" },
            ].map(b => (
              <div key={b.lbl} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", width: 80 }}>{b.lbl}</span>
                <div style={{ flex: 1, height: 8, background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
                  <div style={{ width: `${b.n*20}%`, height: "100%", background: b.c }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: b.c, width: 24, textAlign: "right" }}>{b.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  window.RetroScreen = RetroScreen;
})();
