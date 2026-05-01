# @claude-loom/ui

claude-loom の **frontend UI package**。M2 で Vite + React + TypeScript の本実装、現状は claude.ai/design からの **static prototype** のみを保存。

## 構成

```
ui/
├── prototype/           ← claude.ai/design 由来の静的プロトタイプ（M2.0 で embed）
│   ├── index.html       ← デザインキャンバス エントリ
│   ├── *.jsx            ← React 18 + Babel standalone (CDN)
│   ├── styles.css       ← pixel RPG スタイル
│   ├── tokens.css       ← デザイン token
│   ├── uploads/         ← 参照画像
│   └── README.md        ← 原 design bundle の README
└── (M2 proper で src/ + Vite 設定追加予定)
```

## 起動方法（プロトタイプ確認）

```bash
# 初回 dependency install
pnpm install

# プロトタイプを起動（http://localhost:8080）
pnpm --filter @claude-loom/ui prototype

# または開いて確認
pnpm --filter @claude-loom/ui prototype:open
```

ブラウザで `http://localhost:8080/` を開くと、デザインキャンバスに 9 section が縦並びで表示される：

1. **Room View** — 3 theme（pop / dusk / night）+ Detail 選択
2. **13 agent character sheet** — 猫種 + 名前 + 性格
3. **進捗 Gantt** — 直近 1 時間、歩く猫 sprite
4. **Plan View** — 短期 todo + 長期 plan_items ツリー
5. **Retro session** — 4 lens findings + action plan
6. **Worktree** — branch ごとのサブルーム
7. **Consistency Findings** — 4 アクション
8. **Customization Layer** — 13 agent × model + personality
9. **Learned Guidance audit** — 巻物 indicator + active toggle

## デザイン由来

`prototype/` は claude.ai/design で生成された **frontend-design output** を pixel-perfect に保存している。本物の React + Vite + TypeScript 実装は M2 milestone で順次 port していく。

## 関連

- 画面要件 SSoT: `../docs/SCREEN_REQUIREMENTS.md`
- Visual 方向性: `../SPEC.md` §12（ピクセル RPG + 猫の開発室 motif）
- API surface: `../daemon/src/router.ts` (AppRouter type, M2 で `import type` で共有)
