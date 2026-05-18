// Room View — Kairosoft-style isometric office.
// Desks in rows, cats clearly at PCs, signage, plants, speech bubbles.

const { CatSprite, ROSTER } = window;

// === A single desk station: monitor + keyboard + cat seated facing PC ===
const DeskStation = ({ x, y, cat, status = "busy", task, scroll, tdd, label, deskColor = "var(--p-wood)", onClick, selected = false }) => {
  const statusColor = {
    busy: "var(--p-success)", idle: "var(--p-stone)",
    review: "var(--p-accent)", fail: "var(--p-error)", tdd: "var(--p-warn)",
  }[status];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 100 }}>
      {/* Speech bubble */}
      {task && (
        <div style={{
          position: "relative", display: "inline-block",
          background: "var(--p-paper)", border: "2px solid var(--p-border)",
          padding: "3px 6px", fontSize: 9, lineHeight: 1.3, maxWidth: 110,
          marginBottom: 4, boxShadow: "2px 2px 0 0 var(--p-shadow)",
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          color: "var(--p-text)", marginLeft: 8, fontWeight: 700,
        }}>
          {task}
          <span style={{
            position: "absolute", left: 14, bottom: -5, width: 6, height: 6,
            background: "var(--p-paper)", borderRight: "2px solid var(--p-border)",
            borderBottom: "2px solid var(--p-border)", transform: "rotate(45deg)",
          }} />
        </div>
      )}
      <button
        onClick={onClick}
        style={{
          all: "unset", cursor: "pointer", display: "block", width: "100%",
          padding: 4, boxSizing: "border-box",
          outline: selected ? "3px solid var(--p-accent)" : "none",
          outlineOffset: 2,
        }}
      >

      {/* Cat behind monitor — peek over the top */}
      <div style={{ position: "relative", height: 56, marginLeft: 16 }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <CatSprite size={48} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose={status === "idle" ? "sit" : "work"} sleep={status === "idle"} scroll={scroll} />
        </div>
      </div>

      {/* Monitor + desk (isometric-ish) */}
      <div style={{ position: "relative", marginTop: -16, width: 96 }}>
        {/* monitor screen */}
        <div style={{
          width: 64, height: 36, marginLeft: 16,
          background: status === "fail" ? "var(--p-error)" : "var(--p-screen)",
          border: "2px solid var(--p-border)", position: "relative",
          boxShadow: "inset 0 0 0 2px var(--p-screen-glow)",
        }}>
          {/* code lines on screen */}
          <div style={{ position: "absolute", left: 4, top: 4, right: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ height: 2, width: "70%", background: "var(--p-screen-glow)" }} />
            <div style={{ height: 2, width: "50%", background: "var(--p-screen-glow)" }} />
            <div style={{ height: 2, width: "85%", background: "var(--p-screen-glow)" }} />
            <div style={{ height: 2, width: "40%", background: "var(--p-screen-glow)" }} />
          </div>
          {/* status dot in corner */}
          <span style={{ position: "absolute", top: -5, right: -5, width: 10, height: 10, background: statusColor, border: "2px solid var(--p-border)" }} />
        </div>
        {/* monitor stand */}
        <div style={{ width: 12, height: 4, marginLeft: 42, background: "var(--p-stone)", border: "2px solid var(--p-border)", borderTop: "none" }} />
        {/* desk top */}
        <div style={{ width: 96, height: 8, background: deskColor, border: "2px solid var(--p-border)", borderRadius: 1 }} />
        {/* desk shadow / front */}
        <div style={{ width: 96, height: 4, background: "var(--p-wood-dark)", borderLeft: "2px solid var(--p-border)", borderRight: "2px solid var(--p-border)", borderBottom: "2px solid var(--p-border)" }} />
      </div>

      {/* Nameplate */}
      <div style={{
        marginTop: 4, fontSize: 9, fontFamily: 'ui-monospace, monospace',
        textAlign: "center", color: "var(--p-text)", fontWeight: 700,
      }}>
        {cat.name} <span style={{ color: "var(--p-text-muted)", fontWeight: 400 }}>{label || cat.role}</span>
      </div>

      {/* TDD phase tag */}
      {tdd && (
        <div style={{
          display: "block", margin: "2px auto 0", padding: "1px 4px", fontSize: 8,
          background: "var(--p-warn)", color: "white", border: "1px solid var(--p-border)",
          fontFamily: 'ui-monospace, monospace', width: "fit-content", fontWeight: 700,
        }}>{tdd}</div>
      )}
      </button>
    </div>
  );
};

