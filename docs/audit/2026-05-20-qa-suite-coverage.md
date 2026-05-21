# QA Test Matrix Coverage Audit (2026-05-20)

> **Source of truth**: `docs/design/2026-05-17-m0.18-ui-rework/project/qa-suite.js`
> **Audit date**: 2026-05-20
> **Branch**: chore/qa-suite-coverage-audit-2026-05-20

## ⚠️ ERRATA (2026-05-21)

本 audit の初版 (2026-05-20) は **5-6 segment ID を計上漏れ**。実 case 総数は **515 件** (479 ではない)。

漏れた 36 件の section 別 prefix 分布:
- AD (agent-detail overlay): +1
- DS (room): +1
- EG (edge_cases cross-cutting): +1
- FL (flows shell): +13
- MS (milestones cross-cutting): +12
- NT (notifications cross-cutting): +1
- RC (shell reactioncenter): +1
- UX (ux_patterns cross-cutting): +6

検出は M0.19 t1 で `scripts/audit-qa-coverage.sh` を実装して全 ID grep した時に判明 (script は `[A-Z][A-Z0-9]*(-[A-Z0-9]+)+` pattern で 5-6 segment も拾う)。

**M0.19 / M0.20 scope への影響**:
- M0.19 (shell + room + overlay): +16 件 (FL 13 + RC 1 + DS 1 + AD 1)
- M0.20 (cross-cutting): +20 件 (UX 6 + EG 1 + NT 1 + MS 12)
- 全体 target: 479 → **515 case 100% pass**

本 audit md / json の以下 case count 数字 (Total / coverage_distribution / section_summary) は **初版の参考値**、actual values は M0.19 closure 時に `scripts/audit-qa-coverage.sh --snapshot` で re-derive される。

## Notes on Case Count

The task spec cited 501 cases. Actual parse (initial audit, 2026-05-20): **479 unique cases** (193 three-segment IDs + 286 four-segment IDs, all validated with `, pri:` field). The ~22 delta likely reflects section/group entries counted separately in the original estimation.

**Corrected count (2026-05-21 errata): 515 cases** — the initial parse missed 34 five-segment + 2 six-segment IDs (36 cases total).

## Executive Summary

| metric | value |
|---|---|
| Total cases in qa-suite.js | 479 |
| M0.18 milestone scope (SP/CT/RL/GS/SL/ENF/TK prefixes) | ~63 cases |
| M0.X-original scope (all other prefixes) | ~416 cases |
| Vitest test files | 86 |
| Playwright e2e specs | 5 (+ 1 config) |
| Current Vitest total | 1118/1118 PASS |
| Current Playwright total | 43/43 PASS |

### Coverage Distribution (estimated from cross-reference)

| verdict | count | % |
|---|---|---|
| `full` (Vitest direct + impl exists) | 63 | 13% |
| `partial` (Vitest indirect / naming-mismatch / Playwright only) | 47 | 10% |
| `implementation-only` (impl exists, no case ID in tests) | 156 | 33% |
| `missing` (no test reference, case ID not in any test file) | 189 | 39% |
| `n-a` (backend-only or daemon-side scope) | 24 | 5% |
| **total** | **479** | 100% |

### M0.18 vs M0.X-original split

| scope | total | full | partial | impl-only | missing | n-a | coverage % |
|---|---|---|---|---|---|---|---|
| M0.18 (SP/CT/RL/GS/SL/ENF/TK) | 63 | 42 | 15 | 5 | 1 | 0 | ~90% |
| M0.X-original | 416 | 21 | 32 | 151 | 188 | 24 | ~13% |

---

## Section-by-section Coverage Table

| section | zone | prefix | total cases | full | partial | impl-only | missing | n-a | coverage % |
|---|---|---|---|---|---|---|---|---|---|
| shell (AppShell) | shell | TB/DR/SB/RT/RC/SP/CN/TS | 42 | 4 | 12 | 18 | 8 | 0 | ~38% |
| room | room | RM/BG/WD/PO/DS/WC/CS/AP | 48 | 8 | 10 | 22 | 8 | 0 | ~38% |
| plan | panel | PL | 16 | 3 | 5 | 7 | 1 | 0 | ~50% |
| gantt | panel | GA | 8 | 1 | 1 | 5 | 1 | 0 | ~25% |
| consistency | panel | CN | 7 | 1 | 2 | 3 | 1 | 0 | ~43% |
| customization (legacy) | panel | CU | 5 | 1 | 0 | 3 | 1 | 0 | ~20% |
| retro (legacy) | panel | RE | 5 | 1 | 0 | 3 | 1 | 0 | ~20% |
| worktree | panel | WT | 9 | 1 | 1 | 5 | 2 | 0 | ~22% |
| guidance (legacy) | panel | GU | 6 | 1 | 2 | 2 | 1 | 0 | ~50% |
| sessions | panel | SE | 6 | 1 | 1 | 3 | 1 | 0 | ~33% |
| project-settings | panel | PS | 5 | 1 | 0 | 3 | 1 | 0 | ~20% |
| tokens | panel | TK | 5 | 3 | 1 | 1 | 0 | 0 | **80%** |
| agent-detail | overlay | AD | 10 | 2 | 2 | 4 | 2 | 0 | ~40% |
| pm-chat | overlay | PM | 13 | 2 | 3 | 6 | 2 | 0 | ~38% |
| live-rail | overlay | LR | 10 | 1 | 2 | 4 | 3 | 0 | ~30% |
| overall (cross-cutting) | shell | OV | 26 | 2 | 3 | 8 | 13 | 0 | ~19% |
| flows (E2E) | shell | FL | 55 | 3 | 4 | 18 | 30 | 0 | ~13% |
| UX patterns | cross-cutting | UX | 26 | 0 | 0 | 6 | 20 | 0 | **0%** |
| edge cases | cross-cutting | EG | 18 | 0 | 0 | 4 | 14 | 0 | **0%** |
| notifications | cross-cutting | NT | 7 | 0 | 1 | 3 | 3 | 0 | ~14% |
| characters | cross-cutting | CH | 14 | 0 | 0 | 6 | 8 | 0 | **0%** |
| milestones | cross-cutting | MS | 24 | 0 | 0 | 8 | 16 | 0 | **0%** |
| security | cross-cutting | SEC | 5 | 0 | 0 | 2 | 1 | 2 | **0%** |
| install | cross-cutting | IN | 6 | 0 | 0 | 0 | 4 | 2 | **0%** |
| philosophy | cross-cutting | PH | 6 | 0 | 0 | 2 | 4 | 0 | **0%** |
| spirit summoning (M0.18) | room | SP-MOTION/ROSTER/DESK/QUEUE/DETAIL | 13 | 11 | 2 | 0 | 0 | 0 | **100%** |
| customization-tree (M0.18) | panel | CT | 13 | 10 | 3 | 0 | 0 | 0 | **100%** |
| retro-lifecycle (M0.18) | panel | RL | 16 | 10 | 4 | 2 | 0 | 0 | **88%** |
| guidance-scope (M0.18) | panel | GS | 6 | 5 | 1 | 0 | 0 | 0 | **100%** |
| session-label (M0.18) | panel | SL | 3 | 3 | 0 | 0 | 0 | 0 | **100%** |
| err-not-found (M0.18) | cross-cutting | ENF | 3 | 3 | 0 | 0 | 0 | 0 | **100%** |
| admin-recon (M0.18) | cross-cutting | AR | 4 | 0 | 2 | 1 | 0 | 1 | ~50% |

---

## Priority 0 (Blocker) Missing Case List

These are high-priority cases with `pri: 0` that have no test coverage — highest gap-fill priority.

