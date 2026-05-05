# Smoke Test Strategy — 2026-05-05 m0.11.4-aesthetic-verify

## Scope: full

M0.11.4 Phase D t19 closure。Phase A〜C で 13 view 全体を **DOM/SVG +
RPG primitive (rpg-frame / rpg-title / rpg-label / chip / dot / exp-bar
/ btn-px) + 3 theme palette (pop/dusk/night)** に書直した production
code が、実機 browser で aesthetic 通り render されとるかを verify。

## Route matrix

| route | expected DOM elements | expected canvas state | expected interactions | REQ refs |
|---|---|---|---|---|
| / | `[data-testid="room-canvas"]`, agent station SVG/DOM, RoomBackground | DOM/SVG only (Phaser 完全 retire、t17) | agent click → AgentDetailPanel modal | REQ-032, REQ-045 |
| /plan | `[data-testid="plan-short-term"].rpg-frame`, `[data-testid="plan-long-term"].rpg-frame`, `.rpg-title`, button.btn-px | n/a | "+ 追加" button visible | REQ-033 |
| /gantt | `.rpg-frame.pixel`, `.rpg-title`, gantt SVG, CatSprite (`[data-testid="cat-sprite"]`) per row | n/a | bar 右端で CatSprite が歩く | REQ-033 |
| /retro | `.rpg-frame`, `.rpg-title`, lens cards, btn-px action buttons (accept/reject/defer/discuss) | n/a | tab/finding interaction | REQ-034 |
| /worktree | `.rpg-frame` worktree cards, branch name (rpg-title), subagent chip, status dot | n/a | card click | REQ-035 |
| /consistency | `.rpg-frame` finding cards, `.chip` severity, `.dot` status, btn-px action (Acknowledge/Mark Fixed/Dismiss/Open in Editor) | n/a | btn click | REQ-036 |
| /customization | `.rpg-frame` 13 agent rows, model select chip, preset btn-px, scope chip | n/a | row 構造 visible | REQ-037 |
| /guidance | `.rpg-frame` agent sections, guidance entry list, applied_in dot | n/a | guidance entry visible | REQ-038 |
| /sessions | `.rpg-frame` session list, status chip/dot, role chip | n/a | session row visible | REQ-039 |
| /project-settings | `.rpg-frame` setting sections, btn-px / chip toggles | n/a | section visible | REQ-040 |
| /tokens | `.rpg-frame`, `.exp-bar` token usage meter, `.rpg-label` numeric | n/a | bar fill visible | REQ-041 |

## Known risk areas

Phase B closure (commit 246ca56) + Phase C closure (commit 1cc03d0) +
Phase D t17 closure (commit ed58015) 以降 mode で重点 verify したい
past bug pattern：

- **Phaser retire 残骸**: t17 で source/test 物理削除済だが、import 残存
  などで blank canvas / runtime error が出る可能性 → / と /gantt 重点
- **theme switching**: tokens.css で `[data-theme="dusk|night"]` は CSS
  変数を切り替える設計、production code でこの attribute を切替える UI
  は M0.11.4 では未実装 (default = pop) → smoke では pop only verify、
  dusk/night は t18 で e2e baseline 取得済
- **RPG primitive class wiring**: rpg-frame / rpg-title / chip / dot /
  exp-bar / btn-px が tokens.css に定義済か確認、各 view が正しく適用
  しとるか
- **CatSprite presence (Gantt)**: t13 で gantt bar 右端に CatSprite を
  歩行 animation で描画する仕様、`[data-testid="cat-sprite"]` の存在
  確認
- **TodoWrite mock 残存**: Phase 1 MVP closure 後 production build に
  mock が残らんかチェック (console error / warning から検出)
- **WS transform error**: tRPC subscription mount 時の zod schema
  mismatch (M1 期由来 risk pattern)
- **dead code from removed views**: Phaser 削除に伴う navigation 失効

## verify 順序

11 route + index sequence。各 route で:
1. browser_navigate
2. browser_snapshot (depth 抑制 OK、accessibility tree 取得)
3. browser_take_screenshot (`screenshots/<NN>-<route>.png`)
4. browser_console_messages (error level、各 route ごと append)

最後に browser_close。
