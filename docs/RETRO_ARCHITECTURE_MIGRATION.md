# Retro Architecture Migration Plan (agent-centric → skill-centric)

> claude-loom retro 機能の構造的 refactor 計画。**Step 2** として別 milestone で実施する design doc。

## Motivation

retro 機能は現在 **7 agents** (`loom-retro-pm` + 4 lens + counter-arguer + aggregator) で構成されとるが、本来 retro は **workflow / procedure** であって persistent role ではない。`docs/AGENT_PROMPT_DESIGN.md` で確立した agent / skill semantic に照らすと、現状の architecture は **workflow を agent で偽装** しとる構造。

### Agent vs Skill semantic

| 軸 | Agent | Skill |
|---|---|---|
| 存在の継続性 | persistent | ephemeral |
| 責務 | role / responsibility | workflow / procedure |
| 判断主体 | 自律的に decision | 呼び出し元 agent の手段 |
| 例 | PM / developer / reviewer | TDD cycle / writing plan / debugging |

### Retro 7 agents の実態

| 現 agent | 実態 |
|---|---|
| `loom-retro-pm` | retro 起動 / user 対話 / 結果適用の orchestrator → **persistent role**（残す） |
| `loom-retro-pj-judge` | Stage 1 pj 軸の 1-shot critic | **ephemeral workflow step** |
| `loom-retro-process-judge` | Stage 1 process 軸の 1-shot critic | **ephemeral workflow step** |
| `loom-retro-meta-judge` | Stage 1 meta 軸の 1-shot critic | **ephemeral workflow step** |
| `loom-retro-researcher` | Stage 1 external 軸の 1-shot critic | **ephemeral workflow step** |
| `loom-retro-counter-arguer` | Stage 2 反証パスの 1-shot judge | **ephemeral workflow step** |
| `loom-retro-aggregator` | Stage 3 統合の 1-shot synthesizer | **ephemeral workflow step** |

retro-pm 以外の 6 体は **session を跨いで存在せん**、毎回 invoke される作業手順。正しい abstraction は skill。

## Target architecture

### Skill-centric design

```
skills/loom-retro/SKILL.md
├── retro 使命 + 3-stage protocol semantic
├── Stage 0: preparation contracts (file build / branch guard / scope inclusion)
├── Stage 1: 4 lens parallel critique
│   ├── pj-axis lens prompt template
│   ├── process-axis lens prompt template
│   ├── meta-axis lens prompt template
│   ├── researcher lens prompt template
│   └── (optional) user lens template
├── Stage 2: counter-argument pass prompt template
├── Stage 3: aggregation prompt template
└── Interface contracts (findings JSON shape / verdict_evidence / learned_guidance write)

agents/loom-retro-pm.md (slim orchestrator として残存)
├── milestone retro hook detection
├── retro_id 採番 + Stage 0 file build
├── skill loom-retro invoke
├── presentation (conversation / report mode)
└── pending.json state finalize + audit
```

### Dispatch pattern

lens / counter-arguer / aggregator は **`subagent_type="general-purpose"` への inline prompt** で dispatch する形式に統一：

```typescript
// 現状 (agent-centric)
Agent({
  subagent_type: "loom-retro-pj-judge",
  prompt: "[loom-meta] retro_id=..."
})

// 目標 (skill-centric)
Agent({
  subagent_type: "general-purpose",
  prompt: `${LENS_PJ_TEMPLATE}\n[loom-meta] retro_id=...\n${context_data}`
})
```

skill 内の lens template を retro-pm が読み込み、parallel dispatch 時に prompt に組み立てる。

## Migration trade-offs

### Skill 化のメリット

1. **行数大幅削減**: 7 agents (合計 ~1,768 行) → 1 skill (~400 行) + 1 slim agent (~150 行) ≈ **550 行（68% 削減）**
2. **lens template の共通構造** が 1 file に集まり、retro 全体の workflow が visible
3. **新 lens 追加** が skill 内 section 追加で済む（新 agent file 作成不要）
4. **正しい abstraction** — agent / skill の semantic に忠実
5. **PM agent prompt との対称性** — retro = "PM が milestone closure 時に invoke する skill" として整合
6. **Customization Layer の `[loom-customization]` block 注入が simple** — skill 経由 invoke の dispatch prompt 生成で集約可能

### Skill 化の課題

1. **Customization mechanism の redesign 必要**
   - 現状: `agents.<lens-name>.learned_guidance[]` が agent name で keyed
   - 移行先: `skills.loom-retro.lenses.<lens-name>.learned_guidance[]` か、または同じ keying で skill 側が injection
   - 既存 prefs の migration script 必要（破壊的変更を避ける）
2. **既存 retro 履歴との互換性**
   - 過去 retro が agent-keyed 参照を持つ場合（archive markdown / pending.json）の取扱
   - schema migration の要否確認
3. **Parallel dispatch pattern の確立**
   - skill が「以下 4 prompt で parallel dispatch せよ」と指示する形式を standardize
   - retro-pm 側で parallel batch を実行する Agent invocation pattern を明確化
