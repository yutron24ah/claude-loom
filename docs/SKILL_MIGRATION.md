# Agent → Skill Migration (claude-loom)

> claude-loom の agent registry を **persistent role のみ** に絞り、workflow step は skill に migrate する architectural cleanup。本 doc は `branch docs/agent-prompt-design` で **executing** な migration の plan + 完了記録。

## Motivation

`docs/AGENT_PROMPT_DESIGN.md` で確立した **agent / skill semantic** を厳密適用すると、現状 13 agents のうち多くが **workflow を agent で偽装** しとる構造になっとる。

### Agent vs Skill semantic

| 軸 | Agent | Skill |
|---|---|---|
| 存在の継続性 | persistent（session 跨ぐ identity） | ephemeral（invoke 時だけ存在） |
| 責務 | role / responsibility | workflow / procedure |
| 判断主体 | 自律的に decision を下す | 呼び出し元 agent の手段 |
| 例 | PM / developer / retro-pm | TDD cycle / review / retro 3-stage protocol |

### Migration 対象 10 agents

| 区分 | agent | 実態 | migration 先 |
|---|---|---|---|
| **Retro lens (4 体)** | `loom-retro-pj-judge` | Stage 1 pj 軸の 1-shot critic | `skills/loom-retro/SKILL.md` lens template |
| | `loom-retro-process-judge` | Stage 1 process 軸の 1-shot critic | 同上 |
| | `loom-retro-meta-judge` | Stage 1 meta 軸の 1-shot critic | 同上 |
| | `loom-retro-researcher` | Stage 1 external 軸の 1-shot critic | 同上 |
| **Retro pipeline (2 体)** | `loom-retro-counter-arguer` | Stage 2 反証パスの 1-shot judge | `skills/loom-retro/SKILL.md` Stage 2 template |
| | `loom-retro-aggregator` | Stage 3 統合の 1-shot synthesizer | `skills/loom-retro/SKILL.md` Stage 3 template |
| **Reviewer (4 体)** | `loom-reviewer` | single mode 1-shot multi-aspect reviewer | `skills/loom-review/SKILL.md` single strategy |
| | `loom-code-reviewer` | trio mode code aspect 専 1-shot | `skills/loom-review/SKILL.md` code aspect template |
| | `loom-security-reviewer` | trio mode security aspect 専 1-shot | `skills/loom-review/SKILL.md` security aspect template |
| | `loom-test-reviewer` | trio mode test aspect 専 1-shot | `skills/loom-review/SKILL.md` test aspect template |

10 agents 全部が session を跨ぐ persistent identity を持たず、毎回 invoke される workflow step。

### 残存 agents (persistent role)

| agent | 残存理由 |
|---|---|
| `loom-pm` | spec/impl/verify phase orchestrator、user 対話の主体、project lifecycle 管理 |
| `loom-retro-pm` | retro session orchestrator、user 対話 + state 管理 + skill invoke |
| `loom-developer` | TDD-disciplined worker、PM dispatch を receive する slot identity |

## Target architecture

### Skill-centric design

```
skills/loom-retro/SKILL.md (~400 行)
├── retro 使命 + 3-stage protocol semantic
├── Stage 0: preparation contracts
├── Stage 1: 4 lens parallel critique
│   ├── pj-axis lens template
│   ├── process-axis lens template
│   ├── meta-axis lens template
│   ├── researcher lens template
│   └── (optional) user lens template
├── Stage 2: counter-argument template
├── Stage 3: aggregation template
└── Interface contracts (findings JSON / verdict_evidence / learned_guidance write)

skills/loom-review/SKILL.md (~250 行)
├── review 使命 + 2 strategies (single / trio)
├── single strategy: 1 dispatch、3 aspects sequential
├── trio strategy: 3 parallel dispatches、各 1 aspect 専
├── code aspect template
├── security aspect template
├── test aspect template
└── Output JSON contract (shape / category enum / verdict logic)

agents/loom-retro-pm.md (slim orchestrator)
agents/loom-developer.md (slim impl worker、review dispatch を skill invoke 経由に)
agents/loom-pm.md (top-level、変更なし)
```

### Dispatch pattern

lens / counter-arguer / aggregator / reviewer は **`subagent_type="general-purpose"` への inline prompt** で dispatch する形式に統一：

```typescript
// Before (agent-centric)
Agent({
  subagent_type: "loom-retro-pj-judge",
  prompt: "[loom-meta] retro_id=..."
})

// After (skill-centric)
Agent({
  subagent_type: "general-purpose",
  prompt: `${LENS_PJ_TEMPLATE_FROM_SKILL}\n[loom-meta] retro_id=...\n${context_data}`
})
```

skill 内の template を dispatcher (retro-pm / developer) が読み込み、prompt を組み立てて parallel dispatch する。

## Migration phases (本 branch で execution)