// === Office decor pieces ===
const Plant = ({ x, y, size = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    <svg viewBox="0 0 16 20" width={28 * size} height={36 * size} style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="14" width="10" height="6" fill="var(--p-wood)" stroke="var(--p-border)" strokeWidth="1" shapeRendering="crispEdges" />
      <rect x="2" y="6" width="12" height="2" fill="var(--p-leaf-2)" shapeRendering="crispEdges" />
      <rect x="3" y="2" width="3" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
      <rect x="6" y="0" width="4" height="8" fill="var(--p-leaf-2)" shapeRendering="crispEdges" />
      <rect x="10" y="2" width="3" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
      <rect x="2" y="8" width="12" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
      <rect x="2" y="6" width="12" height="2" fill="none" stroke="var(--p-border)" strokeWidth="1" shapeRendering="crispEdges" />
    </svg>
  </div>
);

const Whiteboard = ({ x, y, title, lines = [] }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 130, background: "var(--p-paper)", border: "3px solid var(--p-border)", padding: 6, boxShadow: "2px 2px 0 0 var(--p-shadow)" }}>
    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: "var(--p-accent)", marginBottom: 3, letterSpacing: "0.04em" }}>{title}</div>
    {lines.map((l, i) => (
      <div key={i} style={{ display: "flex", gap: 4, fontSize: 8, fontFamily: 'ui-monospace, monospace', alignItems: "center", padding: "1px 0" }}>
        <span style={{ width: 6, height: 6, background: l.c || "var(--p-text-muted)", border: "1px solid var(--p-border)", flexShrink: 0 }} />
        <span style={{ color: "var(--p-text)" }}>{l.t}</span>
      </div>
    ))}
  </div>
);

const Sign = ({ x, y, label, color = "var(--p-accent)" }) => (
  <div style={{ position: "absolute", left: x, top: y, padding: "3px 8px", background: color, color: "white", border: "2px solid var(--p-border)", boxShadow: "2px 2px 0 0 var(--p-shadow)", fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace', letterSpacing: "0.04em" }}>
    {label}
  </div>
);

// === Subroom clone — half-transparent ghost cat working in a worktree sub-agent ===
const SubroomClone = ({ x, y, cat, branch, status = "busy", onClick }) => (
  <button className="subroom-clone" onClick={onClick} style={{ left: x, top: y }}>
    <div className="subroom-clone__sprite">
      <CatSprite size={36} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="work" />
    </div>
    <div className="subroom-clone__label">
      <span className={`subroom-clone__dot subroom-clone__dot--${status}`} />
      <span>@{branch}</span>
    </div>
  </button>
);

// === Floor / wall background ===
const RoomBackground = ({ width, height }) => (
  <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ position: "absolute", inset: 0, imageRendering: "pixelated" }}>
    {/* upper wall */}
    <rect x="0" y="0" width={width} height={height * 0.3} fill="var(--p-wall)" />
    {/* wall trim line */}
    <rect x="0" y={height * 0.28} width={width} height="3" fill="var(--p-wood-dark)" />
    {/* lower wall (wainscoting) */}
    <rect x="0" y={height * 0.31} width={width} height={height * 0.12} fill="var(--p-wall-2)" />
    <rect x="0" y={height * 0.42} width={width} height="2" fill="var(--p-wood-dark)" />
    {/* floor */}
    <rect x="0" y={height * 0.44} width={width} height={height * 0.56} fill="var(--p-bg-floor)" />
    {/* floor tile grid */}
    {Array.from({ length: 14 }).map((_, i) => (
      <rect key={`v${i}`} x={i * (width / 14)} y={height * 0.44} width="1" height={height * 0.56} fill="var(--p-bg-floor-2)" opacity="0.6" />
    ))}
    {Array.from({ length: 6 }).map((_, i) => (
      <rect key={`h${i}`} x="0" y={height * 0.44 + (i + 1) * 38} width={width} height="1" fill="var(--p-bg-floor-2)" opacity="0.4" />
    ))}
    {/* wallpaper dots */}
    {Array.from({ length: 22 }).map((_, i) => (
      <g key={i}>
        <rect x={20 + i * 38} y="20" width="2" height="2" fill="var(--p-wall-2)" />
        <rect x={36 + i * 38} y="50" width="2" height="2" fill="var(--p-wall-2)" />
      </g>
    ))}
  </svg>
);

