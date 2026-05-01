// Supporting screens — Agent Detail, Gantt, Plan, Retro, Worktree, Header

const { CatSprite, ROSTER } = window;

// --------------------------------------------------------------
// HEADER — Process Discipline metrics (経験値ゲージ風)
// --------------------------------------------------------------
const DisciplineHeader = ({ width = 920 }) => {
  const metrics = [
    { label: "PARALLEL", value: "82%", pct: 82, color: "var(--p-success)" },
    { label: "TASK TOOL", value: "OK",  pct: 100, color: "var(--p-success)" },
    { label: "TDD ORDER", value: "1 violation", pct: 60, color: "var(--p-warn)" },
    { label: "VERDICT",   value: "12/12", pct: 100, color: "var(--p-accent)" },
  ];
  return (
    <div className="pixel" style={{
      width, padding: "10px 14px", display: "flex", alignItems: "center", gap: 16,
      background: "var(--p-paper)", border: "3px solid var(--p-border)",
      boxShadow: "0 4px 0 0 var(--p-shadow)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em" }}>
        🐱 claude-loom <span style={{ color: "var(--p-text-muted)", fontWeight: 400 }}>/ 猫の開発室</span>
      </div>
      <div style={{ flex: 1 }} />
      {metrics.map(m => (
        <div key={m.label} style={{ minWidth: 130 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}>
            <span style={{ color: "var(--p-text-muted)", letterSpacing: "0.06em" }}>{m.label}</span>
            <span style={{ fontWeight: 700 }}>{m.value}</span>
          </div>
          <div className="exp-bar"><i style={{ width: `${m.pct}%`, background: m.color }} /></div>
        </div>
      ))}
    </div>
  );
};

// --------------------------------------------------------------
// AGENT DETAIL — popup panel beside a cat
// --------------------------------------------------------------
const AgentDetailPanel = ({ agent }) => (
  <div className="rpg-frame pixel" style={{ width: 320, padding: 16 }}>
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ background: "var(--p-tint)", border: "2px solid var(--p-border)", padding: 4 }}>
        <CatSprite size={72} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{agent.name}</div>
        <div className="rpg-label" style={{ marginTop: 2 }}>{agent.role} · {agent.breed}</div>
        <div style={{ fontSize: 10, fontStyle: "italic", color: "var(--p-text-muted)", marginTop: 6 }}>
          「{agent.quote}」
        </div>
      </div>
    </div>
    {/* status row */}
    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
      <span className="chip"><span className="dot busy" /> busy</span>
      <span className="chip">model: sonnet</span>
      <span className="chip">friendly-mentor</span>
      <span className="chip">★ 注目</span>
    </div>
    {/* token usage */}
    <div style={{ marginTop: 14 }}>
      <div className="rpg-label" style={{ marginBottom: 4 }}>TOKEN — TODAY</div>
      <div style={{ display: "flex", gap: 8, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
        <div>in <b>32.1k</b></div>
        <div>out <b>9.4k</b></div>
        <div>cache <b>118k</b></div>
      </div>
      <div className="exp-bar" style={{ marginTop: 4 }}><i style={{ width: "42%" }} /></div>
    </div>
    {/* current task */}
    <div style={{ marginTop: 14 }}>
      <div className="rpg-label" style={{ marginBottom: 4 }}>NOW</div>
      <div style={{ fontSize: 11, padding: 8, background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
        user.service.test.ts の RED → GREEN 確認中
      </div>
    </div>
    {/* history */}
    <div style={{ marginTop: 14 }}>
      <div className="rpg-label" style={{ marginBottom: 4 }}>HISTORY</div>
      {[
        { t: "14:21", txt: "fix(auth): catch 漏れ 1件" },
        { t: "13:48", txt: "test: refresh_token rotation" },
        { t: "13:02", txt: "spec 整合: §3.6.5 反映" },
      ].map(h => (
        <div key={h.t} style={{ display: "flex", gap: 8, fontSize: 10, padding: "3px 0", fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: "var(--p-text-muted)" }}>{h.t}</span>
          <span>{h.txt}</span>
        </div>
      ))}
    </div>
    {/* memo + fav */}
    <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
      <button className="btn-px ghost" style={{ flex: 1 }}>📝 メモ</button>
      <button className="btn-px primary" style={{ flex: 1 }}>★ 注目</button>
    </div>
  </div>
);

// --------------------------------------------------------------
// GANTT — walking cats stretching the bars
// --------------------------------------------------------------
const Gantt = ({ width = 920, height = 360 }) => {
  const rows = [
    { id: "pm",       label: "ニケ (PM)",       fur: "#cdd2d8", hat: "leader",  bars: [{ s: 5, e: 95, c: "var(--p-accent)", t: "PM session" }] },
    { id: "dev",      label: "サバ (Dev)",      fur: "#b8a98c", hat: "headband",bars: [{ s: 12, e: 38, c: "var(--p-success)", t: "auth: login spec" }, { s: 44, e: 74, c: "var(--p-warn)", t: "auth: TDD red" }, { s: 76, e: 92, c: "var(--p-success)", t: "auth: green", live: true }] },
    { id: "code",     label: "ペン (Code Rev)", fur: "#e8e2d2", hat: "visor",   bars: [{ s: 40, e: 56, c: "var(--p-accent)", t: "review: PR #42" }, { s: 70, e: 84, c: "var(--p-error)", t: "review: failed" }] },
    { id: "sec",      label: "シノビ (Sec)",    fur: "#2c2a35", hat: "scarf",   bars: [{ s: 18, e: 34, c: "var(--p-accent)", t: "secret scan" }] },
    { id: "test",     label: "メメ (Test Rev)", fur: "#a3b1bd", hat: "bowtie",  bars: [{ s: 22, e: 48, c: "var(--p-accent)", t: "coverage check" }, { s: 60, e: 80, c: "var(--p-accent)", t: "verdict" }] },
    { id: "agg",      label: "マル (Aggregator)",fur: "#cfb597", hat: "scarf",  bars: [{ s: 86, e: 95, c: "var(--p-accent)", t: "retro summary", live: true }] },
  ];
  const labelW = 130;
  const barW = width - labelW - 24;
  const rowH = 44;
  return (
    <div className="rpg-frame pixel" style={{ width, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="rpg-title">📜 進捗ガント — 直近 1 時間</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["30m", "1h", "4h", "all"].map((z, i) => (
            <span key={z} className="chip" style={{ background: i === 1 ? "var(--p-accent)" : "var(--p-tint)", color: i === 1 ? "white" : undefined }}>{z}</span>
          ))}
        </div>
      </div>
      {/* time axis */}
      <div style={{ display: "flex", paddingLeft: labelW, marginBottom: 4, fontSize: 9, color: "var(--p-text-muted)", fontFamily: 'ui-monospace, monospace' }}>
        {["13:30", "13:45", "14:00", "14:15", "now"].map((t, i, a) => (
          <div key={t} style={{ width: barW / (a.length - 1), textAlign: i === 0 ? "left" : "center" }}>{t}</div>
        ))}
      </div>
      {/* rows */}
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", height: rowH, borderTop: i === 0 ? "none" : "1px dashed var(--p-border)" }}>
          <div style={{ width: labelW, display: "flex", alignItems: "center", gap: 6 }}>
            <CatSprite size={28} fur={r.fur} hat={r.hat} pose="sit" />
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{r.label}</span>
          </div>
          <div style={{ position: "relative", flex: 1, height: rowH - 4, background: "var(--p-tint)", border: "1px solid var(--p-border)" }}>
            {/* gridlines */}
            {[25, 50, 75].map(p => <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "var(--p-border)", opacity: 0.2 }} />)}
            {/* bars */}
            {r.bars.map((b, bi) => (
              <div key={bi} title={b.t} style={{
                position: "absolute", left: `${b.s}%`, width: `${b.e - b.s}%`, top: 6, bottom: 6,
                background: b.c, border: "1px solid var(--p-border)",
                backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 3px, transparent 3px 6px)",
                display: "flex", alignItems: "center", paddingLeft: 4,
                fontSize: 9, color: "white", fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap",
                fontFamily: 'ui-monospace, monospace',
              }}>
                {b.t}
                {b.live && (
                  <span style={{
                    position: "absolute", right: -16, top: "50%", transform: "translateY(-50%)",
                  }}>
                    <CatSprite size={28} fur={r.fur} hat={r.hat} pose="walk" />
                  </span>
                )}
              </div>
            ))}
            {/* now line */}
            <div style={{ position: "absolute", left: "95%", top: -2, bottom: -2, width: 2, background: "var(--p-error)" }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 10, display: "flex", gap: 10, fontSize: 9, color: "var(--p-text-muted)" }}>
        <span><span className="dot busy" /> busy</span>
        <span><span className="dot review" /> review</span>
        <span><span className="dot tdd" /> TDD red</span>
        <span><span className="dot fail" /> failed</span>
        <span style={{ marginLeft: "auto" }}>🐈 = ライブ伸長中</span>
      </div>
    </div>
  );
};

window.DisciplineHeader = DisciplineHeader;
window.AgentDetailPanel = AgentDetailPanel;
window.Gantt = Gantt;
