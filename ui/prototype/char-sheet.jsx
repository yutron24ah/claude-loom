// Character sheet — all 13 agents with breed / name / quote
const { CatSprite, ROSTER } = window;

const groupTitle = {
  core:   { jp: "コア — PJ 駆動", en: "CORE" },
  review: { jp: "レビュアー — 監視猫", en: "REVIEWERS" },
  retro:  { jp: "Retro — 観察役 7体", en: "RETRO BOARD" },
};

const CharSheet = ({ width = 920 }) => {
  const groups = ["core", "review", "retro"];
  return (
    <div className="rpg-frame pixel" style={{ width, padding: 16 }}>
      <div className="rpg-title" style={{ marginBottom: 4 }}>📕 13 agent — キャラクターシート</div>
      <div className="rpg-label" style={{ marginBottom: 14 }}>愛着最大化のため、全員に猫種・名前・一言性格を付与</div>

      {groups.map(g => (
        <div key={g} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 2, flex: 1, background: "var(--p-border)" }} />
            <div className="rpg-label">{groupTitle[g].en} · {groupTitle[g].jp}</div>
            <div style={{ height: 2, flex: 1, background: "var(--p-border)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {ROSTER.filter(r => r.group === g).map(c => (
              <div key={c.id} className="rpg-frame-tight" style={{ padding: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ background: "var(--p-tint)", border: "1px solid var(--p-border)", padding: 2 }}>
                    <CatSprite size={48} fur={c.fur} cheek={c.cheek} hat={c.hat} pose="sit" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                    <div className="rpg-label" style={{ marginTop: 1 }}>{c.role}</div>
                    <div style={{ fontSize: 9, color: "var(--p-text-muted)", marginTop: 2 }}>{c.breed}</div>
                  </div>
                </div>
                <div style={{ fontSize: 9, fontStyle: "italic", color: "var(--p-text)", marginTop: 6, padding: "4px 6px", background: "var(--p-tint)", border: "1px dashed var(--p-border)", lineHeight: 1.4 }}>
                  「{c.quote}」
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Color palette card — show the 3 themes (noon / dusk / night)
const ThemeShowcase = ({ width = 920 }) => {
  const themes = [
    { id: "",      name: "noon — 昼",    jp: "ぽっぷ・明るい開発室",     desc: "Kintai DS の indigo + 白 + slate を尊重。OAuth 画面と地続き。" },
    { id: "dusk",  name: "dusk — 夕暮れ",jp: "暖かい・少し秘密基地っぽい", desc: "紫の屋内灯。集中の時間。" },
    { id: "night", name: "night — 深夜", jp: "ダークな秘密基地",         desc: "黒基調・ネオン青。観賞用に強い。" },
  ];
  return (
    <div className="rpg-frame pixel" style={{ width, padding: 16 }}>
      <div className="rpg-title" style={{ marginBottom: 4 }}>🎨 3つの世界観 — 時間帯切替</div>
      <div className="rpg-label" style={{ marginBottom: 14 }}>System default · 朝 9-17 noon / 17-22 dusk / 22-9 night（Tweaks で固定可）</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {themes.map(t => (
          <div key={t.id} className={`theme-${t.id} rpg-frame-tight`} style={{ padding: 10, background: "var(--p-bg-sky)", color: "var(--p-text)" }}>
            <div style={{ background: "var(--p-paper)", border: "2px solid var(--p-border)", padding: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--p-text)" }}>{t.name}</div>
              <div style={{ fontSize: 10, color: "var(--p-text-muted)", marginTop: 2 }}>{t.jp}</div>
              <div style={{ fontSize: 9, color: "var(--p-text-muted)", marginTop: 6 }}>{t.desc}</div>
            </div>
            {/* mini room preview */}
            <div style={{ height: 80, background: "var(--p-wall)", border: "2px solid var(--p-border)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, background: "var(--p-bg-floor)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, height: 6, background: "var(--p-rug)" }} />
              <div style={{ position: "absolute", left: 14, bottom: 18 }}><CatSprite size={32} pose="work" hat="leader" /></div>
              <div style={{ position: "absolute", left: 50, bottom: 18 }}><CatSprite size={32} pose="work" hat="headband" fur="#b8a98c" /></div>
              <div style={{ position: "absolute", right: 14, bottom: 18 }}><CatSprite size={32} pose="sit" hat="visor" fur="#e8e2d2" /></div>
            </div>
            {/* swatches */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {["var(--p-bg-sky)", "var(--p-wall)", "var(--p-bg-floor)", "var(--p-accent)", "var(--p-success)", "var(--p-error)"].map((c, i) => (
                <div key={i} style={{ width: 18, height: 18, background: c, border: "1px solid var(--p-border)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.CharSheet = CharSheet;
window.ThemeShowcase = ThemeShowcase;