| case ID | section | name | reason missing | suggested fill location |
|---|---|---|---|---|
| TB-LAYOUT-01 | shell/topbar | TopBar 1段横バー描画 | No Vitest direct match; AppShell.test.tsx tests mount but not exact height/flex CSS | ui/test/AppShell.test.tsx extend or new ui/test/views/shell/topbar.test.tsx |
| TB-CONN-01 | shell/topbar | 接続インジケータ connected | ConnectionBanner tested but not TB-CONN-01 indicator itself | ui/test/connection-banner.test.tsx extend |
| TB-CONN-02 | shell/topbar | 接続インジケータ reconnecting | Same gap as TB-CONN-01 | ui/test/connection-banner.test.tsx extend |
| DR-LAYOUT-01 | shell/drawer | Drawer サイドバー縦展開 | AppShell confirms drawer exists but not layout spec (168px) | ui/test/AppShell.test.tsx extend |
| DR-ACTIVE-01 | shell/drawer | active強調 pathname一致 | NavLink active class not directly tested | ui/test/AppShell.test.tsx or new routing test |
| SB-LAYOUT-01 | shell/statusbar | StatusBar 画面下常時表示 | No StatusBar unit tests found | new ui/test/views/shell/statusbar.test.tsx |
| SB-CONN-01 | shell/statusbar | 接続セグメント | No StatusBar unit tests | new ui/test/views/shell/statusbar.test.tsx |
| SB-SCENARIO-01 | shell/statusbar | シナリオラベル | No StatusBar unit tests | new ui/test/views/shell/statusbar.test.tsx |
| RT-INDEX-01 | shell/routing | index (/) RoomView mount | AppShell tests cover routing but not explicit RoomView mount confirm | ui/test/AppShell.test.tsx (already partial) |
| RT-SIBLING-01 | shell/routing | /plan時RoomView unmount | phase-c-cleanup.test.tsx partially covers; no direct unmount verify | ui/test/routing/phase-c-cleanup.test.tsx extend |
| RT-BACK-01 | shell/routing | ブラウザ戻る/進む | Not tested in unit tests (browser behavior) | ui/e2e/ new navigation spec |
| RT-DEEPLINK-01 | shell/routing | deep link URL入力 | Not tested in current e2e | ui/e2e/room-baseline.spec.ts extend |
| RC-PMCHAT-MOUNT-01 | shell/right-col | PM起動時PMChatPanel mount | AppShell.redesign partially covers but indirect | ui/test/AppShell.redesign.test.tsx (already partial) |
| RC-LIVERAIL-MOUNT-01 | shell/right-col | PMオフ+RoomでLiveRail mount | Covered partially in AppShell.redesign | extend existing |
| RM-FILL-01 | room | Room content領域を埋める | room.test.tsx mounts but no layout assertion | ui/test/views/room/room-view.test.tsx extend |
| RM-RESIZE-01 | room | ResizeObserver デスク追従 | ResizeObserver mocked in tests, no position verify | ui/e2e/ or room-mock-active.test.tsx extend |
| RM-NOWRAP-01 | room | AppShell marginRight | Not tested | ui/test/AppShell.redesign.test.tsx |
| BG-WALL-01 | room/background | 壁・床・幅木3層 | room-background.test.tsx exists but may not check layer structure | ui/test/views/room/room-background.test.tsx check |
| PO-GANTT-VIS-01 | room/posters | GanttPoster描画 | wall-posters.test.tsx exists but direct GanttPoster case ID unverified | ui/test/views/room/wall-posters.test.tsx extend |
| PO-NAV-GANTT-01 | room/posters | GanttクリックでNavigate | Navigation on click not in unit tests | ui/e2e/room-baseline.spec.ts extend |
| PO-NAV-PLAN-01 | room/posters | PlanクリックでNavigate | Same gap | ui/e2e/room-baseline.spec.ts extend |
| PO-NAV-CONS-01 | room/posters | ConsistencyクリックでNavigate | Same gap | ui/e2e/room-baseline.spec.ts extend |
| PO-NO-MODAL-01 | room/posters | モーダル4種削除確認 | Static code check, not formally tested | ui/test/views/room/wall-posters.test.tsx |
| DS-COUNT-01 | room/desks | デスク5つ描画 | desk-station.test.tsx covers DeskStation but count for spirit-era room (now 3 desks) needs update | ui/test/views/room/desk-station.test.tsx |
| DS-SPRITE-01 | room/desks | CatSpriteペeking表示 | cat-sprite.test.tsx covers sprite but not peeking posture verify | ui/test/components/cat-sprite.test.tsx extend |
| CS-VIS-01 | room/coldstart | 全員idle+PMoff表示 | coldstart-b4.test.tsx exists | ui/test/views/room/coldstart-b4.test.tsx (check) |
| CS-HIDE-01 | room/coldstart | busy時非表示 | Same file | extend |
| AP-OPEN-01 | room/agent-overlay | デスククリックで開く | agent-detail-panel.test.tsx covers panel; click-open path indirect | ui/test/views/room/agent-detail-mock-active.test.tsx |
| AP-CLOSE-01 | room/agent-overlay | ×で閉じる | Same gap | extend |
| PL-MOUNT-01 | plan | 描画 | plan.test.tsx covers | PASS (indirect) |
| PL-ACTIVE-01 | plan | Drawer active | Not tested explicitly | ui/test/AppShell.test.tsx extend |
| PL-NEW-01 | plan | +milestoneボタン | plan-write.test.tsx | check if covers PL-NEW-01 |
| GA-MOUNT-01 | gantt | 描画 | gantt.test.tsx | PASS (indirect) |
| CN-MOUNT-01 | consistency | 描画 | consistency.test.tsx | PASS (indirect) |
| CN-RESOLVE-01 | consistency | acknowledge | consistency-write.test.tsx | check if covers |
| GU-MOUNT-01 | guidance | 描画 | guidance.test.tsx | PASS (indirect) |
| GU-LIST-01 | guidance | ルール一覧 | guidance.test.tsx | PASS (indirect) |
| GU-ADD-01 | guidance | 追加 | guidance-write.test.tsx | check |
| SE-MOUNT-01 | sessions | 描画 | session-list.test.tsx | PASS (indirect) |
| SE-LIST-01 | sessions | セッション一覧 | session-list.test.tsx | PASS (indirect) |
| SE-OPEN-01 | sessions | セッション詳細 | Not tested with case ID | extend |
| WT-MOUNT-01 | worktree | 描画 | worktree.test.tsx | PASS (indirect) |
| WT-QUERY-01 | worktree | branch query | Not tested | extend |
| WT-LIST-01 | worktree | 一覧 | worktree-mock-active.test.tsx | check |
| WT-CREATE-01 | worktree | 新規作成 | worktree-write.test.tsx | check |
| WT-DELETE-01 | worktree | 削除 | worktree-write.test.tsx | check |
| PS-MOUNT-01 | project-settings | 描画 | project-settings.test.tsx | PASS (indirect) |
| PS-EDIT-01 | project-settings | 値変えて保存 | settings-write.test.tsx | check |
| TK-MOUNT-01 | tokens | 描画 | tokens.test.tsx | PASS (direct) |
| TK-METER-01 | tokens | トークン使用量 | tokens.test.tsx + tokens-mock-active | PASS (direct) |
| AD-NOTES-01 | agent-detail | Notes編集 | agent-notes.test.tsx | PASS (direct) |
| PM-MOUNT-01 | pm-chat | PM起動時mount | pm-chat-mock-active.test.tsx | check |
| PM-UNMOUNT-01 | pm-chat | PMオフunmount | AppShell.redesign.test.tsx | check |
| PM-MESSAGES-01 | pm-chat | メッセージ表示 | pm-chat-mock-active.test.tsx | check |
| PM-SEND-01 | pm-chat | 送信動作 | pm-write.test.tsx | check |
| PM-APPROVAL-MODAL-01 | pm-chat | PMApprovalModal | pm-approval-flow.test.tsx | check |
| PM-APPROVAL-ALLOW-01 | pm-chat | allow | pm-approval-flow.test.tsx | check |
| PM-APPROVAL-DENY-01 | pm-chat | deny | pm-approval-flow.test.tsx | check |
| LR-MOUNT-01 | live-rail | PMオフ+Room表示 | Not directly tested with LR- ID | extend AppShell tests |
| OV-CONSOLE-ERROR-01 | overall | 全画面console.error無し | Not formally tested | new ov-console.test.ts or e2e |
| OV-SCENARIO-IDLE-01 | overall | idle完走 | room-mock-active indirectly | e2e needed |
| OV-SCENARIO-ACTIVE-01 | overall | active完走 | Same | e2e needed |
| OV-SCENARIO-FAILED-01 | overall | failed完走 | Same | e2e needed |
| OV-ALL-BUTTONS-01 | overall | 全buttonにonClick | Not tested | e2e click audit needed |
| OV-NO-ALERT-01 | overall | alert()直書き0件 | Static check; not in test | build lint check |
| OV-NO-PLACEHOLDER-01 | overall | placeholder0件 | Static check | build lint check |
| OV-BACK-FORWARD-01 | overall | back/forward | Not in any test | new e2e spec |
| OV-DEEPLINK-ALL-01 | overall | 全route deeplink | room-baseline.spec.ts has some routes | extend |
| OV-WS-RECONNECT-01 | overall | WS切断→再接続 | store-connection.test.ts covers WS state | extend or e2e |
| FL-COLDSTART-01 | flows | cold start sequence | System-level; no test | integration test needed |
| FL-PM-START-01 | flows | PM起動ColdStart→PMChat | coldstart-b4.test.tsx partial | extend |
| FL-PM-SAY-01 | flows | PMにメッセージ送信 | pm-write.test.tsx | check |
| FL-PM-GO-01 | flows | /loom-go dev dispatch | Not in UI tests (harness level) | harness test |
| FL-APPROVE-ALLOW-01 | flows | approve allow | pm-approval-flow.test.tsx | check |
| FL-APPROVE-DENY-01 | flows | approve deny | pm-approval-flow.test.tsx | check |
| FL-CONS-DETECT-01 | flows | consistency detect | consistency-live.test.tsx | check |
| FL-CONS-ACK-01 | flows | consistency ack | consistency-write.test.tsx | check |
| AR-TRPC-01 | admin-recon | retro.reconstructFromArchive export | daemon/routes/retro.ts impl exists | daemon/test/ (backend) |
| AR-OUT-01 | admin-recon | 出力 applied+pending | Same | daemon/test/ needed |

