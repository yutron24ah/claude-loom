// screens/tokens.jsx — usage + cost dashboard. Focus: efficiency analysis.
(function () {
  const { useScenario, ROSTER, CatSprite, MODELS, PRICING, costOf } = window;
  const React = window.React;
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));
  const M_COLOR = Object.fromEntries(MODELS.map(m => [m.id, m.color]));
  const fmtN = n => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(0)+"k" : String(n);

  function TokensScreen() {
    const sc = useScenario();
    const t = sc.tokens;
    const by = ROSTER_BY();
    const [period, setPeriod] = React.useState("7d");

    // compute per-row metrics
    const rows = t.byAgent.map(r => {
      const total = r.input + r.output + r.cacheWrite + r.cacheRead;
      const cacheHit = total > 0 ? (r.cacheRead) / (r.input + r.cacheRead) : 0;
      const cost = costOf(r, r.model);
      return { ...r, total, cacheHit, cost };
    });
    const totals = rows.reduce((a,r) => ({
      input: a.input + r.input, output: a.output + r.output,
      cacheWrite: a.cacheWrite + r.cacheWrite, cacheRead: a.cacheRead + r.cacheRead,
      cost: a.cost + r.cost,
    }), { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0 });
    const avgCacheHit = rows.reduce((a,r) => a + r.cacheHit, 0) / rows.length;
    const maxDaily = Math.max(...t.daily.map(d => d.cost));

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>$ TOKENS — usage + 効率分析</div>
          <span className="chip">{t.period}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", border: "2px solid var(--p-border)" }}>
            {["24h","7d","30d","all"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ all: "unset", cursor: "pointer", padding: "3px 10px", fontSize: 9, fontWeight: 700,
                  background: p === period ? "var(--p-accent)" : "var(--p-tint)",
                  color: p === period ? "white" : "var(--p-text)",
                  borderRight: "1px solid var(--p-border)" }}>{p}</button>
            ))}
          </div>
          <span style={{ fontSize: 9, color: "var(--p-text-muted)" }}>pricing: Anthropic公式 (1h cache)</span>
        </div>

        {/* top stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { lbl: "TOTAL COST", v: "$" + totals.cost.toFixed(2), sub: "≈ ¥" + Math.round(totals.cost*150).toLocaleString(), c: "var(--p-accent)" },
            { lbl: "INPUT TOK",  v: fmtN(totals.input + totals.cacheRead), sub: "incl. cached", c: "var(--p-text)" },
            { lbl: "OUTPUT TOK", v: fmtN(totals.output), sub: "billed at higher rate", c: "var(--p-text)" },
            { lbl: "CACHE HIT",  v: Math.round(avgCacheHit*100) + "%", sub: avgCacheHit > 0.7 ? "良好" : "要改善", c: avgCacheHit > 0.7 ? "var(--p-success)" : "var(--p-warn)" },
          ].map(s => (
            <div key={s.lbl} style={{ padding: 12, background: "var(--p-paper)", border: "2px solid var(--p-border)",
              boxShadow: "3px 3px 0 0 var(--p-shadow)" }}>
              <div style={{ fontSize: 8, color: "var(--p-text-muted)", letterSpacing: "0.08em" }}>{s.lbl}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* daily trend */}
        <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 8 }}>DAILY COST × CACHE-HIT (7d)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
            {t.daily.map((d,i) => {
              const h = (d.cost / maxDaily) * 100;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>${d.cost.toFixed(2)}</span>
                  <div style={{ position: "relative", width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                    <div style={{ width: "100%", height: `${h}%`, background: "var(--p-accent)",
                      border: "1.5px solid var(--p-border)", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, top: `${(1-d.cacheRatio)*100}%`,
                        height: 2, background: "var(--p-success)" }} title={`cache ${Math.round(d.cacheRatio*100)}%`} />
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{d.day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: "var(--p-text-muted)", display: "flex", gap: 16 }}>
            <span><span style={{ display: "inline-block", width: 12, height: 8, background: "var(--p-accent)", marginRight: 4, verticalAlign: "middle" }} />cost ($/day)</span>
            <span><span style={{ display: "inline-block", width: 12, height: 2, background: "var(--p-success)", marginRight: 4, verticalAlign: "middle" }} />cache-hit ratio</span>
          </div>
        </div>

        {/* per-agent table */}
        <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 90px 90px 100px 90px 90px",
            fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em",
            padding: "6px 10px", borderBottom: "2px solid var(--p-border)", background: "var(--p-tint)" }}>
            <span>AGENT</span><span>MODEL</span><span style={{ textAlign: "right" }}>INPUT</span><span style={{ textAlign: "right" }}>OUTPUT</span><span style={{ textAlign: "right" }}>CACHE R/W</span><span style={{ textAlign: "right" }}>CACHE-HIT</span><span style={{ textAlign: "right" }}>COST</span>
          </div>
          {rows.sort((a,b) => b.cost - a.cost).map(r => {
            const a = by[r.agentId];
            const lowHit = r.cacheHit < 0.5;
            return (
              <div key={r.agentId} style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 90px 90px 100px 90px 90px",
                alignItems: "center", padding: "8px 10px", borderBottom: "1px dashed var(--p-border)",
                fontSize: 10, fontFamily: "ui-monospace, monospace" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font-sans, system-ui)" }}>
                  {a && <CatSprite size={20} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                  <span style={{ fontWeight: 700 }}>{a?.name || r.agentId}</span>
                </div>
                <span style={{ display: "inline-block", padding: "1px 6px", fontSize: 9, fontWeight: 700,
                  background: M_COLOR[r.model], color: "white", border: "1px solid var(--p-border)", width: "fit-content" }}>{r.model}</span>
                <span style={{ textAlign: "right" }}>{fmtN(r.input)}</span>
                <span style={{ textAlign: "right" }}>{fmtN(r.output)}</span>
                <span style={{ textAlign: "right" }}>{fmtN(r.cacheRead)} / {fmtN(r.cacheWrite)}</span>
                <span style={{ textAlign: "right", color: lowHit ? "var(--p-warn)" : "var(--p-success)", fontWeight: 700 }}>
                  {Math.round(r.cacheHit*100)}%
                </span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>${r.cost.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* insights */}
        <div style={{ marginTop: 12, padding: 12, background: "var(--p-paper)", border: "2px dashed var(--p-warn)",
          fontSize: 10, lineHeight: 1.6 }}>
          <div style={{ fontSize: 9, color: "var(--p-warn)", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 700 }}>💡 効率改善ヒント (rule-based)</div>
          {rows.filter(r => r.cacheHit < 0.5).map(r => (
            <div key={r.agentId}>◆ <b>{by[r.agentId]?.name || r.agentId}</b> の cache-hit が {Math.round(r.cacheHit*100)}%。system prompt + tool def を session 単位で固定すると改善する可能性あり。</div>
          ))}
          {rows.filter(r => r.model === "opus" && r.output < 30_000).map(r => (
            <div key={r.agentId}>◆ <b>{by[r.agentId]?.name || r.agentId}</b> は output が少なく、opus を sonnet に下げて ${(r.cost - r.cost*PRICING.sonnet.output/PRICING.opus.output).toFixed(2)}/週 節約できる可能性。</div>
          ))}
          {rows.every(r => r.cacheHit >= 0.5) && rows.every(r => !(r.model === "opus" && r.output < 30_000)) && (
            <div style={{ color: "var(--p-text-muted)" }}>◆ 大きな改善余地は見つかりませんでした。</div>
          )}
        </div>
      </div>
    );
  }
  window.TokensScreen = TokensScreen;
})();
