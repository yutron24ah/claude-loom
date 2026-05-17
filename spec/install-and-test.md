# install-and-test (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。
>
> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (master SPEC §3.11.4 SSoT)。
>
> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §3.7 / §9 / §10 から migration)

## 1. プロジェクトライフサイクルと adopt 戦略 (旧 master §3.7)

claude-loom は **新規プロジェクトの立ち上げ** にも **既存プロジェクトの取り込み（adopt）** にも対応する。両者は明確に区別され、PM が異なるフローで処理する。

### 1.1 ライフサイクル 3 段階

| 段階 | 契機 | PM の動作 |
|---|---|---|
| **init** | 空ディレクトリ or 既存 git repo に loom 初導入 | テンプレから SPEC/PLAN/CLAUDE/README を生成、`.claude-loom/project.json` 作成 |
| **adopt** | 既存ファイルを持つ git repo に loom 導入 | 既存ファイルを **検知して尊重**、`.claude-loom/project.json` のみ生成、CLAUDE.md には loom セクションを追記マーカーで挿入 |
| **maintain** | 上記いずれか後の継続運用 | doc 整合性監視、ライフサイクル全体で全ドキュメントを保守対象とする |

### 1.2 adopt 戦略（既存 PJ への侵略を防ぐ）

**non-destructive 原則**：既存ファイルは **user の明示承認なしに改変しない**。

PM が adopt フローで実施する内容：

1. cwd を git root 化、既存ファイル一覧を取得
2. 検知対象：
   - `SPEC.md` / `PLAN.md` / `CLAUDE.md` / `README.md` の有無
   - 既存テスト dir（`tests/` `__tests__/` `spec/` 等）
   - 既存 CI 設定（`.github/workflows/` 等）
   - branch / commit 規約の手がかり（`CONTRIBUTING.md` `CHANGELOG.md`）
3. 検知レポートを user に提示
4. user が項目ごとに承認 → PM が以下を実行：
   - **必ず生成**：`.claude-loom/project.json`（loom 固有、衝突不可能）
   - **既存あり**：尊重、変更しない（必要なら user 承認の上でテンプレ生成）
   - **既存 CLAUDE.md あり**：末尾に loom セクションを追記（マーカー区切り、§1.3）
   - **既存 CLAUDE.md なし**：テンプレから新規生成
   - **既存 README.md あり**：尊重、変更しない
   - **既存 README.md なし**：テンプレから最小スケルトンを生成

### 1.3 loom-managed セクションマーカー

CLAUDE.md などに loom が追記する範囲は、視覚的に分離するためマーカーで囲む：

```markdown
（既存ユーザーコンテンツはそのまま）

<!-- claude-loom managed: start -->
## claude-loom 開発フロー

このプロジェクトは claude-loom で管理されています。
詳細は SPEC.md / PLAN.md を参照。

[loom が動的に管理する規約・ルール記述]
<!-- claude-loom managed: end -->
```

PM が CLAUDE.md を更新する際は **マーカー間のみを書き換える**。マーカー外の既存内容には絶対に触らない。マーカーが無い場合は新規追加（既存 CLAUDE.md の末尾、必要なら user 承認）。

### 1.4 PM のドキュメント保守スコープ

PM は以下の **すべて** を保守対象として扱う：

| 種別 | 例 | 保守タイミング |
|---|---|---|
| 仕様書 | `SPEC.md` | spec フェーズで作成・更新、変更時に doc 整合性 trigger |
| 計画 | `PLAN.md` | 実装中に進捗反映、新規タスク追加時に更新 |
| 作業ガイド | `CLAUDE.md` | loom セクションは PM 管理、それ以外は変更しない |
| ユーザー向け | `README.md` | user 承認の上で更新 |
| その他 docs | `docs/**/*.md` | 整合性チェックの対象、変更は user 承認 |
| 受入要件 | `tests/REQUIREMENTS.md` | spec 変更で新規 REQ 追加時に PM が更新 |

**MVP では PM は doc 整合性 finding を提示するのみ**（自動修正は v2 = Phase 2）。ユーザーが各 finding に対して acknowledge / fix / dismiss を判断する。

### 1.5 mode detection と選択（M0.12 から）

