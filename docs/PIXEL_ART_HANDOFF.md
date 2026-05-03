# PIXEL_ART_HANDOFF — claude-loom Frontend Design 引継ぎ仕様

> **本ファイルは M5 t1 で作成した pixel art 制作引継ぎ仕様書。**
> 実 pixel art 制作は post-MVP / Phase 2 evolution に委ねる（Phase 1 MVP は placeholder で動作確認済）。
> frontend-design skill 実 invocation および Phaser scene 構成詳細実装は M3.0 で完了、本ファイルはあくまで引継ぎ仕様とオプション整理。

---

## Section 1: Vision

### コンセプト

**「猫の開発室」** — claude-loom の Room View は Stardew Valley 系のピクセル RPG 世界観を持つ。
Claude agent 達が猫キャラクターとして室内で作業している、可愛く・没入感のある開発ルームが目標。

### デザイン方向性（SPEC §12 参照）

- **スタイル**: ピクセル RPG（Stardew Valley / RPG Maker 系）
- **雰囲気**: 温かみのある「秘密の開発室」
- **キャラクター**: 猫系 13 体（roster.ts で identity 確立済）
- **カメラ**: トップダウン / アイソメトリック風（M3.0 は top-down 実装済）
- **パレット**: 3 theme（pop / dusk / night）に対応、tokens.css CSS variable 準拠

### 参考資料

- SPEC §12: 技術スタック・ビジュアル方向性の SSoT
- `ui/src/views/room/roster.ts`: 13 agent の visual identity（fur / cheek / hat / name / breed）
- `ui/prototype/`: 元デザインモックアップ

---

## Section 2: 現状 Placeholder State

### Agent Sprite 一覧（M3.0 時点）

現在 `ui/src/views/room/scenes/RoomScene.ts` の `setAgentState()` は `Phaser.GameObjects.Graphics` で
fillCircle を描画する placeholder。以下 13 agent が sprite 対象：

| agent_id          | role                | 日本語名     | hat       | fur color |
|-------------------|---------------------|--------------|-----------|-----------|
| `pm`              | PM                  | ニケ         | leader    | #cdd2d8   |
| `dev`             | Developer           | サバ         | headband  | #b8a98c   |
| `rev`             | Reviewer            | ハカセ       | goggles   | #cfc7b4   |
| `rev-code`        | Code Reviewer       | ペン         | visor     | #e8e2d2   |
| `rev-sec`         | Security Reviewer   | シノビ       | scarf     | #3a3340   |
| `rev-test`        | Test Reviewer       | メメ        | bowtie    | #a3b1bd   |
| `retro-pm`        | Retro PM            | ヨミ         | leader    | #c89668   |
| `retro-research`  | Researcher          | サグ         | cap       | #9c8266   |
| `retro-pj`        | PJ Judge            | リケ         | wizard    | #e8d6b3   |
| `retro-proc`      | Process Judge       | リズ         | wizard    | #d8a86a   |
| `retro-meta`      | Meta Judge          | オウル       | wizard    | #efe6d4   |
| `retro-counter`   | Counter-Arguer      | アマ         | antenna   | #f4f0e6   |
| `retro-agg`       | Aggregator          | マル         | scarf     | #cfb597   |

**sprite placeholder identifier**: `agentSpriteSync.ts` の `AGENT_POSITIONS` Record が各 agent の
Phaser canvas 座標を保持（1080 × 660 px キャンバス）。pixel art 導入後は同 Record を活用し
`Phaser.GameObjects.Sprite` / `Phaser.GameObjects.Image` に差し替える。

### Tile Map: `ui/public/assets/tiles/room-base.json`

現状は placeholder JSON（実タイルシートなし）。構造：

- 27 × 17 tiles（各 40 × 40 px → 1080 × 680 ウィンドウ）
- layers: `floor`（tilelayer, data=[]）、`wall`（tilelayer, data=[]）
- zones: `pm_island`、`dev_island`、`review_island`、`retro_island`（x/y/w/h で区画定義）

Phaser 4 の `this.load.json('room-base', 'assets/tiles/room-base.json')` で preload 済み。
real tile sheet 追加時はこの JSON を Tiled (.json) 互換フォーマットに拡充して差し替える。

### 3 Theme カラートークン（`ui/src/styles/tokens.css`）

Phaser scene は `getComputedStyle(document.documentElement).getPropertyValue(...)` で CSS variable を読み取り、
`MutationObserver` で `data-theme` 属性変更を検知して即時再描画する。

