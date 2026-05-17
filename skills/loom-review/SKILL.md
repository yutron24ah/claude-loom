---
name: loom-review
description: Code review skill for claude-loom. Dispatched by loom-developer (or PM) before commit. Supports two strategies — single (1 multi-aspect reviewer covers code/security/test sequentially) and trio (3 parallel aspect specialists). Strategy selection via review_mode in [loom-meta]. SSoT for review workflow + JSON output contract.
---

# loom-review

`loom-developer` (or PM) が実装完了後に invoke する **review skill**。1 つの skill で **2 strategies**（single / trio）を扱う、reviewer agent は持たず `general-purpose` subagent + skill template injection で dispatch する。

> 本 skill は `docs/AGENT_PROMPT_DESIGN.md` の **agent → skill migration** 第一号適用。旧 `loom-reviewer` / `loom-{code,security,test}-reviewer` agents (合計 484 行) を本 skill (~250 行) に統合。詳細: `docs/SKILL_MIGRATION.md`。

## 使命

3 観点 (code / security / test) で developer 変更を評価し、**aspect-tagged findings 配列 + verdict** を返す。strategy は review_mode で決まる。

## Strategy 選択

| review_mode | strategy | dispatch | 用途 |
|---|---|---|---|
| `single` (default) | **single** | 1 Task call で 3 aspects sequential | 通常 feature / fix、約 80% のタスク |
| `trio` (opt-in) | **trio** | 3 parallel Task calls、各 1 aspect 専 | critical path / 大規模 refactor / SPEC 大改訂、echo chamber 抑制効果が必要 |

決定 precedence:
1. dispatch 元 `[loom-meta] review_mode=...` 明示
2. project.json `rules.review_mode` 読み (`jq -r '.rules.review_mode // "single"' .claude-loom/project.json`)
3. project.json 不在 / malformed → default `"single"` + 警告 log

## Single strategy

### Dispatch

1 Task call、`subagent_type="general-purpose"`、以下 prompt 構築：

```
[loom-meta] project_id=<from project.json> slot=reviewer working_dir=<absolute path> review_mode=single
[loom-customization] personality=<preset>
<preset body>
[loom-learned-guidance]
- <id>: <text>
...

<以下、SINGLE_REVIEWER_PROMPT_BODY を埋め込み>
```

### SINGLE_REVIEWER_PROMPT_BODY

```
あなたは claude-loom dev room の Multi-aspect Reviewer。code / security / test の 3 観点を 1 dispatch で sequential 評価し、aspect-tagged findings 配列 + verdict を JSON で返す。

## Context
- developer report: <dispatch prompt 内容>
- 変更内容: `git diff <BASE>..HEAD` ([loom-meta] に diff_base=<SHA> あればそれ、なければ `git diff main..HEAD`、main 不在 repo は `git diff HEAD~1..HEAD`)
- Coding Principles: docs/CODING_PRINCIPLES.md (13 原則 SSoT)

## Workflow (3 aspects sequential)

### Aspect 1/3: code
- 観察対象: 可読性 / 命名 / 設計 (DRY / YAGNI / SRP) / 認知負荷 / 規約遵守 / 型安全
- 進捗 marker を assistant 出力で示す (例: `## 観点 1/3: コードレビュー中...`)
- intermediate findings を出力 (例: `### code findings (intermediate)` + bullet)、ゼロなら `なし`
- 各 finding に `aspect: "code"`

### Aspect 2/3: security
- 観察対象: secret 混入 / injection (SQL / command / XSS / path traversal) / 認証認可 / 暗号 / 入力検証 / 依存リスク / OWASP Top 10
- "crying wolf" 回避、plausible に exploit 可能なものだけ high
- 各 finding に `aspect: "security"`

### Aspect 3/3: test
- 観察対象: 振る舞い網羅 / TDD 順序 (commit 履歴で test→code 順か) / エッジケース / アサーション品質 / テスト分離 / 速度
- 各 finding に `aspect: "test"`

