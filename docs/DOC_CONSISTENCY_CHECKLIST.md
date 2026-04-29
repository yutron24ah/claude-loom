# Doc Consistency Manual Checklist

> M4 で自動化される（doc 整合性エンジン v1）まで、SPEC を変更したらこのチェックリストを **PM が必ず実行** する。

## 手順

### 1. 変更内容の把握

```bash
git diff SPEC.md
# あるいは前回 commit からの差分
git diff HEAD~1 SPEC.md
```

### 2. 影響範囲の洗い出し

以下のドキュメントについて、SPEC 変更の影響を確認：

- [ ] `README.md` — ユーザー向け説明と齟齬がないか
- [ ] `CLAUDE.md` — 作業規約に変更が必要か
- [ ] `PLAN.md` — マイルストーン / タスクに追加・削除が必要か
- [ ] `docs/SCREEN_REQUIREMENTS.md` — 画面要件に波及するか
- [ ] `docs/plans/*.md` — 進行中の詳細プランに波及するか
- [ ] `tests/REQUIREMENTS.md` — 受入要件 ID の追加・削除が必要か
- [ ] `agents/*.md` — agent system prompt の振る舞いに変更が必要か
- [ ] `commands/*.md` — slash command の挙動に変更が必要か

### 3. 検出語彙の grep（軽量チェック）

SPEC で削除・変更された主要語句を grep：

```bash
# 例：SPEC から ANTHROPIC_API_KEY が消えた場合
grep -rn "ANTHROPIC_API_KEY" --include="*.md" .
```

### 4. ユーザー承認

影響を受ける可能性のあるドキュメント一覧を user に提示：

- 影響なし → 確認だけ報告
- 影響あり → 該当箇所を user 承認の上で更新

### 5. 更新の commit

ドキュメント更新は SPEC 変更とは別 commit に分ける：

```bash
git add <updated docs>
git commit -m "docs: align with SPEC update (X 機能)"
```

## 例：典型的なケース

### Case A: SPEC §X の削除

- 関連 grep → 言及のあるドキュメント特定 → 削除 / 書き換え

### Case B: 用語の rename

- 旧用語を grep → 全置換（手動確認しながら）

### Case C: スキーマ変更

- DB スキーマ変更 → 関連する SCREEN_REQUIREMENTS / EVENT_SCHEMA も更新

## このチェックリスト自体の改善

M4（doc 整合性エンジン v1）実装時に検出ルールを抽出する元データとして本チェックリストを使う。手で運用しながら気付いた検出パターンを追記すること。

## M0.9 Customization Layer 関連 check

SPEC `§3.6.5` / `§6.9.4` を編集した時：

- [ ] `templates/user-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `templates/project-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の retro lens 観測対象に customization state が記述されとる
- [ ] `agents/loom-{pm,developer,reviewer 群,retro-* 群}.md` の Customization Layer 参照記述が schema 変更に追従
- [ ] `prompts/personalities/*.md` の preset 名と SPEC §6.9.4.4 の同梱表が一致

`docs/CODING_PRINCIPLES.md` を編集した時：

- [ ] `agents/loom-developer.md` の Coding Principles セクションが現行 13 原則を参照（追加/削除があれば反映）
- [ ] 全 reviewer agent prompt（`loom-reviewer.md` / `loom-code-reviewer.md` / `loom-test-reviewer.md`）の review 観点が CODING_PRINCIPLES.md と整合
- [ ] `README.md` で言及されとる原則数（13）が一致

## M0.10 Worktree 関連 check

`skills/loom-worktree/SKILL.md` を編集した時：

- [ ] Decision tree の 5 用途と SPEC §3.6.6.1 が一致
- [ ] Path convention で参照する `project-prefs.worktree.base_path` の placeholder 仕様と template が一致
- [ ] 3 agent (loom-pm / loom-developer / loom-retro-pm) prompt の Worktree section が skill 仕様と整合
- [ ] README の worktree 入門が skill / SPEC と整合

## M0.11 learned_guidance + lens tagging 関連 check

SPEC §3.6.5.4 / §3.9.x / §6.9.4 を編集した時：