| CSS variable        | pop (light)        | dusk (evening)     | night (dark)       |
|---------------------|--------------------|--------------------|---------------------|
| `--bg`              | 248 249 251        | 42 37 64           | 11 15 29            |
| `--surface`         | 255 255 255        | 61 51 84           | 22 26 38            |
| `--primary`         | 79 70 229          | 124 58 237         | 129 140 248         |
| `--text`            | 31 41 55           | 240 233 216        | 232 236 243         |
| `--border`          | 229 231 235        | 26 19 48           | 5 8 17              |

WHY (rgb format): Tailwind の `rgb(var(--x) / <alpha-value>)` opacity modifier 対応のため空白区切り整数形式。

Phaser scene が参照する主要変数: `--p-bg-floor`（RoomScene fallback: #e8dcc8）

---

## Section 3: 引継ぎ仕様

### Sprite 仕様

- **サイズ**: 32 × 32 px（Phaser 4 spritesheet default に準拠）
- **フレーム数**: 各状態 4 frame 想定（idle: 4 / busy: 4 / fail: 4 = 12 frame / agent）
- **spritesheet 配置**: 横方向に frame 展開（frameWidth=32、frameHeight=32）

### Agent ID ↔ Sprite Mapping

`ui/src/views/room/roster.ts` の `ROSTER` array が 13 agent の `id` フィールドを SSoT として保持。
`agentSpriteSync.ts` の `AGENT_POSITIONS` Record が `id` ↔ canvas 座標のマッピングを管理。
pixel art sprite 導入時は同 `id` をキーとして `this.load.spritesheet(id, 'assets/sprites/${id}.png', config)` でロード。

### Tile Map Format

Tiled (.json) 互換フォーマット、Phaser 4 native `this.load.tilemapTiledJSON()` で読み込み可能。
`room-base.json` の `zones` 拡張フィールドはカスタム区画定義（Phaser 4 は zones を直接使わず `data` array を参照）。

### Theme ↔ Phaser Bridge

Phaser scene が CSS token を読み取るパターン（既実装、`RoomScene.ts` の `getFloorBgColor()`）：

```ts
const value = getComputedStyle(document.documentElement)
  .getPropertyValue('--p-bg-floor')
  .trim();
```

pixel art 導入後も同パターンで tile tint / overlay color を theme に連動させる。
`MutationObserver` は `data-theme` 変更を検知して scene を即時更新（HMR / theme switch 両対応）。

### ファイル配置（将来）

```
ui/public/assets/
├── sprites/            # pixel art spritesheet (32x32 per frame)
│   ├── pm.png
│   ├── dev.png
│   ├── rev.png
│   └── ...（13 agent 分）
└── tiles/
    ├── room-base.json  # Tiled map descriptor（要拡充）
    └── tileset.png     # tile spritesheet（新規追加）
```

---

## Section 4: 制作 Option

pixel art 素材の調達方法を 4 option で比較。各 option の license / quality / effort を考慮して選択する。

### Option A: 自作

- **メリット**: 完全 control、スタイル一貫性、`猫の開発室` コンセプトへの忠実度最高
- **デメリット**: 制作時間大（1 agent あたり 4 状態 × 4 frame = 16 枚）、pixel art スキル要件
- **推奨ツール**: Aseprite（デファクトスタンダード）、Libresprite（FOSS 代替）
- **想定工数**: 1 agent あたり 2-4 時間 × 13 体 = 26-52 時間

### Option B: Kenney.nl 等の Free Asset

- **メリット**: 即時利用可能、高品質、CC0 ライセンス（商用利用・改変自由）
- **デメリット**: スタイルが汎用的、「猫の開発室」独自コンセプトとの差異あり
- **代表リソース**:
  - https://kenney.nl/assets/tiny-town — top-down 室内 RPG 向け
  - https://kenney.nl/assets/pixel-platformer-characters — キャラクター系
  - https://itch.io/game-assets/free/tag-pixel-art — itch.io 無料素材
- **要確認**: ライセンス（CC0 優先、CC BY は author credit 義務確認）

### Option C: frontend-design Skill Invocation

- **メリット**: Claude built-in、即時生成、SVG / PNG 出力可能
- **デメリット**: style consistency 保証が困難（呼び出し毎に差異が出る可能性）、pixel art 品質の検証要
- **用途**: prototype / 試作段階で形を素早く作る用途に向く
- **invocation**: `frontend-design:frontend-design` skill（CLAUDE.md skill 一覧参照）
- **注意**: 本 task（M5 t1）では invocation 不要。deferred to post-MVP polish phase

### Option D: AI 画像生成（DALL-E 等）