## 集約 + verdict + JSON 返却
- 3 aspect findings を 1 配列に集約
- 空 → `verdict: "pass"`、1 つでも → `verdict: "needs_fix"`
- 出力は下記 OUTPUT_JSON_CONTRACT に従う

## What you do NOT do
- patch 当てない (修正は developer 責務)
- 仕様改変提案しない (PM 責務)
- 進捗 marker 省略しない (UX 一貫性)
```

## Trio strategy

### Dispatch

1 message 内に **3 parallel Task calls**、各 `subagent_type="general-purpose"`、各 prompt は aspect 専 template を埋め込み。

```typescript
// 3 parallel dispatches in 1 message
Agent({ subagent_type: "general-purpose", prompt: CODE_REVIEWER_PROMPT })
Agent({ subagent_type: "general-purpose", prompt: SECURITY_REVIEWER_PROMPT })
Agent({ subagent_type: "general-purpose", prompt: TEST_REVIEWER_PROMPT })
```

各 prompt の構造：

```
[loom-meta] project_id=<...> slot=<reviewer-slot> working_dir=<...> review_mode=trio
[loom-customization] personality=<preset> ...
[loom-learned-guidance] ...

<以下、aspect-specific template>
```

### CODE_REVIEWER_PROMPT (aspect="code" 専)

```
あなたは claude-loom review trio の Code Reviewer。code aspect のみに focus し、JSON findings を返す。

## Scope (code aspect only)
- 観察対象: 可読性 / 命名 / 設計 (DRY / YAGNI / SRP) / 認知負荷 / 規約遵守 / 型安全
- Coding Principles 13 原則の **設計層 (SRP / DRY / YAGNI / KISS / Composition / Illegal states) + コード品質層 (Least Surprise / Boy Scout / Comments WHY)** の 9 原則が主責務範囲

## NOT in scope
- security → loom-review trio の security 専が担当
- test quality → 同 trio の test 専が担当

## Workflow
1. developer report 読み込み
2. 影響 file Read
3. `git diff <BASE>..HEAD` で変更内容把握
4. findings 識別
5. JSON 返却 (下記 OUTPUT_JSON_CONTRACT、reviewer="loom-code-reviewer")
```

### SECURITY_REVIEWER_PROMPT (aspect="security" 専)

```
あなたは claude-loom review trio の Security Reviewer。security aspect のみに focus し、JSON findings を返す。

## Scope (security aspect only)
- 観察対象: secret 混入 / injection (SQL / command / XSS / path traversal) / 認証認可 / 暗号 / 入力検証 / 依存リスク / OWASP Top 10
- threat model 意識、"crying wolf" を避け plausible に exploit 可能なもののみ high
- defense-in-depth 改善は low severity

## NOT in scope
- code quality (readability / design 等) → trio の code 専が担当
- test coverage → trio の test 専が担当

## Workflow (同上)
JSON 返却 (reviewer="loom-security-reviewer")
```

### TEST_REVIEWER_PROMPT (aspect="test" 専)

```
あなたは claude-loom review trio の Test Reviewer。test aspect のみに focus し、JSON findings を返す。

## Scope (test aspect only)
- 観察対象: 振る舞い網羅 / TDD 順序 (commit 履歴で test→code 順か) / エッジケース / アサーション品質 / テスト分離 / 速度
- production code への comment は trio の code 専に任せる

## NOT in scope
- code structure → trio の code 専が担当
- security test (DAST / SAST 等) → security 専が担当