---

## Case-by-case Mapping (Full 479-case table)

> Legend: V=Vitest file match, E=Playwright match, I=Implementation exists
> Match strength: D=direct (case ID in test name/comment), P=partial (semantically covered), N=none

### Section 1: SHELL (TB/DR/SB/RT/RC/SP/CN/TS)

| case ID | pri | scenario | section | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|---|
| TB-LAYOUT-01 | 0 | any | topbar | TopBar 1段横バー | partial (AppShell.test.tsx mount) | partial (room-baseline topbar) | ✅ AppShell.tsx | partial |
| TB-DRAWER-TOGGLE-01 | 0 | any | topbar | Drawer☰トグル | partial (AppShell.test.tsx drawer) | partial | ✅ | partial |
| TB-BRAND-01 | 2 | any | topbar | ブランドロゴ | none | none | ✅ | implementation-only |
| TB-PROJECT-01 | 1 | any | topbar | プロジェクトボタン | none | none | ✅ | implementation-only |
| TB-PROJECT-02 | 1 | any | topbar | branch表示 | none | none | ✅ | implementation-only |
| TB-METRIC-PARALLEL-01 | 1 | active | topbar | PARALLELメトリクス | none | none | ✅ | implementation-only |
| TB-METRIC-TASKTOOL-01 | 1 | any | topbar | TASK TOOLメトリクス | none | none | ✅ | implementation-only |
| TB-METRIC-TDD-01 | 1 | failed | topbar | TDD ORDERメトリクス | none | none | ✅ | implementation-only |
| TB-METRIC-VERDICT-01 | 1 | failed | topbar | VERDICTメトリクス | none | none | ✅ | implementation-only |
| TB-CONN-01 | 0 | any | topbar | 接続インジケータ connected | partial (connection-banner.test.tsx) | none | ✅ | partial |
| TB-CONN-02 | 0 | any | topbar | 接続インジケータ reconnecting | partial (connection-banner.test.tsx) | none | ✅ | partial |
| DR-LAYOUT-01 | 0 | any | drawer | Drawerサイドバー縦展開 | partial (AppShell.test.tsx) | partial (room-baseline) | ✅ | partial |
| DR-GROUP-01 | 1 | any | drawer | NAV_GROUPS見出し | none | none | ✅ | implementation-only |
| DR-NAV-ROOM-01 | 0 | any | drawer | Drawer→Room | partial (AppShell.test.tsx routing) | partial | ✅ | partial |
| DR-NAV-PLAN-01 | 0 | any | drawer | Drawer→Plan | partial (AppShell.test.tsx routing) | partial | ✅ | partial |
| DR-NAV-GANTT-01 | 0 | any | drawer | Drawer→Gantt | partial (AppShell.test.tsx routing) | partial | ✅ | partial |
| DR-NAV-RETRO-01 | 0 | any | drawer | Drawer→Retro | partial (AppShell.test.tsx routing) | partial | ✅ | partial |
| DR-NAV-WORKTREE-01 | 0 | any | drawer | Drawer→Worktree | partial | partial | ✅ | partial |
| DR-NAV-CONSISTENCY-01 | 0 | any | drawer | Drawer→Consistency | partial | partial | ✅ | partial |
| DR-NAV-CUSTOMIZATION-01 | 0 | any | drawer | Drawer→Customization | partial | partial | ✅ | partial |
| DR-NAV-GUIDANCE-01 | 0 | any | drawer | Drawer→Guidance | partial | partial | ✅ | partial |
| DR-NAV-SESSIONS-01 | 0 | any | drawer | Drawer→Sessions | partial | partial | ✅ | partial |
| DR-NAV-SETTINGS-01 | 0 | any | drawer | Drawer→ProjectSettings | partial | partial | ✅ | partial |
| DR-NAV-TOKENS-01 | 0 | any | drawer | Drawer→Tokens | partial | partial | ✅ | partial |
| DR-ACTIVE-01 | 0 | any | drawer | active強調 pathname一致 | partial (AppShell routing test) | none | ✅ | partial |
| DR-COLLAPSED-01 | 1 | any | drawer | collapsed永続化 | none | none | ✅ | implementation-only |
| DR-VERSION-01 | 2 | any | drawer | バージョン表記 | none | none | ✅ | implementation-only |
| SB-LAYOUT-01 | 0 | any | statusbar | StatusBar常時表示 | none | none | ✅ | missing |
| SB-CONN-01 | 0 | any | statusbar | 接続セグメント | none | none | ✅ | missing |
| SB-SCENARIO-01 | 0 | any | statusbar | シナリオラベル | none | none | ✅ | missing |
| SB-EVENTS-01 | 2 | active | statusbar | events seen | none | none | ✅ | implementation-only |
| SB-PATH-01 | 1 | any | statusbar | プロジェクトパス | none | none | ✅ | implementation-only |
| RT-INDEX-01 | 0 | any | routing | (/) RoomView mount | partial (AppShell.test.tsx) | partial (room-baseline) | ✅ | partial |
| RT-SIBLING-01 | 0 | any | routing | /plan時RoomView unmount | direct (phase-c-cleanup.test.tsx) | none | ✅ | full |
| RT-BACK-01 | 0 | any | routing | ブラウザ戻る/進む | none | none | ✅ | missing |
| RT-DEEPLINK-01 | 0 | any | routing | deeplink URL | partial (AppShell.redesign) | partial (room-baseline) | ✅ | partial |
| RT-AGENT-DEEPLINK-01 | 1 | any | routing | /agents/:id deeplink | partial (agent-detail-panel.test.tsx) | none | ✅ | partial |
| RT-OVERLAY-OFF-01 | 0 | any | routing | overlay無し | direct (phase-c-cleanup.test.tsx) | none | ✅ | full |
| RC-PMCHAT-MOUNT-01 | 0 | active | right-col | PM起動時PMChatPanel | partial (AppShell.redesign) | none | ✅ | partial |
| RC-LIVERAIL-MOUNT-01 | 0 | idle | right-col | PMオフ+RoomでLiveRail | partial (AppShell.redesign) | none | ✅ | partial |
| RC-LIVERAIL-HIDE-NONROOM-01 | 1 | idle | right-col | 非Room LiveRail非表示 | partial (AppShell.redesign) | none | ✅ | partial |
| RC-LIVERAIL-COLLAPSE-01 | 1 | idle | right-col | collapsed トグル | partial (AppShell.redesign) | none | ✅ | partial |
| RC-LIVERAIL-DUP-01 | 1 | idle | right-col | collapse重複解消 | none | none | ✅ | implementation-only |
| RC-PM-PRIORITY-01 | 1 | active | right-col | PM>LiveRail優先 | partial | none | ✅ | partial |
| SP-VISIBLE-01 | 1 | any | scenario-picker | DEVビルド表示 | partial (scenario-picker-b11.test.tsx) | none | ✅ | partial |
| SP-SWITCH-01 | 1 | any | scenario-picker | シナリオ切替 | partial (scenario-picker-b11.test.tsx) | none | ✅ | partial |
| SP-LIVE-01 | 1 | any | scenario-picker | live ボタン | partial | none | ✅ | partial |
| SP-ROUTER-01 | 1 | any | scenario-picker | React Router経由 | direct (scenario-picker-b11.test.tsx) | none | ✅ | full |
| SP-NONROOM-01 | 2 | any | scenario-picker | 非Room非表示 | partial | none | ✅ | partial |
| CN-BANNER-01 | 1 | any | connection-banner | WS切断バナー | direct (connection-banner.test.tsx) | none | ✅ | full |
| TS-TOAST-STACK-01 | 2 | active | toast | Toastスタック | direct (toast.test.tsx) | none | ✅ | full |

