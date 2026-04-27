# Commit + Branch Guide

claude-loom が採用する **Conventional Commits + GitHub Flow** の詳細ルール + 例。SPEC §3.8 の policy 宣言から参照される SSoT。

## なぜこの規約か

- **Conventional Commits**：commit 種別の機械的分類で changelog 自動生成 / SemVer 連携が可能。業界標準
- **GitHub Flow**：個人〜小規模チーム向け、main + 短命 feature ブランチのみ。CD 親和性高
- **Atomic commits**：1 commit = 1 論理変更で revert / cherry-pick が安全、レビュー粒度が揃う

参考: [conventionalcommits.org](https://www.conventionalcommits.org), [Google's Engineering Practices](https://google.github.io/eng-practices/), [Chris Beams - How to Write a Git Commit Message](https://cbeams.com/posts/git-commit/), [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)

## 1. コミットメッセージ

### 1.1 形式

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

例：

```
feat(skills): loom-test bundled script + SKILL.md

loom-developer から呼ばれる前提のテスト一括実行スクリプト。
project root を SPEC.md + tests/run_tests.sh の存在で自動探索する。

Refs: m0.5-t5
```

### 1.2 Type（11 種）

| Type | 用途 | 例 |
|---|---|---|
| `feat` | 新機能 | `feat(agents): add loom-reviewer single-mode agent` |
| `fix` | バグ修正 | `fix(install): handle empty $HOME guard` |
| `docs` | ドキュメントのみの変更 | `docs(spec): §3.8 add CC adoption` |
| `style` | フォーマット / 空白 / コメント等の整形（ロジック不変） | `style: align indent in install.sh` |
| `refactor` | リファクタ（機能不変） | `refactor(skills): extract find_project_root helper` |
| `perf` | パフォーマンス改善 | `perf(daemon): batch event writes` |
| `test` | テストのみの追加・修正 | `test(install): add REQ-008 coverage` |
| `build` | ビルドシステム / 依存関係 | `build: bump bun to 1.2` |
| `ci` | CI 設定 | `ci: add lint workflow` |
| `chore` | 雑務（リリース準備、tooling 等） | `chore: scaffold M0 repo structure` |
| `revert` | 直前 commit の取消 | `revert: feat(...) <SHA>` |

### 1.3 Scope（任意）

該当モジュール / 領域を括弧で。複数モジュールにまたがる変更は scope なし、または最も影響度の高い 1 つ。

良い例：`feat(skills)`, `fix(agents)`, `docs(plan)`, `test(commands)`
悪い例：`feat(skills,agents,docs)` ← 多すぎ、scope 省略推奨

### 1.4 Subject（件名）

- **命令形** または **日本語の体言止め** 可
- 英語: ≤50 文字目安、長くても 72 文字以内
- 日本語: ≤40 文字目安（情報密度が高いため）
- **末尾ピリオドなし**
- 1 文字目大文字（英語）／文頭整形（日本語）

良い例：
- `feat(install): add idempotent symlink installer`
- `fix(agents): align loom-developer mode-neutral wording`
- `docs(spec): §6.9 schema gains rules.review_mode`

悪い例：
- `Added install script.` （過去形 + 末尾ピリオド）
- `fix stuff` （vague）
- `feat: refactored 42 files including agents/loom-* and skills/...` （長すぎ + scope 過大）

### 1.5 Body（本文）

必要時のみ。件名と空行で区切る。

- **WHY を書く**（WHAT は diff で見える）
- 72 文字目安で折返（日本語は自然な改行）
- 影響範囲・トレードオフ・実装メモなど

```
fix(install): use -type l for symlink detection on macOS

macOS の find は default で symlink を follow しない。
-type f / -type d は symlink にマッチせず、status.sh が
全 installed セクションで (none) を返してしまう regression を起こした。
-type l に統一して symlink を直接検出する。
```

### 1.6 Footer（任意）

- `Refs:` `Closes:` `Fixes:` で issue / task ID
- `Co-Authored-By:` 共同作業
- `BREAKING CHANGE:` 破壊的変更（型変更・API 削除・スキーマ変更等）

```
feat(api)!: rename /v1/users to /v1/accounts

BREAKING CHANGE: API consumers must update endpoint paths.
旧 /v1/users は 410 Gone を返す。
```

`type` の直後に `!` を付けると BREAKING の短縮表記。

### 1.7 言語ポリシー

`.claude-loom/project.json` の `rules.commit_language` で：
- `"any"`（default）：日本語 / 英語どちらも OK。code identifiers は原文（日本語化しない）
- `"english"`：英語強制。OSS / 国際チーム向け
- `"japanese"`：日本語強制（稀）

claude-loom 自身は `"any"`。

## 2. Atomic Commits（1 commit = 1 論理変更）

- 機能追加とリファクタは別 commit に分ける
- 1 commit だけで `git revert` できる単位にする
- 各 commit で **build pass + tests pass** 状態を維持
- 行数目安：200 行以下が理想、500 行超は分割を検討（Google CL 流儀）
- 例外：1 機能の test ファイル + 実装ファイルは同じ commit に含めて OK（TDD red→green の green commit）

### 良い分割例

| Bad（1 commit） | Good（3 commit に分割） |
|---|---|
| `feat: add X feature, refactor Y helper, fix Z bug` | `feat(x): add X feature` / `refactor(y): extract Y helper` / `fix(z): handle Z edge case` |

## 3. ブランチ規約（GitHub Flow）

### 3.1 戦略

- **`main`** + 短命 **feature ブランチ** のみ
- Git Flow の `develop` / `release` ブランチは使わない
- main 直 commit 禁止、PR 経由のみ
- merge 後はブランチ削除（履歴を main に集約）

### 3.2 命名

`<type>/<short-kebab-name>` 形式。type は commit type の 10 種（`revert` を除く）：

| Branch type | 用途 | 例 |
|---|---|---|
| `feat/` | 新機能 | `feat/loom-reviewer-agent` |
| `fix/` | バグ修正 | `fix/install-home-guard` |
| `docs/` | ドキュメントのみ | `docs/commit-guide` |
| `style/` | フォーマット | `style/install-indent` |
| `refactor/` | リファクタ | `refactor/find-project-root` |
| `perf/` | パフォーマンス | `perf/event-batching` |
| `test/` | テスト追加 | `test/install-req-008` |
| `build/` | ビルド | `build/bun-bump` |
| `ci/` | CI 設定 | `ci/add-lint-workflow` |
| `chore/` | 雑務 | `chore/scaffold-m0` |

### 3.3 寿命

- 数日〜数週間が目安
- 長期化したら分割（マイルストーン単位を超える場合は M0.5 / M0.6 のように細かく刻む）
- 短命 = main との rebase / merge コストが低い

### 3.4 merge 戦略

- **`--no-ff`**：マイルストーン境界を history に残したい時（M0 / M0.5 / M0.6 の merge 実例）
- **squash**：WIP commit が多く、本質的に 1 つの論理変更として履歴に残したい時
- **fast-forward**：避ける（履歴のフラット化で branch boundary が消える）

claude-loom 自身は `--no-ff` で運用してる。

## 4. claude-loom の実コミット例

良い例（claude-loom 自身の commit history より引用）：

- `feat(install): minimal symlink installer with TDD coverage (REQ-001..004)` — type + scope + subject、`Refs:` 代わりに `(REQ-...)` で要件参照
- `fix(skills): status.sh symlink detection (-type l) + plan t13 done + install banner generic` — 複数の関連修正を 1 commit にまとめた例
- `docs(spec): §3.8 add Conventional Commits + GitHub Flow adoption (M0.7)` — SPEC 章番号を subject に含める claude-loom 流儀

避ける例：
- 件名のみで本文なしの大規模変更（WHY が失われる）
- 異なる type の混在（`feat + fix + refactor` 同時 commit）
- "Update files" / "WIP" 系の vague subject

## 5. claude-loom 規約への移行（既存プロジェクトの adopt）

既存プロジェクトを `claude-loom` で adopt する際は：

1. `.claude-loom/project.json` の `rules.commit_prefixes` / `rules.branch_types` / `rules.commit_language` を既存規約に合わせてカスタマイズ
2. 既存の commit 履歴は移行しない（過去資産は尊重）
3. adopt 以降の新規 commit から本ガイドに従う

## 6. 自動検証

- `tests/conventions_test.sh` が `templates/claude-loom/project.json.template` の `commit_prefixes` / `branch_types` の整合性を機械検証（REQ-012, REQ-013）
- `docs/COMMIT_GUIDE.md` の存在は REQ-014 で検証
- M1 以降で commit-msg hook（commitlint 等）の自動 lint を検討予定（M2 / M3 ではなく実装フェーズで）

## 関連参照

- SPEC §3.8（policy 宣言）
- SPEC §6.9（project.json schema）
- `.claude-loom/project.json` の `rules.*`（プロジェクト固有設定）
- [Conventional Commits 公式](https://www.conventionalcommits.org)
- [Chris Beams - How to Write a Git Commit Message](https://cbeams.com/posts/git-commit/)
