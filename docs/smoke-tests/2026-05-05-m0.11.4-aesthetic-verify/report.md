# Smoke Test Report — 2026-05-05-m0.11.4-aesthetic-verify

## Summary

| Field | Value |
|---|---|
| Smoke ID | 2026-05-05-m0.11.4-aesthetic-verify |
| Scope | full |
| Started | 2026-05-05 16:14:11 |
| Completed | 2026-05-05 16:14:11 |

## Stats

| Metric | Count |
|---|---|
| Routes Tested | 11 |
| Routes Passed | 10 |
| Routes Failed | 1 |
| Console Errors | 0 |
| Console Warnings | 2 |

## Findings

### MEDIUM

#### F-001: /project-settings

- **Category**: rendering
- **Description**: ProjectSettingsView の 3 dropdown が label/option をレンダーしておらず、空の chevron のみ表示。rpg-frame と Save/Reset btn-px は適用済みだが setting 名 (Auto-retro on milestone tag / Coexistence mode / Default review mode 等) が選択肢として render されとらん。
- **Screenshot**: [screenshots/10-project-settings.png](screenshots/10-project-settings.png)
- **Expected**: 各 setting 行に rpg-label の項目名 + 選択肢付き dropdown
- **Actual**: label 不在、option text 不在、chevron icon のみの空 dropdown 3 個
- **REQ refs**: REQ-040
- **Recommended action**: ProjectSettingsView.tsx を読み、setting metadata (id/label/options) の data binding を確認。M0.11.4 t16 で RPG style 化した時に label rendering が落ちた可能性。loom-developer dispatch (PM 経由) で fix 推奨

### LOW

#### F-003: /guidance

- **Category**: navigation
- **Description**: /guidance 一発目の navigate で Page URL は /guidance に到達したが render 内容が直前の /gantt のままに見えた (transient race と思われる、再 navigate で正常表示)。再現性は低く、modal overlay の mount race と推測。
- **Screenshot**: [screenshots/08-guidance.png](screenshots/08-guidance.png)
- **Expected**: /guidance navigate 1 回で LearnedGuidanceView の rpg-frame が即時 render
- **Actual**: 1 度目: /gantt content が残った状態で screenshot される、2 度目で正常
- **REQ refs**: REQ-038
- **Recommended action**: AppShell の modal overlay key/mount 戦略を確認、または Playwright headless 環境固有の race の可能性 → 監視継続、再発時に finding 化

### INFO

#### F-002: /tokens

- **Category**: rendering
- **Description**: TokenMeterView の 3 exp-bar (INPUT/OUTPUT/CACHE) が token usage = 0 の empty state で fill 0% となり、bar の background のみ薄く可視 (active fill 不在)。値 0 では正しい表示だが UX 的に「機能未起動」か「fill 描画 bug」か区別しづらい。
- **Screenshot**: [screenshots/11-tokens.png](screenshots/11-tokens.png)
- **Expected**: 0% fill でも bar 枠が明示的、もしくは 'no data' indicator
- **Actual**: 薄灰の thin bar のみ、active token 不在で識別困難
- **REQ refs**: REQ-041
- **Recommended action**: empty state visual を強化 (border outline 強化 or '— no recent tokens' caption) を retro carryover に積む

## Output Links

- Strategy: [strategy.md](strategy.md)
- Screenshots: [screenshots/](screenshots/)
- Console log: [console.log](console.log)
- Findings (machine-readable): [findings.json](findings.json)

## Recommended Next Action

loom-developer dispatch recommended (via PM) to address 1 failed route(s) and 3 finding(s).
Alternatively, add as retro carryover findings.
