// screens/customization.jsx — Agents (3) + Skills (2 with sub-scope) tree
// post M0.X-skill-migration (PR#18): agents flat → agents + skills tree
(function () {
  const { useScenario, ROSTER, SKILLS, CatSprite } = window;
  const React = window.React;

  const PRESETS = [
    { id: "default",         emoji: "😌", name: "Default",         desc: "標準。プロンプトは原型のまま。" },
    { id: "friendly-mentor", emoji: "🌱", name: "Friendly Mentor", desc: "やさしく褒める。初学者向け。" },
    { id: "strict-drill",    emoji: "💪", name: "Strict Drill",    desc: "厳しく指摘、根拠重視。" },
    { id: "detective",       emoji: "🔍", name: "Detective",       desc: "問いで深掘り。仮説検証型。" },
  ];
  const MODELS = [
    { id: "opus",   color: "var(--p-accent)" },
    { id: "sonnet", color: "var(--p-success)" },
    { id: "haiku",  color: "var(--p-stone)" },
  ];

  // Static fixture for design canvas — wires to user_prefs.json / project.json
  // in production via useCustomization() hook.
  const LEAVES = {
    "agents/loom-pm":        { kind: "agent",   spiritId: "pm",            preset: "default",         model: "opus",   custom: "",
                               note: "PM は model 切替不可 (SPEC §3.9.16 で固定)" },
    "agents/loom-developer": { kind: "agent",   spiritId: "dev",           preset: "friendly-mentor", model: "sonnet",
                               custom: "TDD red 順序の遵守を最優先で。" },
    "agents/loom-retro-pm":  { kind: "agent",   spiritId: "retro-pm",      preset: "default",         model: "opus",   custom: "" },
    "skills/loom-review/strategies/single":        { kind: "skill", spiritId: "rev",      preset: "default",      custom: "" },
    "skills/loom-review/strategies/trio/code":     { kind: "skill", spiritId: "rev-code", preset: "strict-drill", custom: "" },
    "skills/loom-review/strategies/trio/security": { kind: "skill", spiritId: "rev-sec",  preset: "detective",
                                                     custom: "OWASP top 10 を必ず根拠に。" },
    "skills/loom-review/strategies/trio/test":     { kind: "skill", spiritId: "rev-test", preset: "default",      custom: "" },
    "skills/loom-retro/lenses/pj-axis":      { kind: "skill", spiritId: "retro-pj",       preset: "default",   custom: "" },
    "skills/loom-retro/lenses/process-axis": { kind: "skill", spiritId: "retro-proc",     preset: "default",   custom: "" },
    "skills/loom-retro/lenses/meta-axis":    { kind: "skill", spiritId: "retro-meta",     preset: "detective", custom: "" },
    "skills/loom-retro/lenses/researcher":   { kind: "skill", spiritId: "retro-research", preset: "default",   custom: "" },
    "skills/loom-retro/stages/counter-arguer": { kind: "skill", spiritId: "retro-counter", preset: "strict-drill", custom: "" },
    "skills/loom-retro/stages/aggregator":     { kind: "skill", spiritId: "retro-agg",     preset: "default",
                                                 writePermission: true,
                                                 custom: "carryover_count >= 3 で auto-expire marker 付与。" },
  };

  // learned_guidance counts per leaf — would come from useLearnedGuidance()
  const GUIDANCE_COUNT = {
    "agents/loom-pm": 2,
    "agents/loom-developer": 4,
    "agents/loom-retro-pm": 0,
    "skills/loom-review/strategies/trio/code": 1,
    "skills/loom-review/strategies/trio/security": 2,
    "skills/loom-retro/stages/aggregator": 6,
  };

  function CustomizationScreen() {
    const sc = useScenario();
    const [selected, setSelected] = React.useState("agents/loom-developer");
    const [expanded, setExpanded] = React.useState({
      "agents": true, "skills": true,
      "skills/loom-review": true,
      "skills/loom-review/strategies": true,
      "skills/loom-review/strategies/trio": true,
      "skills/loom-retro": true,
      "skills/loom-retro/lenses": true,
      "skills/loom-retro/stages": true,
    });
    const [dirty, setDirty] = React.useState(false);
    const toggle = (k) => setExpanded(e => ({ ...e, [k]: !e[k] }));

    const leaf = LEAVES[selected];
    const cat  = leaf ? ROSTER.find(r => r.id === leaf.spiritId) : null;

    const Row = ({ label, path, hasChildren = false, depth = 0, leafKey, badge, count }) => {
      const isOpen = !!expanded[path];
      const isSel  = selected === leafKey;
      return (
        <div onClick={() => leafKey ? setSelected(leafKey) : toggle(path)}
          style={{ display: "flex", alignItems: "center", gap: 4,
            padding: "3px 6px", paddingLeft: 6 + depth * 14, cursor: "pointer", fontSize: 10,
            background: isSel ? "var(--p-accent-soft)" : "transparent",
            borderLeft: isSel ? "3px solid var(--p-accent)" : "3px solid transparent",
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
          {hasChildren && <span style={{ width: 10, fontSize: 9, color: "var(--p-text-muted)" }}>{isOpen ? "▾" : "▸"}</span>}
          {!hasChildren && <span style={{ width: 10 }}>•</span>}
          <span style={{ flex: 1, fontWeight: leafKey ? 600 : 700,
            color: leafKey ? "var(--p-text)" : "var(--p-text-muted)" }}>{label}</span>
          {count != null && <span style={{ fontSize: 8, color: "var(--p-text-muted)" }}>({count})</span>}
          {badge && <span style={{ fontSize: 7, padding: "1px 4px", background: "var(--p-warn)", color: "white",
            border: "1px solid var(--p-border)", letterSpacing: "0.04em" }}>{badge}</span>}
        </div>
      );
    };

    return (
      <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "auto", background: "var(--p-bg-sky)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>⚙ CUSTOMIZATION — Agents (3) + Skills (2)</div>
          <span className="chip">schema: <b style={{ marginLeft: 4 }}>v2 (PR#18)</b></span>
          <span className="chip">scope: user-prefs · project override 4件</span>
          <div style={{ flex: 1 }} />
          {dirty && <span style={{ fontSize: 9, color: "var(--p-warn)", fontWeight: 700 }}>● 未保存変更あり</span>}
          <button className="btn-px ghost" style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setDirty(false)}>取消</button>
          <button className={"btn-px " + (dirty ? "primary" : "ghost")} style={{ fontSize: 9, padding: "3px 8px" }} onClick={() => setDirty(false)}>保存</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, alignItems: "stretch" }}>
          {/* ===== LEFT — TREE ===== */}
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: "8px 0", maxHeight: 600, overflow: "auto" }}>
            <Row label="Agents" path="agents" hasChildren depth={0} count={3} />
            {expanded["agents"] && (
              <React.Fragment>
                <Row label="loom-pm"        path="x1" depth={1} leafKey="agents/loom-pm" />
                <Row label="loom-developer" path="x2" depth={1} leafKey="agents/loom-developer" />
                <Row label="loom-retro-pm"  path="x3" depth={1} leafKey="agents/loom-retro-pm" />
              </React.Fragment>
            )}
            <Row label="Skills" path="skills" hasChildren depth={0} count={2} />
            {expanded["skills"] && (
              <React.Fragment>
                <Row label="loom-review" path="skills/loom-review" hasChildren depth={1} />
                {expanded["skills/loom-review"] && (
                  <React.Fragment>
                    <Row label="strategies/" path="skills/loom-review/strategies" hasChildren depth={2} />
                    {expanded["skills/loom-review/strategies"] && (
                      <React.Fragment>
                        <Row label="single" path="y1" depth={3} leafKey="skills/loom-review/strategies/single" />
                        <Row label="trio/"  path="skills/loom-review/strategies/trio" hasChildren depth={3} />
                        {expanded["skills/loom-review/strategies/trio"] && (
                          <React.Fragment>
                            <Row label="code"     path="z1" depth={4} leafKey="skills/loom-review/strategies/trio/code" />
                            <Row label="security" path="z2" depth={4} leafKey="skills/loom-review/strategies/trio/security" />
                            <Row label="test"     path="z3" depth={4} leafKey="skills/loom-review/strategies/trio/test" />
                          </React.Fragment>
                        )}
                      </React.Fragment>
                    )}
                  </React.Fragment>
                )}
                <Row label="loom-retro" path="skills/loom-retro" hasChildren depth={1} />
                {expanded["skills/loom-retro"] && (
                  <React.Fragment>
                    <Row label="lenses/" path="skills/loom-retro/lenses" hasChildren depth={2} />
                    {expanded["skills/loom-retro/lenses"] && (
                      <React.Fragment>
                        <Row label="pj-axis"      path="w1" depth={3} leafKey="skills/loom-retro/lenses/pj-axis" />
                        <Row label="process-axis" path="w2" depth={3} leafKey="skills/loom-retro/lenses/process-axis" />
                        <Row label="meta-axis"    path="w3" depth={3} leafKey="skills/loom-retro/lenses/meta-axis" />
                        <Row label="researcher"   path="w4" depth={3} leafKey="skills/loom-retro/lenses/researcher" />
                      </React.Fragment>
                    )}
                    <Row label="stages/" path="skills/loom-retro/stages" hasChildren depth={2} />
                    {expanded["skills/loom-retro/stages"] && (
                      <React.Fragment>
                        <Row label="counter-arguer" path="v1" depth={3} leafKey="skills/loom-retro/stages/counter-arguer" />
                        <Row label="aggregator"     path="v2" depth={3} leafKey="skills/loom-retro/stages/aggregator" badge="WRITE" />
                      </React.Fragment>
                    )}
                  </React.Fragment>
                )}
              </React.Fragment>
            )}
            <div style={{ padding: "8px 10px", fontSize: 8, color: "var(--p-text-muted)",
              borderTop: "1px dashed var(--p-border)", marginTop: 6, lineHeight: 1.5 }}>
              ◆ Agent = 常駐 (model + personality + learned_guidance)<br />
              ◆ Skill = 召喚 template (scope ごとに personality + learned_guidance)<br />
              ◆ <span style={{ background: "var(--p-warn)", color: "white", padding: "0 3px" }}>WRITE</span> = pending/applied 書き込み権限あり
            </div>
          </div>

          {/* ===== RIGHT — LEAF EDITOR ===== */}
          <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 14, minHeight: 540 }}>
            {!leaf && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--p-text-muted)", fontSize: 10 }}>
                左の tree から agent / skill scope を選んでください
              </div>
            )}
            {leaf && (
              <React.Fragment>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                  paddingBottom: 10, borderBottom: "2px solid var(--p-border)" }}>
                  {cat && <CatSprite size={42} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="sit" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: "var(--p-text-muted)", fontFamily: "ui-monospace, monospace" }}>{selected}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {cat?.name || "—"}
                      <span style={{ fontSize: 9, fontWeight: 400, color: "var(--p-text-muted)", marginLeft: 8 }}>
                        {cat?.role}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 8, padding: "2px 6px",
                    background: leaf.kind === "agent" ? "var(--p-success)" : "var(--p-accent-soft)",
                    color: leaf.kind === "agent" ? "white" : "var(--p-accent)",
                    border: "1.5px solid var(--p-border)", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {leaf.kind === "agent" ? "PERSISTENT AGENT" : "SKILL SCOPE"}
                  </span>
                  {leaf.writePermission && (
                    <span style={{ fontSize: 8, padding: "2px 6px", background: "var(--p-warn)", color: "white",
                      border: "1.5px solid var(--p-border)", fontWeight: 700, letterSpacing: "0.04em" }}>WRITE</span>
                  )}
                </div>

                {/* Model — agents only */}
                {leaf.kind === "agent" && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>MODEL</div>
                    <div style={{ display: "flex", border: "2px solid var(--p-border)", width: "fit-content" }}>
                      {MODELS.map(m => (
                        <div key={m.id} onClick={() => setDirty(true)}
                          style={{ padding: "4px 12px", fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace",
                            cursor: "pointer",
                            background: leaf.model === m.id ? m.color : "transparent",
                            color: leaf.model === m.id ? "white" : "var(--p-text-muted)",
                            borderRight: "1px solid var(--p-border)" }}>{m.id}</div>
                      ))}
                    </div>
                    {leaf.note && (
                      <div style={{ fontSize: 8, color: "var(--p-text-muted)", marginTop: 4, fontStyle: "italic" }}>
                        ※ {leaf.note}
                      </div>
                    )}
                  </div>
                )}

                {/* Personality preset */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>PERSONALITY PRESET</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {PRESETS.map(p => (
                      <div key={p.id} onClick={() => setDirty(true)}
                        style={{ padding: "6px 8px", cursor: "pointer", fontSize: 9,
                          background: leaf.preset === p.id ? "var(--p-accent)" : "var(--p-tint)",
                          color: leaf.preset === p.id ? "white" : "var(--p-text)",
                          border: "1.5px solid var(--p-border)" }}>
                        <div style={{ fontWeight: 700 }}>{p.emoji} {p.name}</div>
                        <div style={{ fontSize: 8, opacity: 0.8, marginTop: 2 }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom override */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "var(--p-text-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>
                    CUSTOM OVERRIDE — free-form prompt addendum
                  </div>
                  <div style={{ padding: 8, background: "var(--p-tint)", border: "1.5px solid var(--p-border)",
                    borderLeft: "3px solid var(--p-accent)", fontSize: 10, fontFamily: "ui-monospace, monospace",
                    minHeight: 32, color: leaf.custom ? "var(--p-text)" : "var(--p-text-muted)" }}>
                    {leaf.custom || "(空 — preset がそのまま使われます)"}
                  </div>
                </div>

                {/* Learned guidance count + preview */}
                <div style={{ display: "flex", gap: 10, fontSize: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, padding: 8, background: "var(--p-tint)", border: "1.5px solid var(--p-border)" }}>
                    <div style={{ fontSize: 8, color: "var(--p-text-muted)", letterSpacing: "0.06em" }}>LEARNED GUIDANCE</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {GUIDANCE_COUNT[selected] ?? 0} entries
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: 8, background: "var(--p-tint)", border: "1.5px solid var(--p-border)" }}>
                    <div style={{ fontSize: 8, color: "var(--p-text-muted)", letterSpacing: "0.06em" }}>EFFECTIVE PROMPT</div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>preview ▸</div>
                  </div>
                </div>

                <div style={{ padding: "6px 10px", fontSize: 9, color: "var(--p-text-muted)",
                  background: "var(--p-tint)", border: "1px dashed var(--p-border)", lineHeight: 1.5 }}>
                  ◆ <b>2-layer prompt</b> (docs/AGENT_PROMPT_DESIGN.md): persona + tactical instructions の二層構成。<br />
                  ◆ custom override は preset の上に重ねがけ → 最終 prompt は両方を結合して agent / skill template に渡される。<br />
                  ◆ skill scope では personality を leaf 単位で分離可能 (例: <code>trio.code</code> = drill, <code>trio.security</code> = detective)。
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    );
  }
  window.CustomizationScreen = CustomizationScreen;
})();