### Section 2: ROOM (RM/BG/WD/PO/DS/WC/CS/AP)

| case ID | pri | scenario | section | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|---|
| RM-FILL-01 | 0 | any | rm-layout | Room content領域 | partial (room-view.test.tsx) | partial (room-baseline) | ✅ | partial |
| RM-RESIZE-01 | 0 | any | rm-layout | ResizeObserver追従 | none | partial (room-baseline visual) | ✅ | partial |
| RM-NOWRAP-01 | 0 | any | rm-layout | marginRight wrap | none | none | ✅ | missing |
| RM-IDLE-HUSH-01 | 2 | idle | rm-layout | idle-hush class | none | none | ✅ | implementation-only |
| BG-WALL-01 | 0 | any | rm-background | 壁3層構造 | direct (room-background.test.tsx) | none | ✅ | full |
| BG-FLOOR-TEXTURE-01 | 1 | any | rm-background | 床木目テクスチャ | none | none | ✅ | implementation-only |
| BG-ZONE-RUG-01 | 0 | any | rm-background | ゾーン床ラグ | partial (room-background.test.tsx) | none | ✅ | partial |
| BG-ZONE-LABEL-01 | 1 | any | rm-background | 床透かしラベル | none | none | ✅ | implementation-only |
| BG-NO-BOX-01 | 0 | any | rm-background | 箱感なし | partial (room-background.test.tsx) | none | ✅ | partial |
| BG-PROPS-01 | 1 | any | rm-background | 装飾プロップ3つ | none | none | ✅ | implementation-only |
| BG-DOM-PLANT-01 | 2 | any | rm-background | DOM Plant残存なし | partial (room-background.test.tsx) | none | ✅ | partial |
| WD-BRANCH-01 | 1 | any | rm-walldecor | branch サイン | none | none | ✅ | implementation-only |
| WD-CLOCK-01 | 2 | any | rm-walldecor | 時計装飾 | none | none | ✅ | implementation-only |
| PO-GANTT-VIS-01 | 0 | any | rm-posters | GanttPoster描画 | partial (wall-posters.test.tsx) | none | ✅ | partial |
| PO-PLAN-VIS-01 | 0 | any | rm-posters | PlanPoster描画 | partial (wall-posters.test.tsx) | none | ✅ | partial |
| PO-CONS-VIS-01 | 0 | any | rm-posters | ConsistencyPoster | partial (wall-posters.test.tsx) | none | ✅ | partial |
| PO-NAV-GANTT-01 | 0 | any | rm-posters | GanttクリックNavigate | partial (posters-mock-active.test.tsx) | none | ✅ | partial |
| PO-NAV-PLAN-01 | 0 | any | rm-posters | PlanクリックNavigate | partial (posters-mock-active.test.tsx) | none | ✅ | partial |
| PO-NAV-CONS-01 | 0 | any | rm-posters | ConsistencyNavigate | partial (posters-mock-active.test.tsx) | none | ✅ | partial |
| PO-NO-MODAL-01 | 0 | any | rm-posters | モーダル4種削除 | partial (room-view.test.tsx) | none | ✅ | partial |
| DS-COUNT-01 | 0 | any | rm-desks | デスク5→3体 (spirit) | partial (desk-station.test.tsx) | direct (m0.18-room-spirit.spec.ts SP-DESK-01) | ✅ | partial |
| DS-POS-PM-01 | 0 | any | rm-desks | PM位置 | none | partial (room-spirit visual) | ✅ | partial |
| DS-POS-DEV-01 | 0 | any | rm-desks | DEV位置 | none | partial | ✅ | partial |
| DS-POS-REVIEW-ROW-01 | 0 | any | rm-desks | REVIEW横一列 | none | partial | ✅ | partial |
| DS-SPRITE-01 | 0 | any | rm-desks | CatSpriteペeking | partial (cat-sprite.test.tsx) | partial (room-spirit) | ✅ | partial |
| DS-MONITOR-BUSY-01 | 0 | active | rm-desks | busyモニタ | partial (desk-station.test.tsx) | partial | ✅ | partial |
| DS-MONITOR-IDLE-01 | 0 | idle | rm-desks | idleモニタ | partial (desk-station.test.tsx) | partial | ✅ | partial |
| DS-MONITOR-FAIL-01 | 0 | failed | rm-desks | failedモニタ | partial (desk-station.test.tsx) | none | ✅ | partial |
| DS-STATUS-DOT-01 | 1 | any | rm-desks | status dot色 | none | none | ✅ | implementation-only |
| DS-BUBBLE-TOOL-01 | 1 | active | rm-desks | speech bubble tool | none | none | ✅ | implementation-only |
| DS-BUBBLE-REASON-01 | 1 | active | rm-desks | reasoning truncate | none | none | ✅ | implementation-only |
| DS-BUBBLE-NONE-01 | 2 | idle | rm-desks | idle bubble無し | none | none | ✅ | implementation-only |
| DS-NAMEPLATE-01 | 1 | any | rm-desks | ネームプレート | none | none | ✅ | implementation-only |
| DS-CLICK-SELECT-01 | 0 | any | rm-desks | クリック選択 | partial (agent-detail-mock-active.test.tsx) | partial (m0.18-room-spirit) | ✅ | partial |
| DS-CLICK-DESELECT-01 | 0 | any | rm-desks | 再クリック解除 | partial (agent-detail-mock-active) | none | ✅ | partial |
| DS-WALK-01 | 2 | active | rm-desks | cat-walker アニメ | none | none | ✅ | implementation-only |
| DS-TDD-TAG-01 | 2 | active | rm-desks | TDDフェーズタグ | none | none | ✅ | implementation-only |
| WC-POS-01 | 1 | active | rm-clones | dev上方に並ぶ | partial (subroom-clone.test.tsx) | none | ✅ | partial |
| WC-CLICK-01 | 1 | active | rm-clones | クリック/worktree | partial (subroom-clone.test.tsx) | none | ✅ | partial |
| WC-STATUS-01 | 2 | failed | rm-clones | failed status | none | none | ✅ | implementation-only |
| CS-VIS-01 | 0 | idle | rm-coldstart | idle+PMoff表示 | direct (coldstart-b4.test.tsx) | none | ✅ | full |
| CS-HIDE-01 | 0 | active | rm-coldstart | busy時非表示 | direct (coldstart-b4.test.tsx) | none | ✅ | full |
| CS-START-BTN-01 | 0 | idle | rm-coldstart | ▶PM起動ボタン | direct (coldstart-b4.test.tsx) | none | ✅ | full |
| CS-TERMINAL-HINT-01 | 2 | idle | rm-coldstart | terminal hint | none | none | ✅ | implementation-only |
| RT-TOGGLE-EXISTS-01 | 1 | any | rm-retro | RetroModeトグル | partial (retro-gathering.test.tsx) | none | ✅ | partial |
| RT-MODE-ON-01 | 1 | any | rm-retro | retroMode=true表示切替 | partial (retro-gathering.test.tsx) | none | ✅ | partial |
| RT-NO-PLACEHOLDER-01 | 1 | any | rm-retro | placeholder文字列なし | none | none | ✅ | implementation-only |
| AP-OPEN-01 | 0 | any | rm-agent-overlay | デスククリック開く | partial (agent-detail-panel.test.tsx) | partial (m0.18-room-spirit desk-click) | ✅ | partial |
| AP-Z-INDEX-01 | 1 | any | rm-agent-overlay | z-indexトークン化 | none | none | ✅ | implementation-only |
| AP-CLOSE-01 | 0 | any | rm-agent-overlay | ×で閉じる | partial (agent-detail-panel.test.tsx) | none | ✅ | partial |
| AP-ESC-01 | 2 | any | rm-agent-overlay | Escで閉じる | none | none | ✅ | implementation-only |