// === MAIN ROOM VIEW ===
const RoomView = ({ width = 980, height = 580, initialSelected = null }) => {
  const pm     = ROSTER.find(r => r.id === "pm");
  const dev    = ROSTER.find(r => r.id === "dev");
  const rev    = ROSTER.find(r => r.id === "rev");
  const code   = ROSTER.find(r => r.id === "rev-code");
  const sec    = ROSTER.find(r => r.id === "rev-sec");
  const test   = ROSTER.find(r => r.id === "rev-test");
  const retroPm  = ROSTER.find(r => r.id === "retro-pm");
  const retroAgg = ROSTER.find(r => r.id === "retro-agg");

  // Per-agent live state used by progress strip + room
  const agents = [
    { cat: pm,       status: "busy",   task: "仕様確認中",     label: "PM",         progress: 62, scroll: true },
    { cat: dev,      status: "busy",   task: "GREEN にする",    label: "Dev",        progress: 78, tdd: "GREEN", scroll: true },
    { cat: rev,      status: "review", task: "verdict 草稿",    label: "Reviewer",   progress: 45 },
    { cat: code,     status: "review", task: "catch 漏れ 1",    label: "Code Rev",   progress: 30, scroll: true },
    { cat: test,     status: "busy",   task: "coverage 確認",   label: "Test Rev",   progress: 84 },
    { cat: sec,      status: "idle",                            label: "Sec Rev",    progress: 0,  scroll: true },
    { cat: retroPm,  status: "busy",   task: "retro 集合〜",    label: "Retro PM",   progress: 22 },
    { cat: retroAgg, status: "busy",   task: "action plan",     label: "Aggregator", progress: 55 },
  ];

  const [sel, setSel] = React.useState(initialSelected);
  const [showPlan, setShowPlan] = React.useState(false);
  const [showGantt, setShowGantt] = React.useState(false);
  const [showSubroom, setShowSubroom] = React.useState(null); // { branch, parentCat } or null
  const [showConsistency, setShowConsistency] = React.useState(false);
  const [retroMode, setRetroMode] = React.useState(false);
  const selected = sel ? agents.find(a => a.cat.id === sel) : null;

  return (
    <div className="room" style={{ position: "relative", width, height: retroMode ? Math.max(height, 860) : height }}>
      <RoomBackground width={width} height={height} />

      {/* === WALL DECOR — branch + clock + window === */}
      <div className="room-sign room-sign--branch" style={{ left: 20, top: 14 }}>◆ claude-loom — branch: main</div>
      <div className="room-sign room-sign--clock"  style={{ left: width - 150, top: 14 }}>☀ 14:23 JST</div>
      <div className="room-window" style={{ left: 30, top: 32, width: 80, height: 56 }} />

      {/* === WALL POSTERS — Gantt (left) + Plan (right) + Consistency (far right). Hidden in retro mode. === */}
      {!retroMode && (
        <>
          {/* GANTT POSTER — agent activity, last 1h */}
          <button className="room-poster room-poster--gantt" onClick={() => setShowGantt(true)} style={{ left: 130, top: 28, width: 360, height: 125 }}>
            <div className="room-poster__header">
              <div className="room-poster__title">❖ 進捗 GANTT — 直近 1h</div>
              <div className="room-poster__hint">now → / クリックで拡大</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {[
                { name: "ニケ", bars: [{ s: 5,  e: 95, c: "var(--p-accent)" }] },
                { name: "サバ", bars: [{ s: 12, e: 38, c: "var(--p-success)" }, { s: 44, e: 74, c: "var(--p-warn)" }, { s: 76, e: 92, c: "var(--p-success)" }] },
                { name: "ペン", bars: [{ s: 40, e: 56, c: "var(--p-accent)" }, { s: 70, e: 84, c: "var(--p-error)" }] },
                { name: "メメ", bars: [{ s: 22, e: 48, c: "var(--p-accent)" }, { s: 60, e: 80, c: "var(--p-accent)" }] },
                { name: "マル", bars: [{ s: 86, e: 95, c: "var(--p-accent)" }] },
              ].map((row, i) => (
                <div key={i} className="room-poster__row">
                  <span className="room-poster__row-name">{row.name}</span>
                  <div className="room-poster__bar">
                    {row.bars.map((b, j) => (
                      <div key={j} className="room-poster__bar-fill" style={{ left: `${b.s}%`, width: `${b.e - b.s}%`, background: b.c }} />
                    ))}
                    <div className="room-poster__bar-now" style={{ left: "95%" }} />
                  </div>
                </div>
              ))}
            </div>
          </button>

          {/* PLAN POSTER — long-term milestones (left col) + this-week todos (right col) */}
          <button className="room-poster room-poster--plan" onClick={() => setShowPlan(true)} style={{ left: 510, top: 28, width: 350, height: 125 }}>
            <div className="room-poster__header">
              <div className="room-poster__title">📋 PLAN BOARD — 30 Apr</div>
              <div className="room-poster__hint">→ クリックで拡大</div>
            </div>
            <div className="room-poster__body">
              {/* LEFT COL — long-term milestones */}
              <div className="room-poster__col">
                <div className="room-poster__section-label">🗺 長期 — milestones</div>
                {[
                  { name: "M0.13", s: 5,  e: 55, st: "in_progress", count: "3/7" },
                  { name: "M0.14", s: 50, e: 80, st: "pending",     count: "0/4" },
                  { name: "M1.0",  s: 75, e: 98, st: "pending",     count: "0/12" },
                ].map((m, i) => {
                  const c = { in_progress: "var(--p-warn)", pending: "var(--p-stone)", completed: "var(--p-success)" }[m.st];
                  return (
                    <div key={i} className="room-poster__row">
                      <span className="room-poster__row-name" style={{ width: 38 }}>{m.name}</span>
                      <div className="room-poster__bar">
                        <div className="room-poster__bar-fill" style={{ left: `${m.s}%`, width: `${m.e - m.s}%`, background: c }} />
                        <div className="room-poster__bar-now" style={{ left: "45%" }} />
                      </div>
                      <span className="room-poster__row-meta">{m.count}</span>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COL — this-week todos */}
              <div className="room-poster__col">
                <div className="room-poster__section-label">📒 今週 — todos · 5件</div>
                {[
                  { s: "in_progress", t: "user.service.test.ts GREEN" },
                  { s: "pending",     t: "freee OAuth callback 確認" },
                  { s: "completed",   t: "PR #41 verdict" },
                ].map((t, i) => (
                  <div key={i} className="room-poster__row">
                    <span className={`room-poster__check room-poster__check--${t.s}`}>{t.s === "completed" ? "✓" : t.s === "in_progress" ? "●" : ""}</span>
                    <span className={`room-poster__check-text${t.s === "completed" ? " room-poster__check-text--completed" : ""}`}>{t.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </button>

          {/* CONSISTENCY POSTER — small alert plaque on the right */}
          <button className="room-poster room-poster--consistency" onClick={() => setShowConsistency(true)} style={{ left: 880, top: 28, width: 170, height: 125 }}>
            <div className="room-poster__header">
              <div className="room-poster__title" style={{ fontSize: 9 }}>📜 整合性 INBOX</div>
              <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", background: "var(--p-error)", color: "white", border: "1px solid var(--p-border)", letterSpacing: "0.04em" }}>NEW 2</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, padding: "4px 0" }}>
              {[
                { sev: "high",   c: "var(--p-error)", t: "F-12 §3.6 ガント縦軸 矛盾" },
                { sev: "high",   c: "var(--p-error)", t: "F-11 TDD 順序 乖離" },
                { sev: "medium", c: "var(--p-warn)",  t: "F-09 hotfix CLI 古い" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 8, fontFamily: 'ui-monospace, monospace' }}>
                  <span style={{ width: 5, height: 5, background: f.c, border: "1px solid var(--p-border)", flexShrink: 0 }} />
                  <span style={{ color: "var(--p-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.t}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 7, color: "var(--p-text-muted)", textAlign: "right", letterSpacing: "0.04em" }}>クリックで詳細</div>
          </button>
        </>
      )}

      {/* === ISLANDS — 3 by ROLE (hidden in retro mode) === */}
      {!retroMode && (
        <>
          <div className="room-island room-island--pm"     style={{ left: width/2 - 80, top: 200, width: 160, height: 160 }} />
          <div className="room-island room-island--dev"    style={{ left: 40,            top: 380, width: 240, height: 160 }} />
          <div className="room-island room-island--review" style={{ left: width - 410,   top: 380, width: 380, height: 160 }} />
          <div className="room-sign room-sign--island--pm"     style={{ left: width/2 - 50, top: 178 }}>◆ PM</div>
          <div className="room-sign room-sign--island--dev"    style={{ left: 130,          top: 358 }}>◆ DEV</div>
          <div className="room-sign room-sign--island--review" style={{ left: width - 280,  top: 358 }}>◆ REVIEW</div>
        </>
      )}

      {/* Retro Island sign only — board itself becomes the focus */}
      {retroMode && (
        <div className="room-sign room-sign--retro" style={{ left: width/2 - 80, top: 110, zIndex: 5 }}>🔮 RETRO ISLAND</div>
      )}

      {/* Mode toggle (top-right corner) */}
      <button className={`room-mode-toggle${retroMode ? " room-mode-toggle--active" : ""}`} onClick={() => setRetroMode(m => !m)} style={{ right: 14, top: 168 }}>
        {retroMode ? "📋 通常モードへ" : "🔮 レトロ開始"}
      </button>

      {/* === DESK ROWS — by role island === */}
      {!retroMode && (() => {
        const positions = {
          // PM Island: solo center
          pm:            { x: width/2 - 50,  y: 220 },
          // Dev Island: solo (room for worktree clones later)
          dev:           { x: 130,           y: 400 },
          // Review Island: 2x2
          rev:           { x: width - 380,   y: 400 },
          "rev-code":    { x: width - 270,   y: 400 },
          "rev-test":    { x: width - 160,   y: 400 },
          "rev-sec":     { x: width - 270,   y: 480 },
        };
        return agents
          .filter(a => positions[a.cat.id])
          .map(a => {
            const p = positions[a.cat.id];
            return (
              <DeskStation key={a.cat.id} x={p.x} y={p.y} cat={a.cat}
                status={a.status} task={a.task} tdd={a.tdd} scroll={a.scroll} label={a.label}
                selected={sel === a.cat.id}
                onClick={() => setSel(sel === a.cat.id ? null : a.cat.id)}
              />
            );
          });
      })()}

      {/* === SUBROOM CLONES — dev's worktree sub-agents working in parallel === */}
      {!retroMode && (() => {
        const dev = ROSTER.find(r => r.id === "dev");
        const clones = [
          { branch: "feat/oauth", status: "busy",   x: 218, y: 408 },
          { branch: "fix/test-flake", status: "review", x: 252, y: 446 },
        ];
        return clones.map((c, i) => (
          <SubroomClone key={i} x={c.x} y={c.y} cat={dev} branch={c.branch} status={c.status}
            onClick={() => setShowSubroom({ branch: c.branch, parentCat: dev, status: c.status })} />
        ));
      })()}

      {/* === RETRO MODE — everyone gathers around the whiteboard === */}
      {retroMode && (
        <RetroGathering width={width} height={height} sel={sel} setSel={setSel} />
      )}

      {/* === DECOR === */}
      <Plant x={width - 60} y={height - 80} size={1} />
      <Plant x={20} y={height - 200} size={0.8} />

      {/* === Detail overlay (click cat) === */}
      {selected && window.AgentDetailPanel && (
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}>
          <div style={{ position: "relative" }}>
            <button className="room-modal__close" style={{ width: 24, height: 24, fontSize: 12 }} onClick={() => setSel(null)}>×</button>
            <window.AgentDetailPanel agent={selected.cat} />
          </div>
        </div>
      )}

      {/* === Gantt overlay (click gantt poster) — full Gantt === */}
      {showGantt && window.Gantt && (
        <div className="room-modal" onClick={() => setShowGantt(false)}>
          <div className="room-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button className="room-modal__close" onClick={() => setShowGantt(false)}>×</button>
            <window.Gantt width={Math.min(width - 80, 880)} />
          </div>
        </div>
      )}

      {/* === Plan overlay (click plan poster) — full PlanView === */}
      {showPlan && window.PlanView && (
        <div className="room-modal" onClick={() => setShowPlan(false)}>
          <div className="room-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button className="room-modal__close" onClick={() => setShowPlan(false)}>×</button>
            <window.PlanView width={Math.min(width - 80, 880)} />
          </div>
        </div>
      )}

      {/* === Subroom overlay (click clone) — shows worktree sub-agent state === */}
      {showSubroom && window.SubroomView && (
        <div className="room-modal" onClick={() => setShowSubroom(null)}>
          <div className="room-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button className="room-modal__close" onClick={() => setShowSubroom(null)}>×</button>
            <window.SubroomView width={Math.min(width - 80, 760)} branch={showSubroom.branch} parentCat={showSubroom.parentCat} status={showSubroom.status} />
          </div>
        </div>
      )}

      {/* === Consistency overlay (click consistency poster) — full ConsistencyView === */}
      {showConsistency && window.ConsistencyView && (
        <div className="room-modal" onClick={() => setShowConsistency(false)}>
          <div className="room-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button className="room-modal__close" onClick={() => setShowConsistency(false)}>×</button>
            <window.ConsistencyView width={Math.min(width - 80, 880)} />
          </div>
        </div>
      )}

    </div>
  );
};

// === RETRO GATHERING — RetroView is the focus, cats are flavor on the perimeter ===
const RetroGathering = ({ width, height, sel, setSel }) => {
  const RetroView = window.RetroView;

  // Tiny cat — small clickable sprite + label, placed on the perimeter as decoration
  const PerimeterCat = ({ cat, x, y, talking, selected, onClick, flip }) => (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", position: "absolute", left: x, top: y,
      width: 44, textAlign: "center", zIndex: 4,
      outline: selected ? "3px solid var(--p-accent)" : "none", outlineOffset: 2,
    }}>
      {talking && (
        <div style={{
          position: "absolute", left: flip ? -110 : 30, top: -6,
          background: "var(--p-paper)", border: "2px solid var(--p-border)",
          padding: "2px 5px", fontSize: 8, fontFamily: 'ui-monospace, monospace',
          fontWeight: 700, whiteSpace: "nowrap", boxShadow: "2px 2px 0 0 var(--p-shadow)",
          zIndex: 5,
        }}>{talking}</div>
      )}
      <div style={{ height: 28, transform: flip ? "scaleX(-1)" : "none" }}>
        <CatSprite size={28} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="sit" />
      </div>
      <div style={{ fontSize: 7, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: "var(--p-text)", lineHeight: 1.1 }}>
        {cat.name}
      </div>
    </button>
  );

  // Place RetroView big in the center of the room (below the gantt poster + signs)
  // Room is 1080 × ~760 in retro mode. Reserve top 110px for wall/Gantt; bottom 90 for cats.
  const boardW = width - 80;
  const boardLeft = 40;
  const boardTop = 130;

  // Cats on the perimeter — symmetric, just peeking around the board
  const perimeter = [
    // Top row (above the board, in front of gantt) — moderator + retro lens leads
    { id: "retro-pm",      x: boardLeft + 40,           y: boardTop - 36, talk: "じゃあ始めるよ〜" },
    { id: "retro-counter", x: boardLeft + boardW - 80,  y: boardTop - 36, talk: "本当にそうかな？", flip: true },
    // Bottom row (below the board) — the team listens
    { id: "pm",            x: boardLeft + 30,           y: height - 60 },
    { id: "dev",           x: boardLeft + 90,           y: height - 60, talk: "...聞いてる" },
    { id: "retro-research",x: boardLeft + 160,          y: height - 60 },
    { id: "retro-pj",      x: boardLeft + 220,          y: height - 60 },
    { id: "retro-proc",    x: boardLeft + 280,          y: height - 60, talk: "TDD red 順序ズレ" },
    { id: "retro-meta",    x: boardLeft + boardW - 320, y: height - 60, talk: "仕組みを疑おう" },
    { id: "retro-agg",     x: boardLeft + boardW - 250, y: height - 60 },
    { id: "rev",           x: boardLeft + boardW - 190, y: height - 60, flip: true },
    { id: "rev-code",      x: boardLeft + boardW - 130, y: height - 60, flip: true },
    { id: "rev-test",      x: boardLeft + boardW - 70,  y: height - 60, flip: true },
    { id: "rev-sec",       x: boardLeft + boardW - 30,  y: height - 60, flip: true },
  ];

  return (
    <>
      {/* Floor cushion strip under bottom-row cats */}
      <div className="room-floor-cushion" />
      {/* THE WHITEBOARD — actually the full RetroView */}
      <div style={{
        position: "absolute", left: boardLeft, top: boardTop, width: boardW,
        zIndex: 2,
        boxShadow: "5px 5px 0 0 var(--p-shadow)",
        border: "4px solid var(--p-border)",
      }}>
        {/* whiteboard tray top */}
        <div style={{ height: 6, background: "var(--p-wood-dark)", borderBottom: "2px solid var(--p-border)" }} />
        {RetroView ? (
          <div style={{ background: "var(--p-paper)" }}>
            <RetroView width={boardW - 8} />
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: "center", background: "var(--p-paper)" }}>RetroView loading…</div>
        )}
        {/* whiteboard tray bottom */}
        <div style={{ height: 6, background: "var(--p-wood-dark)", borderTop: "2px solid var(--p-border)" }} />
      </div>

      {/* Cats on the perimeter */}
      {perimeter.map(p => {
        const cat = ROSTER.find(c => c.id === p.id);
        if (!cat) return null;
        return (
          <PerimeterCat key={p.id} cat={cat} x={p.x} y={p.y}
            talking={p.talk} flip={p.flip}
            selected={sel === cat.id}
            onClick={() => setSel(sel === cat.id ? null : cat.id)}
          />
        );
      })}
    </>
  );
};

window.RoomView = RoomView;
window.DeskStation = DeskStation;