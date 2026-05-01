// === SUBROOM VIEW ===
// What's inside a worktree sub-agent's room: branch state, current task,
// recent activity, and a tiny gantt of just this clone's work.

const { CatSprite: SCat } = window;

const SubroomView = ({ width = 720, branch = "feat/oauth", parentCat, status = "busy" }) => {
  // Branch-specific demo content. In a real implementation this would
  // come from the worktree's actual state.
  const session = {
    "feat/oauth": {
      task: "freee OAuth callback の URL 検証",
      tdd: "RED",
      tddDetail: "test 3つ追加 → 失敗確認済",
      file: "src/auth/oauth.callback.ts",
      diffAdds: 28, diffDels: 4,
      commits: 3,
      activity: [
        { t: "14:21", m: "test: callback URL の query 検証を追加", k: "test" },
        { t: "14:18", m: "feat: callback handler stub", k: "code" },
        { t: "14:14", m: "spec §3.6.5 → cases 抽出", k: "spec" },
        { t: "14:09", m: "branch: feat/oauth 作成", k: "git" },
      ],
      bars: [
        { s: 0,  e: 18, c: "var(--p-success)", l: "spec" },
        { s: 18, e: 38, c: "var(--p-warn)",    l: "RED" },
        { s: 38, e: 62, c: "var(--p-warn)",    l: "RED" },
        { s: 62, e: 95, c: "var(--p-accent)",  l: "writing now" },
      ],
    },
    "fix/test-flake": {
      task: "user.service.test.ts の flake 調査",
      tdd: "DIAGNOSE",
      tddDetail: "race condition 疑い、再現中",
      file: "src/users/user.service.test.ts",
      diffAdds: 5, diffDels: 12,
      commits: 1,
      activity: [
        { t: "14:22", m: "verdict: 'review' をリクエスト", k: "verdict" },
        { t: "14:17", m: "test: timing を deterministic に", k: "test" },
        { t: "14:11", m: "再現スクリプト → flake 80%", k: "diag" },
        { t: "14:03", m: "branch: fix/test-flake 作成", k: "git" },
      ],
      bars: [
        { s: 0,  e: 22, c: "var(--p-stone)",   l: "repro" },
        { s: 22, e: 55, c: "var(--p-warn)",    l: "diagnose" },
        { s: 55, e: 80, c: "var(--p-success)", l: "fix" },
        { s: 80, e: 95, c: "var(--p-accent)",  l: "review" },
      ],
    },
  }[branch] || { task: "—", tdd: "—", file: "", diffAdds: 0, diffDels: 0, commits: 0, activity: [], bars: [] };

  const statusColor = {
    busy:   "var(--p-success)",
    review: "var(--p-accent)",
    idle:   "var(--p-stone)",
  }[status] || "var(--p-success)";

  const kindBg = {
    test:    "var(--p-warn)",
    code:    "var(--p-accent)",
    spec:    "var(--p-success)",
    git:     "var(--p-stone)",
    verdict: "var(--p-accent)",
    diag:    "var(--p-warn)",
  };

  return (
    <div className="rpg-frame pixel subroom-view" style={{ width, padding: 0, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
      {/* HEADER STRIP — branch + clone identity */}
      <div style={{
        background: "var(--p-accent)", color: "white",
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "3px solid var(--p-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ filter: "drop-shadow(0 0 0 2px white)" }}>
            <SCat size={32} fur={parentCat?.fur || "#aaa"} cheek={parentCat?.cheek || "#fda"} hat={parentCat?.hat} pose="work" />
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.85, letterSpacing: "0.06em" }}>SUBROOM · WORKTREE</div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.02em" }}>@{branch}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-block", width: 10, height: 10,
            background: statusColor, border: "2px solid white",
            animation: status === "busy" ? "subroom-pulse 1.2s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{status}</span>
        </div>
      </div>

      {/* BODY — 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
        {/* LEFT — current task + diff + activity */}
        <div style={{ padding: 16, borderRight: "2px dashed var(--p-border)", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* current task */}
          <div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>▶ NOW</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--p-text)", lineHeight: 1.4 }}>{session.task}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "var(--p-warn)", color: "white", border: "2px solid var(--p-border)" }}>TDD: {session.tdd}</span>
              <span style={{ fontSize: 10, color: "var(--p-text-muted)" }}>{session.tddDetail}</span>
            </div>
          </div>

          {/* file + diff */}
          <div style={{ background: "var(--p-tint)", border: "2px solid var(--p-border)", padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.04em", marginBottom: 3 }}>EDITING</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--p-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.file}</div>
            <div style={{ marginTop: 4, fontSize: 10, display: "flex", gap: 10 }}>
              <span style={{ color: "var(--p-success)", fontWeight: 700 }}>+{session.diffAdds}</span>
              <span style={{ color: "var(--p-error)", fontWeight: 700 }}>−{session.diffDels}</span>
              <span style={{ color: "var(--p-text-muted)" }}>· {session.commits} commits</span>
            </div>
          </div>

          {/* activity */}
          <div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>▶ ACTIVITY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {session.activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
                  <span style={{ fontSize: 9, color: "var(--p-text-muted)", width: 36, flexShrink: 0 }}>{a.t}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: "1px 5px",
                    background: kindBg[a.k] || "var(--p-stone)",
                    color: "white", border: "1.5px solid var(--p-border)",
                    width: 50, textAlign: "center", flexShrink: 0,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{a.k}</span>
                  <span style={{ flex: 1, color: "var(--p-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — mini gantt + meta */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>▶ THIS BRANCH · 1h</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {session.bars.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "var(--p-text-muted)", width: 60, flexShrink: 0, textAlign: "right" }}>{b.l}</span>
                  <div style={{ flex: 1, height: 10, background: "var(--p-tint)", border: "1px solid var(--p-border)", position: "relative" }}>
                    <div style={{ position: "absolute", left: `${b.s}%`, width: `${b.e - b.s}%`, top: 0, bottom: 0, background: b.c, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 2px, transparent 2px 4px)" }} />
                    <div style={{ position: "absolute", left: "95%", top: -1, bottom: -1, width: 1, background: "var(--p-error)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* meta — parallelism + back to main */}
          <div style={{ background: "var(--p-paper-2, var(--p-tint))", border: "2px solid var(--p-border)", padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.04em", marginBottom: 3 }}>PARENT</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{parentCat?.name || "—"} <span style={{ fontWeight: 400, color: "var(--p-text-muted)", fontSize: 10 }}>(本体)</span></div>
            <div style={{ marginTop: 6, fontSize: 10, color: "var(--p-text-muted)", lineHeight: 1.4 }}>
              本体が orchestrate、このサブルームで並列実行中。<br />
              merge: 検証 PASS 後 → main へ
            </div>
          </div>

          {/* parallel info */}
          <div style={{ fontSize: 9, color: "var(--p-text-muted)", lineHeight: 1.4, paddingTop: 4, borderTop: "1px dashed var(--p-border)" }}>
            ◆ worktree path: <span style={{ fontWeight: 700, color: "var(--p-text)" }}>~/loom/worktrees/{branch.replace("/", "-")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

window.SubroomView = SubroomView;
