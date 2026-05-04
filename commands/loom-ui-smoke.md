---
description: UI 開発時の browser-interactive smoke test を実行。SCREEN_REQUIREMENTS / 機能要件 / design から test 戦略を derive し、Playwright MCP で実機 verify、構造化 report (docs/smoke-tests/<date>-<scope>/) を生成。SPEC §3.6.11 SSoT、suggest skill (UI 開発時のみ)。引数: --scope=full|route:<name>|smoke-only (default: full)、--auto-start (dev server 自動起動)。
---

# /loom-ui-smoke

UI 開発時の **browser-interactive smoke test** を実行する。`loom-ui-smoke` skill を invoke し、SKILL.md の 4 stage pipeline を実行する。

## 前提条件

- PM mode (`/loom-pm`) 起動済み必須
- UI 開発を含む project 限定（daemon-only / agent-prompt-only milestone には YAGNI）
- Playwright MCP tool (`browser_navigate` 等) が利用可能なこと

## 引数解釈

```
/loom-ui-smoke                        # --scope=full (default)
/loom-ui-smoke --scope=full           # 全 route navigate + verify + screenshot
/loom-ui-smoke --scope=route:<name>   # 単一 route のみ verify (例: --scope=route:room)
/loom-ui-smoke --scope=smoke-only     # screenshot なし、console error / DOM check only (CI-friendly)
/loom-ui-smoke --auto-start           # dev server 未起動時に scripts/start-servers.sh で auto-start
/loom-ui-smoke --scope=full --auto-start  # 組み合わせ可
```

### --scope

| 値 | 動作 |
|---|---|
| `full` (default) | 全 route navigate + accessibility snapshot + screenshot 取得 |
| `route:<name>` | 単一 route (`/<name>`) のみ verify (部分 verify、高速) |
| `smoke-only` | screenshot をスキップ、console error + DOM check のみ (light mode) |

### --auto-start

dev server (port 5757 daemon + 5173 ui) が未起動の場合、`skills/loom-ui-smoke/scripts/start-servers.sh` を呼び出して background 起動する。smoke test 完了後に dev server を cleanup する。

flag 未指定時: dev server 未起動なら user に確認プロンプトを出す。

## Action

1. 引数を parse して `scope` と `auto_start` を決定
2. `loom-ui-smoke` skill (SKILL.md) を invoke
3. SKILL.md の 4 stage pipeline を実行：
   - **Stage 1**: SCREEN_REQUIREMENTS / SPEC / design から test 戦略を derive し `docs/smoke-tests/<YYYY-MM-DD>-<scope>/strategy.md` を生成
   - **Stage 2**: Playwright MCP `browser_*` tool で実機 verify、screenshot + console.log を収集
   - **Stage 3**: `skills/loom-ui-smoke/scripts/format-report.sh` で `report.md` + `findings.json` を生成
4. Stage 3 final report を PM / user に返却

## Output

```
docs/smoke-tests/<YYYY-MM-DD>-<scope>/
├── strategy.md      # Stage 1 derive 結果
├── report.md        # Stage 3 human-readable report
├── console.log      # 全 route の console error + warning
├── findings.json    # machine-readable findings (JSON schema validate 済)
└── screenshots/     # --scope=full / route:<name> 時のみ
    ├── 01-home.png
    ├── 02-room.png
    └── ...
```

`<scope>` 文字列: `full` / `route-<name>` / `smoke-only`

## 関連参照

- SPEC §3.6.11 — UI Smoke Test Skill 全 10 sub-section (SSoT)
- SPEC §10.4 — Browser-interactive verification layer (2 層 verification 規約)
- `skills/loom-ui-smoke/SKILL.md` — skill 実装詳細（stage pipeline / pre-flight / dev server lifecycle）
- `docs/SCREEN_REQUIREMENTS.md` — 9 view の UI 要件
- `RETRO_GUIDE` — retro carryover findings との連携