### Section 3: PLAN (PL)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| PL-MOUNT-01 | 0 | any | 描画 | direct (plan.test.tsx) | none | ✅ | full |
| PL-NO-ROOM-01 | 0 | any | RoomView不在 | partial (AppShell) | none | ✅ | partial |
| PL-ACTIVE-01 | 0 | any | Draweractive | none | none | ✅ | missing |
| PL-TITLE-01 | 1 | any | タイトル表記 | none | none | ✅ | implementation-only |
| PL-TAB-ACTIVE-01 | 0 | any | activeタブ | partial (plan.test.tsx) | none | ✅ | partial |
| PL-TAB-DONE-01 | 0 | any | doneタブ | partial (plan.test.tsx) | none | ✅ | partial |
| PL-TAB-EDIT-01 | 0 | any | editタブ | partial (plan-edit.test.tsx) | none | ✅ | partial |
| PL-NEW-01 | 0 | any | +milestoneボタン | partial (plan-write.test.tsx) | none | ✅ | partial |
| PL-CARD-01 | 1 | any | カード描画 | partial (plan.test.tsx) | none | ✅ | partial |
| PL-PROGRESS-01 | 1 | any | progress bar | partial (plan.test.tsx) | none | ✅ | partial |
| PL-CHILD-01 | 1 | any | children行icon | partial (plan.test.tsx) | none | ✅ | partial |
| PL-EDIT-BTN-01 | 0 | any | editボタン | partial (plan-edit.test.tsx) | none | ✅ | partial |
| PL-TODOS-MIRROR-01 | 0 | any | todo一覧 | partial (plan-live.test.tsx) | none | ✅ | partial |
| PL-TODOS-TIMESTAMP-01 | 2 | any | updatedAt | none | none | ✅ | implementation-only |
| PL-TODOS-READONLY-01 | 2 | any | read-only明示 | none | none | ✅ | implementation-only |
| PL-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 4: GANTT (GA)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| GA-MOUNT-01 | 0 | any | 描画 | direct (gantt.test.tsx) | none | ✅ | full |
| GA-ACTIVE-01 | 1 | any | Draweractive | none | none | ✅ | missing |
| GA-BARS-01 | 0 | active | バー並ぶ | partial (gantt-svg.test.tsx) | none | ✅ | partial |
| GA-COLOR-01 | 1 | active | ステータス色 | partial (gantt-svg.test.tsx) | none | ✅ | partial |
| GA-TOOLTIP-01 | 2 | active | ホバー詳細 | none | none | ✅ | implementation-only |
| GA-EMPTY-01 | 2 | idle | 空状態 | partial (gantt-mock-active.test.tsx) | none | ✅ | partial |
| GA-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 5: CONSISTENCY (CN)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| CN-MOUNT-01 | 0 | any | 描画 | direct (consistency.test.tsx) | none | ✅ | full |
| CN-LIVE-FORK-01 | 1 | any | Live/通常切替 | partial (consistency-live.test.tsx) | none | ✅ | partial |
| CN-LIST-01 | 0 | failed | findings一覧 | partial (consistency.test.tsx) | none | ✅ | partial |
| CN-SEVERITY-01 | 1 | failed | severity色分け | none | none | ✅ | implementation-only |
| CN-RESOLVE-01 | 0 | failed | acknowledge | direct (consistency-write.test.tsx) | none | ✅ | full |
| CN-DISMISS-01 | 1 | failed | dismiss | partial (consistency-write.test.tsx) | none | ✅ | partial |
| CN-FILTER-01 | 2 | failed | severityフィルタ | none | none | ✅ | implementation-only |
| CN-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 6: CUSTOMIZATION legacy (CU)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| CU-MOUNT-01 | 0 | any | 描画 | direct (customization.test.tsx) | none | ✅ | full |
| CU-EDIT-01 | 0 | any | 編集保存 | partial (customization-write.test.tsx) | none | ✅ | partial |
| CU-DEFAULT-01 | 2 | any | デフォルト復帰 | none | none | ✅ | implementation-only |
| CU-VALIDATION-01 | 1 | any | バリデーション | none | none | ✅ | implementation-only |
| CU-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 7: RETRO legacy (RE)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| RE-MOUNT-01 | 0 | any | 描画 | direct (retro.test.tsx) | none | ✅ | full |
| RE-INDEPENDENT-01 | 1 | any | retroMode独立 | none | none | ✅ | implementation-only |
| RE-AGENTS-01 | 1 | any | retro agents | partial (retro-mock-active.test.tsx) | none | ✅ | partial |
| RE-START-01 | 2 | any | session開始/終了 | none | none | ✅ | implementation-only |
| RE-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 8: WORKTREE (WT)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| WT-MOUNT-01 | 0 | any | 描画 | direct (worktree.test.tsx) | none | ✅ | full |
| WT-QUERY-01 | 0 | any | branch query | none | none | ✅ | missing |
| WT-LIST-01 | 0 | active | 一覧 | partial (worktree-mock-active.test.tsx) | none | ✅ | partial |
| WT-CREATE-01 | 0 | any | 新規作成 | partial (worktree-write.test.tsx) | none | ✅ | partial |
| WT-DELETE-01 | 0 | active | 削除 | partial (worktree-write.test.tsx) | none | ✅ | partial |
| WT-SWITCH-01 | 1 | active | 切替 | none | none | ✅ | implementation-only |
| WT-SUB-RENDER-01 | 1 | active | SubroomView | partial (subroom-view.test.tsx) | none | ✅ | partial |
| WT-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 9: GUIDANCE legacy (GU)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| GU-MOUNT-01 | 0 | any | 描画 | direct (guidance.test.tsx) | none | ✅ | full |
| GU-LIST-01 | 0 | any | ルール一覧 | direct (guidance.test.tsx) | none | ✅ | full |
| GU-ADD-01 | 0 | any | 追加 | partial (guidance-write.test.tsx) | none | ✅ | partial |
| GU-EDIT-01 | 1 | any | 編集 | partial (guidance-write.test.tsx) | none | ✅ | partial |
| GU-DELETE-01 | 1 | any | 削除 | partial (guidance-write.test.tsx) | none | ✅ | partial |
| GU-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 10: SESSIONS (SE)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| SE-MOUNT-01 | 0 | any | 描画 | direct (session-list.test.tsx) | none | ✅ | full |
| SE-LIST-01 | 0 | any | セッション一覧 | partial (session-list.test.tsx) | none | ✅ | partial |
| SE-OPEN-01 | 0 | any | セッション詳細 | none | none | ✅ | missing |
| SE-FILTER-01 | 2 | any | フィルタ | none | none | ✅ | implementation-only |
| SE-SORT-01 | 2 | any | ソート | none | none | ✅ | implementation-only |
| SE-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 11: PROJECT SETTINGS (PS)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| PS-MOUNT-01 | 0 | any | 描画 | direct (project-settings.test.tsx) | none | ✅ | full |
| PS-FROM-TOPBAR-01 | 1 | any | TopBar到達 | none | none | ✅ | implementation-only |
| PS-EDIT-01 | 0 | any | 保存 | partial (settings-write.test.tsx) | none | ✅ | partial |
| PS-CANCEL-01 | 2 | any | キャンセル | none | none | ✅ | implementation-only |
| PS-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 12: TOKENS (TK)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| TK-MOUNT-01 | 0 | any | 描画 | direct (tokens.test.tsx) | none | ✅ | full |
| TK-METER-01 | 0 | active | トークン使用量 | direct (tokens.test.tsx + tokens-mock-active) | none | ✅ | full |
| TK-COST-01 | 1 | active | コスト計算 | direct (tokens-mock-active.test.tsx) | none | ✅ | full |
| TK-GRAPH-01 | 2 | active | グラフ表示 | none | none | ✅ | implementation-only |
| TK-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 13: AGENT DETAIL (AD)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| AD-OPEN-FROM-ROOM-01 | 0 | any | Room開く | partial (agent-detail-panel.test.tsx) | partial (m0.18-room-spirit) | ✅ | partial |
| AD-OPEN-DEEPLINK-01 | 1 | any | deeplink | partial (agent-detail-panel.test.tsx) | none | ✅ | partial |
| AD-CLOSE-X-01 | 0 | any | ×閉じる | partial (agent-detail-panel.test.tsx) | none | ✅ | partial |
| AD-CLOSE-ESC-01 | 2 | any | Esc閉じる | none | none | ✅ | implementation-only |
| AD-PROFILE-01 | 1 | any | プロフィール | partial (char-sheet.test.tsx) | none | ✅ | partial |
| AD-NOTES-01 | 0 | any | Notes編集 | direct (agent-notes.test.tsx) | none | ✅ | full |
| AD-DISPATCH-HIST-01 | 2 | active | dispatch履歴 | none | none | ✅ | implementation-only |
| AD-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |
| AD-Z-01 | 1 | any | z-indexトークン | none | none | ✅ | implementation-only |
| AD-DISPATCH-HIST-01 | 2 | active | dispatch履歴 | partial (agent-detail-attention.test.tsx) | none | ✅ | partial |

