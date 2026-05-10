// screens/sessions.jsx — past session archive with search + filter + transcript replay
(function () {
  const { useScenario, ROSTER, CatSprite } = window;
  const React = window.React;
  const ROSTER_BY = () => Object.fromEntries((ROSTER||[]).map(r => [r.id, r]));

  function fmtDur(sec) { const m = Math.floor(sec/60); return m >= 60 ? `${Math.floor(m/60)}h${m%60}m` : `${m}m`; }

  function SessionsScreen() {
    const sc = useScenario();
    const sessions = sc.sessions || [];
    const by = ROSTER_BY();
    const [q, setQ] = React.useState("");
    const [agentFilter, setAgentFilter] = React.useState("all");
    const [verdictFilter, setVerdictFilter] = React.useState("all");
    const [selected, setSelected] = React.useState(null);

    const filtered = sessions.filter(s =>
      (agentFilter === "all" || s.agentRoot === agentFilter) &&
      (verdictFilter === "all" || s.verdict === verdictFilter) &&
      (q === "" || (s.summary + " " + s.filesTouched.join(" ")).toLowerCase().includes(q.toLowerCase()))
    );
    const agentRoots = Array.from(new Set(sessions.map(s => s.agentRoot)));

    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "minmax(380px, 1fr) 1.4fr",
        gap: 0, background: "var(--p-bg-sky)" }}>

        {/* LEFT — list + filters */}
        <div style={{ borderRight: "3px solid var(--p-border)", background: "var(--p-paper)",
          display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: "2px solid var(--p-border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>❐ SESSIONS</div>
              <span className="chip">{filtered.length} / {sessions.length}</span>
            </div>
            <input type="text" placeholder="🔍 summary / file name / PR…"
              value={q} onChange={e => setQ(e.target.value)}
              style={{ width: "100%", padding: "5px 8px", fontSize: 10, marginBottom: 6,
                border: "1.5px solid var(--p-border)", background: "var(--p-tint)",
                fontFamily: "ui-monospace, monospace", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 4 }}>
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
                style={{ flex: 1, padding: "3px", fontSize: 9, border: "1.5px solid var(--p-border)", background: "var(--p-tint)" }}>
                <option value="all">全 agent</option>
                {agentRoots.map(id => <option key={id} value={id}>{by[id]?.name || id}</option>)}
              </select>
              <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)}
                style={{ flex: 1, padding: "3px", fontSize: 9, border: "1.5px solid var(--p-border)", background: "var(--p-tint)" }}>
                <option value="all">全 verdict</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </div>
          </div>

          {/* timeline list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: 30, textAlign: "center", fontSize: 10, color: "var(--p-text-muted)" }}>
                条件にマッチする session はありません
              </div>
            )}
            {filtered.map((s,i) => {
              const a = by[s.agentRoot];
              const isOpen = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSelected(s)}
                  style={{ all: "unset", cursor: "pointer", display: "block", width: "100%",
                    padding: "10px 12px", borderBottom: "1px dashed var(--p-border)",
                    background: isOpen ? "var(--p-accent-soft)" : "transparent",
                    borderLeft: isOpen ? "3px solid var(--p-accent)" : "3px solid transparent",
                    boxSizing: "border-box" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    {a && <CatSprite size={20} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                    <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>{s.startedAt}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 8, fontWeight: 700, padding: "0 4px",
                      background: s.verdict === "PASS" ? "var(--p-success)" : "var(--p-error)",
                      color: "white", border: "1px solid var(--p-border)" }}>{s.verdict}</span>
                    <span style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>{fmtDur(s.durationSec)}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{s.summary}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 8 }}>
                    {s.filesTouched.slice(0,3).map(f => (
                      <span key={f} style={{ padding: "1px 4px", background: "var(--p-tint)",
                        border: "1px solid var(--p-border)", fontFamily: "ui-monospace, monospace",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{f}</span>
                    ))}
                    {s.filesTouched.length > 3 && <span style={{ color: "var(--p-text-muted)" }}>+{s.filesTouched.length-3}</span>}
                    {s.relatedFindings.length > 0 && s.relatedFindings.map(f => (
                      <span key={f} style={{ padding: "1px 4px", background: "var(--p-warn)",
                        color: "white", border: "1px solid var(--p-border)" }}>⚠ {f}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — detail panel */}
        <div style={{ minHeight: 0, overflow: "auto", padding: 16 }}>
          {!selected && (
            <div style={{ display: "grid", placeItems: "center", height: "100%",
              fontSize: 11, color: "var(--p-text-muted)", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                左のリストから session を選ぶと、ここに<br />
                summary / 関連 file / 関連 retro / transcript player が表示されます。
              </div>
            </div>
          )}
          {selected && (() => {
            const a = by[selected.agentRoot];
            return (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  {a && <CatSprite size={36} fur={a.fur} cheek={a.cheek} hat={a.hat} pose="sit" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.summary}</div>
                    <div style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "var(--p-text-muted)" }}>
                      {selected.id} · {selected.startedAt} · {fmtDur(selected.durationSec)} · {selected.turns} turns
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px",
                    background: selected.verdict === "PASS" ? "var(--p-success)" : "var(--p-error)",
                    color: "white", border: "1.5px solid var(--p-border)" }}>{selected.verdict}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 10, background: "var(--p-paper)", border: "2px solid var(--p-border)" }}>
                    <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>FILES TOUCHED</div>
                    {selected.filesTouched.map(f => (
                      <div key={f} style={{ fontSize: 10, fontFamily: "ui-monospace, monospace",
                        padding: "2px 0", color: "var(--p-accent)" }}>↗ {f}</div>
                    ))}
                  </div>
                  <div style={{ padding: 10, background: "var(--p-paper)", border: "2px solid var(--p-border)" }}>
                    <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>RELATED</div>
                    {selected.relatedRetro && (
                      <div style={{ fontSize: 10, padding: "2px 0" }}>
                        ◆ retro: <a style={{ color: "var(--p-accent)", cursor: "pointer" }}>{selected.relatedRetro}</a>
                      </div>
                    )}
                    {selected.relatedFindings.length > 0 && selected.relatedFindings.map(f => (
                      <div key={f} style={{ fontSize: 10, padding: "2px 0" }}>⚠ finding: <a style={{ color: "var(--p-accent)", cursor: "pointer" }}>{f}</a></div>
                    ))}
                    {!selected.relatedRetro && selected.relatedFindings.length === 0 && (
                      <div style={{ fontSize: 10, color: "var(--p-text-muted)" }}>—</div>
                    )}
                  </div>
                </div>

                {/* transcript replay placeholder — uses retro player UX */}
                <div style={{ padding: 14, background: "var(--p-paper)", border: "2px solid var(--p-border)",
                  textAlign: "center", fontSize: 11, color: "var(--p-text-muted)", lineHeight: 1.6 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.06em", marginBottom: 8 }}>TRANSCRIPT REPLAY</div>
                  <button className="btn-px primary" style={{ fontSize: 10, padding: "5px 12px" }}>▶ 再生 (Retro と同じ player)</button>
                  <div style={{ marginTop: 8, fontSize: 9 }}>
                    実装時: <code>~/.claude/projects/{sc.project}/{selected.id}.jsonl</code> を読んで<br />
                    Retro screen の transcript component を流用
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }
  window.SessionsScreen = SessionsScreen;
})();