adopt mode の中で以下の追加検出を行う：
- 既存他 plugin の存在 (`~/.claude/plugins/` 配下)
- 既存 agents / skills / commands (loom-* 以外)
- 既存 user-authored CLAUDE.md / project.json

検出結果を提示し、`coexistence_mode` 未設定時は user に 3 mode のうち選択を促す。
default は `full`（greenfield 想定）、user が「既存 setup 尊重」と意思表示したら `coexist`、細かく指定したいなら `custom`。

---

## 2. 配布・インストール (旧 master §9)

### 2.1 ディレクトリ構造（claude-loom リポジトリ）

```
claude-loom/
├── SPEC.md                  ← 本ドキュメント
├── PLAN.md                  ← 実装計画（後で writing-plans で生成）
├── CLAUDE.md                ← Claude Code 向け作業ガイド
├── README.md                ← ユーザー向け説明
├── install.sh               ← シンボリックリンク設置 + daemon ファイル配置
├── uninstall.sh
├── docs/
│   ├── SCREEN_REQUIREMENTS.md  ← 画面要件（別ドキュメント）
│   └── EVENT_SCHEMA.md         ← hook payload 詳細
├── agents/                  ← 3 persistent role only (reviewer / retro lens は skill template に migrate 済)
│   ├── loom-pm.md
│   ├── loom-developer.md
│   └── loom-retro-pm.md
├── commands/
│   ├── loom.md
│   ├── loom-pm.md
│   ├── loom-spec.md
│   ├── loom-go.md
│   ├── loom-status.md
│   └── loom-stop.md
├── hooks/
│   ├── loom-session-start.sh
│   ├── loom-pre-tool.sh
│   ├── loom-post-tool.sh
│   └── loom-stop.sh
├── skills/                  ← workflow + template SSoT。reviewer / retro lens は agent file ではなく skill template として codify (2026-05 architectural cleanup)
│   ├── loom-test/
│   ├── loom-status/
│   ├── loom-tdd-cycle/
│   ├── loom-review/        ← single + trio strategy 統合、aspect template (code / security / test) を内包
│   ├── loom-retro/         ← Stage 0-3 protocol + 4 lens + counter-arguer + aggregator template を内包
│   ├── loom-write-plan/
│   ├── loom-debug/
│   ├── loom-worktree/
│   └── loom-ui-smoke/
├── daemon/                  ← Node プロジェクト
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── ui/                      ← React + Vite + Phaser
│   ├── package.json
│   └── src/
├── templates/               ← 新規 PJ / adopt 用テンプレ
│   ├── SPEC.md.template
│   ├── PLAN.md.template
│   ├── CLAUDE.md.template          ← loom-managed セクション含む
│   ├── README.md.template          ← 最小スケルトン
│   ├── settings.json.template            ← bundled-script allowlist 初期値（M0.5）
│   └── claude-loom/
│       └── project.json.template
└── tests/
    ├── REQUIREMENTS.md      ← 受入要件（claude-blog-skill 流儀）
    └── *_test.sh / *_test.ts
```

### 2.2 install.sh の振る舞い詳細

```bash
install.sh の流れ:

1. 前提チェック
   - bash / jq / curl / node (>=20) / claude コマンドの存在確認
   - 不足あればエラーで停止、不足分一覧を表示

2. ディレクトリ準備
   - mkdir -p ~/.claude/{agents,commands,hooks,skills}
   - mkdir -p ~/.claude-loom

3. シンボリックリンク設置 (claude-blog-skill 流儀)
   for f in agents/loom-*.md commands/loom-*.md hooks/loom-*.sh; do
     dest=~/.claude/<type>/$(basename "$f")
     if [ -e "$dest" ] && [ ! -L "$dest" ]; then
       echo "ERROR: $dest が通常ファイルとして存在。手動で対応してくれ" → 停止
     elif [ -L "$dest" ]; then
       echo "INFO: 既存リンクを更新"
       rm "$dest"
     fi
     ln -s "$(realpath "$f")" "$dest"
   done

4. daemon ビルド & 配置
   - cd daemon && npm ci && npm run build
   - cp -r daemon/dist ~/.claude-loom/daemon
   - chmod 0700 ~/.claude-loom

5. UI ビルド & 配置
   - cd ui && npm ci && npm run build
   - cp -r ui/dist ~/.claude-loom/ui

6. settings.json 更新 (jq + atomic mv)
   src=~/.claude/settings.json
   tmp=${src}.tmp
   bak=${src}.bak.$(date +%s)
   cp "$src" "$bak"
   jq --arg hook "$(realpath hooks/loom-pre-tool.sh)" \
      '.hooks.PreToolUse += [{"matcher": "Task", "hooks": [{"type": "command", "command": $hook}]}]' \
      "$src" > "$tmp"
   jq empty "$tmp" || { echo "ERROR: 不正な JSON"; exit 1; }   # 再検証
   mv "$tmp" "$src"
   rm "$bak"   # 成功時は backup 削除
   # ※ 同様に PostToolUse / SessionStart / Stop も登録

7. 完了表示
   - 「インストール完了。`/loom` で起動できる」を表示
```