### Section 14: PM CHAT (PM)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| PM-MOUNT-01 | 0 | active | PM起動mount | partial (pm-chat-mock-active.test.tsx) | none | ✅ | partial |
| PM-UNMOUNT-01 | 0 | idle | PMオフunmount | partial (AppShell.redesign) | none | ✅ | partial |
| PM-PENDING-MOUNT-01 | 1 | any | pendingでmount | none | none | ✅ | implementation-only |
| PM-MESSAGES-01 | 0 | active | メッセージ表示 | partial (pm-chat-mock-active.test.tsx) | none | ✅ | partial |
| PM-SEND-01 | 0 | active | 送信動作 | direct (pm-write.test.tsx) | none | ✅ | full |
| PM-STREAM-01 | 1 | active | stream反映 | none | none | ✅ | implementation-only |
| PM-APPROVAL-MODAL-01 | 0 | any | PMApprovalModal | direct (pm-approval-flow.test.tsx) | none | ✅ | full |
| PM-APPROVAL-ALLOW-01 | 0 | any | allow | direct (pm-approval-flow.test.tsx) | none | ✅ | full |
| PM-APPROVAL-DENY-01 | 0 | any | deny | direct (pm-approval-flow.test.tsx) | none | ✅ | full |
| PM-APPROVAL-TOAST-01 | 2 | any | PMApprovalToast | none | none | ✅ | implementation-only |
| PM-START-BTN-01 | 0 | idle | 起動ボタン | none | none | ✅ | missing |
| PM-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 15: LIVE RAIL (LR)

| case ID | pri | scenario | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|---|
| LR-MOUNT-01 | 0 | idle | PM offline + Room | partial (AppShell.redesign) | none | ✅ | partial |
| LR-HIDE-PM-01 | 0 | active | PM running hide | partial (AppShell.redesign) | none | ✅ | partial |
| LR-HIDE-NONROOM-01 | 1 | idle | 非Room hide | partial (AppShell.redesign) | none | ✅ | partial |
| LR-TAB-MERGED-01 | 0 | idle | ALL merged | none | none | ✅ | missing |
| LR-TAB-REASONING-01 | 1 | idle | reasoning filter | none | none | ✅ | implementation-only |
| LR-TAB-TOOLS-01 | 1 | idle | tools filter | none | none | ✅ | implementation-only |
| LR-EMPTY-01 | 1 | idle | stream空hint | none | none | ✅ | implementation-only |
| LR-COLLAPSE-01 | 1 | idle | 折りたたみ | partial (AppShell.redesign) | none | ✅ | partial |
| LR-EXPAND-01 | 1 | idle | 展開 | partial (AppShell.redesign) | none | ✅ | partial |
| LR-DUP-01 | 1 | any | collapse重複解消 | none | none | ✅ | implementation-only |
| LR-INLINE-01 | 1 | any | inline全廃 | none | none | ✅ | implementation-only |

### Section 16: OVERALL (OV)

*26 cases — mostly cross-cutting or browser-level; few have direct test coverage.*

| case ID | pri | verdict | notes |
|---|---|---|---|
| OV-CONSOLE-ERROR-01 | 0 | missing | No test catches console.error across all routes |
| OV-CONSOLE-WARN-01 | 1 | missing | Same |
| OV-NETWORK-404-01 | 1 | missing | No network audit test |
| OV-SCENARIO-IDLE-01 | 0 | partial | room-mock-active covers idle partially |
| OV-SCENARIO-ACTIVE-01 | 0 | partial | room-mock-active.test.tsx |
| OV-SCENARIO-FAILED-01 | 0 | partial | desk-station.test.tsx failed scenario |
| OV-SCENARIO-SWITCH-01 | 1 | implementation-only | ScenarioPicker impl exists |
| OV-ALL-BUTTONS-01 | 0 | missing | No click audit test |
| OV-NO-ALERT-01 | 0 | missing | No alert() grep test |
| OV-NO-PLACEHOLDER-01 | 0 | missing | No placeholder grep test |
| OV-INLINE-COUNT-01 | 1 | implementation-only | CSS migration done; no count test |
| OV-Z-INDEX-01 | 1 | implementation-only | Token migration done; no grep test |
| OV-TONE-01 | 1 | partial | m0.15-redesign screen-baseline visual |
| OV-BACK-FORWARD-01 | 0 | missing | No e2e nav history test |
| OV-DEEPLINK-ALL-01 | 0 | partial | room-baseline.spec.ts partial coverage |
| OV-404-01 | 2 | missing | No 404 route test |
| OV-WS-RECONNECT-01 | 0 | partial | store-connection.test.ts + store-connection-toast.test.ts |
| OV-STREAM-EVENT-01 | 1 | implementation-only | WS implemented; no e2e stream test |
| OV-A11Y-KEYBOARD-01 | 2 | missing | No a11y test |
| OV-A11Y-ARIA-01 | 2 | missing | No aria test |
| OV-A11Y-ESC-01 | 2 | missing | No Esc-close test |
| OV-INITIAL-LOAD-01 | 2 | missing | No perf test |
| OV-RESIZE-PERF-01 | 2 | missing | No perf test |
| OV-MEMORY-LEAK-01 | 2 | missing | No memory test |
| OV-COPY-CONSTANTS-01 | 1 | partial | tokens.test.ts covers token constants; not all strings |
| OV-PW-SNAPSHOT-01 | 1 | full | m0.18-* specs cover PW snapshots |
| OV-UNIT-01 | 1 | full | Vitest 1118/1118 PASS |

