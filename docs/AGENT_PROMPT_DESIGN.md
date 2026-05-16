# loom agent prompt design principles

> claude-loom の `agents/*.md` を書く / 直す際の foundational design doc。

## Background

claude-loom is a Claude Code plugin. The agents (`loom-pm` / `loom-developer` / `loom-reviewer` 系 / `loom-retro-*` 系) are **NOT independent AI agents** — they are **roles overlaid on Claude Code**.

agent prompt の目的は、Claude Code に **mission + character + loom-specific contracts** を上乗せして loom-specific なロールを演じてもらうことであって、ゼロから AI agent を作ることではない。

## Core thesis

> **Claude Code は既に賢い。** loom agent prompt は「ゼロから AI 作る」やのうて、「Claude Code に loom-specific なロールを演じてもらう」ためのもの。

これがすべての principle の根。長い prescriptive prompt は Claude Code の判断能力を **degrade** させ、結果的に performance を下げる。

## 2-layer prompt structure

すべての `agents/*.md` は 2 層構造で書く。

### Layer 1: Reasoning layer（薄く、judgment は Claude Code に委ねる）

| 要素 | 中身 | 規模目安 |
|---|---|---|
| **Mission** | 何を達成するために存在するか | 1-3 行 |
| **Character** | 性格・スタンス（spec-driven / non-destructive / conductor mindset 等） | 5-7 個 |
| **Workflow semantic** | workflow の **意味**（spec → impl → verify）、各 phase の目的 | 手順詳述しない |
| **Judgment axes** | 判断の axis だけ示す（高信頼 / 不明瞭 / 無関係 等）。keyword list や AND 条件で機械的に決めない | axis 名のみ |

### Layer 2: Contract layer（厳密、precise に prescribe）

Claude Code が **知らないと動けない loom 固有情報** だけ書く。

| 要素 | 例 |
|---|---|
| **Interface contracts** | `[loom-meta]` prefix、`commit_handoff=dev\|pm` flag、`<!-- claude-loom managed: start/end -->` marker、`m*-complete` tag 形式、`[reviewer-dispatch-refs]` block format、`[post-tag-hotfix]` commit annotation |
| **File paths / SSoT refs** | `~/.claude-loom/user-prefs.json`、`<project>/.claude-loom/project-prefs.json`、`templates/*.template`、`SPEC §X.X` |
| **Hard constraints** | judgment で override 不可の絶対制約 |
| **Subagent inventory** | dispatch 可能な subagent list + dispatch protocol |
| **Loom-specific tools** | `loom-*` skill / slash command の存在と invoke pattern |

## Anti-patterns（避ける）

### ❌ 1. Mechanical keyword matching

```
spec 系 intent keyword list（日本語 + 英語、合計 23 個）:
- 日本語: 「実装したい」「機能追加」「追加したい」「作りたい」「バグ」...
- 判定は case-insensitive substring match
```

Claude Code は user intent を自然に理解できる。keyword list は false negative / over-fit を生み、新規 case 出るたび rule 追加で膨張する。**判断軸だけ示せ。**

### ❌ 2. Re-teaching Claude Code basics

- "Be concise"
- "Ask clarifying questions ONE AT A TIME"
- "Use TodoWrite to track progress"
- "Use Bash for git commands"

これらは Claude Code の system prompt に既にある。**重複は害**（token 浪費 + 判断 conflict）。

### ❌ 3. Prescribed prompt template verbatim

```
確認 prompt template:
「直前の message と PLAN.md の状態から、spec phase への entry を検出しました。
「<検出した作業内容の要約>」の spec phase に入りますで、ええか？」
```

状況に応じた自然な phrasing は AI に任せる。固定 template 強制は character も殺す。**意図だけ codify、phrasing は AI。**

### ❌ 4. Step-by-step bash command prescription

```
1. `ls SPEC.md 2>/dev/null && echo "spec_exists"`
2. `grep -c "status: todo" PLAN.md`
3. `git log --oneline -5`
```

Claude Code は probe したいなら自分で tool を選ぶ。command 詳述は tool 選択の自由を縛り、新 tool 登場時の対応も遅れる。

### ❌ 5. Historical retro reference embed

```
（retro 2026-05-04-001 F-pj-002/F-proc-002 で default inversion、SPEC §3.6.8.6 SSoT 同期）
```

agent の振る舞いに必要なのは **現在の rule**、過去の経緯ではない。歴史は SPEC / retro archive へ。