- **メリット**: 高速生成、style prompt で方向性を制御可能
- **デメリット**: ライセンス曖昧（商用利用 policy 要確認）、pixel art 特有のアーティファクト、style consistency 課題
- **代替 tool**: Midjourney v6（pixel art 品質良好）、Stable Diffusion + pixel art LoRA
- **ライセンス**: OpenAI DALL-E は生成物の著作権を user に帰属（利用規約 §3 参照、商用利用 OK）、ただし学習データ起因の懸念

### 推奨優先順位

Phase 2 evolution での pixel art 導入時は以下を推奨：

1. **prototype段階**: Option C（frontend-design skill で素早く形を確認）
2. **MVP polish**: Option B（Kenney.nl CC0 asset で品質確保、即時利用）
3. **長期**: Option A（スタイル確定後に自作移行）

---

## Section 5: post-MVP Migration Plan

### Placeholder → Pixel Art 置換手順

1. **sprite 素材準備**（Option A/B/C/D のいずれかで制作）
   - 各 agent の spritesheet を 32 × 32 × 12 frame（idle 4 / busy 4 / fail 4）形式で用意
   - `ui/public/assets/sprites/<agent_id>.png` に配置

2. **RoomScene.ts の sprite load 実装**（M5 以降）
   ```ts
   // preload() — 13 agent 分の spritesheet ロード
   for (const agent of ROSTER) {
     this.load.spritesheet(agent.id, `assets/sprites/${agent.id}.png`, {
       frameWidth: 32, frameHeight: 32,
     });
   }
   ```

3. **agentSpriteSync.ts の sprite 差し替え**
   - `Phaser.GameObjects.Graphics` → `Phaser.GameObjects.Sprite` に差し替え
   - `setAgentState()` でアニメーション play（`scene.anims.play('pm-idle')` 等）
   - animation key 命名: `<agent_id>-<status>` パターン

4. **tile map 実装**（Tiled で room-base.json を拡充）
   - `tileset.png` 追加 + `this.load.tilemapTiledJSON()` で読み込み
   - 既存 `zones` 区画定義を Tiled layer のカスタムプロパティに移行

5. **Playwright e2e baseline 更新**（M3.1 t5 との整合）
   - M3.1 で確立した Room View pop theme screenshot baseline を新 sprite で再撮影
   - `pnpm --filter @claude-loom/ui e2e` で全 PASS 確認
   - 3 theme 切替動作 verify（pop / dusk / night の visual regression check）

### 整合確認チェックリスト

- [ ] 13 agent 全 sprite の idle / busy / fail アニメ動作確認
- [ ] 3 theme（pop / dusk / night）切替で背景・tile 色が連動
- [ ] `MutationObserver` による即時テーマ反映動作確認（HMR 再起動不要）
- [ ] Playwright e2e baseline 更新（3 theme × 1 screenshot = 3 件）
- [ ] `pnpm --filter @claude-loom/ui test` 全 PASS（既存 vitest test の green 状態保持）

---

## Section 6: Trade-off Note

### Phase 1 MVP での Placeholder 決定について

**WHY (SPEC §12 / M3.0 retro 由来)**: pixel art の絶対的 quality は Phase 1 MVP の delivery には必須でない。

M3.0 で確立した以下の動作確認は placeholder sprite でも完遂済み：
- Phaser 4 の React コンポーネント内 mount / unmount lifecycle（memory leak ゼロ）
- agent 状態（idle / busy / fail）のアニメーション切替（色変化で代替）
- 3 theme 切替時の背景色即時反映（MutationObserver + CSS token 連携）
- daemon `agent` subscription event による live sprite state 更新

### Phase 1 → Phase 2 の責務分離

| Phase 1 (done)                          | Phase 2 / post-MVP (deferred)               |
|-----------------------------------------|----------------------------------------------|
| Phaser 4 mount + lifecycle              | 実 pixel art spritesheet 制作                |
| agent state animation (color)           | frame-based アニメーション実装               |
| 3 theme CSS token bridge                | tile map 実装（Tiled tileset + JSON 拡充）   |
| daemon live sync (zustand subscribe)    | Playwright visual regression baseline 更新   |
| 13 agent placeholder sprite 配置        | Option A/B/C/D 選択 + 素材調達              |

### YAGNI 原則との整合

Phase 1 MVP での pixel art 制作は YAGNI 違反（実際に使う時点まで作らない）。
Stardew Valley 系世界観・猫系キャラ・3 theme palette は SPEC §12 で確定済みであり、
それを実装するタイミングを Phase 2 以降に分離することで開発速度と品質の両立を図る。