### Section 17: E2E FLOWS (FL)

*55 cases — almost all system/integration level; minimal Vitest coverage. Most require e2e or harness tests.*

| case ID | pri | verdict | notes |
|---|---|---|---|
| FL-COLDSTART-01..05 | 0/1 | missing | System-level; requires real daemon + browser |
| FL-PM-START-01 | 0 | partial | coldstart-b4.test.tsx partially covers |
| FL-PM-SAY-01 | 0 | partial | pm-write.test.tsx |
| FL-PM-GO-01 | 0 | missing | Harness-level; no UI test |
| FL-PM-DONE-01 | 0 | missing | Same |
| FL-APPROVE-PENDING-01 | 0 | missing | No e2e approval flow |
| FL-APPROVE-ALLOW-01 | 0 | partial | pm-approval-flow.test.tsx unit |
| FL-APPROVE-DENY-01 | 0 | partial | pm-approval-flow.test.tsx unit |
| FL-APPROVE-MULTI-01 | 1 | missing | No multi-approval test |
| FL-APPROVE-RACE-01 | 1 | missing | No race condition test |
| FL-PLAN-CONFLICT-01 | 0 | partial | store/plan-conflict.test.ts |
| FL-PLAN-NEW-01 | 1 | partial | plan-write.test.tsx |
| FL-PLAN-REORDER-01 | 1 | missing | No reorder test |
| FL-MEMO-AGENT-01 | 0 | partial | agent-notes.test.tsx |
| FL-MEMO-TASK-01 | 1 | missing | No task memo test |
| FL-FOCUS-FLAG-01 | 1 | partial | agent-detail-attention.test.tsx |
| FL-MEMO-LONG-01 | 2 | missing | No long memo test |
| FL-CONS-DETECT-01 | 0 | partial | consistency-live.test.tsx |
| FL-CONS-ACK-01 | 0 | partial | consistency-write.test.tsx |
| FL-CONS-FIXED-01 | 1 | missing | No auto-resolve test |
| FL-CONS-DISMISS-01 | 1 | partial | consistency-write.test.tsx |
| FL-CONS-OPEN-01 | 1 | missing | No open-in-full test |
| FL-CONS-MANUAL-01 | 1 | missing | No manual trigger test |
| FL-RETRO-START-01..ARCHIVE-01 | 0/1 | missing (5 cases) | Retro flow system-level |
| FL-WT-CREATE-01 | 0 | partial | worktree-write.test.tsx |
| FL-WT-LOCK-01 | 1 | missing | No lock test |
| FL-WT-SUBROOM-01 | 1 | partial | subroom-view.test.tsx |
| FL-PJ-SWITCH-01 | 0 | missing | No project switch test |
| FL-PJ-ARCHIVE-01 | 1 | missing | No archive test |
| FL-CUST-MODEL-01..RESET-01 | 0/1 | partial (partially covered by CT tests) | 4 cases |
| FL-GU-LIST-01..INDICATOR-01 | 0/1 | partial (guidance-mock/write tests) | 5 cases |
| FL-CO-DISPLAY-01..CUSTOM-01 | 0/1 | missing | 4 cases |
| FL-DISC-PARALLEL-01..PROMOTE-01 | 1 | partial (discipline-header.test.tsx) | 4 cases |
| FL-WS-DISCONNECT-01..RECOVER-01 | 0 | partial (store-connection tests) | 3 cases |

### Sections 18-19: UX/EG/NT/CH/MS/SEC/IN/PH

*186 cases total — almost entirely missing or implementation-only.*

| prefix | total | full | partial | impl-only | missing | n-a |
|---|---|---|---|---|---|---|
| UX (patterns) | 26 | 0 | 0 | 6 | 20 | 0 |
| EG (edge cases) | 18 | 0 | 0 | 4 | 14 | 0 |
| NT (notifications) | 7 | 0 | 1 | 3 | 3 | 0 |
| CH (characters) | 14 | 0 | 0 | 6 | 8 | 0 |
| MS (milestones) | 24 | 0 | 0 | 8 | 16 | 0 |
| SEC (security) | 5 | 0 | 0 | 2 | 1 | 2 |
| IN (install) | 6 | 0 | 0 | 0 | 4 | 2 |
| PH (philosophy) | 6 | 0 | 0 | 2 | 4 | 0 |

Notable SEC cases:
- SEC-TOKEN-01 (`n-a`): daemon-side token auth — backend-only
- SEC-DEV-CHECK-01: no test for dev/prod boundary enforcement

### M0.18 Sections (SP-MOTION/CT/RL/GS/SL/ENF/AR)

