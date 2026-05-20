// =============================================================
// screens/room.jsx — RoomView
// Consumes: useScenario() → { agents, todos, todosUpdatedAt, milestones,
//                              findings, worktrees, stream, branch, now }
// =============================================================

(function () {
  const { CatSprite, ROSTER, useScenario, STATUS_COLOR } = window;
  const React = window.React;

  // === ROOM_AGENTS — post M0.X-skill-migration ============================
  // 13 agents → 3 persistent (always at a desk) + 10 spirits (summoned via skills).
  // Reviewers and retro lens are now ephemeral; see <Spirit> / <SummonQueue>.
  const ROOM_AGENTS = ["pm", "dev", "retro-pm"];

  function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + "…" : s; }

  // === Desk ============================================================
  const Desk = ({ x, y, agent, state, walk, onClick, selected }) => {
    const status = state?.status ?? "idle";
    const walking = !!walk;
    const statusColor = STATUS_COLOR[status];
    const sleeping = status === "idle";
    const bubble = state?.currentTool
      ? { kind: "tool", text: state.currentTool, sub: state.currentReasoning }
      : state?.currentReasoning
      ? { kind: "reason", text: truncate(state.currentReasoning, 38) }
      : null;
    return (
      <div style={{ position: "absolute", left: x, top: y, width: 110 }}>
        {bubble && (
          <div style={{
            position: "relative", display: "inline-block", marginLeft: 10,
            background: "var(--p-paper)", border: "2px solid var(--p-border)",
            padding: "3px 6px", fontSize: 9, lineHeight: 1.3, maxWidth: 130,
            marginBottom: 4, boxShadow: "2px 2px 0 0 var(--p-shadow)", fontWeight: 700,
          }}>
            {bubble.kind === "tool" && (
              <span style={{ background: "var(--p-warn)", color: "white", padding: "0 4px", marginRight: 4, fontSize: 8 }}>{bubble.text}</span>
            )}
            {bubble.kind === "reason"
              ? <span style={{ fontStyle: "italic", fontWeight: 500 }}>"{bubble.text}"</span>
              : bubble.sub ? <span style={{ fontWeight: 500 }}>{truncate(bubble.sub, 28)}</span> : null}
            <span style={{ position: "absolute", left: 14, bottom: -5, width: 6, height: 6,
              background: "var(--p-paper)", borderRight: "2px solid var(--p-border)",
              borderBottom: "2px solid var(--p-border)", transform: "rotate(45deg)" }} />
          </div>
        )}
        <button onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", padding: 4, boxSizing: "border-box",
          outline: selected ? "3px solid var(--p-accent)" : "none", outlineOffset: 2 }}>
          <div style={{ position: "relative", height: 56, marginLeft: 18 }}>
            <div className={walking ? "cat-walker" : ""} style={{ position: "absolute", left: 0, top: 0,
              ...(walking ? { "--walk-dx": `${walk.dx}px`, "--walk-dy": `${walk.dy}px` } : {}) }}>
              <CatSprite size={48} fur={agent.fur} cheek={agent.cheek} pose={sleeping ? "sit" : "work"} sleep={sleeping} />
            </div>
          </div>
          <div style={{ position: "relative", marginTop: -16, width: 96 }}>
            <div style={{
              width: 64, height: 36, marginLeft: 16,
              background: status === "failed" ? "var(--p-error)" : (sleeping ? "#2a2f3e" : "var(--p-screen)"),
              border: "2px solid var(--p-border)", position: "relative",
              boxShadow: sleeping ? "none" : "inset 0 0 0 2px var(--p-screen-glow)",
              opacity: sleeping ? 0.55 : 1,
            }}>
              {!sleeping && (
                <div style={{ position: "absolute", left: 4, top: 4, right: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ height: 2, width: "70%", background: "var(--p-screen-glow)" }} />
                  <div style={{ height: 2, width: "50%", background: "var(--p-screen-glow)" }} />
                  <div style={{ height: 2, width: "85%", background: "var(--p-screen-glow)" }} />
                </div>
              )}
              <span style={{ position: "absolute", top: -5, right: -5, width: 10, height: 10, background: statusColor, border: "2px solid var(--p-border)" }} />
            </div>
            <div style={{ width: 12, height: 4, marginLeft: 42, background: "var(--p-stone)", border: "2px solid var(--p-border)", borderTop: "none" }} />
            <div style={{ width: 96, height: 8, background: "var(--p-wood)", border: "2px solid var(--p-border)" }} />
            <div style={{ width: 96, height: 4, background: "var(--p-wood-dark)", borderLeft: "2px solid var(--p-border)", borderRight: "2px solid var(--p-border)", borderBottom: "2px solid var(--p-border)" }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 9, textAlign: "center", color: "var(--p-text)", fontWeight: 700 }}>
            {agent.name} <span style={{ color: "var(--p-text-muted)", fontWeight: 400 }}>{agent.role}</span>
          </div>
          <div style={{ marginTop: 1, fontSize: 7, textAlign: "center", color: "var(--p-text-muted)" }}>
            {sleeping ? `last: ${state?.lastSeenAt ?? "—"}` : status}
          </div>
        </button>
      </div>
    );
  };

  // === Worktree clones ================================================
  const WorktreeClone = ({ x, y, branch, status, parentAgent }) => (
    <button className="subroom-clone" style={{ left: x, top: y }}>
      <div className="subroom-clone__sprite">
        <CatSprite size={32} fur={parentAgent.fur} cheek={parentAgent.cheek}
          pose={status === "idle" ? "sit" : "work"} sleep={status === "idle"} />
      </div>
      <div className="subroom-clone__label">
        <span className={`subroom-clone__dot subroom-clone__dot--${status === "review" ? "review" : status === "idle" ? "idle" : status === "failed" ? "review" : "busy"}`} />
        <span>@{branch}</span>
      </div>
    </button>
  );

  // === Spirit (ephemeral, summoned via skill) ==========================
  // post M0.X-skill-migration: reviewers / retro lens appear only while a skill
  // template is dispatched and vanish when the Task subagent exits.
  const Spirit = ({ x, y, agent, skill, task, status = "active", ttl, leaving = false, onClick, selected }) => {
    const statusColor = { active: "var(--p-success)", queued: "var(--p-warn)", leaving: "var(--p-stone)" }[status];
    return (
      <div className={`spirit${leaving ? " spirit--leaving" : ""}`} style={{ left: x, top: y, width: 92 }}>
        {task && (
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)",
            padding: "2px 5px", fontSize: 8, lineHeight: 1.3, maxWidth: 110,
            marginBottom: 3, boxShadow: "2px 2px 0 0 var(--p-shadow)", fontWeight: 700,
            color: "var(--p-text)", display: "inline-block" }}>{task}</div>
        )}
        <button onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "block",
          textAlign: "center", width: "100%",
          outline: selected ? "3px solid var(--p-accent)" : "none", outlineOffset: 2 }}>
          <div className="spirit__sprite" style={{ position: "relative", display: "inline-block" }}>
            <div className="spirit__sprite-img">
              <CatSprite size={44} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
            </div>
            <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8,
              background: statusColor, border: "2px solid var(--p-border)" }} />
          </div>
          <div className="spirit__label">
            {agent.name} {ttl != null && <span className="spirit__ttl">{ttl}s</span>}
          </div>
          <div className="spirit__skill">⟡ {skill}</div>
        </button>
      </div>
    );
  };

  // === SpiritEcho (hybrid mode: faded trace of recent summons) =========
  const SpiritEcho = ({ x, y, agent, caption, onClick }) => (
    <button className="spirit-echo" onClick={onClick}
      style={{ left: x, top: y, all: "unset", cursor: "pointer", textAlign: "center" }}>
      <div className="spirit-echo__sprite">
        <CatSprite size={28} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
      </div>
      <div className="spirit-echo__caption">{caption}</div>
    </button>
  );

  // === SummonQueue (wall plaque listing live + queued dispatches) ======
  const SummonQueue = ({ x, y, rows }) => (
    <div className="summon-queue" style={{ left: x, top: y }}>
      <div className="summon-queue__title">召喚キュー</div>
      {rows.map((r, i) => (
        <div key={i} className="summon-queue__row">
          <span className={`summon-queue__state summon-queue__state--${r.state}`} />
          <span style={{ flex: 1, color: "var(--p-text)" }}>{r.skill}</span>
          <span style={{ color: "var(--p-text-muted)" }}>{r.t}</span>
        </div>
      ))}
    </div>
  );

  // === Posters =========================================================
  const PlanPoster = ({ todos, milestones, updatedAt, x, y }) => (
    <div className="room-poster" style={{ left: x, top: y, width: 360, height: 130, position: "absolute" }}>
      <div className="room-poster__header">
        <div className="room-poster__title">📋 PLAN — TodoWrite + plan_items</div>
        <div className="room-poster__hint">updated: {updatedAt}</div>
      </div>
      <div className="room-poster__body">
        <div className="room-poster__col">
          <div className="room-poster__section-label">🗺 milestones</div>
          {milestones.slice(0, 3).map(m => {
            const c = { doing: "var(--p-warn)", todo: "var(--p-stone)", done: "var(--p-success)" }[m.status] || "var(--p-stone)";
            return (
              <div key={m.id} className="room-poster__row">
                <span className="room-poster__row-name" style={{ width: 38 }}>{m.id}</span>
                <div className="room-poster__bar">
                  <div className="room-poster__bar-fill" style={{ left: 0, width: `${m.progress*100}%`, background: c }} />
                </div>
                <span className="room-poster__row-meta">{m.count}</span>
              </div>
            );
          })}
        </div>
        <div className="room-poster__col">
          <div className="room-poster__section-label">📒 todos · {todos.length}件</div>
          {todos.slice(0, 4).map((t, i) => (
            <div key={i} className="room-poster__row">
              <span className={`room-poster__check room-poster__check--${t.status}`}>{t.status === "completed" ? "✓" : t.status === "in_progress" ? "●" : ""}</span>
              <span className={`room-poster__check-text${t.status === "completed" ? " room-poster__check-text--completed" : ""}`}>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ConsistencyPoster = ({ findings, x, y }) => {
    const newCount = findings.filter(f => f.sev === "high" && f.status === "open").length;
    return (
      <div className="room-poster" style={{ left: x, top: y, width: 200, height: 130, position: "absolute" }}>
        <div className="room-poster__header">
          <div className="room-poster__title" style={{ fontSize: 9 }}>📜 整合性 INBOX</div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px",
            background: newCount ? "var(--p-error)" : "var(--p-stone)", color: "white", border: "1px solid var(--p-border)" }}>
            NEW {newCount}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, padding: "4px 0" }}>
          {findings.slice(0, 4).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 8 }}>
              <span style={{ width: 5, height: 5,
                background: f.sev === "high" ? "var(--p-error)" : f.sev === "medium" ? "var(--p-warn)" : "var(--p-stone)",
                border: "1px solid var(--p-border)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong style={{ color: "var(--p-text)" }}>{f.id}</strong> {f.title}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 7, color: "var(--p-text-muted)", textAlign: "right" }}>クリックで詳細 →</div>
      </div>
    );
  };

  const GanttPoster = ({ scenario, x, y }) => {
    const isActive = scenario.stream.length > 0;
    const rows = ROOM_AGENTS.map(id => {
      const a = ROSTER.find(r => r.id === id);
      const st = scenario.agents[id]?.status || "idle";
      return {
        name: a?.name ?? id,
        bars: st === "idle"   ? []
            : st === "failed" ? [{ s: 60, e: 95, c: "var(--p-error)" }]
            : [{ s: 30, e: 90, c: STATUS_COLOR[st] }],
      };
    });
    return (
      <div className="room-poster" style={{ left: x, top: y, width: 360, height: 130, position: "absolute" }}>
        <div className="room-poster__header">
          <div className="room-poster__title">❖ GANTT — 直近 30min</div>
          <div className="room-poster__hint">{isActive ? "live →" : "(履歴のみ)"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {rows.map((row, i) => (
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
      </div>
    );
  };

  // Background SVG. Zones can stack vertically (PM above REVIEW on the right).
  const RoomBackground = ({ width, height, zones }) => {
    const wallH = height * 0.32;
    const floorY = height * 0.43;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, imageRendering: "pixelated" }}>
        <rect x="0" y="0" width={width} height={wallH} fill="var(--p-wall)" />
        <rect x="0" y={height * 0.30} width={width} height="3" fill="var(--p-wood-dark)" />
        <rect x="0" y={height * 0.32} width={width} height={height * 0.10} fill="var(--p-wall-2)" />
        <rect x="0" y={height * 0.41} width={width} height="2" fill="var(--p-wood-dark)" />
        <rect x="0" y={floorY} width={width} height={height - floorY} fill="var(--p-bg-floor)" />
        {/* wood-plank floor tiles — single open office, no partitions */}
        {Array.from({ length: Math.ceil((height - floorY) / 28) }).map((_, r) => (
          <rect key={"r" + r} x="0" y={floorY + r * 28} width={width} height="1" fill="var(--p-wood-dark)" opacity="0.18" />
        ))}
        {Array.from({ length: Math.ceil(width / 56) }).map((_, c) => (
          <rect key={"c" + c} x={c * 56} y={floorY} width="1" height={height - floorY} fill="var(--p-wood-dark)" opacity="0.10" />
        ))}
        {/* faint zone area-rugs (no borders, just subtle tint to suggest where teams sit) */}
        {zones.map(z => (
          <g key={z.id}>
            <rect x={z.x + 6} y={z.y + 6} width={z.w - 12} height={z.h - 12} fill={z.tint} opacity="0.30" rx="2" />
            <text x={z.x + z.w / 2} y={z.y + z.h - 12} textAnchor="middle"
              fontSize="16" fontWeight="700" letterSpacing="8"
              fill={z.fg} opacity="0.16"
              style={{ fontFamily: "var(--p-font-mono)" }}>{z.label}</text>
          </g>
        ))}
        {/* perimeter walls — defines "the office" as one room */}
        <rect x="0" y={floorY - 2} width={width} height="3" fill="var(--p-wood-dark)" opacity="0.6" />
        <rect x="0" y={height - 3} width={width} height="3" fill="var(--p-wood-dark)" opacity="0.4" />
        {/* a few props to break up empty space — plant, shelf, water cooler */}
        <g opacity="0.85">
          {/* potted plant bottom-left */}
          <rect x="14" y={height - 56} width="22" height="20" fill="#5a7d3a" />
          <rect x="18" y={height - 60} width="14" height="6" fill="#7aa050" />
          <rect x="16" y={height - 36} width="18" height="10" fill="#8b6f3e" stroke="var(--p-border)" strokeWidth="1.5" />
          {/* shelf top-left of dev pit (against back wall) */}
          <rect x="40" y={floorY + 8} width="56" height="26" fill="#9a7a4a" stroke="var(--p-border)" strokeWidth="1.5" />
          <rect x="44" y={floorY + 12} width="48" height="3" fill="#6a4a2a" />
          <rect x="44" y={floorY + 19} width="48" height="3" fill="#6a4a2a" />
          {/* water cooler between dev and review */}
          <rect x={width * 0.48} y={floorY + 40} width="14" height="36" fill="#c8d8e0" stroke="var(--p-border)" strokeWidth="1.5" />
          <rect x={width * 0.48 + 2} y={floorY + 44} width="10" height="14" fill="#7ab0d8" />
        </g>
      </svg>
    );
  };

  // === LiveRail ========================================================
  const LiveRail = ({ stream, collapsed, onToggle }) => {
    const [tab, setTab] = React.useState("merged");
    const filtered = tab === "tools" ? stream.filter(s => s.kind === "tool")
      : tab === "reasoning" ? stream.filter(s => s.kind === "reason")
      : stream;
    return (
      <div className={`rail${collapsed ? " collapsed" : ""}`}>
        <div className="rail__hdr">
          ⚡ LIVE STREAM
          <span className="x" onClick={onToggle} title="閉じる">×</span>
        </div>
        <div className="rail__tabs">
          {[["merged","ALL"],["reasoning","reasoning"],["tools","tools"]].map(([id, lbl]) => (
            <div key={id} className={`rail__tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{lbl}</div>
          ))}
        </div>
        <div className="rail__body">
          {filtered.length === 0 && <div style={{ color: "var(--p-text-muted)", fontSize: 10, padding: 12, textAlign: "center" }}>
            静かです…<br />/loom-go で開発開始
          </div>}
          {filtered.map((s, i) => (
            <div key={i} className={`rail__line ${s.kind}`}>
              <span className="ts">{s.ts}</span>
              <span className="who">{s.who}</span>
              {s.tool && <span className="tool">{s.tool}</span>}
              {s.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === PM Chat (right column, Slack-style) ============================
  // Wires to: pm.message events (read), POST /pm/say (write), POST /pm/permission/:id
  // Absorbs the stream rail as a tab inside the same right column.
  const PMChatPanel = ({ pm, stream, collapsed, onToggle }) => {
    const [draft, setDraft] = React.useState("");
    const [tab, setTab] = React.useState("chat");
    const logRef = React.useRef(null);
    const high = pm.pendingApprovals.find(a => a.risk === "high");
    const others = pm.pendingApprovals.filter(a => a.risk !== "high");
    React.useEffect(() => {
      if (tab === "chat" && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [pm.messages.length, tab]);
    const send = () => {
      if (!draft.trim()) return;
      console.log("→ POST /pm/say", { text: draft });
      setDraft("");
    };
    if (collapsed) {
      return (
        <button className="pm-chat-handle" onClick={onToggle} title="PM チャットを開く">
          ◆ PM <span style={{ fontSize: 9 }}>{stream.length > 0 && `· ${stream.length}`}</span>
        </button>
      );
    }
    return (
      <React.Fragment>
        <div className="pm-chat">
          <div className="pm-chat__tabs">
            <button className={`pm-chat__tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
              ◆ PM CHAT
            </button>
            <button className={`pm-chat__tab ${tab === "stream" ? "active" : ""}`} onClick={() => setTab("stream")}>
              ⚡ STREAM <span className="badge">{stream.length}</span>
            </button>
            <button className="pm-chat__close" onClick={onToggle} title="折り畳む">▶</button>
          </div>
          {tab === "chat" && (
          <React.Fragment>
          <div className="pm-chat__head">
            <span className="pm-chat__dot" /> PM session
            <span className="pm-chat__meta">claude-sonnet-4 · stream-json</span>
          </div>
          <div className="pm-chat__log" ref={logRef}>
            {pm.messages.map((m, i) => (
              <div key={i} className={`pm-msg pm-msg--${m.who}`}>
                <div className="pm-msg__who">{m.who === "pm" ? "PM" : "you"} <span>{m.ts}</span></div>
                <div className="pm-msg__text">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="pm-chat__input">
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
              placeholder="PM に話しかける… (⌘+Enter で送信)" rows={2} />
            <button onClick={send} disabled={!draft.trim()}>送信</button>
          </div>
          </React.Fragment>
          )}
          {tab === "stream" && (
            <div className="pm-chat__log" style={{ fontFamily: "var(--p-font-mono)", fontSize: 10 }}>
              {stream.length === 0 && <div style={{ color: "var(--p-text-muted)", fontStyle: "italic" }}>stream is quiet</div>}
              {stream.map((s, i) => (
                <div key={i} className={`rail__line ${s.kind}`}>
                  <span className="ts" style={{ color: "var(--p-text-muted)", marginRight: 6 }}>{s.ts}</span>
                  <span className="who">{s.who}</span>
                  {s.kind === "tool" && <span className="tool">{s.tool}</span>}
                  <span className="text">{s.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {others.map(a => (
          <div key={a.id} className={`pm-toast pm-toast--${a.risk}`}>
            <div className="pm-toast__head">
              <span className="pm-toast__risk">{a.risk.toUpperCase()}</span>
              <span className="pm-toast__from">{a.from} が承認待ち</span>
            </div>
            <div className="pm-toast__tool">{a.tool}</div>
            <code className="pm-toast__args">{a.args}</code>
            <div className="pm-toast__actions">
              <button className="reject">却下</button>
              <button className="allow">許可</button>
            </div>
          </div>
        ))}

        {high && (
          <div className="pm-modal-bg">
            <div className="pm-modal">
              <div className="pm-modal__risk">⚠ HIGH RISK · 確認が必要</div>
              <div className="pm-modal__from">{high.from} が以下を実行しようとしています</div>
              <div className="pm-modal__tool">{high.tool}</div>
              <pre className="pm-modal__args">{high.args}</pre>
              <div className="pm-modal__why">この操作は破壊的です。本当に許可しますか?</div>
              <div className="pm-modal__actions">
                <button className="reject">却下 (推奨)</button>
                <button className="allow">許可する</button>
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  // === Main Room =======================================================
  const RoomScreen = ({ sel, setSel, railCollapsed, setRailCollapsed }) => {
    const scenario = useScenario();
    const ref = React.useRef(null);
    const [size, setSize] = React.useState({ w: 1200, h: 700 });
    React.useEffect(() => {
      if (!ref.current) return;
      const ro = new ResizeObserver(([e]) => {
        const r = e.contentRect;
        setSize({ w: Math.max(900, r.width), h: Math.max(560, r.height) });
      });
      ro.observe(ref.current);
      return () => ro.disconnect();
    }, []);
    const chatOpen = scenario.pm.running && !railCollapsed;
    const CHAT_W = 340;
    const W = chatOpen ? Math.max(600, size.w - CHAT_W) : size.w;
    const H = size.h;
    const isIdleAll = ROOM_AGENTS.every(id => (scenario.agents[id]?.status || "idle") === "idle");

    const wallTop = 28;
    const floorY = H * 0.43;
    const deskRowY = floorY + 70;

    // Asymmetric office layout (post skill-migration):
    //   PM       = top-right manager corner (persistent)
    //   DEV      = left half / center (persistent, + worktree clones)
    //   SUMMON   = bottom-right zone where review/retro spirits puff in
    //   (retro-pm sits inside the PM zone, near the summon gate)
    const zones = [
      { id: "dev",    label: "DEV PIT",   x: 0,         y: floorY,                w: W * 0.55, h: H - floorY,             tint: "#e8d8c0", fg: "#7a4a1a" },
      { id: "pm",     label: "MANAGERS",  x: W * 0.55,  y: floorY,                w: W * 0.45, h: (H - floorY) * 0.45,    tint: "#d8e0e8", fg: "#1a4a7a" },
      { id: "summon", label: "SUMMON",    x: W * 0.55,  y: floorY + (H - floorY) * 0.45, w: W * 0.45, h: (H - floorY) * 0.55, tint: "#e8d8e8", fg: "#5a1a7a" },
    ];

    const positions = {
      // PM: top-right corner
      pm:         { x: W * 0.78, y: floorY + 30 },
      // Retro PM: also top-right, slightly back, presides over Summon Zone
      "retro-pm": { x: W * 0.62, y: floorY + 30 },
      // DEV: left cluster
      dev:        { x: W * 0.18, y: floorY + 80 },
    };

    // Currently-summoned spirits — would come from useDispatchQueue() in prod.
    // For now, derive from scenario.agents that aren't in ROOM_AGENTS.
    const SPIRIT_SKILLS = {
      "rev":           "loom-review/single",
      "rev-code":      "loom-review/trio.code",
      "rev-sec":       "loom-review/trio.security",
      "rev-test":      "loom-review/trio.test",
      "retro-pj":      "loom-retro/lenses.pj-axis",
      "retro-proc":    "loom-retro/lenses.process-axis",
      "retro-meta":    "loom-retro/lenses.meta-axis",
      "retro-research":"loom-retro/lenses.researcher",
      "retro-counter": "loom-retro/stages.counter-arguer",
      "retro-agg":     "loom-retro/stages.aggregator",
    };
    const liveSpirits = Object.entries(scenario.agents)
      .filter(([id, st]) => !ROOM_AGENTS.includes(id) && st && st.status && st.status !== "idle")
      .slice(0, 4)
      .map(([id, st], i) => ({
        id, agent: ROSTER.find(r => r.id === id),
        skill: SPIRIT_SKILLS[id] || id,
        status: st.status === "review" || st.status === "busy" ? "active" : (st.status === "failed" ? "leaving" : "queued"),
        task: st.currentTool || st.currentReasoning?.slice(0, 24),
        ttl: 30 + i * 12,
      }))
      .filter(s => s.agent);
    const spiritMode = scenario.spiritMode || "hybrid"; // tweakable in Tweaks panel

    return (
      <div ref={ref} className={`room room--${spiritMode} ${isIdleAll ? "idle-hush" : ""}`}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0, borderRadius: 0 }}>
        <RoomBackground width={W} height={H} zones={zones} />

        <div className="room-sign room-sign--branch" style={{ left: 14, top: wallTop - 18 }}>◆ branch: {scenario.branch}</div>
        <div className="room-sign room-sign--clock"  style={{ right: 14, top: wallTop - 18 }}>☀ {scenario.now} JST</div>

        <GanttPoster scenario={scenario} x={Math.max(14, W * 0.02)} y={wallTop} />
        <PlanPoster todos={scenario.todos} milestones={scenario.milestones} updatedAt={scenario.todosUpdatedAt}
          x={Math.max(390, W * 0.32)} y={wallTop} />
        <ConsistencyPoster findings={scenario.findings} x={Math.min(W - 220, W * 0.78)} y={wallTop} />

        <div className="room-island room-island--pm"     style={{ display: "none" }} />
        <div className="room-island room-island--dev"    style={{ display: "none" }} />
        <div className="room-island room-island--review" style={{ display: "none" }} />
        {/* zone signs are drawn inside RoomBackground SVG as floor labels */}

        {ROOM_AGENTS.map(id => {
          const r = ROSTER.find(x => x.id === id);
          const p = positions[id]; if (!p || !r) return null;
          const state = scenario.agents[id];
          const wt = state?.walkTo;
          const target = wt && positions[wt];
          const walk = target ? { dx: target.x - p.x, dy: target.y - p.y } : null;
          return <Desk key={id} x={p.x} y={p.y} agent={r} state={state} walk={walk}
            selected={sel === id} onClick={() => setSel(sel === id ? null : id)} />;
        })}

        {scenario.worktrees.filter(w => w.parentAgent === "dev").slice(0, 4).map((w, i) => (
          <WorktreeClone key={i} x={positions.dev.x + 60 + i * 56} y={positions.dev.y - 60}
            branch={w.branch} status={w.status} parentAgent={ROSTER.find(r => r.id === w.parentAgent)} />
        ))}

        {/* === Summoned spirits — review / retro lens (ephemeral) === */}
        {liveSpirits.map((s, i) => {
          const slotX = zones[2].x + 30 + (i % 2) * 110;
          const slotY = zones[2].y + 30 + Math.floor(i / 2) * 70;
          return <Spirit key={s.id} x={slotX} y={slotY}
            agent={s.agent} skill={s.skill} status={s.status}
            task={s.task} ttl={s.ttl}
            selected={sel === s.id} onClick={() => setSel(sel === s.id ? null : s.id)} />;
        })}

        {/* === Spirit echoes — recent summons (hybrid mode only) === */}
        {spiritMode === "hybrid" && (scenario.recentSpirits || []).slice(0, 3).map((e, i) => {
          const agent = ROSTER.find(r => r.id === e.id);
          if (!agent) return null;
          return <SpiritEcho key={"e" + i} x={zones[2].x + 30 + i * 90} y={zones[2].y + zones[2].h - 70}
            agent={agent} caption={e.caption} />;
        })}

        {/* === Summon queue wall plaque === */}
        <SummonQueue x={zones[2].x + zones[2].w - 170} y={Math.max(wallTop + 140, zones[2].y - 90)}
          rows={[
            ...liveSpirits.map(s => ({ skill: s.skill.replace("loom-", ""), state: s.status, t: s.ttl ? `0:${String(s.ttl).padStart(2, "0")}` : "—" })),
            ...((scenario.queuedSpirits || []).map(q => ({ skill: q.skill.replace("loom-", ""), state: "queued", t: "—" }))),
          ].slice(0, 5)} />

        {isIdleAll && !scenario.pm.running && (
          <div className="coldstart">
            <h3>みんな寝てます 💤</h3>
            <p>このプロジェクトでは現在 claude code セッションが動いていません。<br />前回の値は壁に貼ってあります。</p>
            <div className="row">
              <button className="btn-px primary" onClick={() => alert("POST /pm/start")}>▶ PM を起動</button>
              <span style={{ fontSize: 9, color: "var(--p-text-muted)" }}>or terminal で <code>/loom-pm</code></span>
            </div>
          </div>
        )}

        {scenario.pm.running && (
          <PMChatPanel pm={scenario.pm} stream={scenario.stream}
            collapsed={railCollapsed} onToggle={() => setRailCollapsed(!railCollapsed)} />
        )}

        {!scenario.pm.running && !railCollapsed && (
          <LiveRail stream={scenario.stream} collapsed={false} onToggle={() => setRailCollapsed(true)} />
        )}
        {!scenario.pm.running && railCollapsed && (
          <button className="rail-toggle" onClick={() => setRailCollapsed(false)}>⚡ LIVE</button>
        )}

        {/* Walking is now driven by state.walkTo on each agent — sprite detaches from desk and trots over */}
      </div>
    );
  };

  window.RoomScreen = RoomScreen;
})();
