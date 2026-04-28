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
