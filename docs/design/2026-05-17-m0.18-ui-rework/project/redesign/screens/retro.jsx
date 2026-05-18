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
    const [showAdmin, setShowAdmin] = React.useState(false);
    const visible = r.transcript.slice(0, cursor + 1);
    const dur = r.durationSec;

    // Lifecycle fixture — these would come from pending_summary.json in prod.
    const carryover = r.carryover || [
      { id: "P-07", sev: "high", title: "secret scan の pre-commit hook 未配置",
        carryover: 2, max: 3, lastSeenIn: "2026-04-22-001", reEvaluatedIn: null,
        sourceRetro: "2026-04-08-001", verdict: "still-relevant" },
      { id: "P-09", sev: "med",  title: "consistency JSON tail watcher 未着手",
        carryover: 1, max: 3, lastSeenIn: "2026-04-22-001", reEvaluatedIn: r.id,
        sourceRetro: "2026-04-15-001", verdict: "still-relevant" },
      { id: "P-04", sev: "low",  title: "worktree hotfix CLI 古い引数",
        carryover: 3, max: 3, lastSeenIn: "2026-04-22-001", reEvaluatedIn: r.id,
        sourceRetro: "2026-04-01-001", verdict: "expired" },
    ];
    const keep = r.keep || [
      { text: "並列度 47% を維持 — Task tool dispatch が逐次化していない", lens: "retro-proc" },
      { text: "Aggregator が action plan を 3 行で要約", lens: "user" },
    ];
    const verdictMeta = {
      "still-relevant": { icon: "🔄", label: "promoted",   color: "var(--p-accent)" },
      "expired":        { icon: "⏳", label: "auto-expire", color: "var(--p-stone)" },
      "drop":           { icon: "❌", label: "lens-drop",  color: "var(--p-error)" },
    };

    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--p-bg-sky)", display: "grid",
        gridTemplateColumns: "1fr 380px", gap: 12, padding: 16, overflow: "hidden" }}>

        {/* LEFT — transcript player */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>🔮 {r.title}</div>
            <span className="chip">verdict: <b style={{ color: r.verdict === "PASS" ? "var(--p-success)" : "var(--p-error)" }}>{r.verdict}</b></span>
            <span className="chip">{Math.floor(dur/60)} min</span>
            <span className="chip" style={{ fontFamily: "ui-monospace, monospace" }}>schema v3</span>
            <div style={{ flex: 1 }} />
            <button className="btn-px ghost" onClick={() => setShowAdmin(s => !s)}>⚙ admin</button>
            <button className="btn-px ghost">archive →</button>
            <button className="btn-px primary">+ 新 retro</button>
          </div>

          {/* Admin / Recovery section */}
          {showAdmin && (
            <div style={{ padding: 10, marginBottom: 10, background: "var(--p-tint)",
              border: "2px dashed var(--p-warn)" }}>
              <div style={{ fontSize: 9, color: "var(--p-warn)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
                ⚠ ADMIN / RECOVERY — pending.json 消失時の復旧用
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-px ghost" style={{ fontSize: 9 }}>
                  ↻ Reconstruct from archive markdown
                  <span style={{ marginLeft: 6, fontSize: 8, color: "var(--p-text-muted)" }}>
                    <code>retro.reconstructFromArchive()</code>
                  </span>
                </button>
                <button className="btn-px ghost" style={{ fontSize: 9 }}>📄 pending_summary.json 再生成</button>
                <button className="btn-px ghost" style={{ fontSize: 9 }}>↺ approval.decide retry (NOT_FOUND 検知時)</button>
              </div>
              <div style={{ fontSize: 8, color: "var(--p-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                ◆ archive markdown を parse して applied_summary + pending_summary を再構築。<br />
                ◆ <code>reconstructed_from_archive: true</code> marker が finding に付与される。
              </div>
            </div>
          )}

          {/* lens summary — compact */}
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

        {/* RIGHT — KPT board (KEEP / PROBLEM / CARRYOVER / TRY) */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 8, overflow: "auto" }}>
          <div style={{ fontSize: 10, color: "var(--p-text-muted)", letterSpacing: "0.06em",
            padding: "0 2px" }}>KPT BOARD — agile retrospective framework</div>

          {/* KEEP */}
          <div style={{ border: "2px solid var(--p-success)", padding: 7, background: "var(--p-paper)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--p-success)", letterSpacing: "0.06em", marginBottom: 4 }}>
              ✓ KEEP — 良かった点 / 継続
            </div>
            {keep.map((k, i) => (
              <div key={i} style={{ fontSize: 10, padding: 5, marginBottom: 3, background: "var(--p-tint)",
                border: "1px solid var(--p-border)", lineHeight: 1.4 }}>
                {k.text}
                <div style={{ fontSize: 8, color: "var(--p-text-muted)", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>lens: {k.lens}</div>
              </div>
            ))}
          </div>

          {/* PROBLEM — 今回 findings */}
          <div style={{ border: "2px solid var(--p-error)", padding: 7, background: "var(--p-paper)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--p-error)", letterSpacing: "0.06em", marginBottom: 4 }}>
              ⚠ PROBLEM — 今回 finding ({r.findings.length})
            </div>
            {r.findings.map(f => (
              <div key={f.id} style={{ display: "flex", gap: 5, padding: 5, marginBottom: 3,
                background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
                <span style={{ width: 4, height: "auto", background: SEV[f.sev], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{f.title}</div>
                  <div style={{ fontSize: 8, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>
                    {f.id} · {f.lens} · {f.target}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3, flexDirection: "column" }}>
                  <button className="btn-px success" style={{ fontSize: 7, padding: "1px 5px" }}>accept</button>
                  <button className="btn-px ghost"   style={{ fontSize: 7, padding: "1px 5px" }}>defer</button>
                </div>
              </div>
            ))}
          </div>

          {/* CARRYOVER — lifecycle (PR#20+21) */}
          <div style={{ border: "2px solid var(--p-warn)", padding: 7, background: "var(--p-paper)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--p-warn)", letterSpacing: "0.06em", marginBottom: 4,
              display: "flex", alignItems: "center", gap: 4 }}>
              ⏳ CARRYOVER — pending lifecycle ({carryover.length})
            </div>
            {carryover.map(p => {
              const vm = verdictMeta[p.verdict] || verdictMeta["still-relevant"];
              return (
                <div key={p.id} style={{ padding: 5, marginBottom: 3, background: "var(--p-tint)",
                  border: "1px solid var(--p-border)" }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <span style={{ width: 4, height: 32, background: SEV[p.sev], flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ fontSize: 8, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace", marginTop: 1 }}>
                        {p.id} · 元 retro: {p.sourceRetro}
                      </div>
                    </div>
                    <span title={vm.label} style={{ fontSize: 12, lineHeight: 1 }}>{vm.icon}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 8,
                    fontFamily: "ui-monospace, monospace" }}>
                    <span style={{ color: "var(--p-text-muted)" }}>carryover</span>
                    {Array.from({ length: p.max }).map((_, i) => (
                      <span key={i} style={{ width: 7, height: 7, border: "1px solid var(--p-border)",
                        background: i < p.carryover ? (p.carryover >= p.max ? "var(--p-error)" : "var(--p-warn)") : "var(--p-paper)" }} />
                    ))}
                    <span style={{ fontWeight: 700, color: p.carryover >= p.max ? "var(--p-error)" : "var(--p-text)" }}>
                      {p.carryover}/{p.max}
                    </span>
                    <span style={{ marginLeft: "auto", color: vm.color, fontWeight: 700 }}>{vm.label}</span>
                  </div>
                  <div style={{ fontSize: 8, color: "var(--p-text-muted)", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>
                    last_seen: {p.lastSeenIn}
                    {p.reEvaluatedIn && <> · re-eval: {p.reEvaluatedIn}</>}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 7, color: "var(--p-text-muted)", padding: "2px 4px", lineHeight: 1.4,
              fontStyle: "italic", marginTop: 2 }}>
              ※ 3-strike rule: carryover_count ≥ 3 で auto-expire flip
            </div>
          </div>

          {/* TRY — action plan */}
          <div style={{ border: "2px solid var(--p-accent)", padding: 7, background: "var(--p-paper)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--p-accent)", letterSpacing: "0.06em", marginBottom: 4 }}>
              ▶ TRY — action plan (aggregator が確定)
            </div>
            {[
              { lbl: "IMMEDIATE", n: r.actionPlan.immediate, c: "var(--p-error)" },
              { lbl: "MILESTONE", n: r.actionPlan.milestone, c: "var(--p-warn)" },
              { lbl: "DEFERRED",  n: r.actionPlan.deferred,  c: "var(--p-stone)" },
            ].map(b => (
              <div key={b.lbl} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                <span style={{ width: 6, height: 6, background: b.c, border: "1px solid var(--p-border)" }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", width: 76 }}>{b.lbl}</span>
                <div style={{ flex: 1, height: 8, background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
                  <div style={{ width: `${b.n*20}%`, height: "100%", background: b.c }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: b.c, width: 22, textAlign: "right" }}>{b.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  window.RetroScreen = RetroScreen;
})();