### 2.3 uninstall.sh の振る舞い

```bash
uninstall.sh の流れ:

1. daemon 停止 (動作中なら)
   - localhost:5757/shutdown を叩く、応答無くば SIGTERM
2. シンボリックリンク削除
   - ~/.claude/<type>/loom-* で symlink のものだけ削除
3. settings.json から hooks エントリを削除
   - jq で .hooks.PreToolUse[] | select(.command | contains("loom-")) | del 等
4. ~/.claude-loom/ の扱い
   - state.db, config.json, .token を保持するかユーザーに確認
   - --purge オプション付きなら全削除
```

#### 2.3.1 LOCAL_STATE_DIR safety boundary（retro 2026-05-04-001 F-pj-003 / F-proc-003）

M5 t5 で uninstall.sh が repo の `.claude-loom/retro/` を削除する incident 発生（root cause: `LOCAL_STATE_DIR="${LOOM_STATE_DIR:-${PWD}/.claude-loom}"` で default が repo-local PWD に解決された）。下記 boundary を SPEC SSoT 化：

- **LOCAL_STATE_DIR default は `${HOME}/.claude-loom` 固定**（user state global SSoT）
- **`LOOM_STATE_DIR` env var で override 可能**（test sandbox 用、`mktemp -d` で temp dir に向ける）
- **safety boundary check**: uninstall.sh は実行時に LOCAL_STATE_DIR が git repo 内に解決されとるか check、解決されとる場合は `--repo-state-ok` flag が無ければ refuse + exit code 2
- **`--repo-state-ok` flag**: repo-local state を意図的に対象とする場合（test fixture / 開発時）の明示 opt-in
- **tests/uninstall_test.sh**: 全 test scenario で `LOOM_STATE_DIR=$SBn/.claude-loom` を必ず set、repo-local default に依存せん write boundary 厳密化

### 2.4 依存関係

- bash, jq, curl（hooks 層）
- Node.js >= 20（daemon, UI build）
- Claude Code CLI（`claude` コマンドが PATH に必要）
- SQLite 3（OS バンドルで OK）

---

## 3. テスト戦略 (旧 master §10)

### 3.1 TDD 基本ルール

- main 直コミット禁止、ブランチ単位で /review + /security-review 指摘ゼロ必須
- コミット粒度：Conventional Commits 準拠（11 type — 詳細は `spec/harness.md` §5 参照、`docs/COMMIT_GUIDE.md` に good/bad 例）
- 1 要件 = 1 ブランチ、1 機能 = 1 コミット

### 3.2 テスト配置

- bash hooks: `tests/*_test.sh`（claude-blog-skill 流儀、自前ハーネス）
- daemon (TypeScript): `daemon/src/**/*.test.ts`（vitest）
- UI: `ui/src/**/*.test.tsx`（vitest + testing-library）
- 統合テスト: `tests/integration/*_test.sh`（daemon 起動 → hook 発火 → DB 検証）

### 3.3 受入要件

`tests/REQUIREMENTS.md` に ID 付きで記録（claude-blog-skill 流儀）。
例：`REQ-001: /loom 実行で daemon が起動し、ブラウザが localhost:5757 を開く`

### 3.4 Browser-interactive verification layer（M0.11.3 から、retro 2026-05-04-001 F-proc-005 拡張）