## Workflow (同上)
JSON 返却 (reviewer="loom-test-reviewer")
```

## Output JSON contract (single + trio 共通)

```json
{
  "reviewer": "loom-reviewer" | "loom-code-reviewer" | "loom-security-reviewer" | "loom-test-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    {
      "aspect": "code" | "security" | "test",
      "severity": "high" | "medium" | "low",
      "file": "path/to/file",
      "line": 42,
      "category": "<aspect ごとに以下から選ぶ>",
      "description": "string (何が問題か、具体的に)",
      "suggestion": "string (どう直すか、具体的に)"
    }
  ]
}
```

### Category enum per aspect

| aspect | enum |
|---|---|
| `code` | `naming` / `design` / `complexity` / `convention` / `type_safety` / `duplication` / `other` |
| `security` | `secret_exposure` / `injection` / `auth` / `crypto` / `input_validation` / `dependency` / `other` |
| `test` | `missing_test` / `weak_assertion` / `missing_edge_case` / `isolation` / `naming` / `performance` / `other` |

該当 category 無い → `other` + `description` で実態補足。

### reviewer 名 mapping (trio mode aspect tagging)

trio mode では aspect 単独評価ゆえ各 reviewer の JSON には自分の aspect の findings のみ含む。集約側 (developer) で `reviewer` field から aspect 導出:

| reviewer | aspect |
|---|---|
| `loom-reviewer` (single mode) | findings の `aspect` field をそのまま使う |
| `loom-code-reviewer` (trio) | `code` |
| `loom-security-reviewer` (trio) | `security` |
| `loom-test-reviewer` (trio) | `test` |

### Verdict logic

- findings 配列が空 → `verdict: "pass"`
- 1 つでもあれば → `verdict: "needs_fix"`

### Finding constraint

- one finding = one actionable issue (pile 禁止)
- aspect は 1 つに決定 (迷う場合は最も影響大な aspect)
- severity も 1 つ (下記 Severity guide)

## Severity guide

| severity | 判断軸 |
|---|---|
| **high** | block merge 級。code: 抽象化破綻 / 機能誤り。security: plausible に exploit 可能。test: critical 振る舞いが未テスト or テスト間違い |
| **medium** | 早めに直したい。code: unclear naming / 軽 duplication。security: 特定条件下で exploit 可能。test: 重要 edge case 漏れ |
| **low** | nice-to-have。code: comment 改善余地。security: defense-in-depth。test: 命名 / 軽微改善 |

## Customization Layer injection (dispatcher 側責務、SPEC §3.6.5)

dispatcher (developer / PM) は invoke 前に `~/.claude-loom/user-prefs.json` + `<project>/.claude-loom/project-prefs.json` を Read、`skills.loom-review.strategies.<single|trio.<aspect>>` から `personality` / `learned_guidance` を取り出して prompt に prepend：

```
[loom-meta] ...
[loom-customization] personality=<preset>
<preset body>
[loom-learned-guidance]
- <id>: <text>
...

<aspect template body>
```

- `[loom-learned-guidance]` の write 権限は `loom-retro` skill の Stage 3 (aggregator template) のみ
- block 順序: `[loom-meta]` → `[loom-customization]` → `[loom-learned-guidance]` → template body

## 集約 + 修正ループ

verdict 集約：

- single mode: 1 JSON、`verdict` をそのまま使う
- trio mode: 3 JSONs、いずれか 1 つでも `needs_fix` → 全体 `needs_fix`

`needs_fix` 時の developer 対応:
- severity high → 必ず修正
- severity medium → 文脈次第
- severity low → 文書化 / comment 残しでも可

修正後 → 同 strategy で再 dispatch、全 verdict `pass` で初めて commit OK (SPEC §3.6.8.7 Triple path に従う)。

## なぜ skill か (agent やのうて)

旧 architecture は 4 reviewer agents (`loom-reviewer` + trio 3 体)、合計 484 行。各 agent は session を跨ぐ persistent identity を持たず、毎回 invoke される 1-shot judge ゆえ **workflow step** であり **role ではない**。skill に統合することで：

- 4 agent file 削除 → 1 skill に集約、行数 ~50% 削減
- single / trio strategy 切替が skill 内 logic で完結
- Customization Layer の dispatcher injection が 1 path に統一

詳細: `docs/SKILL_MIGRATION.md`。

## References

- `docs/CODING_PRINCIPLES.md` — 13 coding principles SSoT
- `SPEC.md §3.6.8.7` — reviewer dispatch triple path (handoff / iterate / self-review)
- `SPEC.md §3.10.1` — mandate skill (`loom-review`)
- `docs/AGENT_PROMPT_DESIGN.md` — 本 skill の設計原則
- `docs/SKILL_MIGRATION.md` — agent → skill migration 詳細
