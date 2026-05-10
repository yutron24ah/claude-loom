# redesign/ — claude-loom UI 再設計 bundle

このディレクトリは Claude Design (claude.ai/design) で詰めた UI 再設計の **mock prototype + production 実装契約書** が同居する場所。design 確定の経緯は `_chat1.md` `_chat2.md` (人間と design assistant の対話 log) を参照。

## 鉄則

### 🔒 `scenarios.js` と `screens/*.jsx` は絶対に消すな

理由:
- `scenarios.js` は **daemon WS の payload 仕様書を兼ねる**。`SCENARIOS.idle / active / failed` の object shape = production 実装が満たすべき型契約。末尾の `BACKEND INTEGRATION NOTES` ブロックは画面 → 必要 daemon event / write API の対応一覧。
- `screens/*.jsx` 各ファイル冒頭の destructuring (`const { agents, plan, findings } = useScenario()`) はその画面の **data dependency 仕様**。
- 開発中の visual regression / デザイン確認 / QA で常時参照する。
- `Redesign App.html` をブラウザで開けば即 mock が動くこと自体が retreat path として価値がある。

production 実装で fixture が古くなった場合は **scenarios.js を更新** すること。削除や移動は不可。

## 構成

```
redesign/
├── README.md                  ← この file
├── _BUNDLE_README.md          ← Claude Design 公式の handoff 注意書き
├── _chat1.md                  ← user × design assistant 履歴 (Phase 1)
├── _chat2.md                  ← user × design assistant 履歴 (Phase 2、scenarios.js 確定)
├── Redesign App.html          ← prototype shell (script src は redesign/ 配下相対に修正済)
├── cat.jsx                    ← CatSprite + ROSTER (13 agent metadata)
├── scenarios.js               ★ 仕様書本体 (mock fixture 兼 SCENARIOS shape)
├── screens/                   ← 12 画面の prototype JSX
│   ├── room.jsx                ← ① RoomView (★ 動く確信:高)
│   ├── gantt.jsx               ← ② Gantt
│   ├── plan.jsx                ← ③ Plan
│   ├── consistency.jsx         ← ④ Consistency
│   ├── retro.jsx               ← ⑤ Retro
│   ├── worktree.jsx            ← ⑥ Worktree
│   ├── customization.jsx       ← ⑦ Customization
│   ├── guidance.jsx            ← ⑧ Guidance
│   ├── agent-detail.jsx        ← ⑨ Agent Detail Drawer
│   ├── sessions.jsx            ← ⑩ Sessions
│   ├── tokens.jsx              ← ⑪ Tokens
│   └── settings.jsx            ← ⑫ Project Settings
├── styles.css, tokens.css     ← prototype CSS
└── api/                       ← production 実装層 (mock prototype と独立)
    ├── types.ts                ← SCENARIOS shape の TypeScript 型
    └── websocket.ts            ← useScenario() impl: WS reducer + ?mock= query fallback
```

## production 実装方針

prototype (Babel standalone JSX) を直接 build せず、**TypeScript で書き直し** ながら以下の手順で進める:

1. `scenarios.js` を読んで `api/types.ts` に shape を TypeScript 型として起こす (daemon/src/events/types.ts と整合)。
2. `api/websocket.ts` で `useScenario()` を実装。`?mock=idle|active|failed` query で fixture fallback、それ以外は daemon WS event を reducer で同 shape に組み立てる。
3. BACKEND INTEGRATION NOTES の **★ 動く確信:高** から順に実装:
   - **① RoomView** — `agent.change` WS event だけで猫が動くまで (MVP)
   - 動いたら次の event 型を 1 つずつ足していく
4. write API (POST /pm/say, POST /findings/:id/ack 等) は読み出しが揃ってから順次接続。

## ブラウザで mock を確認する手順

`redesign/` ディレクトリで簡易 HTTP server を立てて `Redesign App.html` を開く:

```bash
cd redesign
python3 -m http.server 8000
# → http://localhost:8000/Redesign%20App.html
```

右上の SCENARIO セレクタで `idle / active / failed` を切替えると全画面が同時に更新される。

## 実装着手順 (確信:高 のみ抜粋)

| # | 画面 | 必要 read event | 必要 write API | 確信 |
|---|---|---|---|:---:|
| 1 | Room (cats + posters + stream) | agent.change / stream.append / todo.change / plan.change | POST /pm/dispatch | 高 |
| 2 | Gantt | agent_history.jsonl tail | (無) | 高 |
| 3 | Plan | plan.change / todo.change | PUT /plan_items | 高 |
| 6 | Worktree | git worktree list scan | POST/DELETE /worktree | 高 |
| 7 | Customization | (静的 JSON 重ね合わせ) | PUT /customization/:id | 高 |
| 8 | Guidance | learned_guidance.change | DELETE /guidance/:id | 高 |
| 9 | Agent Detail | (① の filter のみ) | (無) | 高 |
| 10 | Sessions | ~/.claude/projects/ tail | (無) | 高 |
| 11 | Tokens | session.jsonl の usage block 集計 | (無) | 高 |
| 12 | Settings | project.json fs.watch | PUT /settings | 高 |
| 13 | PM Chat | pm.message / pm.permission_request | POST /pm/{say,permission/:id} | 高 |

確信:中 は ④ Consistency / ⑤ Retro。後回し可。