UI 開発時の test 戦略を **2 層化**：

| Layer | 担当 | 検出する gap |
|---|---|---|
| **Layer 1: bash + automated test** | `bash tests/run_tests.sh` + `pnpm test` (vitest unit + integration) + `pnpm e2e` (Playwright baseline) | 論理 correctness、build / install / unit behavior、既知 baseline regression |
| **Layer 2: browser-interactive smoke** | `loom-ui-smoke` skill (`spec/ui-arch.md` §3)、Playwright MCP `browser_*` tool 経由 | **実機での描画・WS 流通・state propagation・navigation・interactivity** が automated test mock の隙間に隠れた gap を検出 |

両 layer を **milestone closure default** として実行、F-proc-005 success record の継続的拡張。Layer 2 は UI 開発を含む milestone のみ適用 (suggest skill、master SPEC §3.10.1)、daemon-only / agent-prompt-only の milestone では skip 可能。

#### 3.4.1 Layer 2.5: PM dogfood smoke（M0.X-runtime-mode-recovery 後 retro 2026-05-06-003 F-USER-009 由来、必須）

**trust recovery milestone series 3 連続発覚 pattern (F-USER-005/006 + F-USER-007/008 + Bug A) は全て Layer 1 + Layer 2 が pass した状態で user 直接 dogfood verify でしか発覚しなかった**。Layer 1 (automated test) と Layer 2 (UI smoke) の隙間に「実 user fixture path」が抜けとる構造的 gap。本 layer はその gap を構造的に塞ぐ：

| Layer | 担当 | 検出する gap |
|---|---|---|
| **Layer 2.5: PM dogfood smoke** | PM agent が milestone tag 設置 **直前** に Bash + curl + (optional) WebFetch で実機 verify | **install path → lazy launch hook 起動 → daemon 起動 → /health + /mode probe → UI HTML 取得 → 重要 endpoint 動作** までの user-facing pipeline 全体の actual 動作 |

**verify steps (PM が milestone closure 直前に必ず実行)**:

1. `bash hooks/loom-launch-ui.sh` (or 同等の lazy launch trigger) を user fixture と同条件で実行
2. `curl -sf http://127.0.0.1:5757/health` → `{"status":"ok"}` 応答確認
3. `curl -s http://127.0.0.1:5757/mode | jq .` → `spec/daemon-and-data.md` §1 shape (mode/entry/version/started_at/pid/ui_serving) 全 field 充足確認
4. `curl -sI http://127.0.0.1:5757/` → `200` + `content-type: text/html` 応答確認 (ui/dist 存在 milestone のみ)
5. milestone scope の他 user-visible endpoint があれば追加 verify
6. 結果を `docs/smoke-tests/<date>-<milestone>-dogfood.md` に出力 (任意 format、key signal 列挙)

**failure handling**:
- Layer 2.5 で **任意の失敗を検出 → tag 設置を block**、failed step を user に報告 + fix task を PLAN.md に追加して closure 延期
- pass のみで tag 設置可、後続の milestone retro hook + branch hygiene PR opening trigger に進む

**rationale**:
- F-USER-005/006 (install / build artifact gap) → install path 通せばすぐ気づく
- F-USER-007/008 (symlink CLI guard / hooks SDK 仕様) → lazy launch + /health probe で immediate 検出
- F-USER-009 / Bug A (NODE_ENV / static serving / port bind verify gap) → / + /mode 直接 curl で immediate 検出
- 3 連続全て Layer 2.5 で Layer 1+2 通過後にも検出可能だった (post-hoc analysis)

#### 3.4.2 Layer 3: user verify request（補助 layer、record only）

**Layer 3 は anti-pattern として明示**：開発側の Layer 2.5 dogfood gap を user 拘束 ("動作確認してくれ") で塞ぐ運用は持続不能 (Phase 2 multi-contributor 時に scale せず、user trust を消耗する)。Layer 3 は補助的に **emergency case (Layer 2.5 で気づけない user environment 固有の issue)** にのみ依存し、default workflow からは除外する。

agents/loom-pm.md milestone closure workflow は Layer 1 → Layer 2 (UI 開発時) → **Layer 2.5 (必須)** → tag 設置 → Layer 3 (user-side、record only) の順序で固定。
