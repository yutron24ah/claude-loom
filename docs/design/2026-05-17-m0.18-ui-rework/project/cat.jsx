// Cat sprite — chibi pixel cat. 16x16 grid scaled by viewBox.
// Reference: rounded plump body, clearly attached ears, prominent cheeks.

const CatSprite = ({ size = 64, fur = "var(--p-cat-base)", line = "var(--p-cat-line)", cheek = "var(--p-cat-cheek)", accent = "var(--p-accent)", pose = "sit", hat = null, scroll = false, sleep = false, facing = "front" }) => {
  const px = (x, y, w, h, fill) => <rect x={x} y={y} width={w} height={h} fill={fill} shapeRendering="crispEdges" />;
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated", display: "block" }}>
      {/* === HEAD with attached ears === */}
      {/* ear triangles (attached to head outline) */}
      {px(2,2,1,1,line)}{px(2,3,2,1,line)}{px(3,4,1,1,line)}
      {px(13,2,1,1,line)}{px(12,3,2,1,line)}{px(12,4,1,1,line)}
      {/* ear inner */}
      {px(3,3,1,1,fur)}{px(13,3,1,1,fur)}
      {/* head outline */}
      {px(4,3,1,1,line)}{px(5,2,6,1,line)}{px(11,3,1,1,line)}
      {px(3,4,10,1,line)}
      {px(2,5,1,3,line)}{px(13,5,1,3,line)}
      {px(3,8,10,1,line)}
      {/* head fill */}
      {px(4,3,7,1,fur)}{px(3,5,10,3,fur)}
      {/* cheeks (more prominent) */}
      {px(3,6,1,2,cheek)}{px(12,6,1,2,cheek)}
      {/* eyes */}
      {sleep
        ? (<>{px(5,6,2,1,line)}{px(9,6,2,1,line)}</>)
        : (<>{px(5,5,1,2,line)}{px(10,5,1,2,line)}</>)}
      {/* nose */}
      {px(8,7,1,1,"#d97a8a")}

      {/* === BODY (plump, fully outlined) === */}
      {pose === "sit" && (<>
        {/* top of body */}
        {px(3,9,10,1,line)}
        {/* sides */}
        {px(2,10,1,4,line)}{px(13,10,1,4,line)}
        {/* fill */}
        {px(3,10,10,4,fur)}
        {/* bottom */}
        {px(3,14,10,1,line)}
        {/* paws */}
        {px(4,13,2,1,line)}{px(10,13,2,1,line)}
        {px(4,14,2,1,fur)}{px(10,14,2,1,fur)}
        {/* tail curl */}
        {px(13,11,2,1,line)}{px(15,11,1,1,line)}{px(15,12,1,1,line)}{px(14,13,2,1,line)}{px(14,12,1,1,fur)}
      </>)}

      {pose === "walk" && (<>
        {px(3,9,10,1,line)}
        {px(2,10,1,3,line)}{px(13,10,1,3,line)}
        {px(3,10,10,3,fur)}
        {px(3,13,10,1,line)}
        {/* legs in motion */}
        {px(4,13,1,2,line)}{px(7,13,1,2,line)}{px(11,13,1,2,line)}
        {/* tail up */}
        {px(13,9,1,1,line)}{px(14,8,1,1,line)}{px(15,8,1,2,line)}
      </>)}

      {pose === "work" && (<>
        {/* same body as sit */}
        {px(3,9,10,1,line)}
        {px(2,10,1,4,line)}{px(13,10,1,4,line)}
        {px(3,10,10,4,fur)}
        {px(3,14,10,1,line)}
        {/* paws raised onto laptop */}
        {px(4,11,2,1,line)}{px(10,11,2,1,line)}
        {/* tail */}
        {px(13,11,2,1,line)}{px(15,11,1,2,line)}{px(14,13,2,1,line)}
      </>)}

      {/* === HATS === */}
      {hat === "leader" && (<>
        {/* crown */}
        {px(4,1,1,1,accent)}{px(5,0,1,2,accent)}{px(6,1,1,1,accent)}
        {px(7,0,1,2,accent)}{px(8,1,1,1,accent)}{px(9,0,1,2,accent)}
        {px(10,1,1,1,accent)}{px(11,0,1,2,accent)}
      </>)}
      {hat === "visor" && (<>
        {px(3,2,10,1,line)}
        {px(2,3,12,1,accent)}
      </>)}
      {hat === "wizard" && (<>
        {px(7,-1,2,1,line)}{px(7,0,2,1,accent)}
        {px(6,1,4,1,accent)}{px(6,1,1,1,line)}{px(9,1,1,1,line)}
        {px(5,2,6,1,accent)}{px(5,2,1,1,line)}{px(10,2,1,1,line)}
      </>)}
      {hat === "goggles" && (<>
        {px(4,4,3,1,line)}{px(9,4,3,1,line)}
        {px(4,5,3,1,"#fff")}{px(9,5,3,1,"#fff")}
        {px(5,5,1,1,line)}{px(10,5,1,1,line)}
      </>)}
      {hat === "headband" && (<>
        {px(2,4,12,1,accent)}
        {px(8,3,1,2,accent)}
      </>)}
      {hat === "scarf" && (<>
        {px(3,9,10,1,accent)}
        {px(4,10,1,1,accent)}{px(11,10,1,1,accent)}
      </>)}
      {hat === "bowtie" && (<>
        {px(7,9,2,1,accent)}
        {px(6,10,1,1,accent)}{px(9,10,1,1,accent)}
      </>)}
      {hat === "cap" && (<>
        {px(3,2,10,1,line)}
        {px(2,3,12,1,accent)}
        {px(13,3,3,1,accent)}{px(13,4,3,1,line)}
      </>)}
      {hat === "antenna" && (<>
        {px(8,0,1,3,line)}
        {px(7,-1,3,1,accent)}
      </>)}

      {/* sleep z */}
      {sleep && (<>
        {px(13,1,2,1,line)}{px(14,2,1,1,line)}{px(13,3,1,1,line)}{px(13,4,2,1,line)}
      </>)}
      {/* learned_guidance scroll above head */}
      {scroll && (<>
        {px(11,0,4,1,"#d9b66c")}
        {px(11,1,4,1,"#fff8e7")}
        {px(11,2,4,1,"#d9b66c")}
      </>)}
    </svg>
  );
};