### ❌ 6. Replicated structure across sections

```
Session Start Hook: 軸 1 + 軸 2 → 3 信頼レベル → override → degraded → 誤爆抑制
Spec Phase Completion Hook: 軸 1 + 軸 2 + 軸 3 → 3 信頼レベル → override → degraded → 誤爆抑制
```

同型 section が並列で全書きされとる場合は **統合、差分だけ示す**。

## Good-patterns（適用する）

### ✅ 1. Mission + character + invariants

mission 1-3 行 + character 5-7 個 + hard constraint 3-5 個 で agent の "人格" が立つ。

### ✅ 2. Judgment axes, not rules

「高信頼 / 不明瞭 / 無関係」のような **判断軸** を示し、各軸での **stance** だけ codify する。具体判断は Claude Code。

例：
```
- 高信頼（user intent + cwd state 明確）: 1 問確認 → yes で即突入
- 不明瞭: user に「何したい？」と聞く（選択肢提示）
- 無関係: idle、無用な質問せえへん
```

### ✅ 3. SSoT reference, not duplication

SPEC や docs に SSoT がある内容は **参照 1 行で済ます**。

```
詳細手順 / keyword list / prompt template の正本は SPEC §3.6.8.9 を参照。
```

### ✅ 4. Contracts as precise format spec

interface contract は format を正確に書く：

```
[loom-meta] project_id=<from project.json> slot=dev-<N> working_dir=<absolute path> commit_handoff=<dev|pm>
```

### ✅ 5. Workflow as semantic, not procedure

各 phase の **意味** で書く。Step 1 で Read、Step 2 で Ask、Step 3 で Propose みたいな procedural 詳述は **SPEC § に migrate** する。

## Size guideline

| agent role | 目安行数 |
|---|---|
| PM (最複雑、user 対話 + dispatch + verify の三役) | 200-250 行 |
| developer | 150-200 行 |
| reviewer (single mode) | 100-150 行 |
| reviewer (specialized: code/security/test) | 80-120 行 |
| retro-pm | 150-200 行 |
| retro lens (pj-axis/process-axis/meta/researcher) | 80-120 行 |

**この目安を超える → anti-pattern 混入を疑う。** 超える場合は SPEC § へ migration できる内容がないかまず scan する。

## When to break these rules

以下なら prescribe 残し OK：

- `SPEC §X.X` で **構造的要件として確定済み** の interface contract
- engineering invariant（例: parallel batch では isolation worktree、これも contract に該当）

逆に **過去 1 回の retro 由来の tactical rule** は SPEC に昇格させてから prompt に入れる。**SPEC → prompt の単方向 flow**、prompt 側で新 rule を発明せえへん。

## Migration: 既存 prompt の見直し手順

既存 `agents/*.md` を本 principle に準拠させる時の手順：

1. **Mission + Character を 1 段落で立てる** — 既存 "Your role" を refactor
2. **Hard constraints を切り出す** — judgment で override されたら困る絶対制約を別 section に
3. **Interface contracts を切り出し** — file path / format spec / dispatch protocol を Contract layer に配置
4. **Workflow を semantic で書き直す** — Step 1/2/3 の procedural 詳述は SPEC § へ移送
5. **anti-pattern 1-6 を scan** — 該当 section を削減 / 統合 / 参照化
6. **SSoT が SPEC にあるものは引用 1 行に圧縮**

## Verification

新規・改修した agent prompt は以下で self-check：

- [ ] Mission section が 1-3 行で書かれとる
- [ ] Character section が 5-7 個の項目で agent の "人格" が立つ
- [ ] Hard constraints が override 不可と明示されとる
- [ ] anti-pattern 1-6 のいずれも混入していない
- [ ] mechanical keyword matching / 3 信頼レベル分岐 / AND 条件の prescription がない
- [ ] SPEC §X.X SSoT がある内容は引用 1 行に圧縮されとる
- [ ] historical retro reference (「retro YYYY-MM-DD-NNN F-* 由来」) が embed されとらん
- [ ] size guideline 範囲内
- [ ] interface contract (file path / format spec / dispatch protocol) が precise に書かれとる

## References

- `SPEC.md` — 製品仕様 SSoT
- `CLAUDE.md` — agent 作業規約（本 doc と相補関係）
- `agents/*.md` — 各 agent prompt（本 doc 準拠）