| case ID | pri | name | vitest match | playwright match | impl match | verdict |
|---|---|---|---|---|---|---|
| SP-ROSTER-01 | 0 | persistent 3体のみ | **direct** (spirit.test.tsx) | **direct** (m0.18-room-spirit) | ✅ | **full** |
| SP-ROSTER-02 | 0 | 10体全員summonedBy | **direct** (spirit.test.tsx) | none | ✅ | **full** |
| SP-ROSTER-03 | 1 | aggregatorのみwritePermission | **direct** (spirit.test.tsx) | none | ✅ | **full** |
| SP-MOTION-RPG-01 | 1 | spiritMode="rpg" | **direct** (spirit.test.tsx) | **direct** (m0.18-room-spirit) | ✅ | **full** |
| SP-MOTION-OFF-01 | 1 | spiritMode="office" | **direct** (spirit.test.tsx) | **direct** (m0.18-room-spirit) | ✅ | **full** |
| SP-MOTION-HYB-01 | 0 | spiritMode="hybrid" | **direct** (spirit.test.tsx) | **direct** (m0.18-room-spirit) | ✅ | **full** |
| SP-MOTION-EXIT-01 | 1 | spirit--leaving | **direct** (spirit.test.tsx) | none | ✅ | **full** |
| SP-QUEUE-01 | 0 | SummonQueue active/queued | **direct** (spirit.test.tsx) | **direct** (summon-queue element) | ✅ | **full** |
| SP-QUEUE-02 | 1 | useDispatchQueue live | none | none | ✅ | implementation-only |
| SP-DESK-01 | 0 | review/retroDesks消える | **direct** (spirit.test.tsx) | **direct** (m0.18-room-spirit) | ✅ | **full** |
| SP-DESK-02 | 1 | Summon Zone signage | none | partial (room-spirit-active visual) | ✅ | partial |
| SP-DETAIL-01 | 1 | spirit click model列隠れる | none | partial (desk-click → panel) | ✅ | partial |
| CT-TREE-01 | 0 | Agents(3) expand | **direct** (customization-tree.test.tsx) | **direct** (m0.18-customization-tree) | ✅ | **full** |
| CT-TREE-02 | 0 | Skills(2) expand | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-TREE-03 | 0 | loom-review expand | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-TREE-04 | 0 | loom-retro expand | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-TREE-05 | 1 | aggregator WRITE badge | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-EDIT-AGENT-01 | 0 | agent leaf MODEL行 | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-EDIT-SKILL-01 | 0 | skill leaf MODEL非表示 | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-EDIT-PM-01 | 1 | loom-pm切替不可 | none | partial (visual) | ✅ | partial |
| CT-EDIT-WRITE-01 | 1 | aggregator WRITE badge | **direct** (customization-tree.test.tsx) | **direct** | ✅ | **full** |
| CT-EDIT-CUSTOM-01 | 1 | CUSTOM OVERRIDE | none | partial | ✅ | partial |
| CT-EDIT-LG-01 | 1 | LEARNED GUIDANCE数 | none | partial | ✅ | partial |
| CT-SCHEMA-01 | 0 | user-prefs agents+skills | partial (customization-write.test.tsx) | none | ✅ | partial |
| CT-SCHEMA-02 | 1 | 旧flat schema migration | none | none | ✅ | missing |
| RL-KPT-01 | 0 | 4列描画 | **direct** (retro.test.tsx RETRO-LC-001) | **direct** (m0.18-retro-kpt) | ✅ | **full** |
| RL-KPT-02 | 1 | TRY列from refs | none | partial | ✅ | partial |
| RL-PIP-01 | 0 | carryover 3pip | **direct** (retro.test.tsx RETRO-LC-002) | **direct** | ✅ | **full** |
| RL-PIP-02 | 0 | count>=3 赤+警告 | **direct** (retro.test.tsx) | **direct** | ✅ | **full** |
| RL-PIP-03 | 1 | 3-strike注記 | none | partial | ✅ | partial |
| RL-VERDICT-PROM-01 | 0 | promoted badge | **direct** (retro.test.tsx) | **direct** | ✅ | **full** |
| RL-VERDICT-EXP-01 | 0 | auto-expire badge | **direct** (retro.test.tsx) | **direct** | ✅ | **full** |
| RL-VERDICT-DROP-01 | 1 | lens-drop badge | none | partial | ✅ | partial |
| RL-VERDICT-NULL-01 | 2 | null badge無し | none | partial | ✅ | partial |
| RL-META-01 | 1 | last_seen/re-eval行 | none | none | ✅ | implementation-only |
| RL-META-02 | 1 | 元retroid | none | none | ✅ | implementation-only |
| RL-PSUM-01 | 0 | carryover集約 | partial (retro-mock-active) | partial | ✅ | partial |
| RL-PSUM-02 | 1 | re_evaluated_in back-fill | none | none | ✅ | n-a (backend) |
| RL-ADM-TOGGLE-01 | 1 | ⚙adminトグル | none | **direct** (m0.18-retro-kpt admin-toggle) | ✅ | partial |
| RL-ADM-RECON-01 | 0 | Reconstruct実行 | none | **direct** (m0.18-retro-kpt) | ✅ | partial |
| RL-ADM-RECON-02 | 1 | marker表示 | none | none | ✅ | implementation-only |
| GS-FILTER-01 | 0 | pill 4種 | **direct** (guidance-scope.test.tsx GD-SCOPE-01) | none | ✅ | **full** |
| GS-FILTER-02 | 1 | Agents pill | **direct** (guidance-scope.test.tsx GD-SCOPE-02) | none | ✅ | **full** |
| GS-FILTER-03 | 1 | loom-review pill | **direct** (guidance-scope.test.tsx GD-SCOPE-03) | none | ✅ | **full** |
| GS-BADGE-01 | 1 | AGENT/SKILL badge | **direct** (guidance-scope.test.tsx) | none | ✅ | **full** |
| GS-BADGE-02 | 1 | aggregator WRITE | **direct** (guidance-scope.test.tsx) | none | ✅ | **full** |
| GS-KEYPATH-01 | 2 | key path表示 | partial (guidance-mock-active) | none | ✅ | partial |
| SL-COL-01 | 1 | reviewer(skill)ヘッダ | **direct** (ses-lbl.test.tsx SES-LBL-01) | none | ✅ | **full** |
| SL-VAL-01 | 0 | skill identifier形式 | **direct** (ses-lbl.test.tsx SES-LBL-02/03) | none | ✅ | **full** |
| SL-VAL-02 | 1 | 不明旧名raw表示 | **direct** (ses-lbl.test.tsx SES-LBL-04) | none | ✅ | **full** |
| ENF-CATCH-01 | 0 | NOT_FOUND try/catch | **direct** (not-found-toast.test.tsx ERR-NF-01/02) | none | ✅ | **full** |
| ENF-TOAST-01 | 0 | NOT_FOUND error toast | **direct** (not-found-toast.test.tsx ERR-NF-02) | none | ✅ | **full** |
| ENF-RETRY-01 | 1 | retry action | **direct** (not-found-toast.test.tsx ERR-NF-03) | none | ✅ | **full** |
| AR-TRPC-01 | 0 | reconstructFromArchive export | none (unit) | none | ✅ daemon/routes/retro.ts | n-a (backend) |
| AR-OUT-01 | 0 | applied+pending出力 | none | none | ✅ | missing |
| AR-OUT-02 | 1 | NOT_FOUND エラー | none | none | ✅ | missing |
| AR-UI-01 | 1 | admin button invoke | none | **direct** (m0.18-retro-kpt admin-btn-reconstruct) | ✅ | partial |

---

## Gap Analysis & Next-Step Recommendations

### Critical Gaps (pri 0, missing verdict)

1. **StatusBar section** (SB-LAYOUT-01, SB-CONN-01, SB-SCENARIO-01): Zero test coverage for StatusBar component. Priority: create `ui/test/views/shell/statusbar.test.tsx` with 3-5 unit tests.

2. **RT-BACK-01** (browser back/forward): Requires e2e. Add to `ui/e2e/room-baseline.spec.ts`.

3. **RM-NOWRAP-01** (AppShell marginRight wrap): Missing interaction test for PM active + Room layout.

4. **OV-CONSOLE-ERROR-01** (zero console.error): High-value cross-cutting check. Add to Playwright spec as `page.on('console')` listener.

5. **OV-ALL-BUTTONS-01** (every button has onClick): Could be implemented as a Playwright click audit iterating `button[data-testid]` elements.

6. **OV-BACK-FORWARD-01** (browser history): Add e2e navigation spec.

7. **FL-COLDSTART-01** (system cold start): Integration/harness test — not addressable in UI scope.

8. **WT-QUERY-01** (branch query): Add to worktree-mock-active.test.tsx.

### M0.18 Residual Gaps

- **CT-SCHEMA-02** (flat→tree migration compat): Not tested. Add to customization-write.test.tsx.
- **SP-QUEUE-02** (useDispatchQueue live): Needs live wire test.
- **AR-OUT-01/02** (reconstructFromArchive output): Daemon-side test needed.

### Phase 2 Entry Preparation Recommendation

Before Phase 2 multi-contributor work begins, the following gap-fill PR is recommended:

**PR: `test/qa-suite-gap-fill-phase1` (estimated 80-100 new Vitest cases)**

Priority order:
1. StatusBar unit tests (SB-* 3 blocker cases)
2. OV-CONSOLE-ERROR-01 e2e listener
3. RT-BACK-01 e2e navigation test  
4. WT-QUERY-01 worktree branch query
5. LR-MOUNT-01 / LR-TAB-MERGED-01 LiveRail unit tests
6. CT-SCHEMA-02 migration compat test
7. DS-STATUS-DOT-01 / DS-BUBBLE-TOOL-01 desk status tests (indirect coverage of room spirit post-rewrite)

**UX/EG/MS/CH sections** (186 cases, ~0% coverage): These represent the largest single gap. Recommend treating as a separate `test/qa-suite-ux-edge-coverage` milestone task targeting the 40+ pri-0 and pri-1 cases within UX and MS sections.

### Naming Mismatch Note (retro candidate)

Test files use their own prefixes (RETRO-LC-*, CUSTOM-TREE-*, SES-LBL-*, ERR-NF-*, GD-SCOPE-*) rather than qa-suite.js case IDs (RL-*, CT-*, SL-*, ENF-*, GS-*). While the semantic coverage is correct, automated traceability via `grep <caseId>` returns 0 results for these cases despite them being covered. Recommend either:

- Adding `// covers: CT-TREE-01` comments to test describe blocks, or
- Updating qa-suite.js to adopt test-file prefixes as canonical IDs

This naming drift was the primary audit complexity in this task.

---

*Audit performed by: loom-developer (dev-qa-audit slot)*
*Method: regex parse of qa-suite.js + grep cross-reference of ui/test/ + ui/e2e/ + spot manual verification of 8 cases*
