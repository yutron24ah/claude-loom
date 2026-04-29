---
description: Switch claude-loom coexistence mode (full / coexist / custom). Updates <project>/.claude-loom/project.json's rules.coexistence_mode and rules.enabled_features. Default mode is "full" (all features enabled). Use "coexist" when adopting alongside existing harness, "custom" with explicit feature group list.
---

# /loom-mode

claude-loom の **coexistence mode** を切り替える slash command。

## Usage

```
/loom-mode <full|coexist|custom> [features...]
```

例:
- `/loom-mode full` → 全機能 ON
- `/loom-mode coexist` → core のみ、他 plugin と共存
- `/loom-mode custom core retro` → core + retro のみ

## 内部動作

PM が `<project>/.claude-loom/project.json` の `rules.coexistence_mode` + `rules.enabled_features` を編集して mode 反映。詳細：`SPEC §3.6.7`、`agents/loom-pm.md` の lifecycle / runtime gate logic。

## Feature groups (5)

- `core`: base agents/skills/commands (disable 不可)
- `retro`: /loom-retro + lens 6 体 + learned_guidance
- `customization`: personality preset + Customization Layer 注入
- `worktree`: /loom-worktree + autonomous decision
- `native-skills`: loom-write-plan + loom-debug