- [ ] `templates/{user,project}-prefs.json.template` の `agents.<name>.learned_guidance` example が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の lens tagging convention が SPEC §3.9.x と一致
- [ ] 4 retro lens (`agents/loom-retro-{pj,process,meta}-judge.md` + `loom-retro-researcher.md`) prompt が `target_artifact / target_agent / guidance_proposal` field 出力を記述
- [ ] 13 agent prompt の Customization Layer section が `learned_guidance` 注入経路を記述
- [ ] `agents/loom-retro-aggregator.md` の write logic が schema 仕様と整合
- [ ] `agents/loom-retro-counter-arguer.md` が tag fields を verdict pass 通過時に preserve

## M0.12 Coexistence Mode 関連 check

SPEC §3.6.7 / §3.7 / §6.9 を編集した時：

- [ ] `templates/claude-loom/project.json.template` の `rules.coexistence_mode` enum 値と SPEC §3.6.7.1 が一致
- [ ] `rules.enabled_features` array の feature group 名と SPEC §3.6.7.2 が一致
- [ ] 3 dispatcher agent (`loom-pm` / `loom-developer` / `loom-retro-pm`) prompt の runtime gate 記述が SPEC §3.6.7.3 と整合
- [ ] `commands/loom-mode.md` が SPEC §3.6.7 と整合
- [ ] README.md の Coexistence Mode intro が SPEC と整合

## M0.13 Retro Discipline & Process Hardening 関連 check

SPEC §3.9.x / §3.6.8 / RETRO_GUIDE.md を編集した時：

- [ ] retro 基本方針 P1/P2/P3 が SPEC §3.9.x と RETRO_GUIDE.md で一致
- [ ] 4 retro lens prompt の freeform improvement instruction が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-aggregator.md` の action plan section が P3 と整合
- [ ] `agents/loom-retro-counter-arguer.md` の freeform 検証強化が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-pm.md` の user lens 公式組込 + verdict 保存 hook が SPEC §3.9.x と整合
- [ ] `agents/loom-pm.md` の workflow discipline 5 項目が SPEC §3.6.8 と整合
- [ ] `agents/loom-developer.md` の TDD red 順序 enforcement が SPEC §3.6.8.6 と整合
- [ ] `tests/retro_test.sh` / `tests/agents_test.sh` の M0.13 assertion が SPEC と整合

## M1 Daemon + Hooks Foundation 関連 check

SPEC §6.2 / §6.3 / §6.4 / §6.10 / §7.3 / §12 を編集した時：

- [ ] `daemon/src/db/schema.ts` の Drizzle 定義が SPEC §6.1 / §6.2 / §7.3 の SQL DDL と semantic 一致（11 table、composite PK 含む）
- [ ] SPEC §12 の確定値（tRPC / Drizzle / nanoid / integer ms / etc.）と `daemon/package.json` の依存が整合
- [ ] `daemon/src/router.ts` の AppRouter export が frontend (M2) 渡し用 export pattern 維持
- [ ] `daemon/src/events/types.ts` の WS event schema が SPEC §6.3 Event payload 仕様と一致
- [ ] `daemon/src/hooks/ingest.ts` の POST /event handler input が `hooks/*.sh` の payload schema と一致
- [ ] `daemon/src/security/token.ts` の chmod 600 + bind 127.0.0.1 が SPEC §12 の security baseline と一致
- [ ] `install.sh` の hooks/ symlink + settings.json 配線が `hooks/*.sh` 5 種を完全 cover

`agents/*.md` を編集した時（M1 後の継続的維持）：

- [ ] daemon が読む event payload schema と各 agent の hook 起動経路が整合

## SCREEN_REQUIREMENTS.md 更新時の整合性 check

`docs/SCREEN_REQUIREMENTS.md` を編集した時：

- [ ] §3 観測ニーズと SPEC §6 (DB schema) / §6.9 (prefs schema) が整合
- [ ] §4 介入ニーズと daemon tRPC procedure (M1 で実装、後続で追加) が対応
- [ ] §5 通知 toast と daemon WS event types (`daemon/src/events/types.ts`) が対応
- [ ] §6 visual hint と SPEC §12 visual 方向性 (ピクセル RPG) が整合
- [ ] §7 Phase 振り分けと PLAN.md M2-M5 milestone tasks が整合