// === ROSTER — post M0.X-skill-migration (PR#18) ============================
// Before: 13 persistent agents.
// After:  3 persistent + 10 ephemeral "spirits" summoned via skills.
//   - kind:"persistent"  ← always in the room (PM / Developer / Retro PM)
//   - kind:"spirit"      ← summoned by a skill template, vanishes after work
//
// Spirits carry `summonedBy` (the skill identifier they're spawned from), used
// by Customization tree, Sessions column rename, and Room ephemeral motion.
const ROSTER = [
  // ---- Persistent (3) — desk + name plate ---------------------------------
  { id: "pm",            kind: "persistent", role: "PM",                jp: "プロジェクトマネージャー", name: "ニケ",    breed: "ブリティッシュショートヘア", quote: "落ち着いて、まず仕様から。",  hat: "leader",   fur: "#cdd2d8", cheek: "#f4a3b3", group: "core" },
  { id: "dev",           kind: "persistent", role: "Developer",         jp: "デベロッパー",           name: "サバ",    breed: "サバトラ",                  quote: "RED → GREEN、まず落とすの。", hat: "headband", fur: "#b8a98c", cheek: "#f4a3b3", group: "core" },
  { id: "retro-pm",      kind: "persistent", role: "Retro PM",          jp: "振り返り進行役",         name: "ヨミ",    breed: "アビシニアン",              quote: "今日もお疲れさま。集合〜。",  hat: "leader",   fur: "#c89668", cheek: "#f4a3b3", group: "core" },

  // ---- Review spirits (4) — loom-review skill -----------------------------
  // single strategy = generalist; trio strategy = code + sec + test
  { id: "rev",           kind: "spirit", summonedBy: "loom-review/single",        role: "Reviewer",          jp: "汎用レビュアー",         name: "ハカセ",  breed: "アメリカンショートヘア",    quote: "verdict は証拠とともに。",    hat: "goggles",  fur: "#cfc7b4", cheek: "#f4a3b3", group: "review" },
  { id: "rev-code",      kind: "spirit", summonedBy: "loom-review/trio.code",     role: "Code Reviewer",     jp: "コードレビュアー",       name: "ペン",    breed: "ハチワレ",                  quote: "そのcatch、握り潰してない？", hat: "visor",    fur: "#e8e2d2", cheek: "#f4a3b3", group: "review" },
  { id: "rev-sec",       kind: "spirit", summonedBy: "loom-review/trio.security", role: "Security Reviewer", jp: "セキュリティレビュアー", name: "シノビ",  breed: "黒白ハチワレ",              quote: "secret、commitしてない？",    hat: "scarf",    fur: "#3a3340", cheek: "#ff8aa3", group: "review" },
  { id: "rev-test",      kind: "spirit", summonedBy: "loom-review/trio.test",     role: "Test Reviewer",     jp: "テストレビュアー",       name: "メメ",    breed: "ロシアンブルー",            quote: "そのテスト、本当に落ちる？",  hat: "bowtie",   fur: "#a3b1bd", cheek: "#f4a3b3", group: "review" },

  // ---- Retro spirits (6) — loom-retro skill -------------------------------
  // lenses: pj / process / meta / researcher  | stages: counter-arguer / aggregator
  { id: "retro-pj",      kind: "spirit", summonedBy: "loom-retro/lenses.pj-axis",       role: "PJ Judge",       jp: "プロジェクト審判", name: "リケ",   breed: "ノルウェージャン",         quote: "成果物として見ようか。",     hat: "wizard",  fur: "#e8d6b3", cheek: "#f4a3b3", group: "retro-lens" },
  { id: "retro-proc",    kind: "spirit", summonedBy: "loom-retro/lenses.process-axis",  role: "Process Judge",  jp: "プロセス審判",     name: "リズ",   breed: "ベンガル",                 quote: "TDDの順序、ズレてない？",    hat: "wizard",  fur: "#d8a86a", cheek: "#f4a3b3", group: "retro-lens" },
  { id: "retro-meta",    kind: "spirit", summonedBy: "loom-retro/lenses.meta-axis",     role: "Meta Judge",     jp: "メタ審判",         name: "オウル", breed: "シャム",                   quote: "そもそも仕組みを疑おう。",   hat: "wizard",  fur: "#efe6d4", cheek: "#f4a3b3", group: "retro-lens" },
  { id: "retro-research",kind: "spirit", summonedBy: "loom-retro/lenses.researcher",    role: "Researcher",     jp: "調査役",           name: "サグ",   breed: "メインクーン",             quote: "ログ、全部読んでおいたよ。", hat: "cap",     fur: "#9c8266", cheek: "#f4a3b3", group: "retro-lens" },
  { id: "retro-counter", kind: "spirit", summonedBy: "loom-retro/stages.counter-arguer",role: "Counter-Arguer", jp: "反対弁論役",       name: "アマ",   breed: "ターキッシュアンゴラ",     quote: "本当にそうかな？反証あり。", hat: "antenna", fur: "#f4f0e6", cheek: "#f4a3b3", group: "retro-stage" },
  { id: "retro-agg",     kind: "spirit", summonedBy: "loom-retro/stages.aggregator",    role: "Aggregator",     jp: "総括役",           name: "マル",   breed: "スコティッシュフォールド", quote: "結論、3行にまとめるね。",    hat: "scarf",   fur: "#cfb597", cheek: "#f4a3b3", group: "retro-stage" },
];