4. **SPEC §3.9 の改訂**
   - retro architecture を agent-centric → skill-centric に書き換え
   - lens responsibility は skill 内 section、retro-pm responsibility は agent prompt 内、責務分離を re-codify
5. **Customization Layer の責務再分配**
   - 現状: dispatcher (retro-pm) が `agents.<lens>.<>` を Read して `[loom-customization]` block を inject
   - 移行先: dispatcher が skill 経由で同等動作、または skill 側に injection logic を持たせる

## Migration phases

### Phase A: Prerequisites (Step 1 として完了済)

- [x] `docs/AGENT_PROMPT_DESIGN.md` で agent / skill semantic を確立
- [x] SPEC §3.10.2 で設計原則 SSoT pointer を追加
- [x] `loom-pm.md` を 2-layer design に再構築 (reference 第一号)
- [x] `loom-retro-pm.md` を 2-layer design に再構築 (reference 第二号、本 plan の前段)

### Phase B: SPEC §3.9 redesign (architectural decision)

1. SPEC §3.9 全体を agent-centric → skill-centric architecture に書き換え
2. 各 lens の responsibility を skill 内 lens template として再 codify
3. retro-pm responsibility を slim orchestrator として再定義
4. Customization Layer の dispatch pattern を skill 経由 invoke に統一
5. SPEC §3.6.5 (Customization Layer) と SPEC §3.9 の interface contract を re-align

### Phase C: Skill 実装

1. `skills/loom-retro/SKILL.md` 拡張 (現 56 行 → ~400 行、lens template 全 4 種 + counter-arguer + aggregator template + Stage 0 contract)
2. lens template の各 section に：
   - mission + character (薄い、judgment は Claude Code に委ねる)
   - finding JSON schema reference (SPEC §6.9.x)
   - per-lens category enum (pj-axis / process-axis / meta-axis / external)
3. counter-arguer template: verdict enum (confirm / for_downgrade / for_drop) + judgment criteria
4. aggregator template: severity 調整 / archive 生成 / learned_guidance write 責務

### Phase D: retro-pm slim refactor

1. `loom-retro-pm.md` を skill invoke 中心に書き換え (~120-150 行 target)
2. Stage 0 preparation は retro-pm 直担当 (file build / branch guard / scope inclusion)
3. Stage 1-3 dispatch は **skill 内 template を読み込み → general-purpose subagent に parallel dispatch**
4. presentation / audit は retro-pm 直担当 (skill invoke 後)

### Phase E: Customization migration

1. prefs schema 拡張: `agents.<lens>` を保持しつつ `skills.loom-retro.lenses.<lens>` を追加 (両 source を merge)
2. 既存 prefs に migration を適用（破壊的変更回避、`agents.<lens>` 由来 entries を `skills.loom-retro.lenses.<lens>` に shadow copy）
3. retro-pm 側で dispatch 時に skill-keyed customization を優先読み（agent-keyed は fallback）

### Phase F: 6 agents 削除 + 整合性 verify

1. `agents/loom-retro-{pj,process,meta}-judge.md` 削除
2. `agents/loom-retro-{counter-arguer,aggregator,researcher}.md` 削除
3. `loom-retro-pm.md` の inventory section から削除済 agent 参照を除去
4. `bash tests/run_tests.sh` で agent test pass 確認
5. Layer 1 / Layer 2.5 dogfood smoke で retro 実機動作確認

## Risk + rollback

### Risk

- **prefs migration ミス**: `agents.<lens>.learned_guidance` の data loss 可能性
  - mitigation: migration 前に backup 必須、shadow copy で両方 keep
- **dispatch pattern の挙動差**: subagent_type 変更で Claude Code の subagent registration 挙動が変わる可能性
  - mitigation: Phase C で `general-purpose` 経由 dispatch を smoke test
- **既存 retro archive の互換性**: 古い report markdown が削除 agent 参照を含む
  - mitigation: archive は read-only history、参照は historical artifact として残す

### Rollback

各 Phase で独立 commit + PR 化、Phase F で agents 削除直前まで old + new が共存する。問題発生時：

- Phase F 前 → 古い agent file を再有効化 (skill 経由 invoke の path だけ revert)
- Phase F 後 → revert commit で agent file 復元

## Timeline 推奨

- **本 Step (Step 1)**: agent prompt 圧縮 reference 確立まで（PM + retro-pm 完了）
- **Step 2 (本 plan 実行)**: 別 milestone で Phase B → C → D → E → F を 1 セッション 1 Phase 単位で進める（context 厳しい場合は Phase 分割）
- **trigger**: PM + 他 agent (developer / reviewer) refactor 完了後、または user が architectural cleanup を優先したい時

## References

- `docs/AGENT_PROMPT_DESIGN.md` — agent / skill semantic SSoT
- `SPEC.md §3.9` — retro 機能 SSoT (Phase B で改訂対象)
- `SPEC.md §3.6.5` — Customization Layer SSoT (Phase E で interface 拡張)
- `agents/loom-retro-pm.md` — slim orchestrator (Phase D 後の姿)
- `skills/loom-retro/SKILL.md` — skill 中心 architecture の本体 (Phase C で拡張)
