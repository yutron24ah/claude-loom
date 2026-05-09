// screens/settings.jsx — project-level config. Small + opinionated.
(function () {
  const { useScenario } = window;
  const React = window.React;

  function Row({ label, hint, children }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, alignItems: "center",
        padding: "10px 0", borderBottom: "1px dashed var(--p-border)" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{label}</div>
          {hint && <div style={{ fontSize: 9, color: "var(--p-text-muted)", marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
        </div>
        <div>{children}</div>
      </div>
    );
  }

  function SettingsScreen() {
    const sc = useScenario();
    const s = sc.settings;
    const [draft, setDraft] = React.useState(s);
    const dirty = JSON.stringify(draft) !== JSON.stringify(s);
    const set = (path, v) => setDraft(d => {
      const nd = JSON.parse(JSON.stringify(d));
      const ks = path.split("."); let cur = nd;
      for (let i = 0; i < ks.length-1; i++) cur = cur[ks[i]];
      cur[ks[ks.length-1]] = v;
      return nd;
    });

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>⚙ PROJECT SETTINGS</div>
          <span className="chip" style={{ fontFamily: "ui-monospace, monospace" }}>{sc.project}/.claude/loom/project.json</span>
          <div style={{ flex: 1 }} />
          {dirty && <span style={{ fontSize: 9, color: "var(--p-warn)", fontWeight: 700 }}>● 未保存</span>}
          <button className="btn-px ghost" onClick={() => setDraft(s)} disabled={!dirty}>取消</button>
          <button className={"btn-px " + (dirty ? "primary" : "ghost")} onClick={() => setDraft(s)}>保存</button>
        </div>

        <div style={{ maxWidth: 720, background: "var(--p-paper)", border: "2px solid var(--p-border)",
          padding: "0 16px", boxShadow: "3px 3px 0 0 var(--p-shadow)" }}>

          <Row label="Daemon Port" hint="loom daemon が listen する port。WS + REST 共用。">
            <input type="number" value={draft.daemonPort} onChange={e => set("daemonPort", +e.target.value)}
              style={{ width: 100, padding: "4px 8px", fontSize: 11,
                border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
          </Row>

          <Row label="Worktree Base" hint="新 worktree を作る親 directory。git worktree add の引数。">
            <input type="text" value={draft.worktreeBase} onChange={e => set("worktreeBase", e.target.value)}
              style={{ width: "100%", maxWidth: 360, padding: "4px 8px", fontSize: 11, boxSizing: "border-box",
                border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
          </Row>

          <Row label="Retro Schedule" hint="自動 retro の cron。enable=off で手動のみ。">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <label style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={draft.retroSchedule.enabled}
                  onChange={e => set("retroSchedule.enabled", e.target.checked)} /> enabled
              </label>
              <input type="text" value={draft.retroSchedule.cron} disabled={!draft.retroSchedule.enabled}
                onChange={e => set("retroSchedule.cron", e.target.value)}
                style={{ width: 140, padding: "4px 8px", fontSize: 11, opacity: draft.retroSchedule.enabled ? 1 : 0.4,
                  border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
              <span style={{ fontSize: 9, color: "var(--p-text-muted)" }}>{draft.retroSchedule.label}</span>
            </div>
          </Row>

          <Row label="Consistency Scope" hint="spec_diff が scan する path glob。1行1件。">
            <textarea value={draft.consistencyScope.join("\n")} rows={3}
              onChange={e => set("consistencyScope", e.target.value.split("\n").filter(Boolean))}
              style={{ width: "100%", maxWidth: 360, padding: "6px 8px", fontSize: 10, boxSizing: "border-box",
                border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace", resize: "vertical" }} />
          </Row>

          <Row label="Hooks" hint="Claude Code hook の有効/無効。OFF にすると stream/gantt が止まる。">
            <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
              {[["preToolUse","PreToolUse"],["postToolUse","PostToolUse"],["subagentStop","SubagentStop"]].map(([k,l]) => (
                <label key={k} style={{ display: "inline-flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={draft.hooks[k]} onChange={e => set(`hooks.${k}`, e.target.checked)} /> {l}
                </label>
              ))}
            </div>
          </Row>

          <Row label="Default Reviewers" hint="PR review で自動 dispatch される reviewer の既定セット。">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["rev-code","rev-test","rev-sec"].map(r => {
                const on = draft.defaultReviewers.includes(r);
                return (
                  <button key={r} onClick={() => set("defaultReviewers",
                    on ? draft.defaultReviewers.filter(x => x !== r) : [...draft.defaultReviewers, r])}
                    style={{ all: "unset", cursor: "pointer", padding: "3px 8px", fontSize: 9, fontWeight: 700,
                      border: "1.5px solid var(--p-border)",
                      background: on ? "var(--p-accent)" : "var(--p-tint)",
                      color: on ? "white" : "var(--p-text)" }}>{on ? "✓ " : ""}{r}</button>
                );
              })}
            </div>
          </Row>

          <Row label="Parallel Limit" hint="同時 dispatch 可能な subagent 数の上限。超えると queue 待ち。">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="range" min={1} max={8} value={draft.parallelLimit}
                onChange={e => set("parallelLimit", +e.target.value)} style={{ width: 200 }} />
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--p-accent)", width: 30 }}>{draft.parallelLimit}</span>
            </div>
          </Row>

          <Row label="Log Retention" hint="agent_history.jsonl と stream tail の保持日数。古いものは zip archive。">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={draft.logRetention.days} onChange={e => set("logRetention.days", +e.target.value)}
                style={{ width: 80, padding: "4px 8px", fontSize: 11,
                  border: "1.5px solid var(--p-border)", background: "var(--p-tint)", fontFamily: "ui-monospace, monospace" }} />
              <span style={{ fontSize: 10, color: "var(--p-text-muted)" }}>日</span>
            </div>
          </Row>
        </div>

        <div style={{ marginTop: 14, maxWidth: 720, padding: 12, fontSize: 9, color: "var(--p-text-muted)",
          background: "var(--p-paper)", border: "2px dashed var(--p-border)", lineHeight: 1.6 }}>
          ◆ user-prefs (<code>~/.claude/loom/user-prefs.json</code>) は CLI からのみ編集。<br />
          ◆ ここでの保存は <code>project.json</code> の write のみ — daemon が fs.watch で即反映。<br />
          ◆ 「reset to defaults」は CLI の <code>loom config reset</code> から。GUI からの破壊的操作は意図的に外してます。
        </div>
      </div>
    );
  }
  window.SettingsScreen = SettingsScreen;
})();
