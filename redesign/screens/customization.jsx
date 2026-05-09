// screens/customization.jsx — per-agent model + personality with scope chain trace
(function () {
  const { useScenario, ROSTER, PRESETS, MODELS, CatSprite } = window;
  const React = window.React;

  function CustomizationScreen() {
    const sc = useScenario();
    const cust = sc.customization;
    const roster = window.ROSTER || [];
    const [open, setOpen] = React.useState(null); // agentId for chain detail
    const [dirty, setDirty] = React.useState(false);

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>✦ CUSTOMIZATION — agent ごとの model + personality</div>
          <div style={{ flex: 1 }} />
          {dirty && <span style={{ fontSize: 9, color: "var(--p-warn)", fontWeight: 700 }}>● 未保存変更あり</span>}
          <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setDirty(false)}>取消</button>
          <button className={"btn-px " + (dirty ? "primary" : "ghost")} style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setDirty(false)}>保存</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "flex-start" }}>
          {/* LEFT — agent table */}
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1.4fr 60px",
              fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em",
              padding: "6px 10px", borderBottom: "2px solid var(--p-border)", background: "var(--p-tint)" }}>
              <span>AGENT</span><span>MODEL</span><span>PERSONALITY</span><span style={{ textAlign: "right" }}>CHAIN</span>
            </div>
            {roster.map(a => {
              const c = cust[a.id];
              if (!c) return null;
              const eff = c.effective;
              const preset = PRESETS.find(p => p.id === eff.preset) || PRESETS[0];
              const overridden = c.chain.length > 1;
              return (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1.4fr 60px",
                  alignItems: "center", padding: "6px 10px", borderBottom: "1px dashed var(--p-border)",
                  background: open === a.id ? "var(--p-accent-soft)" : "transparent" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <CatSprite size={22} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                      <div style={{ fontSize: 8, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>{a.id}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {MODELS.map(m => (
                      <button key={m.id} onClick={() => setDirty(true)}
                        style={{ all: "unset", cursor: "pointer", padding: "2px 8px", fontSize: 9, fontWeight: 700,
                          border: "1.5px solid var(--p-border)",
                          background: m.id === eff.model ? m.color : "var(--p-tint)",
                          color: m.id === eff.model ? "white" : "var(--p-text)" }}>{m.id}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {PRESETS.map(p => (
                      <button key={p.id} onClick={() => setDirty(true)} title={p.desc}
                        style={{ all: "unset", cursor: "pointer", padding: "2px 6px", fontSize: 9,
                          border: "1.5px solid var(--p-border)",
                          background: p.id === eff.preset ? "var(--p-accent)" : "var(--p-tint)",
                          color: p.id === eff.preset ? "white" : "var(--p-text)" }}>{p.emoji} {p.name}</button>
                    ))}
                  </div>
                  <button onClick={() => setOpen(o => o === a.id ? null : a.id)}
                    style={{ all: "unset", cursor: "pointer", textAlign: "right", fontSize: 9, fontWeight: 700,
                      color: overridden ? "var(--p-warn)" : "var(--p-text-muted)" }}>
                    {c.chain.length} ▸
                  </button>
                </div>
              );
            })}
          </div>

          {/* RIGHT — scope chain detail */}
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 10,
            position: "sticky", top: 16 }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 8 }}>
              SCOPE CHAIN — 有効値の出処
            </div>
            {!open && (
              <div style={{ fontSize: 10, color: "var(--p-text-muted)", lineHeight: 1.5 }}>
                行右端の <b>▸</b> をクリックすると、その agent の<br />
                <code>default → user → project → effective</code><br />
                の重ね順を表示します。
              </div>
            )}
            {open && cust[open] && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                  {roster.find(a => a.id === open)?.name || open}
                </div>
                {cust[open].chain.map((step, i, arr) => {
                  const isLast = i === arr.length - 1;
                  const c = step.scope === "default" ? "var(--p-stone)"
                    : step.scope === "user" ? "var(--p-accent)" : "var(--p-warn)";
                  return (
                    <div key={i} style={{ position: "relative", paddingLeft: 14, paddingBottom: isLast ? 0 : 12 }}>
                      <span style={{ position: "absolute", left: 0, top: 4, width: 8, height: 8,
                        background: c, border: "1.5px solid var(--p-border)" }} />
                      {!isLast && <span style={{ position: "absolute", left: 3, top: 14, bottom: 0, width: 2, background: "var(--p-border)" }} />}
                      <div style={{ fontSize: 9, fontWeight: 700, color: c, letterSpacing: "0.06em" }}>{step.scope.toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: "var(--p-text)", marginTop: 2 }}>
                        {step.model && <span>model: <b>{step.model}</b></span>}
                        {step.model && step.preset && " · "}
                        {step.preset && <span>preset: <b>{step.preset}</b></span>}
                      </div>
                      {step.note && <div style={{ fontSize: 9, fontStyle: "italic",
                        color: "var(--p-text-muted)", marginTop: 2 }}>"{step.note}"</div>}
                    </div>
                  );
                })}
                <div style={{ marginTop: 10, padding: 6, fontSize: 9, color: "var(--p-text-muted)",
                  background: "var(--p-tint)", border: "1px dashed var(--p-border)", lineHeight: 1.5 }}>
                  ◆ 上から下へ重ね合わせて effective が決まる。<br />
                  ◆ project スコープは現 PJ のみ、user スコープは全 PJ で有効。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  window.CustomizationScreen = CustomizationScreen;
})();