| Phase | 内容 | commit |
|---|---|---|
| **P1** | Migration plan doc を retro + reviewer 統合 (本 doc rename) | `docs:` |
| **P2** | `skills/loom-review/SKILL.md` 拡張 (single + trio strategy + 3 aspect template) | `feat(skills):` |
| **P3** | `agents/loom-developer.md` の review dispatch を skill invoke に書換 | `refactor(agents):` |
| **P4** | 4 reviewer agents 削除 | `refactor(agents):` |
| **P5** | `skills/loom-retro/SKILL.md` 拡張 (Stage 0-3 + 4 lens + counter-arguer + aggregator template) | `feat(skills):` |
| **P6** | `agents/loom-retro-pm.md` の lens/aggregator/counter-arguer dispatch を skill invoke に書換 | `refactor(agents):` |
| **P7** | 6 retro agents 削除 | `refactor(agents):` |
| **P8** | SPEC §3.9 改訂 (agent-centric → skill-centric architecture) | `docs(spec):` |
| **P9** | Customization migration (templates/*.template + prefs schema 拡張) | `feat(customization):` |
| **P10** | Test verify + broken refs 修正 | `test:` or `fix:` |

## Migration trade-offs

### Skill 化のメリット

1. **行数大幅削減**: 10 agents (合計 ~1,484 行) → 2 skills (~650 行) ≈ **56% 削減**
2. **template の共通構造** が skill 内で visible
3. **新 lens / aspect 追加** が skill 内 section 追加で済む
4. **正しい abstraction** — agent / skill の semantic に忠実
5. **Customization Layer 一元化** — skill 経由 invoke で `[loom-customization]` block 注入が dispatcher 側に集約

### Skill 化の課題

1. **Customization mechanism redesign**: `agents.<lens-name>.learned_guidance[]` → `skills.loom-{retro,review}.lenses.<lens-name>.learned_guidance[]` への prefs 拡張
2. **既存 retro 履歴の参照**: archive markdown が agent name 参照を含むが historical artifact として残す（read-only history）
3. **Parallel dispatch pattern の確立**: skill が dispatcher に template を提供、dispatcher が `general-purpose` subagent に parallel dispatch
4. **SPEC §3.9 全面改訂**: retro architecture を agent-centric → skill-centric に rewrite

## Customization migration (P9 詳細)

### prefs schema 拡張 (radical approach、claude-loom 自身の dogfood project 限定)

claude-loom 自身は dogfood project ゆえ既存 prefs entries を破壊的書換可能。general user PJ には影響なし（claude-loom 自身を install しとる project が無いため）。

**Before** (`~/.claude-loom/user-prefs.json` or `<project>/.claude-loom/project-prefs.json`):

```json
{
  "agents": {
    "loom-retro-pj-judge": {
      "personality": "default",
      "learned_guidance": [...]
    },
    "loom-reviewer": {
      "personality": "default",
      "learned_guidance": [...]
    }
  }
}
```

**After**:

```json
{
  "agents": {
    "loom-pm": { ... },
    "loom-developer": { ... },
    "loom-retro-pm": { ... }
  },
  "skills": {
    "loom-retro": {
      "lenses": {
        "pj-axis": { "personality": "default", "learned_guidance": [...] },
        "process-axis": { ... },
        "meta-axis": { ... },
        "researcher": { ... }
      },
      "stages": {
        "counter-arguer": { ... },
        "aggregator": { ... }
      }
    },
    "loom-review": {
      "strategies": {
        "single": { "personality": "default", "learned_guidance": [...] },
        "trio": {
          "code": { ... },
          "security": { ... },
          "test": { ... }
        }
      }
    }
  }
}
```

dispatcher (retro-pm / developer) は `skills.loom-{retro,review}.*` を read、`[loom-customization]` + `[loom-learned-guidance]` を skill template injection に組み込む。

## Rollback

各 Phase 独立 commit、P4 / P7 で agents 削除直前まで old + new 並存可能。問題発生時：

- P4 前 → reviewer dispatch を skill invoke から agent dispatch に revert
- P7 前 → retro dispatch を skill invoke から agent dispatch に revert
- P8 後 → SPEC §3.9 revert + skill 内 template を削除 + agents 復元

## References

- `docs/AGENT_PROMPT_DESIGN.md` — agent / skill semantic SSoT
- `SPEC.md §3.9` (P8 で改訂対象) — retro architecture SSoT
- `SPEC.md §3.6.5` (P9 で interface 拡張) — Customization Layer SSoT
- `agents/loom-retro-pm.md` — slim orchestrator (P6 で skill invoke 化)
- `agents/loom-developer.md` — slim worker (P3 で skill invoke 化)
- `skills/loom-retro/SKILL.md` — retro skill 本体 (P5 で拡張)
- `skills/loom-review/SKILL.md` — review skill 本体 (P2 で拡張)