// Skill registry — drives the Customization tree + Sessions column rename.
const SKILLS = [
  { id: "loom-review",
    label: "loom-review",
    desc: "コード/PR レビュー。strategy で並列度を切替",
    write: false,
    strategies: [
      { id: "single",        path: "loom-review/single",        label: "single",        spiritId: "rev" },
      { id: "trio.code",     path: "loom-review/trio.code",     label: "trio · code",   spiritId: "rev-code" },
      { id: "trio.security", path: "loom-review/trio.security", label: "trio · security", spiritId: "rev-sec" },
      { id: "trio.test",     path: "loom-review/trio.test",     label: "trio · test",   spiritId: "rev-test" },
    ],
  },
  { id: "loom-retro",
    label: "loom-retro",
    desc: "Retro lens 群 + 反論 + 集約。Aggregator のみ書き込み権限",
    lenses: [
      { id: "pj-axis",      path: "loom-retro/lenses.pj-axis",      label: "lens · PJ-axis",      spiritId: "retro-pj" },
      { id: "process-axis", path: "loom-retro/lenses.process-axis", label: "lens · Process-axis", spiritId: "retro-proc" },
      { id: "meta-axis",    path: "loom-retro/lenses.meta-axis",    label: "lens · Meta-axis",    spiritId: "retro-meta" },
      { id: "researcher",   path: "loom-retro/lenses.researcher",   label: "lens · Researcher",   spiritId: "retro-research" },
    ],
    stages: [
      { id: "counter-arguer", path: "loom-retro/stages.counter-arguer", label: "stage · Counter-Arguer", spiritId: "retro-counter" },
      { id: "aggregator",     path: "loom-retro/stages.aggregator",     label: "stage · Aggregator",     spiritId: "retro-agg",  writePermission: true },
    ],
  },
];

window.CatSprite = CatSprite;
window.ROSTER = ROSTER;
window.SKILLS = SKILLS;
