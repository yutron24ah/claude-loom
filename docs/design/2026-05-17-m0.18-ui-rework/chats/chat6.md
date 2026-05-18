# Claude Loom 更新

_Started 2026-05-18 11:39 UTC_

---

## User

https://github.com/yutron24ah/claude-loom/tree/main

もう一度mainを更新しました。

## User

https://github.com/yutron24ah/claude-loom/tree/main

もう一度mainを更新しました。
多分フロントエンドには影響兄とは思うんだけど念の為見直してもらえますか。

## Assistant

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: list_files]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

確認しました。今回の main 更新（`M0.X-skill-migration` / branch `docs/agent-prompt-design`）は **フロントエンドに影響ゼロ** です。

## 変更スコープ

CHANGELOG と `docs/SKILL_MIGRATION.md` を読み合わせた結果、今回触られたのは以下のみ：

| 領域 | パス | 内容 |
|---|---|---|
| Agents | `agents/loom-pm.md` / `loom-developer.md` / `loom-retro-pm.md` | 圧縮 + skill invoke 化 |
| Agents (削除) | `agents/loom-{reviewer,code-reviewer,security-reviewer,test-reviewer}.md` + 6 retro agents | 計 10 agent → 2 skill に統合 |
| Skills | `skills/loom-review/SKILL.md` / `loom-retro/SKILL.md` | template 内包で大型化 |
| Docs | `SPEC.md` / `CLAUDE.md` / `README*.md` / `docs/AGENT_PROMPT_DESIGN.md` (新規) / `docs/SKILL_MIGRATION.md` (新規) | 整合更新 |
| Templates | `templates/{user,project}-prefs.json.template` | `skills.*` schema 追加 |
| Tests | obsolete 6 tests 削除 | placeholder + verbose hook anti-pattern |

`ui/` 配下は **一切変更なし**。`daemon/` も触られていません（prefs schema は backward-compatible に拡張、daemon 側の読み取り境界は不変）。

## フロント側で気にする必要があるか？

- **UI 表示・WS event・tRPC interface**: 不変 → そのまま動く
- **Customization view (`/customization`)**: 表示対象が `agents.*` だけだと、新規 `skills.loom-{retro,review}.*` の personality / learned_guidance が編集 UI に出ない可能性あり。ただし今回の commit が daemon の prefs read API を変えていないので **UI が壊れることはなく**、単に「新しい skill 階層のカスタマイズが UI から見えない」だけ。必要になったら別 PR で `useCustomizationMutations` に skill-keyed path を追加する形で対応すれば OK
- **`Redesign App.html`**: agent roster をハードコードしている箇所があるなら、削除された 10 agent 名（`loom-retro-pj-judge` 等）を表示しないように整理する余地はあるが、これは「最新の agent registry に追随したい」場合の話で、main 更新による破壊ではない

つまり今回の main 取り込みは **フロント無風**。気になるとしたら「新しい skill カスタマイズを UI で扱いたいか」だけで、それは別タスクとして切り出せます。必要なら `useCustomizationMutations` の schema 拡張案を出します。

