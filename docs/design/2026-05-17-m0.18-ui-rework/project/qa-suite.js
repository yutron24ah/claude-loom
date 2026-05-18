/* ============================================================
   claude-room QA Test Suite — definitions
   ------------------------------------------------------------
   Structure:
     Section (画面 / エリア)
       Group (要素 / 機能)
         Case
           pre[]      — 実行前のセットアップ条件
           steps[]    — 操作手順（番号付き）
           expected[] — 期待される結果（すべて満たせば pass）
           link       — REVIEW.md / PR-REVIEW.md の課題 ID
           pri        — 0 (blocker) / 1 (major) / 2 (minor)
           scenario   — 'any' | 'idle' | 'active' | 'failed'

   全ケース pass = UI が完全に実装され動作することを保証する、を目指す。
   ============================================================ */
window.QA_SUITE = [

/* ============================================================
   1. SHELL — AppShell の TopBar / Drawer / StatusBar / Routing
   ============================================================ */
{
  id: 'shell', zone: 'shell',
  title: 'AppShell — シェル全体',
  path: 'ui/src/routing/AppShell.tsx',
  groups: [
    {
      id: 'topbar', name: 'TopBar (高さ36px / 横一列)',
      cases: [
        {
          id: 'TB-LAYOUT-01', pri: 0, scenario: 'any',
          name: 'TopBar が1段横バーで描画される',
          pre: ['任意の scenario', '/ を開く'],
          steps: [
            'devtools で .top 要素を inspect',
            'computed style を確認',
          ],
          expected: [
            'height ≈ 36px',
            'display: flex / flex-direction: row',
            '子要素が縦並びになっていない',
            '画面幅 1280 / 1024 / 768 すべてで崩れない',
          ],
        },
        {
          id: 'TB-DRAWER-TOGGLE-01', pri: 0, scenario: 'any',
          name: 'Drawer トグルボタン (☰) が機能する',
          pre: ['/ を開く', 'Drawer が初期状態（labels 見える）'],
          steps: [
            '左上の ☰ をクリック',
            '300ms 待つ',
            'もう一度 ☰ をクリック',
          ],
          expected: [
            '1回目クリックで .drawer に .collapsed が付く',
            '各 .nav-link の .lbl が hidden / .ico のみ表示',
            'Drawer width が ~56px に縮まる',
            '2回目クリックで .collapsed が外れ元に戻る',
          ],
        },
        {
          id: 'TB-BRAND-01', pri: 2, scenario: 'any',
          name: 'ブランドロゴと "claude-room" が表示される',
          pre: [],
          steps: ['TopBar の brand 部分を目視確認'],
          expected: [
            '.logo の四角アイコンが見える',
            'テキスト "claude-room" が見える',
          ],
        },
        {
          id: 'TB-PROJECT-01', pri: 1, scenario: 'any',
          name: 'プロジェクトボタンの onClick',
          pre: [],
          steps: [
            '◆ <project> ▾ をクリック',
          ],
          expected: [
            'クリックで何かが起きる（dropdown 展開 or /project-settings 遷移）',
            '何も起きないなら fail',
          ],
          link: 'B7',
        },
        {
          id: 'TB-PROJECT-02', pri: 1, scenario: 'any',
          name: 'プロジェクトラベルが branch を表示',
          pre: ['scenario: any（branch="main" 等が定義されている）'],
          steps: ['◆ の後のテキストを確認'],
          expected: [
            'branch 名が表示されている（"◆ branch: main" 形式）',
            '"claude-room" 等のアプリ名ではない',
          ],
          link: 'S8',
        },
        {
          id: 'TB-METRIC-PARALLEL-01', pri: 1, scenario: 'active',
          name: 'PARALLEL メトリクスが click 可能',
          pre: ['scenario=active'],
          steps: ['"PARALLEL XX%" セルをクリック'],
          expected: [
            '/gantt へ navigate される',
            'Drawer の gantt が active になる',
          ],
          link: 'B10',
        },
        {
          id: 'TB-METRIC-TASKTOOL-01', pri: 1, scenario: 'any',
          name: 'TASK TOOL メトリクスが click 可能',
          pre: [],
          steps: ['"TASK TOOL ..." セルをクリック'],
          expected: ['/sessions へ navigate される'],
          link: 'B10',
        },
        {
          id: 'TB-METRIC-TDD-01', pri: 1, scenario: 'failed',
          name: 'TDD ORDER メトリクスが click 可能',
          pre: ['scenario=failed（TDD violations > 0）'],
          steps: ['"TDD ORDER X VIOLATIONS" セルをクリック'],
          expected: ['/consistency へ navigate（TDD フィルタ付きが理想）'],
          link: 'B10',
        },
        {
          id: 'TB-METRIC-VERDICT-01', pri: 1, scenario: 'failed',
          name: 'VERDICT メトリクスが click 可能 + 色',
          pre: ['scenario=failed'],
          steps: ['VERDICT セルを確認 → クリック'],
          expected: [
            'PASS なら .ok 緑 / FAIL なら .err 赤',
            'クリックで /consistency へ navigate',
          ],
          link: 'B10',
        },
        {
          id: 'TB-CONN-01', pri: 0, scenario: 'any',
          name: '接続インジケータ — connected',
          pre: ['WS 接続中'],
          steps: ['右端の .top__conn を確認'],
          expected: [
            '.dot.busy 緑系の点',
            'テキスト "WS connected"',
          ],
        },
        {
          id: 'TB-CONN-02', pri: 0, scenario: 'any',
          name: '接続インジケータ — reconnecting',
          pre: ['daemon を停止 or WS 切断'],
          steps: ['切断後の .top__conn を確認', '10s 後に再起動して再接続を確認'],
          expected: [
            '切断時に .dot.fail 赤系 + テキスト "reconnecting"',
            '再接続で connected に戻る',
            'ConnectionBanner も連動表示',
          ],
        },
      ],
    },

    {
      id: 'drawer', name: 'Drawer (左サイドバー / 168px)',
      cases: [
        {
          id: 'DR-LAYOUT-01', pri: 0, scenario: 'any',
          name: 'Drawer がサイドバーとして縦展開',
          pre: ['/ を開く', 'collapsed=false'],
          steps: ['.drawer を inspect'],
          expected: [
            'width ≈ 168px',
            'height: 100%（TopBar〜StatusBar 間）',
            'viewport 外に流れていない',
          ],
        },
        {
          id: 'DR-GROUP-01', pri: 1, scenario: 'any',
          name: 'NAV_GROUPS の見出しが描画される',
          pre: [],
          steps: ['Drawer 内の group ラベルを目視'],
          expected: [
            'グループ見出し（VIEW / MANAGE 等）が小さい字で見える',
            'constants.ts の NAV_GROUPS と一致',
          ],
        },
        { id: 'DR-NAV-ROOM-01', pri: 0, scenario: 'any',
          name: 'Drawer → Room ナビ', pre: [],
          steps: ['Drawer の Room をクリック', '/ に居る状態で再度クリック'],
          expected: ['/ へ navigate', '/ で active class が付く'],
        },
        { id: 'DR-NAV-PLAN-01', pri: 0, scenario: 'any',
          name: 'Drawer → Plan', pre: [],
          steps: ['Drawer の Plan をクリック'],
          expected: ['/plan へ遷移', 'PlanView が描画', 'active class 付く'],
        },
        { id: 'DR-NAV-GANTT-01', pri: 0, scenario: 'any',
          name: 'Drawer → Gantt', pre: [],
          steps: ['Drawer の Gantt をクリック'],
          expected: ['/gantt へ遷移', 'GanttView 描画', 'active class 付く'],
        },
        { id: 'DR-NAV-RETRO-01', pri: 0, scenario: 'any',
          name: 'Drawer → Retro', pre: [],
          steps: ['Drawer の Retro をクリック'],
          expected: ['/retro へ遷移', 'RetroView 描画'],
        },
        { id: 'DR-NAV-WORKTREE-01', pri: 0, scenario: 'any',
          name: 'Drawer → Worktree', pre: [],
          steps: ['Drawer の Worktree をクリック'],
          expected: ['/worktree へ遷移', 'WorktreeView 描画'],
        },
        { id: 'DR-NAV-CONSISTENCY-01', pri: 0, scenario: 'any',
          name: 'Drawer → Consistency', pre: [],
          steps: ['Drawer の Consistency をクリック'],
          expected: ['/consistency へ遷移', 'ConsistencyView 描画'],
        },
        { id: 'DR-NAV-CUSTOMIZATION-01', pri: 0, scenario: 'any',
          name: 'Drawer → Customization', pre: [],
          steps: ['Drawer の Customization をクリック'],
          expected: ['/customization へ遷移'],
        },
        { id: 'DR-NAV-GUIDANCE-01', pri: 0, scenario: 'any',
          name: 'Drawer → Guidance', pre: [],
          steps: ['Drawer の Guidance をクリック'],
          expected: ['/guidance へ遷移', 'LearnedGuidanceView 描画'],
        },
        { id: 'DR-NAV-SESSIONS-01', pri: 0, scenario: 'any',
          name: 'Drawer → Sessions', pre: [],
          steps: ['Drawer の Sessions をクリック'],
          expected: ['/sessions へ遷移', 'SessionListView 描画'],
        },
        { id: 'DR-NAV-SETTINGS-01', pri: 0, scenario: 'any',
          name: 'Drawer → Project Settings', pre: [],
          steps: ['Drawer の Project Settings をクリック'],
          expected: ['/project-settings へ遷移'],
        },
        { id: 'DR-NAV-TOKENS-01', pri: 0, scenario: 'any',
          name: 'Drawer → Tokens', pre: [],
          steps: ['Drawer の Tokens をクリック'],
          expected: ['/tokens へ遷移', 'TokenMeterView 描画'],
        },
        {
          id: 'DR-ACTIVE-01', pri: 0, scenario: 'any',
          name: 'active 強調が pathname と一致',
          pre: [],
          steps: ['URL バーで /plan に直接遷移'],
          expected: [
            'Drawer の plan に .active クラスが付く',
            '他のリンクには付かない',
            'NavLink の end=false なので /plan/foo でも active',
          ],
        },
        {
          id: 'DR-COLLAPSED-01', pri: 1, scenario: 'any',
          name: 'collapsed 状態が永続化される（任意）',
          pre: ['collapsed=true でリロード'],
          steps: ['☰ で collapse → リロード'],
          expected: [
            '再表示時も collapsed のまま（要望次第。localStorage 保存推奨）',
          ],
          link: 'M5',
        },
        {
          id: 'DR-VERSION-01', pri: 2, scenario: 'any',
          name: 'バージョン表記',
          pre: ['collapsed=false'],
          steps: ['Drawer 下端を確認'],
          expected: ['.drawer__version にアプリバージョン or 識別子'],
        },
      ],
    },

    {
      id: 'statusbar', name: 'StatusBar (高さ24px / 下固定)',
      cases: [
        { id: 'SB-LAYOUT-01', pri: 0, scenario: 'any',
          name: 'StatusBar が画面下に常時表示', pre: [],
          steps: ['ページ最下部を確認'],
          expected: ['高さ ~24px の bar', 'position: 固定的に下端'],
        },
        { id: 'SB-CONN-01', pri: 0, scenario: 'any',
          name: '接続セグメント', pre: ['WS 接続中'],
          steps: ['左端 seg を確認'],
          expected: ['.dot.busy + "WS connected"'],
        },
        { id: 'SB-SCENARIO-01', pri: 0, scenario: 'any',
          name: 'シナリオラベル', pre: [],
          steps: ['scenario: <name> 表記を確認'],
          expected: [
            'scenario=idle なら "全員 idle (寝てる)"',
            'scenario=active なら "Dev サブエージェント実行中"',
          ],
        },
        { id: 'SB-EVENTS-01', pri: 2, scenario: 'active',
          name: 'events seen カウンタ', pre: ['scenario=active'],
          steps: ['events seen の数値を観察 30s'],
          expected: ['イベント受信に応じて増加（実装次第）'],
        },
        { id: 'SB-PATH-01', pri: 1, scenario: 'any',
          name: 'プロジェクトパス表記', pre: [],
          steps: ['右端 .right を確認'],
          expected: ['"claude-room @ ~/work/<project>" 形式'],
        },
      ],
    },

    {
      id: 'routing', name: 'Routing (React Router)',
      cases: [
        { id: 'RT-INDEX-01', pri: 0, scenario: 'any',
          name: 'index (/) で RoomView が描画', pre: [],
          steps: ['/ を開く'],
          expected: ['RoomView mount', 'Outlet には何も描画されない'],
        },
        { id: 'RT-SIBLING-01', pri: 0, scenario: 'any',
          name: 'sibling screen: /plan 時 RoomView が unmount', pre: [],
          steps: ['/ で RoomView を mount', '/plan へ遷移', 'devtools で .room-canvas が DOM に居ない'],
          expected: [
            'RoomView は DOM から消えている',
            'PlanView のみが content 領域に描画',
            'overlay として Room が背後に透けない',
          ],
          link: 'S2',
        },
        { id: 'RT-BACK-01', pri: 0, scenario: 'any',
          name: 'ブラウザ戻る/進むが動く', pre: [],
          steps: ['/ → /plan → /gantt と遷移', 'ブラウザ戻る', 'もう一度戻る', 'ブラウザ進む'],
          expected: ['戻ると /plan → /', '進むと / → /plan', 'すべてで該当画面が再描画'],
        },
        { id: 'RT-DEEPLINK-01', pri: 0, scenario: 'any',
          name: '直接 URL 入力で deep link', pre: [],
          steps: ['アドレスバーに /consistency を入力'],
          expected: ['ConsistencyView 描画', 'Drawer consistency active'],
        },
        { id: 'RT-AGENT-DEEPLINK-01', pri: 1, scenario: 'any',
          name: '/agents/:id deep link', pre: [],
          steps: ['/agents/pm に直接アクセス'],
          expected: ['AgentDetailPanel が pm の内容で描画'],
        },
        { id: 'RT-OVERLAY-OFF-01', pri: 0, scenario: 'any',
          name: '全画面 Outlet オーバーレイは無い', pre: [],
          steps: ['/plan を開く', '.content の子要素を inspect'],
          expected: [
            '.bg-bg1/80 のようなオーバーレイ div が無い',
            'isPanelOpen 分岐コードが残っていない',
          ],
          link: 'S2',
        },
      ],
    },

    {
      id: 'right-column', name: '右カラム — PMChat / LiveRail 切替',
      cases: [
        { id: 'RC-PMCHAT-MOUNT-01', pri: 0, scenario: 'active',
          name: 'PM 起動時に PMChatPanel が mount', pre: ['scenario=active（pm.running=true）'],
          steps: ['/ を開く', '右側を確認'],
          expected: ['PMChatPanel が width=340 で右に固定', 'LiveRail は mount されない'],
        },
        { id: 'RC-LIVERAIL-MOUNT-01', pri: 0, scenario: 'idle',
          name: 'PM 非起動 + Room で LiveRail が mount', pre: ['scenario=idle'],
          steps: ['/ を開く'],
          expected: ['LiveRail が右に表示', '⚡ LIVE STREAM ヘッダ', 'タブ ALL/reasoning/tools'],
          link: 'S1',
        },
        { id: 'RC-LIVERAIL-HIDE-NONROOM-01', pri: 1, scenario: 'idle',
          name: '非 Room 画面では LiveRail が出ない', pre: ['scenario=idle'],
          steps: ['/plan に遷移'],
          expected: ['LiveRail が unmount', '画面全幅が PlanView'],
        },
        { id: 'RC-LIVERAIL-COLLAPSE-01', pri: 1, scenario: 'idle',
          name: 'LiveRail collapsed トグル', pre: ['scenario=idle', '/'],
          steps: ['LiveRail の × をクリック'],
          expected: [
            'LiveRail が消える',
            '⚡ LIVE 小ボタンが代わりに出る',
            '小ボタンをクリックで LiveRail 復活',
          ],
        },
        { id: 'RC-LIVERAIL-DUP-01', pri: 1, scenario: 'idle',
          name: 'collapse 実装の二重化が解消されている', pre: [],
          steps: ['LiveRail.tsx の if (collapsed) 分岐を grep', 'AppShell.tsx の .rail-toggle を grep'],
          expected: ['どちらか1箇所のみに集約'],
          link: 'B9',
        },
        { id: 'RC-PM-PRIORITY-01', pri: 1, scenario: 'active',
          name: 'PM running > LiveRail の優先順位', pre: ['scenario=active'],
          steps: ['pm.running=true を保ちつつ stream にイベント'],
          expected: ['PMChat だけが mount、LiveRail は出ない'],
        },
      ],
    },

    {
      id: 'scenario-picker', name: 'ScenarioPicker (DEV のみ)',
      cases: [
        { id: 'SP-VISIBLE-01', pri: 1, scenario: 'any',
          name: 'DEV ビルドで表示', pre: ['import.meta.env.DEV=true', '/'],
          steps: ['画面右上を確認'],
          expected: ['.scenario-picker が見える', 'SCENARIO ラベル + ボタン群'],
        },
        { id: 'SP-SWITCH-01', pri: 1, scenario: 'any',
          name: 'シナリオ切替が即反映', pre: [],
          steps: ['idle → active を選択'],
          expected: [
            'URL に ?mock=active',
            'デスクの状態が即変化',
            'StatusBar の scenario ラベルも更新',
          ],
        },
        { id: 'SP-LIVE-01', pri: 1, scenario: 'any',
          name: 'live ボタン', pre: [],
          steps: ['live をクリック'],
          expected: ['?mock= が URL から消える', '実 WS データを表示開始'],
        },
        { id: 'SP-ROUTER-01', pri: 1, scenario: 'any',
          name: 'React Router 経由', pre: [],
          steps: ['ソースを grep "history.replaceState"'],
          expected: ['history.replaceState 直書きが無い', 'useNavigate + useSearchParams 経由'],
          link: 'B11',
        },
        { id: 'SP-NONROOM-01', pri: 2, scenario: 'any',
          name: '非 Room 画面では非表示', pre: [],
          steps: ['/plan に遷移'],
          expected: ['ScenarioPicker が unmount（Room 限定）'],
        },
      ],
    },

    {
      id: 'connection-toast', name: 'ConnectionBanner / Toast',
      cases: [
        { id: 'CN-BANNER-01', pri: 1, scenario: 'any',
          name: 'WS 切断時にバナー出現', pre: ['daemon 停止'],
          steps: ['切断後 1〜2 秒待つ'],
          expected: [
            'ConnectionBanner が画面上部に出る',
            '"reconnecting..." 等のメッセージ',
            '再接続で自動的に消える',
          ],
        },
        { id: 'TS-TOAST-STACK-01', pri: 2, scenario: 'active',
          name: 'Toast が右上にスタック', pre: ['toastBus で連続push'],
          steps: ['console: toastBus.push({...}) を3回'],
          expected: ['3つのトーストが縦に積まれる', '指定時間で自動的に消える'],
        },
      ],
    },
  ],
},

/* ============================================================
   2. ROOM — / (RoomView)
   ============================================================ */
{
  id: 'room', zone: 'room',
  title: '/  Room — オフィス全景',
  path: 'ui/src/views/room/',
  groups: [
    {
      id: 'rm-layout', name: 'レイアウト / リサイズ',
      cases: [
        { id: 'RM-FILL-01', pri: 0, scenario: 'any',
          name: 'Room が content 領域を埋める', pre: ['/'],
          steps: ['.room を inspect'],
          expected: [
            'position:absolute / inset:0',
            'width / height props が無い（responsive）',
          ],
          link: 'B3',
        },
        { id: 'RM-RESIZE-01', pri: 0, scenario: 'any',
          name: 'ResizeObserver でデスク追従', pre: [],
          steps: ['ウィンドウを 1280→900→1500 と変える'],
          expected: [
            'PM デスクが常に右上 (W*0.78)',
            'DEV デスクが常に左下 (W*0.18)',
            'review 3匹が横並びを維持',
          ],
        },
        { id: 'RM-NOWRAP-01', pri: 0, scenario: 'any',
          name: 'AppShell の marginRight で Room が狭まらない', pre: ['scenario=active'],
          steps: ['PMChat 出ている状態で PM デスクの右端を確認'],
          expected: ['PM デスクが PMChat と被らず適切に左に配置'],
          link: 'S7',
        },
        { id: 'RM-IDLE-HUSH-01', pri: 2, scenario: 'idle',
          name: '全員 idle で .idle-hush class', pre: ['scenario=idle'],
          steps: ['.room の class を確認'],
          expected: ['.idle-hush 付与（演出用 — 例: 彩度ダウン）'],
        },
      ],
    },

    {
      id: 'rm-background', name: 'RoomBackground (SVG)',
      cases: [
        { id: 'BG-WALL-01', pri: 0, scenario: 'any',
          name: '壁・床・幅木の3層構造', pre: [],
          steps: ['SVG 内の rect を確認'],
          expected: [
            '上から：upper wall / trim / wainscoting / trim / floor',
            'fill が var(--p-wall) / var(--p-wall-2) / var(--p-bg-floor) 等',
          ],
        },
        { id: 'BG-FLOOR-TEXTURE-01', pri: 1, scenario: 'any',
          name: '床に木目テクスチャ', pre: [],
          steps: ['床部分を inspect'],
          expected: [
            '横方向 seam が 28px ピッチ',
            '縦方向 seam が 56px ピッチ',
            'opacity 0.1〜0.18 で控えめ',
          ],
        },
        { id: 'BG-ZONE-RUG-01', pri: 0, scenario: 'any',
          name: 'ゾーンが床ラグ表現（枠線なし）', pre: [],
          steps: ['DEV/PM/REVIEW のゾーン rect を確認'],
          expected: [
            'fill: var(--p-zone-*)',
            'opacity ≈ 0.30',
            'stroke / border は無い',
            'rect 角丸 rx="2"',
          ],
          link: 'B2',
        },
        { id: 'BG-ZONE-LABEL-01', pri: 1, scenario: 'any',
          name: '床透かしのゾーンラベル', pre: [],
          steps: ['DEV/PM/REVIEW テキストを確認'],
          expected: [
            'opacity ≈ 0.16',
            'letter-spacing 8',
            'font-family ui-monospace',
          ],
        },
        { id: 'BG-NO-BOX-01', pri: 0, scenario: 'any',
          name: '「箱」感が無い', pre: [],
          steps: ['Islands.tsx を grep', '.room-island を grep'],
          expected: [
            'Islands.tsx ファイルが存在しない',
            'CSS から .room-island ルールが削除されている',
          ],
          link: 'B2',
        },
        { id: 'BG-PROPS-01', pri: 1, scenario: 'any',
          name: '装飾プロップが3つ', pre: [],
          steps: ['SVG の g[opacity=0.85] を確認'],
          expected: [
            '左下に植木鉢',
            'DEV 左上に棚',
            'DEV/REVIEW 境界にウォータークーラー',
            'いずれも tokens の --p-prop-* 参照',
          ],
        },
        { id: 'BG-DOM-PLANT-01', pri: 2, scenario: 'any',
          name: 'DOM <Plant> が残っていない', pre: [],
          steps: ['RoomView.tsx を grep "<Plant"'],
          expected: ['DOM 配置の Plant コンポーネントが無い'],
          link: 'S5',
        },
      ],
    },

    {
      id: 'rm-walldecor', name: 'RoomWallDecor (壁の装飾)',
      cases: [
        { id: 'WD-BRANCH-01', pri: 1, scenario: 'any',
          name: 'branch サインが壁に貼られる', pre: ['scenario.branch="main"'],
          steps: ['上部壁面を確認'],
          expected: ['"◆ branch: main" 表記', 'scenario により内容が変わる'],
        },
        { id: 'WD-CLOCK-01', pri: 2, scenario: 'any',
          name: '時計装飾', pre: [],
          steps: ['壁の時計を確認'],
          expected: ['scenario.now の時刻を表示 / 装飾として時計らしい絵'],
        },
      ],
    },

    {
      id: 'rm-posters', name: '壁ポスター (Gantt / Plan / Consistency)',
      cases: [
        { id: 'PO-GANTT-VIS-01', pri: 0, scenario: 'any',
          name: 'GanttPoster 描画', pre: [],
          steps: ['左上のポスター確認'],
          expected: ['ガントチャートのミニ表示', 'クリック可能カーソル'],
        },
        { id: 'PO-PLAN-VIS-01', pri: 0, scenario: 'any',
          name: 'PlanPoster 描画', pre: [],
          steps: ['中央のポスター確認'],
          expected: ['Plan のミニ表示'],
        },
        { id: 'PO-CONS-VIS-01', pri: 0, scenario: 'any',
          name: 'ConsistencyPoster 描画', pre: [],
          steps: ['右側のポスター確認'],
          expected: ['Consistency のミニ表示'],
        },
        { id: 'PO-NAV-GANTT-01', pri: 0, scenario: 'any',
          name: 'Gantt クリックで navigate', pre: [],
          steps: ['GanttPoster をクリック'],
          expected: [
            '/gantt へ遷移（モーダルじゃない）',
            'Drawer の gantt が active',
          ],
          link: 'S2',
        },
        { id: 'PO-NAV-PLAN-01', pri: 0, scenario: 'any',
          name: 'Plan クリックで navigate', pre: [],
          steps: ['PlanPoster をクリック'],
          expected: ['/plan へ遷移'],
        },
        { id: 'PO-NAV-CONS-01', pri: 0, scenario: 'any',
          name: 'Consistency クリックで navigate', pre: [],
          steps: ['ConsistencyPoster をクリック'],
          expected: ['/consistency へ遷移'],
        },
        { id: 'PO-NO-MODAL-01', pri: 0, scenario: 'any',
          name: 'モーダル4種が削除されている', pre: [],
          steps: ['RoomView.tsx を grep "room-modal"', 'showPlan/showGantt/showConsistency state grep'],
          expected: ['いずれも存在しない'],
          link: 'S2',
        },
      ],
    },

    {
      id: 'rm-desks', name: 'DeskStation (5匹)',
      cases: [
        { id: 'DS-COUNT-01', pri: 0, scenario: 'any',
          name: 'デスクが5つ描画', pre: [],
          steps: ['[data-testid="desk-top"] 数を確認'],
          expected: ['正確に5つ（pm, dev, rev-code, rev-test, rev-sec）'],
        },
        { id: 'DS-POS-PM-01', pri: 0, scenario: 'any',
          name: 'PM 位置 (W*0.78, floorY+50)', pre: [],
          steps: ['PM デスクの left/top inline style を確認'],
          expected: ['幅 1200px なら left ≈ 936, top ≈ 351'],
        },
        { id: 'DS-POS-DEV-01', pri: 0, scenario: 'any',
          name: 'DEV 位置 (W*0.18, floorY+80)', pre: [],
          steps: [],
          expected: ['DEV が左下にいる'],
        },
        { id: 'DS-POS-REVIEW-ROW-01', pri: 0, scenario: 'any',
          name: 'REVIEW 3匹が横一列', pre: [],
          steps: ['rev-code / rev-test / rev-sec の y を確認'],
          expected: [
            '3匹とも同じ y',
            'x は 0.62 / 0.74 / 0.86 比率',
            'T 字配置になっていない',
          ],
          link: 'S3',
        },
        { id: 'DS-SPRITE-01', pri: 0, scenario: 'any',
          name: 'CatSprite が peeking 表示', pre: [],
          steps: ['各デスクの猫を確認'],
          expected: ['モニタ上から覗くポーズ', 'cat.fur / cheek / hat が roster と一致'],
        },
        { id: 'DS-MONITOR-BUSY-01', pri: 0, scenario: 'active',
          name: 'busy 状態のモニタ', pre: ['scenario=active'],
          steps: ['busy 猫のモニタを確認'],
          expected: [
            'モニタ画面に4本のコード行',
            '幅 70/50/85/40 で異なる',
          ],
        },
        { id: 'DS-MONITOR-IDLE-01', pri: 0, scenario: 'idle',
          name: 'idle 状態のモニタ', pre: ['scenario=idle'],
          steps: [],
          expected: ['desk-station__monitor--idle で暗い', 'コード行が描画されない', '猫が sleep ポーズ'],
        },
        { id: 'DS-MONITOR-FAIL-01', pri: 0, scenario: 'failed',
          name: 'failed 状態のモニタ', pre: ['scenario=failed'],
          steps: [],
          expected: ['desk-station__monitor--fail で赤系'],
        },
        { id: 'DS-STATUS-DOT-01', pri: 1, scenario: 'any',
          name: 'status dot 色', pre: ['各 status を持つ猫を観察'],
          steps: [],
          expected: [
            'busy: 緑系',
            'idle: 灰',
            'review: 紫系',
            'fail: 赤',
            'tdd: 黄',
          ],
        },
        { id: 'DS-BUBBLE-TOOL-01', pri: 1, scenario: 'active',
          name: 'speech bubble — currentTool', pre: ['scenario=active'],
          steps: ['DEV 猫の上を確認'],
          expected: [
            '吹き出しに tool 名（例: "Bash", "Edit"）',
            '吹き出し三角形が下向き',
          ],
        },
        { id: 'DS-BUBBLE-REASON-01', pri: 1, scenario: 'active',
          name: 'speech bubble — reasoning fallback', pre: ['tool なし reasoning あり'],
          steps: [],
          expected: ['28文字で truncate "…" 付き'],
        },
        { id: 'DS-BUBBLE-NONE-01', pri: 2, scenario: 'idle',
          name: 'idle 時は bubble 無し', pre: ['scenario=idle'],
          steps: [],
          expected: ['吹き出しが描画されない'],
        },
        { id: 'DS-NAMEPLATE-01', pri: 1, scenario: 'any',
          name: 'ネームプレート', pre: [],
          steps: ['各デスク下を確認'],
          expected: [
            'cat.name + role が表示',
            'idle で lastSeenAt があれば "last: HH:MM"',
          ],
        },
        { id: 'DS-CLICK-SELECT-01', pri: 0, scenario: 'any',
          name: 'クリックで選択', pre: [],
          steps: ['DEV 猫をクリック'],
          expected: [
            'sel state が "dev" に',
            'desk-station__btn--selected class 付与',
            'AgentDetailPanel が右上に開く',
          ],
        },
        { id: 'DS-CLICK-DESELECT-01', pri: 0, scenario: 'any',
          name: '再クリックで解除', pre: ['1つ選択中'],
          steps: ['同じ猫をもう一度クリック'],
          expected: ['sel null', 'パネルが閉じる'],
        },
        { id: 'DS-WALK-01', pri: 2, scenario: 'active',
          name: 'cat-walker アニメ', pre: ['state.walkTo 定義済みの猫'],
          steps: ['その猫を観察'],
          expected: [
            '.cat-walker クラス',
            '--walk-dx / --walk-dy CSS 変数注入',
            '@keyframes cat-walk-trip で隣ゾーンへ歩く',
          ],
          link: 'M3',
        },
        { id: 'DS-TDD-TAG-01', pri: 2, scenario: 'active',
          name: 'TDD フェーズタグ', pre: ['TDD 状態の猫'],
          steps: [],
          expected: ['RED/GREEN/REFACTOR ラベル表示'],
        },
      ],
    },

    {
      id: 'rm-clones', name: 'Worktree Clones (subroom)',
      cases: [
        { id: 'WC-POS-01', pri: 1, scenario: 'active',
          name: 'dev デスク上方に並ぶ', pre: ['scenario.worktrees で dev parent 複数'],
          steps: ['ミニ猫の位置を確認'],
          expected: [
            'x = dev.x + 60 + i*56',
            'y = dev.y - 60',
            '最大4匹まで（slice(0,4)）',
          ],
          link: 'S4',
        },
        { id: 'WC-CLICK-01', pri: 1, scenario: 'active',
          name: 'クリックで /worktree?branch=...', pre: [],
          steps: ['SubroomClone をクリック'],
          expected: ['URL に branch query 付き遷移', 'WorktreeView がその branch を開く'],
        },
        { id: 'WC-STATUS-01', pri: 2, scenario: 'failed',
          name: 'failed status の扱い', pre: ['scenario=failed'],
          steps: [],
          expected: ['status=failed の worktree は review として描画（一時的）'],
        },
      ],
    },

    {
      id: 'rm-coldstart', name: 'ColdStart カード',
      cases: [
        { id: 'CS-VIS-01', pri: 0, scenario: 'idle',
          name: '全員 idle + PM off で表示', pre: ['scenario=idle, pm.running=false'],
          steps: ['/ を開く'],
          expected: [
            '中央あたりに .coldstart カード',
            '"みんな寝てます 💤" 見出し',
            '本文 + ボタン行',
          ],
        },
        { id: 'CS-HIDE-01', pri: 0, scenario: 'active',
          name: '誰かが busy なら非表示', pre: ['scenario=active'],
          steps: [],
          expected: ['ColdStart が出ない'],
        },
        { id: 'CS-START-BTN-01', pri: 0, scenario: 'idle',
          name: '▶ PM を起動 が機能する', pre: [],
          steps: [
            '▶ PM を起動 をクリック',
            'devtools network or scenario state を確認',
          ],
          expected: [
            'alert() が出ない',
            'usePMSession.start() が呼ばれる',
            '結果として scenario.pm.running=true へ',
            'PMChatPanel が右に出現',
          ],
          link: 'B4',
        },
        { id: 'CS-TERMINAL-HINT-01', pri: 2, scenario: 'idle',
          name: 'terminal で /loom-pm ヒント', pre: [],
          steps: [],
          expected: ['ボタン横に "or terminal で /loom-pm" テキスト'],
        },
      ],
    },

    {
      id: 'rm-retro', name: 'RetroMode / RetroGathering',
      cases: [
        { id: 'RT-TOGGLE-EXISTS-01', pri: 1, scenario: 'any',
          name: 'RetroMode トグル UI が存在する', pre: [],
          steps: ['/ で retroMode 切替の UI を探す'],
          expected: [
            'Drawer MANAGE グループ or Room 右上にトグル',
            'クリックで setRetroMode 呼出',
            '存在しないなら state ごと削除されているべき',
          ],
          link: 'B5',
        },
        { id: 'RT-MODE-ON-01', pri: 1, scenario: 'any',
          name: 'retroMode=true で表示が切替', pre: ['toggle ON'],
          steps: ['retro モードに入る'],
          expected: [
            '5匹のデスクが消える',
            'RetroGathering が描画',
            'ポスター 3 枚も非表示',
          ],
        },
        { id: 'RT-NO-PLACEHOLDER-01', pri: 1, scenario: 'any',
          name: 'placeholder 文字列が無い', pre: [],
          steps: ['RoomView.tsx を grep "RetroView placeholder"'],
          expected: ['"<div>RetroView placeholder</div>" が無い'],
          link: 'B6',
        },
      ],
    },

    {
      id: 'rm-agent-overlay', name: 'AgentDetailPanel オーバーレイ',
      cases: [
        { id: 'AP-OPEN-01', pri: 0, scenario: 'any',
          name: 'デスククリックで開く', pre: [],
          steps: ['DEV 猫クリック'],
          expected: ['AgentDetailPanel が右上に滑り込み'],
        },
        { id: 'AP-Z-INDEX-01', pri: 1, scenario: 'any',
          name: 'z-index がトークン化', pre: [],
          steps: ['RoomView.tsx の AgentDetailPanel ラッパを grep'],
          expected: [
            'zIndex: 10 などの生数値が無い',
            'var(--z-agent-panel) のような token 参照',
          ],
          link: 'S9',
        },
        { id: 'AP-CLOSE-01', pri: 0, scenario: 'any',
          name: '× で閉じる', pre: ['開いている'],
          steps: ['× ボタンクリック'],
          expected: ['sel null, パネル unmount'],
        },
        { id: 'AP-ESC-01', pri: 2, scenario: 'any',
          name: 'Esc で閉じる', pre: ['開いている'],
          steps: ['Esc キー押下'],
          expected: ['パネルが閉じる（A11y 期待）'],
        },
      ],
    },
  ],
},

/* ============================================================
   3. PLAN — /plan
   ============================================================ */
{
  id: 'plan', zone: 'panel',
  title: '/plan — PlanView',
  path: 'ui/src/views/plan/PlanView.tsx',
  groups: [
    {
      id: 'pl-shell', name: '画面シェル',
      cases: [
        { id: 'PL-MOUNT-01', pri: 0, scenario: 'any',
          name: '描画される（エラーなし）', pre: [],
          steps: ['/plan を開く'],
          expected: ['PlanView mount', 'console.error 無し'],
        },
        { id: 'PL-NO-ROOM-01', pri: 0, scenario: 'any',
          name: 'RoomView が背景に居ない', pre: [],
          steps: ['DOM ツリーを確認'],
          expected: ['.room が DOM に無い'],
        },
        { id: 'PL-ACTIVE-01', pri: 0, scenario: 'any',
          name: 'Drawer の plan が active', pre: [],
          steps: [],
          expected: ['NavLink active class 付与'],
        },
      ],
    },
    {
      id: 'pl-header', name: 'ヘッダ / タブ',
      cases: [
        { id: 'PL-TITLE-01', pri: 1, scenario: 'any',
          name: 'タイトル表記', pre: [],
          steps: [],
          expected: ['"≡ PLAN — plan_items.json + TodoWrite" or 同等'],
        },
        { id: 'PL-TAB-ACTIVE-01', pri: 0, scenario: 'any',
          name: 'active タブ', pre: [],
          steps: ['active タブを選択（初期）'],
          expected: ['progress<1 の milestones のみ表示'],
        },
        { id: 'PL-TAB-DONE-01', pri: 0, scenario: 'any',
          name: 'done archive タブ', pre: [],
          steps: ['done タブをクリック'],
          expected: ['progress>=1 の milestones のみ表示', '0件なら hint メッセージ'],
        },
        { id: 'PL-TAB-EDIT-01', pri: 0, scenario: 'any',
          name: 'edit タブ', pre: [],
          steps: ['edit タブをクリック'],
          expected: ['各 milestone に edit ボタンが追加表示'],
        },
        { id: 'PL-NEW-01', pri: 0, scenario: 'any',
          name: '+ milestone ボタン', pre: [],
          steps: ['+ milestone をクリック'],
          expected: [
            'usePlanMutations.upsertItem 呼出',
            'リストに「新しい milestone」が追加',
          ],
        },
      ],
    },
    {
      id: 'pl-milestones', name: 'Milestone カード',
      cases: [
        { id: 'PL-CARD-01', pri: 1, scenario: 'any',
          name: 'カード描画', pre: ['milestones が1件以上'],
          steps: [],
          expected: ['id, title, count, progress bar, children が見える'],
        },
        { id: 'PL-PROGRESS-01', pri: 1, scenario: 'any',
          name: 'progress bar 幅と色', pre: [],
          steps: [],
          expected: [
            'fill width = progress*100%',
            'progress>=1 で var(--p-success)',
            'それ以外で var(--p-accent)',
          ],
        },
        { id: 'PL-CHILD-01', pri: 1, scenario: 'any',
          name: 'children 行のアイコン', pre: [],
          steps: [],
          expected: [
            'completed → ✓ / 取消線 / muted',
            'in_progress → ◐ / warn 色',
            'pending → ○ / stone 色',
          ],
        },
        { id: 'PL-EDIT-BTN-01', pri: 0, scenario: 'any',
          name: 'edit ボタンに onClick', pre: ['tab=edit'],
          steps: ['任意 milestone の edit を押す'],
          expected: [
            '編集モーダル or インライン編集が起動',
            'noop じゃない',
          ],
          link: 'B8',
        },
      ],
    },
    {
      id: 'pl-todos', name: 'TodoWrite mirror',
      cases: [
        { id: 'PL-TODOS-MIRROR-01', pri: 0, scenario: 'any',
          name: '右ペインに todo 一覧', pre: ['scenario.todos が1件以上'],
          steps: [],
          expected: ['scenario.todos の全件が並ぶ', 'sticky で追従'],
        },
        { id: 'PL-TODOS-TIMESTAMP-01', pri: 2, scenario: 'any',
          name: 'updatedAt 表記', pre: [],
          steps: [],
          expected: ['ヘッダ右に todosUpdatedAt を小さく表示'],
        },
        { id: 'PL-TODOS-READONLY-01', pri: 2, scenario: 'any',
          name: 'read-only であることが明示', pre: [],
          steps: [],
          expected: ['"◆ ここは read-only mirror" hint が見える'],
        },
      ],
    },
    {
      id: 'pl-style', name: 'スタイル（トークン化）',
      cases: [
        { id: 'PL-INLINE-01', pri: 1, scenario: 'any',
          name: 'inline style がほぼ全廃', pre: [],
          steps: ['grep "style={{" ui/src/views/plan'],
          expected: [
            '動的値（width/progress 等）以外は 0 件',
            'screens/plan.css に切り出し済み',
          ],
          link: 'S6',
        },
      ],
    },
  ],
},

/* ============================================================
   4. GANTT — /gantt
   ============================================================ */
{
  id: 'gantt', zone: 'panel',
  title: '/gantt — GanttView',
  path: 'ui/src/views/gantt/GanttView.tsx',
  groups: [
    { id: 'gn-shell', name: '画面シェル', cases: [
      { id: 'GA-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/gantt'],
        expected: ['mount', 'error 無し'] },
      { id: 'GA-ACTIVE-01', pri: 1, scenario: 'any', name: 'Drawer active', pre: [], steps: [],
        expected: ['gantt nav-link が active'] },
    ]},
    { id: 'gn-bars', name: 'タスクバー', cases: [
      { id: 'GA-BARS-01', pri: 0, scenario: 'active', name: 'バーが時系列で並ぶ', pre: ['scenario=active'],
        steps: ['gantt tracks を確認'],
        expected: ['各タスクが横棒で描画', '時間軸が連続', '同時並行が visually overlap'] },
      { id: 'GA-COLOR-01', pri: 1, scenario: 'active', name: 'ステータス色', pre: [], steps: [],
        expected: ['busy/review/failed/completed で色が違う'] },
      { id: 'GA-TOOLTIP-01', pri: 2, scenario: 'active', name: 'ホバーで詳細', pre: [],
        steps: ['バーにホバー'], expected: ['tooltip でタスク詳細'] },
      { id: 'GA-EMPTY-01', pri: 2, scenario: 'idle', name: '空状態', pre: ['scenario=idle'],
        steps: [], expected: ['empty state メッセージ'] },
    ]},
    { id: 'gn-style', name: 'スタイル', cases: [
      { id: 'GA-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/gantt.css へ'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   5. CONSISTENCY — /consistency
   ============================================================ */
{
  id: 'consistency', zone: 'panel',
  title: '/consistency — ConsistencyView',
  path: 'ui/src/views/consistency/',
  groups: [
    { id: 'cn-shell', name: 'シェル', cases: [
      { id: 'CN-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/consistency'],
        expected: ['mount'] },
      { id: 'CN-LIVE-FORK-01', pri: 1, scenario: 'any', name: 'Live版/通常版の使い分け', pre: [],
        steps: [], expected: ['切替 UI が明確 / どちらが今表示中か分かる'] },
    ]},
    { id: 'cn-list', name: 'Findings 一覧', cases: [
      { id: 'CN-LIST-01', pri: 0, scenario: 'failed', name: 'findings が並ぶ', pre: ['scenario=failed'],
        steps: [], expected: ['1件以上の finding カード'] },
      { id: 'CN-SEVERITY-01', pri: 1, scenario: 'failed', name: 'severity 色分け', pre: [],
        steps: [], expected: ['error/warn/info で色 or アイコンが違う'] },
    ]},
    { id: 'cn-actions', name: 'アクション', cases: [
      { id: 'CN-RESOLVE-01', pri: 0, scenario: 'failed', name: 'acknowledge', pre: [],
        steps: ['ack ボタンクリック'], expected: ['useConsistencyMutations 経由で状態更新'] },
      { id: 'CN-DISMISS-01', pri: 1, scenario: 'failed', name: 'dismiss', pre: [],
        steps: ['dismiss ボタンクリック'], expected: ['finding がリストから消える'] },
      { id: 'CN-FILTER-01', pri: 2, scenario: 'failed', name: 'severity フィルタ', pre: [],
        steps: ['error のみに絞る'], expected: ['他 severity が非表示'] },
    ]},
    { id: 'cn-style', name: 'スタイル', cases: [
      { id: 'CN-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/consistency.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   6. CUSTOMIZATION — /customization (legacy v1 — flat schema 前提)
   ⚠ PR#18 で schema v2 (agents + skills tree) に移行済。新テストは §14 を参照。
   ============================================================ */
{
  id: 'customization', zone: 'panel',
  title: '/customization — CustomizationView (legacy v1, flat schema)',
  path: 'ui/src/views/customization/',
  groups: [
    { id: 'cu-shell', name: 'シェル', cases: [
      { id: 'CU-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/customization'],
        expected: ['mount'] },
    ]},
    { id: 'cu-edit', name: '編集 / 保存', cases: [
      { id: 'CU-EDIT-01', pri: 0, scenario: 'any', name: 'フィールド編集 → 保存', pre: [],
        steps: ['値を変える', '保存ボタン押す'], expected: ['useCustomizationMutations 経由で永続化', 'toast で成功通知'] },
      { id: 'CU-DEFAULT-01', pri: 2, scenario: 'any', name: 'デフォルト復帰', pre: [],
        steps: ['reset to default をクリック'], expected: ['初期値に戻る'] },
      { id: 'CU-VALIDATION-01', pri: 1, scenario: 'any', name: 'バリデーション', pre: [],
        steps: ['不正値を入れて保存'], expected: ['エラーメッセージ表示 / 保存ブロック'] },
    ]},
    { id: 'cu-style', name: 'スタイル', cases: [
      { id: 'CU-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/customization.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   7. RETRO — /retro (legacy v1 — pre-lifecycle / no carryover)
   ⚠ PR#20+21 で pending.json schema v3 + KPT board に移行。新テストは §15 を参照。
   ============================================================ */
{
  id: 'retro', zone: 'panel',
  title: '/retro — RetroView (legacy v1, no lifecycle)',
  path: 'ui/src/views/retro/RetroView.tsx',
  groups: [
    { id: 're-shell', name: 'シェル', cases: [
      { id: 'RE-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/retro'],
        expected: ['mount'] },
      { id: 'RE-INDEPENDENT-01', pri: 1, scenario: 'any', name: 'Room の retroMode と独立', pre: [],
        steps: [], expected: ['/retro へ遷移しても RoomView の retroMode と無関係', '別 store / 別 view'] },
    ]},
    { id: 're-content', name: '内容', cases: [
      { id: 'RE-AGENTS-01', pri: 1, scenario: 'any', name: 'retro agents が並ぶ', pre: [],
        steps: [], expected: ['Keep/Problem/Try 等の枠と猫'] },
      { id: 'RE-START-01', pri: 2, scenario: 'any', name: 'セッション開始/終了', pre: [],
        steps: ['start ボタン → end ボタン'], expected: ['state 切替'] },
    ]},
    { id: 're-style', name: 'スタイル', cases: [
      { id: 'RE-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/retro.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   8. WORKTREE — /worktree
   ============================================================ */
{
  id: 'worktree', zone: 'panel',
  title: '/worktree — WorktreeView / SubroomView',
  path: 'ui/src/views/worktree/',
  groups: [
    { id: 'wt-shell', name: 'シェル', cases: [
      { id: 'WT-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/worktree'],
        expected: ['mount'] },
      { id: 'WT-QUERY-01', pri: 0, scenario: 'any', name: 'branch query で特定 worktree', pre: [],
        steps: ['/worktree?branch=feature/x'], expected: ['その branch の subroom がフォーカス'] },
    ]},
    { id: 'wt-list', name: '一覧 / 操作', cases: [
      { id: 'WT-LIST-01', pri: 0, scenario: 'active', name: 'worktree 一覧', pre: ['scenario=active'],
        steps: [], expected: ['scenario.worktrees 全件が並ぶ'] },
      { id: 'WT-CREATE-01', pri: 0, scenario: 'any', name: '新規作成', pre: [],
        steps: ['create ボタン → branch 名入力 → 作成'], expected: ['useWorktreeMutations 経由', 'リストに追加'] },
      { id: 'WT-DELETE-01', pri: 0, scenario: 'active', name: '削除', pre: [],
        steps: ['delete → 確認'], expected: ['一覧から消える'] },
      { id: 'WT-SWITCH-01', pri: 1, scenario: 'active', name: '切替', pre: [],
        steps: ['別 worktree をクリック'], expected: ['URL の branch query が変わる', '内容が切替'] },
    ]},
    { id: 'wt-subroom', name: 'SubroomView', cases: [
      { id: 'WT-SUB-RENDER-01', pri: 1, scenario: 'active', name: 'subroom が描画', pre: [],
        steps: [], expected: ['その worktree 内のミニオフィスが見える'] },
    ]},
    { id: 'wt-style', name: 'スタイル', cases: [
      { id: 'WT-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/worktree.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   9. GUIDANCE — /guidance
   ============================================================ */
{
  id: 'guidance', zone: 'panel',
  title: '/guidance — LearnedGuidanceView (legacy v1 — agent-keyed only)',
  path: 'ui/src/views/guidance/',
  groups: [
    { id: 'gu-shell', name: 'シェル', cases: [
      { id: 'GU-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/guidance'],
        expected: ['mount'] },
    ]},
    { id: 'gu-list', name: 'ルール一覧 / 編集', cases: [
      { id: 'GU-LIST-01', pri: 0, scenario: 'any', name: 'guidance ルール一覧', pre: [],
        steps: [], expected: ['scenario.guidance が並ぶ'] },
      { id: 'GU-ADD-01', pri: 0, scenario: 'any', name: '追加', pre: [],
        steps: ['+追加 → 入力 → 保存'], expected: ['useGuidanceMutations 経由', 'リストに追加'] },
      { id: 'GU-EDIT-01', pri: 1, scenario: 'any', name: '編集', pre: [],
        steps: ['ルールクリック → 編集 → 保存'], expected: ['更新反映'] },
      { id: 'GU-DELETE-01', pri: 1, scenario: 'any', name: '削除', pre: [],
        steps: ['delete → 確認'], expected: ['一覧から消える'] },
    ]},
    { id: 'gu-style', name: 'スタイル', cases: [
      { id: 'GU-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/guidance.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   10. SESSIONS — /sessions
   ============================================================ */
{
  id: 'sessions', zone: 'panel',
  title: '/sessions — SessionListView (column reviewer_agent rename → §17 参照)',
  path: 'ui/src/views/session-list/SessionListView.tsx',
  groups: [
    { id: 'se-shell', name: 'シェル', cases: [
      { id: 'SE-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/sessions'],
        expected: ['mount'] },
    ]},
    { id: 'se-list', name: '一覧', cases: [
      { id: 'SE-LIST-01', pri: 0, scenario: 'any', name: 'セッション一覧', pre: ['useSessionList'],
        steps: [], expected: ['過去セッションが並ぶ', '時刻 / モデル / トークンが見える'] },
      { id: 'SE-OPEN-01', pri: 0, scenario: 'any', name: 'セッション詳細', pre: [],
        steps: ['行をクリック'], expected: ['詳細パネル or 別画面が開く'] },
      { id: 'SE-FILTER-01', pri: 2, scenario: 'any', name: 'フィルタ', pre: [],
        steps: ['agent or 日付フィルタ'], expected: ['結果が絞られる'] },
      { id: 'SE-SORT-01', pri: 2, scenario: 'any', name: 'ソート', pre: [],
        steps: ['列見出しクリック'], expected: ['並び順変化'] },
    ]},
    { id: 'se-style', name: 'スタイル', cases: [
      { id: 'SE-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/sessions.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   11. PROJECT SETTINGS — /project-settings
   ============================================================ */
{
  id: 'project-settings', zone: 'panel',
  title: '/project-settings — ProjectSettingsView',
  path: 'ui/src/views/project-settings/',
  groups: [
    { id: 'ps-shell', name: 'シェル', cases: [
      { id: 'PS-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/project-settings'],
        expected: ['mount'] },
      { id: 'PS-FROM-TOPBAR-01', pri: 1, scenario: 'any', name: 'TopBar から到達', pre: [],
        steps: ['TopBar ◆ <project> をクリック'], expected: ['/project-settings へ navigate'], link: 'B7' },
    ]},
    { id: 'ps-edit', name: '設定 / 保存', cases: [
      { id: 'PS-EDIT-01', pri: 0, scenario: 'any', name: '値を変えて保存', pre: [],
        steps: ['任意の項目変更 → 保存'], expected: ['useProjectSettingsMutation 経由', 'persisted'] },
      { id: 'PS-CANCEL-01', pri: 2, scenario: 'any', name: 'キャンセル', pre: ['変更中'],
        steps: ['キャンセルクリック'], expected: ['変更が破棄される'] },
    ]},
    { id: 'ps-style', name: 'スタイル', cases: [
      { id: 'PS-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/project-settings.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   12. TOKENS — /tokens
   ============================================================ */
{
  id: 'tokens', zone: 'panel',
  title: '/tokens — TokenMeterView / TokensView',
  path: 'ui/src/views/tokens/',
  groups: [
    { id: 'tk-shell', name: 'シェル', cases: [
      { id: 'TK-MOUNT-01', pri: 0, scenario: 'any', name: '描画', pre: [], steps: ['/tokens'],
        expected: ['mount'] },
    ]},
    { id: 'tk-data', name: 'メーター / 内訳', cases: [
      { id: 'TK-METER-01', pri: 0, scenario: 'active', name: 'トークン使用量メーター', pre: [],
        steps: [], expected: ['useTokenUsage 経由', 'input/output/cache の内訳が見える'] },
      { id: 'TK-COST-01', pri: 1, scenario: 'active', name: 'コスト計算', pre: [],
        steps: [], expected: ['costOf() の結果が表示', 'モデルごとに別計算'] },
      { id: 'TK-GRAPH-01', pri: 2, scenario: 'active', name: 'グラフ表示', pre: [],
        steps: [], expected: ['時間軸 or 累積で可視化'] },
    ]},
    { id: 'tk-style', name: 'スタイル', cases: [
      { id: 'TK-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/tokens.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   13. AGENT DETAIL — /agents/:id
   ============================================================ */
{
  id: 'agent-detail', zone: 'overlay',
  title: 'AgentDetailPanel',
  path: 'ui/src/views/room/AgentDetailPanel.tsx',
  groups: [
    { id: 'ad-open', name: '開閉', cases: [
      { id: 'AD-OPEN-FROM-ROOM-01', pri: 0, scenario: 'any', name: 'Room から開く', pre: ['/'],
        steps: ['DEV クリック'], expected: ['右上にスライド表示'] },
      { id: 'AD-OPEN-DEEPLINK-01', pri: 1, scenario: 'any', name: 'deep link', pre: [],
        steps: ['/agents/dev へ直接アクセス'], expected: ['Panel が dev で初期表示'] },
      { id: 'AD-CLOSE-X-01', pri: 0, scenario: 'any', name: '×で閉じる', pre: ['開いてる'],
        steps: ['×クリック'], expected: ['unmount'] },
      { id: 'AD-CLOSE-ESC-01', pri: 2, scenario: 'any', name: 'Escで閉じる', pre: ['開いてる'],
        steps: ['Esc押下'], expected: ['閉じる'] },
    ]},
    { id: 'ad-content', name: '内容', cases: [
      { id: 'AD-PROFILE-01', pri: 1, scenario: 'any', name: 'プロフィール表示', pre: [],
        steps: [], expected: ['name / role / cat sprite / current task'] },
      { id: 'AD-NOTES-01', pri: 0, scenario: 'any', name: 'AgentDetailNotes 編集', pre: [],
        steps: ['ノート入力 → blur / save'], expected: ['useNoteMutations 経由で保存', 'reload で残る'] },
      { id: 'AD-DISPATCH-HIST-01', pri: 2, scenario: 'active', name: 'dispatch history', pre: [],
        steps: [], expected: ['useAgentDispatchHistory で過去 dispatch'] },
    ]},
    { id: 'ad-style', name: 'スタイル', cases: [
      { id: 'AD-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/agent-detail.css'], link: 'S6' },
      { id: 'AD-Z-01', pri: 1, scenario: 'any', name: 'z-index トークン化', pre: [],
        steps: [], expected: ['生 zIndex 数値が無い'], link: 'S9' },
    ]},
  ],
},

/* ============================================================
   14. PM CHAT — 右カラム（PM running 時）
   ============================================================ */
{
  id: 'pm-chat', zone: 'overlay',
  title: 'PMChatPanel',
  path: 'ui/src/views/pm-chat/',
  groups: [
    { id: 'pm-mount', name: 'mount / unmount', cases: [
      { id: 'PM-MOUNT-01', pri: 0, scenario: 'active', name: 'PM running で mount', pre: ['scenario=active'],
        steps: ['/'], expected: ['右に width=340 で表示'] },
      { id: 'PM-UNMOUNT-01', pri: 0, scenario: 'idle', name: 'PM offline で unmount', pre: ['scenario=idle'],
        steps: [], expected: ['PMChat が DOM に無い', '代わりに LiveRail'] },
      { id: 'PM-PENDING-MOUNT-01', pri: 1, scenario: 'any', name: 'pendingApprovals でも mount', pre: ['scenario.pm.pendingApprovals.length>0'],
        steps: [], expected: ['PM running=false でも PMChat 表示'] },
    ]},
    { id: 'pm-chat-ui', name: 'チャット UI', cases: [
      { id: 'PM-MESSAGES-01', pri: 0, scenario: 'active', name: 'メッセージ表示', pre: [],
        steps: [], expected: ['pm.messages が順に並ぶ'] },
      { id: 'PM-SEND-01', pri: 0, scenario: 'active', name: '送信が動く', pre: [],
        steps: ['入力 → Enter or send'], expected: ['pmSession.say(text) 呼出', 'メッセージが上に追加'] },
      { id: 'PM-STREAM-01', pri: 1, scenario: 'active', name: 'stream イベント反映', pre: [],
        steps: [], expected: ['scenario.stream が pulled in / 順次表示'] },
    ]},
    { id: 'pm-approval', name: '承認フロー', cases: [
      { id: 'PM-APPROVAL-MODAL-01', pri: 0, scenario: 'any', name: 'PMApprovalModal', pre: ['pendingApprovals あり'],
        steps: [], expected: ['Modal がトップに出る / allow / deny ボタン'] },
      { id: 'PM-APPROVAL-ALLOW-01', pri: 0, scenario: 'any', name: 'allow', pre: ['pending あり'],
        steps: ['allow クリック'], expected: ['pmSession.permission(id, true) 呼出', 'pending 数が減る'] },
      { id: 'PM-APPROVAL-DENY-01', pri: 0, scenario: 'any', name: 'deny', pre: ['pending あり'],
        steps: ['deny クリック'], expected: ['pmSession.permission(id, false) 呼出'] },
      { id: 'PM-APPROVAL-TOAST-01', pri: 2, scenario: 'any', name: 'PMApprovalToast', pre: [],
        steps: [], expected: ['approval pending を toast でも通知（オプション）'] },
    ]},
    { id: 'pm-start', name: '起動', cases: [
      { id: 'PM-START-BTN-01', pri: 0, scenario: 'idle', name: 'PMChat 内の起動ボタン', pre: ['pm.running=false だが UI を強制的に開く設計の場合'],
        steps: ['start クリック'], expected: ['pmSession.start() 呼出'] },
    ]},
    { id: 'pm-style', name: 'スタイル', cases: [
      { id: 'PM-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['screens/pm-chat.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   15. LIVE RAIL — 右カラム（PM offline 時）
   ============================================================ */
{
  id: 'live-rail', zone: 'overlay',
  title: 'LiveRail',
  path: 'ui/src/views/room/LiveRail.tsx',
  groups: [
    { id: 'lr-mount', name: 'mount', cases: [
      { id: 'LR-MOUNT-01', pri: 0, scenario: 'idle', name: 'PM offline + Room で表示', pre: ['scenario=idle, /'],
        steps: [], expected: ['mount', '⚡ LIVE STREAM ヘッダ'] },
      { id: 'LR-HIDE-PM-01', pri: 0, scenario: 'active', name: 'PM running で hide', pre: ['scenario=active'],
        steps: [], expected: ['LiveRail が unmount'] },
      { id: 'LR-HIDE-NONROOM-01', pri: 1, scenario: 'idle', name: '非 Room で hide', pre: [],
        steps: ['/plan へ'], expected: ['unmount'] },
    ]},
    { id: 'lr-tabs', name: 'タブ', cases: [
      { id: 'LR-TAB-MERGED-01', pri: 0, scenario: 'idle', name: 'ALL (merged)', pre: [],
        steps: ['ALL タブ'], expected: ['stream 全件表示'] },
      { id: 'LR-TAB-REASONING-01', pri: 1, scenario: 'idle', name: 'reasoning フィルタ', pre: [],
        steps: ['reasoning タブ'], expected: ['kind=reason のみ'] },
      { id: 'LR-TAB-TOOLS-01', pri: 1, scenario: 'idle', name: 'tools フィルタ', pre: [],
        steps: ['tools タブ'], expected: ['kind=tool のみ'] },
    ]},
    { id: 'lr-state', name: '空 / 折りたたみ', cases: [
      { id: 'LR-EMPTY-01', pri: 1, scenario: 'idle', name: 'stream 空時の hint', pre: ['stream=[]'],
        steps: [], expected: ['"静かです… /loom-go で開発開始" 表示'] },
      { id: 'LR-COLLAPSE-01', pri: 1, scenario: 'idle', name: '折りたたみ', pre: [],
        steps: ['× クリック'], expected: ['unmount → ⚡ LIVE 小ボタン出現'] },
      { id: 'LR-EXPAND-01', pri: 1, scenario: 'idle', name: '展開', pre: ['折りたたまれた状態'],
        steps: ['⚡ LIVE 押す'], expected: ['LiveRail 再 mount'] },
      { id: 'LR-DUP-01', pri: 1, scenario: 'any', name: 'collapse 実装の重複解消', pre: [],
        steps: ['LiveRail.tsx と AppShell.tsx の collapsed 関連コードを diff'],
        expected: ['1箇所に集約'], link: 'B9' },
    ]},
    { id: 'lr-style', name: 'スタイル', cases: [
      { id: 'LR-INLINE-01', pri: 1, scenario: 'any', name: 'inline 全廃', pre: [],
        steps: ['grep'], expected: ['shell.css or screens/live-rail.css'], link: 'S6' },
    ]},
  ],
},

/* ============================================================
   16. OVERALL — 横断テスト
   ============================================================ */
{
  id: 'overall', zone: 'shell',
  title: '全体動作 — 横断',
  path: '—',
  groups: [
    { id: 'ov-error', name: 'エラー / 警告', cases: [
      { id: 'OV-CONSOLE-ERROR-01', pri: 0, scenario: 'any', name: '全画面で console.error 無し', pre: [],
        steps: ['/ /plan /gantt /retro /worktree /consistency /customization /guidance /sessions /project-settings /tokens を順に開く'],
        expected: ['1件も error 無し'] },
      { id: 'OV-CONSOLE-WARN-01', pri: 1, scenario: 'any', name: 'warn が許容範囲', pre: [],
        steps: ['同上'], expected: ['React 開発時の既知警告以外は 0 件'] },
      { id: 'OV-NETWORK-404-01', pri: 1, scenario: 'any', name: '404 リソース無し', pre: [],
        steps: ['Network タブ確認'], expected: ['favicon 以外 404 無し'] },
    ]},
    { id: 'ov-scenarios', name: 'シナリオ動作', cases: [
      { id: 'OV-SCENARIO-IDLE-01', pri: 0, scenario: 'idle', name: 'idle 完走', pre: [],
        steps: ['全画面を idle で巡回'], expected: ['崩れ無し, ColdStart 出る'] },
      { id: 'OV-SCENARIO-ACTIVE-01', pri: 0, scenario: 'active', name: 'active 完走', pre: [],
        steps: ['active で巡回'], expected: ['DEV busy, PM 動作, stream 流れる'] },
      { id: 'OV-SCENARIO-FAILED-01', pri: 0, scenario: 'failed', name: 'failed 完走', pre: [],
        steps: ['failed で巡回'], expected: ['fail 表示, TDD violations, consistency に findings'] },
      { id: 'OV-SCENARIO-SWITCH-01', pri: 1, scenario: 'any', name: 'シナリオ切替が即時', pre: [],
        steps: ['Picker で idle→active→failed'], expected: ['全画面が一斉に新 scenario に追従'] },
    ]},
    { id: 'ov-onclick', name: 'onClick / 動作保証', cases: [
      { id: 'OV-ALL-BUTTONS-01', pri: 0, scenario: 'any', name: '全 button に onClick or 明確な動作', pre: [],
        steps: ['全画面の各 button を順にクリック'], expected: ['noop / alert() / TODO が0', 'すべて遷移 or modal or mutation を起こす'] },
      { id: 'OV-NO-ALERT-01', pri: 0, scenario: 'any', name: 'alert() 直書き0件', pre: [],
        steps: ['grep "alert(" ui/src'], expected: ['production code に alert() 無し'] },
      { id: 'OV-NO-PLACEHOLDER-01', pri: 0, scenario: 'any', name: 'placeholder 文字列0件', pre: [],
        steps: ['grep "placeholder" / "TODO" / "FIXME" ui/src'], expected: ['UI に出る placeholder 文字列無し'] },
    ]},
    { id: 'ov-style', name: 'スタイル / トークン化', cases: [
      { id: 'OV-INLINE-COUNT-01', pri: 1, scenario: 'any', name: 'inline style 数', pre: [],
        steps: ['grep -rn "style={{" ui/src/views | wc -l'], expected: ['動的値以外は実質0（progress bar width 等のみ許容）'], link: 'S6' },
      { id: 'OV-Z-INDEX-01', pri: 1, scenario: 'any', name: '生 zIndex 数値0件', pre: [],
        steps: ['grep "zIndex:\\s*[0-9]" ui/src'], expected: ['すべて --z-* 経由'], link: 'S9' },
      { id: 'OV-TONE-01', pri: 1, scenario: 'any', name: '画面トーンが一貫', pre: [],
        steps: ['/ → /plan → /gantt と順に開いてスクショ比較'], expected: ['ピクセル/RPG トーンが全画面で保たれる', '普通の Web 画面に化けない'] },
    ]},
    { id: 'ov-routing', name: 'Routing 整合性', cases: [
      { id: 'OV-BACK-FORWARD-01', pri: 0, scenario: 'any', name: 'browser back/forward', pre: [],
        steps: ['/ → /plan → /gantt → 戻 → 戻 → 進'], expected: ['すべて正しい画面が描画'] },
      { id: 'OV-DEEPLINK-ALL-01', pri: 0, scenario: 'any', name: '全 route deep link', pre: [],
        steps: ['各 route を URL 直入力'], expected: ['すべて該当画面 + Drawer active'] },
      { id: 'OV-404-01', pri: 2, scenario: 'any', name: '存在しない URL', pre: [],
        steps: ['/foo に直接アクセス'], expected: ['fallback or リダイレクト（決定方針による）'] },
    ]},
    { id: 'ov-realtime', name: 'リアルタイム', cases: [
      { id: 'OV-WS-RECONNECT-01', pri: 0, scenario: 'any', name: 'WS 切断 → 再接続', pre: ['daemon 操作可'],
        steps: ['daemon を kill', '5s 後 restart'], expected: ['切断検知バナー → 再接続で消える', 'scenario 復旧'] },
      { id: 'OV-STREAM-EVENT-01', pri: 1, scenario: 'active', name: 'stream イベントが live で反映', pre: [],
        steps: ['scenario=active の stream 観察'], expected: ['LiveRail/PMChat に流れ続ける', 'speech bubble も更新'] },
    ]},
    { id: 'ov-a11y', name: 'A11y', cases: [
      { id: 'OV-A11Y-KEYBOARD-01', pri: 2, scenario: 'any', name: 'キーボードナビ', pre: [],
        steps: ['Tab で順に focus 移動'], expected: ['Drawer / TopBar / 主要ボタンが順に focus', 'focus ring 見える'] },
      { id: 'OV-A11Y-ARIA-01', pri: 2, scenario: 'any', name: 'aria 属性', pre: [],
        steps: ['Drawer toggle / Nav に aria-label'], expected: ['aria-label 適切'] },
      { id: 'OV-A11Y-ESC-01', pri: 2, scenario: 'any', name: 'Esc でモーダル系を閉じる', pre: ['AgentDetailPanel 開いてる'],
        steps: ['Esc 押す'], expected: ['閉じる'] },
    ]},
    { id: 'ov-perf', name: 'パフォーマンス', cases: [
      { id: 'OV-INITIAL-LOAD-01', pri: 2, scenario: 'any', name: '初期描画 < 2s', pre: ['キャッシュなし'],
        steps: ['DevTools Performance で計測'], expected: ['First contentful paint < 2s（目安）'] },
      { id: 'OV-RESIZE-PERF-01', pri: 2, scenario: 'any', name: 'リサイズ時にカクつかない', pre: [],
        steps: ['Room でウィンドウを激しくリサイズ'], expected: ['60fps 近くを維持'] },
      { id: 'OV-MEMORY-LEAK-01', pri: 2, scenario: 'any', name: 'route 往復で memory リーク無し', pre: [],
        steps: ['/ ↔ /plan を 20 回往復', 'memory snapshot'], expected: ['heap が線形増加しない'] },
    ]},
    { id: 'ov-i18n', name: 'i18n / コピー', cases: [
      { id: 'OV-COPY-CONSTANTS-01', pri: 1, scenario: 'any', name: '表示文字列が constants 経由', pre: [],
        steps: ['grep "DEV PIT" / "WS connected" 等を ui/src/views で'],
        expected: ['ベタ書き無し / constants.ts 経由'], link: 'G6' },
    ]},
    { id: 'ov-test', name: '自動テスト', cases: [
      { id: 'OV-PW-SNAPSHOT-01', pri: 1, scenario: 'any', name: 'Playwright スナップショット', pre: [],
        steps: ['pnpm test:visual を流す'], expected: ['全 baseline と diff 0'] },
      { id: 'OV-UNIT-01', pri: 1, scenario: 'any', name: 'Unit / hook tests pass', pre: [],
        steps: ['pnpm test'], expected: ['すべて green'] },
    ]},
  ],
},

/* ============================================================
   17. E2E FLOWS — ユーザーが実際にやる一連の操作
   SCREEN_REQUIREMENTS §2.2 典型シナリオ + §3 観測 + §4 介入
   ============================================================ */
{
  id: 'flows', zone: 'shell',
  title: 'E2E フロー — 実利用シナリオ',
  path: '—',
  groups: [
    { id: 'fl-coldstart', name: 'F1. 朝の起動シーケンス', cases: [
      {
        id: 'FL-COLDSTART-01', pri: 0, scenario: 'any',
        name: 'cold start: /loom-pm → daemon 起動 → ブラウザ自動オープン',
        pre: ['daemon 停止状態', 'プロジェクトに claude-loom インストール済'],
        steps: [
          'Claude Code を起動',
          'プロジェクト dir で /loom-pm を実行',
          '~5 秒待つ',
        ],
        expected: [
          'SessionStart hook 経由で daemon が cold start',
          'ブラウザが 127.0.0.1:5757 を自動で開く',
          'GUI が描画される',
          'Room 画面に PM 猫が居る (idle ステータス)',
          'WS connected 状態',
          'コンソールに 5757 開始 log',
        ],
      },
      {
        id: 'FL-COLDSTART-02', pri: 1, scenario: 'any',
        name: 'warm start: ブラウザは開かない',
        pre: ['daemon すでに稼働中'],
        steps: ['同じ /loom-pm を再度実行'],
        expected: [
          '既存タブがそのまま使える',
          '新規ブラウザタブが追加で開かない',
          'log に "warm start" 等の表記',
        ],
      },
      {
        id: 'FL-COLDSTART-03', pri: 1, scenario: 'any',
        name: 'headless 環境: URL 出力のみ',
        pre: ['SSH 経由 / DISPLAY なし'],
        steps: ['/loom-pm を実行'],
        expected: [
          'ブラウザ起動を skip',
          'URL がターミナルに出力される',
          'daemon は通常起動',
        ],
      },
      {
        id: 'FL-COLDSTART-04', pri: 1, scenario: 'any',
        name: 'opt-out: LOOM_NO_UI=1',
        pre: ['LOOM_NO_UI=1 が export 済'],
        steps: ['/loom-pm を実行'],
        expected: [
          'ブラウザを開かない',
          'daemon は起動する',
        ],
      },
      {
        id: 'FL-COLDSTART-05', pri: 1, scenario: 'any',
        name: '30 分 idle shutdown → 復活',
        pre: ['daemon 稼働中、30 分以上操作なし'],
        steps: [
          'daemon が自動停止することを確認',
          '/loom-pm を再実行',
        ],
        expected: [
          'daemon が再起動',
          '前回の SQLite データが保持されている',
          'GUI 再 connect で履歴も復元',
        ],
      },
    ]},

    { id: 'fl-pm-flow', name: 'F2. PM チャット → 指示 → 完了', cases: [
      {
        id: 'FL-PM-START-01', pri: 0, scenario: 'idle',
        name: 'PM 起動: ColdStart カード → 右に PM チャット',
        pre: ['scenario=idle / pm.running=false'],
        steps: [
          'ColdStart「▶ PM を起動」をクリック',
          '~1 秒待つ',
        ],
        expected: [
          'PM 猫の status が busy に変化',
          '右カラムが LiveRail から PMChatPanel に切替',
          'PM の初期メッセージが表示',
          'StatusBar の scenario ラベルが更新',
        ],
        link: 'B4',
      },
      {
        id: 'FL-PM-SAY-01', pri: 0, scenario: 'active',
        name: 'PM にメッセージ送信',
        pre: ['scenario=active'],
        steps: [
          'PMChat 入力欄に "進捗教えて" と入力',
          'Enter or 送信ボタン',
        ],
        expected: [
          'メッセージがチャット履歴に即追加 (optimistic)',
          'pmSession.say() 呼出 (Network タブで確認)',
          'PM の応答が stream 経由で流れる',
          'PM 猫の bubble に応答内容の冒頭',
        ],
      },
      {
        id: 'FL-PM-GO-01', pri: 0, scenario: 'idle',
        name: '/loom-go: PM が Dev を dispatch',
        pre: ['PM 起動済、Plan に未着手タスクあり'],
        steps: [
          'Claude Code 側で /loom-go',
          'GUI 上の変化を観察 ~5 秒',
        ],
        expected: [
          'Dev 猫が idle → busy に変化',
          'Dev の bubble に dispatch されたタスク名',
          'GanttView に新しい bar が伸び始める',
          'stream に dispatch イベント',
        ],
      },
      {
        id: 'FL-PM-DONE-01', pri: 0, scenario: 'active',
        name: 'subagent 完了 → 状態遷移',
        pre: ['Dev が busy で動作中'],
        steps: ['Dev のタスク完了を待つ'],
        expected: [
          'Dev 猫が busy → idle (or review) へ',
          'Gantt bar が確定終了',
          'PM 側で結果が次フェーズに引き継がれる',
        ],
      },
    ]},

    { id: 'fl-approval', name: 'F3. PM 承認フロー (tool permission)', cases: [
      {
        id: 'FL-APPROVE-PENDING-01', pri: 0, scenario: 'any',
        name: 'pending approval が toast/modal で通知',
        pre: ['pendingApprovals 1件以上'],
        steps: [
          'pendingApprovals が発生する scenario を再現',
        ],
        expected: [
          'PMApprovalModal or PMApprovalToast が画面に出る',
          '内容: tool 名 / 対象 file 等',
          'allow / deny ボタンが見える',
        ],
      },
      {
        id: 'FL-APPROVE-ALLOW-01', pri: 0, scenario: 'any',
        name: 'allow → PM 続行',
        pre: ['pending あり'],
        steps: ['allow をクリック'],
        expected: [
          'pmSession.permission(id, true) 呼出',
          'pendingApprovals 数が -1',
          'PM が処理を継続 (stream にイベント)',
          'toast が消える',
        ],
      },
      {
        id: 'FL-APPROVE-DENY-01', pri: 0, scenario: 'any',
        name: 'deny → PM が代替パス',
        pre: ['pending あり'],
        steps: ['deny をクリック'],
        expected: [
          'pmSession.permission(id, false) 呼出',
          'PM が deny を受けて別パス選択 or 停止',
          'toast が消える',
        ],
      },
      {
        id: 'FL-APPROVE-MULTI-01', pri: 1, scenario: 'any',
        name: '複数 pending の連続処理',
        pre: ['pending 3件'],
        steps: ['順に allow x3'],
        expected: [
          '1件ずつ次が表示される (or 一括 list)',
          '全て消化で pending 0',
        ],
      },
      {
        id: 'FL-APPROVE-RACE-01', pri: 1, scenario: 'any',
        name: 'race condition: allow 中に新規 pending',
        pre: [],
        steps: ['allow クリックと同時に新 pending を WS で送る'],
        expected: [
          '両方が正しく処理される',
          '画面が壊れない',
          '順序保持',
        ],
      },
    ]},

    { id: 'fl-plan-sync', name: 'F4. Plan 双方向同期', cases: [
      {
        id: 'FL-PLAN-FILE-TO-UI-01', pri: 0, scenario: 'any',
        name: 'PLAN.md を編集 → UI に即反映',
        pre: ['/plan を開いた状態', 'milestones 1件以上'],
        steps: [
          'エディタで PLAN.md を開き milestone タイトル変更 → save',
          'UI を ~2 秒以内に観察',
        ],
        expected: [
          'UI 側のタイトルが変わる',
          'リロード不要',
          '他フィールド (count, children) も同期',
        ],
      },
      {
        id: 'FL-PLAN-UI-TO-FILE-01', pri: 0, scenario: 'any',
        name: 'UI で編集 → PLAN.md に書き戻し',
        pre: ['/plan tab=edit'],
        steps: [
          'milestone を編集 → 保存',
          'PLAN.md の mtime と内容を確認',
        ],
        expected: [
          'PLAN.md が更新されている',
          'YAML frontmatter / markdown 構造が破壊されない',
        ],
        link: 'B8',
      },
      {
        id: 'FL-PLAN-CONFLICT-01', pri: 1, scenario: 'any',
        name: '同時編集の conflict 検出',
        pre: ['UI で編集中', '裏で PLAN.md 直接編集'],
        steps: [
          'UI 側で保存試行',
        ],
        expected: [
          'planConflict store が trigger',
          'conflict 通知 (banner or modal)',
          '"reload from file" / "overwrite" 選択肢',
        ],
      },
      {
        id: 'FL-PLAN-NEW-01', pri: 0, scenario: 'any',
        name: '+ milestone → 即 PLAN.md 反映',
        pre: ['/plan'],
        steps: [
          '+ milestone クリック',
          'PLAN.md を見る',
        ],
        expected: [
          'PLAN.md に新規 milestone セクションが追加',
          'UI にも optimistic で即表示',
        ],
      },
      {
        id: 'FL-PLAN-REORDER-01', pri: 1, scenario: 'any',
        name: '並び替え (Phase 1 範囲)',
        pre: ['milestones 3件以上'],
        steps: [
          'drag or up/down ボタンで順序変更',
        ],
        expected: [
          'UI / PLAN.md 共に並び順が変わる',
          'position field が更新',
        ],
      },
    ]},

    { id: 'fl-memo', name: 'F5. メモ / 注目フラグ (§4.1)', cases: [
      {
        id: 'FL-MEMO-AGENT-01', pri: 0, scenario: 'any',
        name: 'agent にメモを残す',
        pre: ['任意の agent 選択 → AgentDetailPanel'],
        steps: [
          'メモ欄に「明日 review 依頼」と入力',
          'blur or save'
        ],
        expected: [
          'useNoteMutations 経由で永続化',
          'リロードしても残る',
          'agent character 上に indicator (Phase 2 候補) ',
        ],
      },
      {
        id: 'FL-MEMO-TASK-01', pri: 1, scenario: 'any',
        name: 'タスクにメモ',
        pre: ['Plan の任意タスク'],
        steps: [
          'タスクをクリック → メモ追加',
        ],
        expected: ['メモが保存', 'Plan view に hint アイコン'],
      },
      {
        id: 'FL-FOCUS-FLAG-01', pri: 1, scenario: 'any',
        name: '注目フラグ',
        pre: [],
        steps: [
          'agent or task に「注目」フラグ ON',
        ],
        expected: [
          '一時ハイライト (枠色変化等)',
          'リロード後も残る (or session 限定: 仕様確認)',
        ],
      },
      {
        id: 'FL-MEMO-LONG-01', pri: 2, scenario: 'any',
        name: '長文メモ (500 文字超)',
        pre: [],
        steps: ['500+ 文字を入力 → save'],
        expected: [
          '保存できる',
          '表示時に折りたたみ / 展開トグル',
        ],
      },
    ]},

    { id: 'fl-consistency', name: 'F6. 整合性 finding → action', cases: [
      {
        id: 'FL-CONS-DETECT-01', pri: 0, scenario: 'any',
        name: 'SPEC.md 変更 → finding 発生',
        pre: ['PJ に SPEC.md と related docs'],
        steps: [
          'SPEC.md を編集 → save',
          '~5 秒以内に UI を観察',
        ],
        expected: [
          'consistency_finding_new toast (warning, persistent)',
          'TopBar の VERDICT が変化',
          'ConsistencyPoster ハイライト',
          '/consistency にアクセスすると新 finding',
        ],
      },
      {
        id: 'FL-CONS-ACK-01', pri: 0, scenario: 'failed',
        name: 'Acknowledge → plan_items に自動転記',
        pre: ['finding 1件以上'],
        steps: [
          'finding の Acknowledge をクリック',
          '/plan を確認',
        ],
        expected: [
          'finding が ack 済に',
          '/plan に新規 plan_item が作成',
          'item は finding を逆参照',
        ],
      },
      {
        id: 'FL-CONS-FIXED-01', pri: 1, scenario: 'failed',
        name: 'Mark Fixed',
        pre: ['finding'],
        steps: ['Mark Fixed クリック'],
        expected: ['履歴に残る', 'リストから消える or archived 表示'],
      },
      {
        id: 'FL-CONS-DISMISS-01', pri: 1, scenario: 'failed',
        name: 'Dismiss (false positive) + undo',
        pre: ['finding'],
        steps: [
          'Dismiss クリック',
          'undo toast が出る → undo クリック',
        ],
        expected: [
          'finding が消える',
          'undo で復活',
          'trash bin パターン (§8)',
        ],
      },
      {
        id: 'FL-CONS-OPEN-01', pri: 2, scenario: 'failed',
        name: 'Open in Editor',
        pre: ['VSCode 等の URL handler が登録済'],
        steps: ['finding の Open in Editor をクリック'],
        expected: ['vscode://... URL が発火', '対象ファイルが開く'],
      },
      {
        id: 'FL-CONS-MANUAL-01', pri: 1, scenario: 'any',
        name: '手動チェック実行',
        pre: ['SPEC 変更検知バッジが出ている'],
        steps: ['バッジクリック → 整合性チェック実行'],
        expected: ['進行中 spinner', '完了で finding 更新'],
      },
    ]},

    { id: 'fl-retro', name: 'F7. Retro セッション (4-lens × 3-stage)', cases: [
      {
        id: 'FL-RETRO-START-01', pri: 0, scenario: 'any',
        name: '新 retro を GUI から起動',
        pre: ['/retro'],
        steps: ['「新 retro」ボタンをクリック'],
        expected: [
          'CLI 起動不要で動く',
          'Stage 1 が走り出す',
          '4 lens の進行 indicator',
        ],
      },
      {
        id: 'FL-RETRO-STAGE1-01', pri: 0, scenario: 'any',
        name: 'Stage 1 並列 lens 完了 toast',
        pre: ['retro 走行中'],
        steps: ['~30 秒待つ'],
        expected: [
          'retro_stage_complete info toast (5s で消える)',
          '4 lens の finding 一覧が表示',
          'user lens が他 lens と視覚的に区別',
        ],
      },
      {
        id: 'FL-RETRO-STAGE2-01', pri: 1, scenario: 'any',
        name: 'Stage 2 counter-arguer',
        pre: ['Stage 1 完了'],
        steps: [],
        expected: [
          'counter-argument view',
          'verdict (uphold/overturn) が finding 単位で見える',
        ],
      },
      {
        id: 'FL-RETRO-STAGE3-01', pri: 1, scenario: 'any',
        name: 'Stage 3 aggregator action plan',
        pre: ['Stage 2 完了'],
        steps: [],
        expected: [
          'immediate / milestone / deferred の 3 分類',
          '各 finding が分類済',
          'user decision ボタン (accept/reject/defer/discuss)',
        ],
      },
      {
        id: 'FL-RETRO-DECIDE-01', pri: 0, scenario: 'any',
        name: '1-click finding decision',
        pre: ['Stage 3 表示中'],
        steps: ['accept をクリック'],
        expected: [
          '状態即変化',
          '対応する learned_guidance / plan_item が生成',
        ],
      },
      {
        id: 'FL-RETRO-ARCHIVE-01', pri: 1, scenario: 'any',
        name: 'archive markdown render',
        pre: ['過去 retro 1件以上'],
        steps: ['過去 retro を開く'],
        expected: [
          'docs/retro/<id>-report.md が画面内で render',
          'markdown 構造が正しい',
        ],
      },
      {
        id: 'FL-RETRO-ROOM-MODE-01', pri: 1, scenario: 'any',
        name: 'Room の retroMode 表現',
        pre: ['retro 起動中'],
        steps: ['/'],
        expected: [
          'Room に 7 retro 体 (4 judge + counter + aggregator + retro PM) が登場',
          'RetroGathering layout',
        ],
      },
    ]},

    { id: 'fl-worktree', name: 'F8. Worktree フロー', cases: [
      {
        id: 'FL-WT-CREATE-01', pri: 0, scenario: 'any',
        name: 'worktree 作成 + 用途選択',
        pre: ['/worktree'],
        steps: [
          'create クリック → branch 名 + 用途 (5種から選択) 入力',
          '作成',
        ],
        expected: [
          'useWorktreeMutations 経由',
          '一覧に追加',
          'Room の dev 猫上方に SubroomClone が増える',
          'subroom に branch label',
        ],
      },
      {
        id: 'FL-WT-MAX-WARN-01', pri: 1, scenario: 'any',
        name: 'max_concurrent 上限警告',
        pre: ['既存 worktree が max-1 件'],
        steps: ['もう1つ作成試行'],
        expected: [
          '警告 toast/banner',
          '作成は許可される (warning のみ)',
        ],
      },
      {
        id: 'FL-WT-DELETE-CHECK-01', pri: 0, scenario: 'any',
        name: 'uncommitted change チェック付き削除',
        pre: ['未 commit 変更ある worktree'],
        steps: ['delete クリック'],
        expected: [
          'confirm modal',
          '"uncommitted 変更があります" 警告表示',
          'Cancel/Force delete の選択',
        ],
      },
      {
        id: 'FL-WT-LOCK-01', pri: 1, scenario: 'any',
        name: 'lock / unlock',
        pre: ['worktree 1件'],
        steps: [
          'lock 実行',
          'その worktree への書込を試行 (subagent 経由)',
        ],
        expected: [
          'lock indicator (鍵アイコン等)',
          '書込試行で worktree_lock_warning toast',
        ],
      },
      {
        id: 'FL-WT-SUBROOM-01', pri: 1, scenario: 'active',
        name: 'subagent 所属の subroom 可視化',
        pre: ['scenario=active で dev が worktree 配属'],
        steps: ['Room を観察'],
        expected: [
          'subroom に dev 猫のコピーが居る',
          'branch label 付き',
        ],
      },
      {
        id: 'FL-WT-CLICK-NAV-01', pri: 1, scenario: 'any',
        name: 'subroom クリックで /worktree?branch=x',
        pre: [],
        steps: ['Room の SubroomClone をクリック'],
        expected: [
          'URL に branch query',
          'WorktreeView がその branch にフォーカス',
        ],
      },
    ]},

    { id: 'fl-multiproject', name: 'F9. マルチプロジェクト切替', cases: [
      {
        id: 'FL-PJ-SWITCH-01', pri: 0, scenario: 'any',
        name: 'TopBar の project switcher で切替',
        pre: ['2 PJ 以上 daemon に登録'],
        steps: [
          'TopBar ◆ project ▾ クリック',
          '別 PJ を選択',
        ],
        expected: [
          'Room view と進捗 view が両方連動切替',
          'StatusBar の path も切替',
          'PM 猫は常時残る (singleton)',
          'agents/worktrees/findings 全部入れ替わる',
        ],
        link: 'B7',
      },
      {
        id: 'FL-PJ-PM-PERSIST-01', pri: 0, scenario: 'any',
        name: 'PM 切替後も常時表示',
        pre: ['PJ切替'],
        steps: ['新 PJ 表示後 Room を確認'],
        expected: ['PM 猫が居る (singleton)'],
      },
      {
        id: 'FL-PJ-ARCHIVE-01', pri: 1, scenario: 'any',
        name: 'PJ をアーカイブ',
        pre: ['複数 PJ'],
        steps: ['PJ archive 操作'],
        expected: [
          'switcher から消える',
          'DB には残る',
          'unarchive で復活可能',
        ],
      },
      {
        id: 'FL-PJ-ADDED-TOAST-01', pri: 1, scenario: 'any',
        name: '新規 PJ 検出 → toast',
        pre: ['別 dir で /loom-pm 実行'],
        steps: [],
        expected: [
          'project_added info toast (5s)',
          'switcher 一覧に追加',
        ],
      },
    ]},

    { id: 'fl-customization', name: 'F10. Customization 適用', cases: [
      {
        id: 'FL-CUST-MODEL-01', pri: 0, scenario: 'any',
        name: 'agent の model 変更',
        pre: ['/customization'],
        steps: [
          'loom-pm の model を opus → sonnet に',
          '保存',
        ],
        expected: [
          'useCustomizationMutations 経由',
          'user-prefs.json or project-prefs.json に書込',
          '次回 PM 起動で sonnet が使われる',
        ],
      },
      {
        id: 'FL-CUST-PERSONALITY-01', pri: 0, scenario: 'any',
        name: 'personality preset 切替',
        pre: [],
        steps: ['preset を friendly-mentor に → 保存 → PM 起動'],
        expected: [
          'PM の応答口調が変わる',
          'character 表示に personality indicator (もしあれば)',
        ],
      },
      {
        id: 'FL-CUST-CUSTOM-TEXT-01', pri: 1, scenario: 'any',
        name: 'custom personality free-form',
        pre: [],
        steps: [
          'custom テキスト入力',
          '合成 prompt のプレビュー確認',
        ],
        expected: [
          'プレビュー表示',
          '保存可能',
        ],
      },
      {
        id: 'FL-CUST-SCOPE-01', pri: 1, scenario: 'any',
        name: 'scope: user vs project',
        pre: [],
        steps: ['scope toggle で project に → 保存'],
        expected: [
          'project-prefs.json に書込 (user-prefs.json は無変更)',
          'scope indicator が UI に表示',
        ],
      },
      {
        id: 'FL-CUST-RESET-01', pri: 1, scenario: 'any',
        name: 'default reset',
        pre: ['customized 状態'],
        steps: ['reset to default → 確認 → OK'],
        expected: ['全 13 agent が default に戻る'],
      },
    ]},

    { id: 'fl-guidance', name: 'F11. learned_guidance audit', cases: [
      {
        id: 'FL-GU-LIST-01', pri: 0, scenario: 'any',
        name: 'agent ごとの active guidance 一覧',
        pre: ['/guidance'],
        steps: ['agent 絞込で loom-pm 選択'],
        expected: [
          'active な guidance のみ表示',
          '各行に audit trail (from_retro / category / added_at)',
          'TTL / use_count 表示',
        ],
      },
      {
        id: 'FL-GU-TOGGLE-01', pri: 0, scenario: 'any',
        name: 'active toggle 1-click',
        pre: [],
        steps: ['toggle クリック'],
        expected: [
          '即 ON/OFF 反映',
          '次回 agent 起動で挙動が変わる',
        ],
      },
      {
        id: 'FL-GU-DELETE-01', pri: 1, scenario: 'any',
        name: 'hard delete',
        pre: [],
        steps: ['delete → 確認'],
        expected: [
          'リストから消える',
          'retro markdown には archive trail 残る',
        ],
      },
      {
        id: 'FL-GU-DUPLICATE-01', pri: 1, scenario: 'any',
        name: '重複 / 矛盾検出 hint',
        pre: ['似た guidance が複数'],
        steps: [],
        expected: [
          '同 category / 似テキストに hint バッジ',
          'merge 提案 (UI のみ提示、操作は Phase 2)',
        ],
      },
      {
        id: 'FL-GU-INDICATOR-01', pri: 1, scenario: 'any',
        name: 'agent character 上 indicator',
        pre: ['agent に guidance 装着'],
        steps: ['Room の該当 agent を見る'],
        expected: [
          'idle 時 head 上に scroll icon 等',
          '詳細 panel で guidance リスト',
        ],
      },
    ]},

    { id: 'fl-coexistence', name: 'F12. Coexistence mode', cases: [
      {
        id: 'FL-CO-DISPLAY-01', pri: 1, scenario: 'any',
        name: '現 mode 表示',
        pre: ['/project-settings'],
        steps: [],
        expected: [
          '現 mode (full/coexist/custom) ラベル表示',
          '5 feature group の ON/OFF 可視化',
        ],
      },
      {
        id: 'FL-CO-SWITCH-01', pri: 0, scenario: 'any',
        name: 'mode 切替 → project.json 書込',
        pre: [],
        steps: ['radio で coexist に → 保存'],
        expected: [
          'project.json に書込',
          '影響範囲 hint 表示',
          'gate 中機能の説明が見える',
        ],
      },
      {
        id: 'FL-CO-DETECT-01', pri: 2, scenario: 'any',
        name: '他 plugin 検出再実行',
        pre: ['~/.claude/plugins/ に他 plugin あり'],
        steps: ['再検出ボタン'],
        expected: ['検出結果一覧更新'],
      },
      {
        id: 'FL-CO-CUSTOM-01', pri: 1, scenario: 'any',
        name: 'custom mode で個別 toggle',
        pre: ['mode=custom'],
        steps: ['retro group を OFF'],
        expected: [
          'retro 機能が一時的に不可',
          'Drawer の retro リンクが disabled or hint',
        ],
      },
    ]},

    { id: 'fl-discipline', name: 'F13. Process Discipline metrics', cases: [
      {
        id: 'FL-DISC-PARALLEL-01', pri: 0, scenario: 'active',
        name: 'PARALLEL rate live indicator',
        pre: ['複数 subagent dispatch'],
        steps: ['TopBar の PARALLEL を観察'],
        expected: [
          'claimed parallel / actually parallel の比率がリアルタイム更新',
          '~ 5 秒以内に反映',
        ],
      },
      {
        id: 'FL-DISC-TASKTOOL-DEGRADED-01', pri: 0, scenario: 'any',
        name: 'Task tool degraded mode 警告',
        pre: ['Task tool 利用不可状態'],
        steps: [],
        expected: [
          'TASK TOOL セルに degraded 表示',
          'mode 表示 (sequential fallback 等)',
          'ack ボタン (degraded 切替了承)',
        ],
      },
      {
        id: 'FL-DISC-DEGRADED-ACK-01', pri: 1, scenario: 'any',
        name: 'degraded mode を ack',
        pre: [],
        steps: ['ack クリック'],
        expected: [
          '警告が一時抑制',
          'log に ack 記録',
        ],
      },
      {
        id: 'FL-DISC-TDD-01', pri: 0, scenario: 'failed',
        name: 'TDD 順序 violation 件数',
        pre: ['scenario=failed (TDD violations あり)'],
        steps: [],
        expected: [
          'TDD ORDER セルに違反数表示',
          'クリックで /consistency へ (TDD filter)',
        ],
      },
      {
        id: 'FL-DISC-VERDICT-01', pri: 1, scenario: 'failed',
        name: 'reviewer verdict 証拠 indicator',
        pre: [],
        steps: [],
        expected: [
          '証拠あり/なしが見える',
          'なしは fail 色',
        ],
      },
      {
        id: 'FL-DISC-PROMOTE-01', pri: 1, scenario: 'failed',
        name: 'violation を retro へ promote',
        pre: ['violation 1件'],
        steps: ['promote to retro クリック'],
        expected: ['次 retro で議論マーク付与'],
      },
      {
        id: 'FL-DISC-CRITICAL-TOAST-01', pri: 1, scenario: 'failed',
        name: 'critical violation toast',
        pre: ['parallel rate 急落 or TDD 違反多発'],
        steps: [],
        expected: [
          'discipline_violation_critical warning toast',
          '持続表示 (手動 close)',
        ],
      },
    ]},

    { id: 'fl-reconnect', name: 'F14. WS 切断 / 再接続', cases: [
      {
        id: 'FL-WS-DISCONNECT-01', pri: 0, scenario: 'any',
        name: 'daemon kill → 切断バナー',
        pre: ['稼働中'],
        steps: ['daemon を kill'],
        expected: [
          'daemon_disconnected warning バナー',
          '再接続中 indicator',
          'TopBar conn dot が red',
        ],
      },
      {
        id: 'FL-WS-RETRY-01', pri: 0, scenario: 'any',
        name: 'exponential backoff retry',
        pre: ['daemon down'],
        steps: ['network タブで WS 再接続試行を観察'],
        expected: [
          '間隔が exponential に伸びる',
          'max 30s で頭打ち',
        ],
      },
      {
        id: 'FL-WS-RECOVER-01', pri: 0, scenario: 'any',
        name: 'daemon 復活 → 自動再接続 + toast',
        pre: ['daemon down, UI は retry 中'],
        steps: ['daemon 再起動'],
        expected: [
          '自動的に再 connect',
          'バナー消去',
          'daemon_reconnected success toast (3s)',
          'scenario state が復元',
        ],
      },
      {
        id: 'FL-WS-WRITE-DISABLE-01', pri: 1, scenario: 'any',
        name: 'MVP: 切断中は write 不可',
        pre: ['切断中'],
        steps: ['plan 編集を試行'],
        expected: [
          'disable or 即エラー',
          '"接続が切れています" メッセージ',
          'queue 機能は Phase 2',
        ],
      },
    ]},
  ],
},

/* ============================================================
   18. UX MICRO-INTERACTIONS — 触り心地
   ============================================================ */
{
  id: 'ux', zone: 'shell',
  title: 'UX マイクロインタラクション',
  path: 'visual / interaction quality',
  groups: [
    { id: 'ux-hover', name: 'Hover / Pressed / Focus', cases: [
      {
        id: 'UX-HOVER-BTN-01', pri: 1, scenario: 'any',
        name: '全ボタンに hover 状態',
        pre: [],
        steps: [
          '主要画面の button にホバー → 色/影/transform の変化を確認',
        ],
        expected: [
          'visual change がある (色 / outline / shadow / transform)',
          'cursor: pointer',
          'transition 100-200ms',
        ],
      },
      {
        id: 'UX-PRESSED-BTN-01', pri: 1, scenario: 'any',
        name: 'pressed 状態 (active class)',
        pre: [],
        steps: ['button を押下して保持'],
        expected: [
          '押下中に visual feedback (沈み込み等)',
          'release で戻る',
        ],
      },
      {
        id: 'UX-FOCUS-RING-01', pri: 1, scenario: 'any',
        name: 'focus ring が視認できる',
        pre: [],
        steps: ['Tab で focus 移動'],
        expected: [
          'outline / box-shadow が見える',
          'コントラスト十分',
          '消されていない (outline: none 禁止)',
        ],
      },
      {
        id: 'UX-CURSOR-01', pri: 1, scenario: 'any',
        name: 'cursor が役割と一致',
        pre: [],
        steps: ['全要素を hover'],
        expected: [
          'clickable は pointer',
          'text 編集可能は text',
          'disabled は not-allowed',
          'drag handle は move/grab',
        ],
      },
      {
        id: 'UX-HOVER-DESK-01', pri: 2, scenario: 'any',
        name: 'desk hover で hint',
        pre: ['/'],
        steps: ['desk にホバー'],
        expected: [
          'subtle highlight',
          'cursor: pointer',
          'speech bubble が常時表示でも問題ない',
        ],
      },
      {
        id: 'UX-HOVER-POSTER-01', pri: 2, scenario: 'any',
        name: 'wall poster hover',
        pre: [],
        steps: ['poster にホバー'],
        expected: ['視覚的変化', 'クリック可能であることを示唆'],
      },
    ]},

    { id: 'ux-transition', name: 'Transition / Animation', cases: [
      {
        id: 'UX-TRANS-MODAL-01', pri: 1, scenario: 'any',
        name: 'modal open/close transition',
        pre: [],
        steps: [
          'AgentDetailPanel を開く',
          '閉じる',
        ],
        expected: [
          'fade or slide で出入り',
          'カクつかない',
          '<= 300ms',
        ],
      },
      {
        id: 'UX-TRANS-DRAWER-01', pri: 1, scenario: 'any',
        name: 'drawer collapse transition',
        pre: [],
        steps: ['☰ で trigger'],
        expected: [
          'width が滑らかに変化',
          'label が opacity fade',
        ],
      },
      {
        id: 'UX-TRANS-TAB-01', pri: 2, scenario: 'any',
        name: 'tab 切替の transition',
        pre: ['/plan'],
        steps: ['active → done → edit'],
        expected: ['切替時に flash しない', '内容が即座 swap or fade'],
      },
      {
        id: 'UX-ANIM-CAT-IDLE-01', pri: 2, scenario: 'idle',
        name: 'idle 猫の z\'s アニメ',
        pre: ['scenario=idle'],
        steps: ['idle 猫を 5 秒観察'],
        expected: ['z\'s が出る or 寝息アニメ', '繰り返し'],
      },
      {
        id: 'UX-ANIM-CAT-BUSY-01', pri: 2, scenario: 'active',
        name: 'busy 猫のスクロールアニメ',
        pre: ['scenario=active'],
        steps: ['busy 猫を観察'],
        expected: ['scroll prop=true で wiggle / type アニメ'],
      },
      {
        id: 'UX-ANIM-WALKER-01', pri: 2, scenario: 'active',
        name: 'cat-walker トリップ',
        pre: ['walkTo 設定済'],
        steps: ['その猫を観察'],
        expected: ['隣ゾーンへ歩く', '@keyframes cat-walk-trip 適用', 'カクカクで RPG 風'],
        link: 'M3',
      },
      {
        id: 'UX-ANIM-GANTT-BAR-01', pri: 2, scenario: 'active',
        name: 'Gantt bar リアルタイム伸長',
        pre: ['active で進行中タスク'],
        steps: ['/gantt'],
        expected: [
          'bar 右端が時間と共に伸びる',
          'タイル単位カクカク (世界観統一)',
        ],
      },
      {
        id: 'UX-REDUCED-MOTION-01', pri: 2, scenario: 'any',
        name: 'prefers-reduced-motion 対応',
        pre: ['OS 設定で reduced-motion ON'],
        steps: [],
        expected: [
          '装飾アニメは停止',
          '必要な遷移 (state change indication) は残る',
        ],
      },
    ]},

    { id: 'ux-loading', name: 'Loading / Optimistic / Error', cases: [
      {
        id: 'UX-LOADING-INIT-01', pri: 1, scenario: 'any',
        name: '初期 load 中の skeleton',
        pre: ['cold cache'],
        steps: ['/plan に初回アクセス'],
        expected: [
          'skeleton or spinner が表示',
          '空白で固まらない',
          '~1s 以内にデータ',
        ],
      },
      {
        id: 'UX-OPTIMISTIC-01', pri: 1, scenario: 'any',
        name: 'optimistic update',
        pre: [],
        steps: ['+ milestone を slow network で実行'],
        expected: [
          '即 UI に追加表示',
          '完了でそのまま',
          '失敗で rollback + error toast',
        ],
      },
      {
        id: 'UX-ROLLBACK-01', pri: 1, scenario: 'any',
        name: 'mutation failure rollback',
        pre: ['mock 500 error'],
        steps: ['plan 編集 → 保存失敗'],
        expected: [
          'UI が元に戻る',
          'error toast 表示',
          'retry 可能',
        ],
      },
      {
        id: 'UX-EMPTY-PLAN-01', pri: 1, scenario: 'idle',
        name: 'Plan 空状態',
        pre: ['milestones=[]'],
        steps: ['/plan'],
        expected: [
          '空 hint メッセージ',
          '"+ milestone" 案内',
          'ピクセル風 illustrate (任意)',
        ],
      },
      {
        id: 'UX-EMPTY-FINDINGS-01', pri: 1, scenario: 'idle',
        name: 'Consistency 空状態',
        pre: ['findings=[]'],
        steps: ['/consistency'],
        expected: ['"finding なし、ヘルシー" メッセージ'],
      },
      {
        id: 'UX-EMPTY-SESSIONS-01', pri: 1, scenario: 'any',
        name: 'Sessions 空状態',
        pre: ['sessions=[]'],
        steps: ['/sessions'],
        expected: ['空 hint'],
      },
      {
        id: 'UX-EMPTY-WT-01', pri: 1, scenario: 'any',
        name: 'Worktree 空',
        pre: ['worktrees=[]'],
        steps: ['/worktree'],
        expected: ['"worktree なし、+ で作成" hint'],
      },
      {
        id: 'UX-EMPTY-RETRO-01', pri: 2, scenario: 'any',
        name: 'Retro 空',
        pre: ['retroSession なし'],
        steps: ['/retro'],
        expected: ['過去 retro なし hint + 新 retro CTA'],
      },
      {
        id: 'UX-EMPTY-GUIDANCE-01', pri: 2, scenario: 'any',
        name: 'Guidance 空',
        pre: ['guidance=[]'],
        steps: ['/guidance'],
        expected: ['"まだ learned guidance なし、retro 実行で蓄積" hint'],
      },
    ]},

    { id: 'ux-text', name: 'テキスト / フォーマット', cases: [
      {
        id: 'UX-TRUNCATE-01', pri: 1, scenario: 'any',
        name: '長文 truncate + ellipsis',
        pre: ['speech bubble に 100 文字'],
        steps: [],
        expected: [
          '28文字 truncate + "…"',
          '全文は tooltip or hover で確認',
        ],
      },
      {
        id: 'UX-TOOLTIP-01', pri: 2, scenario: 'any',
        name: 'tooltip on truncated text',
        pre: [],
        steps: ['truncated text にホバー 1s'],
        expected: ['tooltip で全文'],
      },
      {
        id: 'UX-NUMBER-FORMAT-01', pri: 1, scenario: 'active',
        name: '数値フォーマット (token / cost)',
        pre: ['/tokens'],
        steps: [],
        expected: [
          '1,234 のように 3 桁区切り',
          '12.3K / 1.2M も妥当な表示',
          '$0.12 のような currency',
        ],
      },
      {
        id: 'UX-TIME-RELATIVE-01', pri: 1, scenario: 'any',
        name: '時刻: relative + absolute',
        pre: [],
        steps: ['sessions / agent last seen の時刻'],
        expected: [
          '"5m ago" 等の relative',
          'hover で absolute (2026-05-16 14:23)',
        ],
      },
      {
        id: 'UX-EMOJI-01', pri: 2, scenario: 'any',
        name: 'emoji 表示',
        pre: ['user note や PM message に emoji'],
        steps: [],
        expected: ['豆腐にならない', '猫の世界観を壊さない'],
      },
      {
        id: 'UX-SPECIALCHAR-01', pri: 2, scenario: 'any',
        name: '特殊文字エスケープ',
        pre: ['<script> をメモに'],
        steps: ['保存 → 再表示'],
        expected: ['XSS 不可', 'text として表示'],
      },
    ]},

    { id: 'ux-a11y', name: 'A11y 深堀り', cases: [
      {
        id: 'UX-A11Y-CONTRAST-01', pri: 1, scenario: 'any',
        name: 'WCAG AA コントラスト',
        pre: [],
        steps: [
          '主要テキスト/背景の組み合わせを Lighthouse a11y で',
        ],
        expected: ['コントラスト >= 4.5:1 (small text), 3:1 (large)'],
      },
      {
        id: 'UX-A11Y-FOCUS-TRAP-01', pri: 1, scenario: 'any',
        name: 'modal で focus trap',
        pre: ['AgentDetailPanel 開いてる'],
        steps: ['Tab で focus 移動'],
        expected: [
          'focus が panel 内を循環',
          '背景の Drawer 等に逃げない',
        ],
      },
      {
        id: 'UX-A11Y-FOCUS-RESTORE-01', pri: 1, scenario: 'any',
        name: 'modal 閉じた後 focus 復帰',
        pre: ['desk click → panel open'],
        steps: ['× で close'],
        expected: ['focus が trigger element (desk button) に戻る'],
      },
      {
        id: 'UX-A11Y-ARIA-LANDMARK-01', pri: 2, scenario: 'any',
        name: 'aria landmarks',
        pre: [],
        steps: ['DOM を inspect'],
        expected: [
          '<nav> for Drawer',
          '<main> for content',
          '<header>/<footer> 等',
        ],
      },
      {
        id: 'UX-A11Y-SCREENREADER-01', pri: 2, scenario: 'any',
        name: 'screen reader でも操作可',
        pre: ['VoiceOver/NVDA 有効'],
        steps: [
          'Drawer → nav-link を読み上げて遷移',
        ],
        expected: ['全 nav-link が読み上げ可能', '主要ボタンが操作可能'],
      },
      {
        id: 'UX-A11Y-SHORTCUT-01', pri: 2, scenario: 'any',
        name: 'キーボードショートカット (Phase 1 最低限)',
        pre: [],
        steps: ['Esc / ? / g キー試行'],
        expected: [
          'Esc で modal/panel close',
          '? で help (Phase 2 候補)',
          'no key で意図しない操作が起きない',
        ],
      },
    ]},

    { id: 'ux-feedback', name: '操作フィードバック', cases: [
      {
        id: 'UX-CONFIRM-DESTRUCTIVE-01', pri: 1, scenario: 'any',
        name: '破壊的操作の確認',
        pre: [],
        steps: [
          'worktree delete / customization reset / dismiss finding',
        ],
        expected: [
          'confirm modal',
          'OR undo toast (§8 trash bin pattern)',
        ],
      },
      {
        id: 'UX-UNDO-01', pri: 1, scenario: 'any',
        name: 'undo パターン',
        pre: ['dismiss finding'],
        steps: ['dismiss 直後 ~5 秒'],
        expected: [
          'undo toast 表示',
          'undo クリックで復活',
        ],
      },
      {
        id: 'UX-COPY-FEEDBACK-01', pri: 2, scenario: 'any',
        name: 'コピー操作のフィードバック',
        pre: [],
        steps: ['/loom コマンドの URL コピー'],
        expected: [
          'toast/inline で "コピーしました"',
          'cross-platform で動く',
        ],
      },
      {
        id: 'UX-SAVE-INDICATOR-01', pri: 2, scenario: 'any',
        name: 'autosave indicator',
        pre: ['note 編集中'],
        steps: ['blur で save'],
        expected: ['"saved" 表示 / check mark / 一瞬で消える'],
      },
      {
        id: 'UX-VALIDATION-INLINE-01', pri: 2, scenario: 'any',
        name: 'inline validation',
        pre: ['form で不正値'],
        steps: ['入力 → blur'],
        expected: [
          '即エラー表示',
          'submit blocked',
        ],
      },
    ]},
  ],
},

/* ============================================================
   19. NOTIFICATIONS — Toast / Banner (SCREEN_REQ §5.2)
   ============================================================ */
{
  id: 'notify', zone: 'overlay',
  title: 'Notifications — Toast / Banner',
  path: 'ui/src/notifications/',
  groups: [
    { id: 'nt-persistent', name: '持続表示 (手動 close)', cases: [
      {
        id: 'NT-CONS-FINDING-01', pri: 0, scenario: 'failed',
        name: 'consistency_finding_new — warning, 持続',
        pre: ['SPEC.md 編集トリガ済'],
        steps: [],
        expected: [
          'warning toast',
          '自動消去しない',
          '手動 close ボタン',
          '内容: 件数 + severity',
        ],
      },
      {
        id: 'NT-AGENT-FAILED-01', pri: 0, scenario: 'failed',
        name: 'subagent_failed — error, 持続',
        pre: ['scenario=failed'],
        steps: [],
        expected: [
          'error toast (red)',
          '持続表示',
          'agent id / 失敗理由表示',
          'agent detail への link',
        ],
      },
      {
        id: 'NT-DISC-CRITICAL-01', pri: 1, scenario: 'failed',
        name: 'discipline_violation_critical — warning, 持続',
        pre: [],
        steps: [],
        expected: ['持続表示', '/consistency への link'],
      },
      {
        id: 'NT-WT-LOCK-01', pri: 1, scenario: 'any',
        name: 'worktree_lock_warning — warning, 持続',
        pre: ['locked worktree への書込試行'],
        steps: [],
        expected: ['持続表示', 'worktree 名表示'],
      },
    ]},

    { id: 'nt-autodismiss', name: '自動消去', cases: [
      {
        id: 'NT-RECONNECT-01', pri: 1, scenario: 'any',
        name: 'daemon_reconnected — success, 3s',
        pre: ['切断 → 復活'],
        steps: [],
        expected: [
          'green toast',
          '3 秒で自動消去',
        ],
      },
      {
        id: 'NT-PJ-ADDED-01', pri: 1, scenario: 'any',
        name: 'project_added — info, 5s',
        pre: ['新規 PJ 検出'],
        steps: [],
        expected: ['info toast', '5s で消える'],
      },
      {
        id: 'NT-RETRO-STAGE-01', pri: 2, scenario: 'any',
        name: 'retro_stage_complete — info, 5s',
        pre: ['retro Stage 1 完了'],
        steps: [],
        expected: ['info toast', '5s'],
      },
    ]},

    { id: 'nt-banner', name: 'Banner (画面上部 persistent)', cases: [
      {
        id: 'NT-WS-DISCONNECT-BANNER-01', pri: 0, scenario: 'any',
        name: 'daemon_disconnected banner',
        pre: ['daemon down'],
        steps: [],
        expected: [
          '画面上部に warning banner',
          '"再接続中… (next retry in Ns)" 表示',
          '再接続成功で消去',
        ],
      },
    ]},

    { id: 'nt-stack', name: 'スタッキング / 重複', cases: [
      {
        id: 'NT-STACK-MULTI-01', pri: 2, scenario: 'any',
        name: '複数 toast の積み重ね',
        pre: [],
        steps: ['toastBus.push x 3 を連続'],
        expected: [
          '縦に積まれる',
          '最大 N 件 (5?) で頭打ち, 古い順に消える',
        ],
      },
      {
        id: 'NT-DEDUP-01', pri: 2, scenario: 'any',
        name: '同種 toast の dedup',
        pre: [],
        steps: ['同じ event を 5 回連続発火'],
        expected: [
          '重複は merge / counter 表示 (x5)',
          '画面が toast で埋まらない',
        ],
      },
      {
        id: 'NT-CLOSE-01', pri: 1, scenario: 'any',
        name: '個別 close',
        pre: ['toast 3件'],
        steps: ['真ん中だけ close'],
        expected: ['他は残る', '上下が詰まる'],
      },
    ]},
  ],
},

/* ============================================================
   20. CHARACTER EXPRESSION — 13 agent の可視化
   SCREEN_REQ §6.2
   ============================================================ */
{
  id: 'characters', zone: 'room',
  title: 'Character 表現 — 13 agent ピクセル猫',
  path: 'ui/src/components/CatSprite.tsx + roster',
  groups: [
    { id: 'ch-roster', name: '13 agent 個別', cases: [
      {
        id: 'CH-PM-01', pri: 1, scenario: 'any',
        name: 'PM 猫 — リーダー猫種',
        pre: [],
        steps: ['Room の PM を観察'],
        expected: [
          'PM 専用 fur/cheek/hat 組合せ',
          'リーダー感のあるデザイン (色/帽子)',
          '他 agent と区別可能',
        ],
      },
      {
        id: 'CH-DEV-01', pri: 1, scenario: 'any',
        name: 'Developer 猫',
        pre: [],
        steps: [],
        expected: ['作業猫らしいデザイン', 'PM と明確に区別'],
      },
      {
        id: 'CH-REV-CODE-01', pri: 1, scenario: 'any',
        name: 'Reviewer (code) 猫',
        pre: [],
        steps: [],
        expected: ['monitoring 役感'],
      },
      {
        id: 'CH-REV-TEST-01', pri: 1, scenario: 'any',
        name: 'Reviewer (test) 猫',
        pre: [],
        steps: [],
        expected: ['code とは別個性'],
      },
      {
        id: 'CH-REV-SEC-01', pri: 1, scenario: 'any',
        name: 'Reviewer (security) 猫',
        pre: [],
        steps: [],
        expected: ['security 寄りの個性 (sunglasses 等)'],
      },
      {
        id: 'CH-RETRO-LENS-01', pri: 2, scenario: 'any',
        name: '4 retro lens judge',
        pre: ['retro mode ON'],
        steps: ['Room を観察'],
        expected: ['4 体それぞれ別キャラ', 'lens 名表示'],
      },
      {
        id: 'CH-RETRO-COUNTER-01', pri: 2, scenario: 'any',
        name: 'retro counter-arguer',
        pre: ['retro Stage 2'],
        steps: [],
        expected: ['判事的個性'],
      },
      {
        id: 'CH-RETRO-AGG-01', pri: 2, scenario: 'any',
        name: 'retro aggregator',
        pre: [],
        steps: [],
        expected: ['司令塔的個性'],
      },
      {
        id: 'CH-RETRO-PM-01', pri: 2, scenario: 'any',
        name: 'retro PM (通常 PM とは別)',
        pre: [],
        steps: [],
        expected: ['通常 PM と区別可能', 'retro 進行役'],
      },
    ]},

    { id: 'ch-status-visual', name: 'ステータスが一目で分かる', cases: [
      {
        id: 'CH-ST-IDLE-01', pri: 0, scenario: 'idle',
        name: 'idle → 寝姿',
        pre: ['scenario=idle'],
        steps: [],
        expected: [
          '猫が sit/sleep ポーズ',
          'モニタ暗い',
          'z\'s アニメ',
        ],
      },
      {
        id: 'CH-ST-BUSY-01', pri: 0, scenario: 'active',
        name: 'busy → 作業姿',
        pre: ['scenario=active'],
        steps: [],
        expected: [
          'work ポーズ',
          'モニタにコード',
          'scroll アニメ',
        ],
      },
      {
        id: 'CH-ST-REVIEW-01', pri: 1, scenario: 'active',
        name: 'review → 観察姿',
        pre: [],
        steps: [],
        expected: ['review status の visual hint (色や視線等)'],
      },
      {
        id: 'CH-ST-FAIL-01', pri: 0, scenario: 'failed',
        name: 'fail → エラー表示',
        pre: ['scenario=failed'],
        steps: [],
        expected: [
          'モニタ red',
          'status dot red',
          '×表示やマーク',
        ],
      },
      {
        id: 'CH-ST-TDD-01', pri: 1, scenario: 'active',
        name: 'TDD RED/GREEN/REFACTOR',
        pre: [],
        steps: [],
        expected: [
          'TDD タグ表示 (RED/GREEN/REFACTOR)',
          'phase ごとに色',
        ],
      },
    ]},

    { id: 'ch-affiliation', name: 'プロジェクト所属 / guidance / discipline indicator', cases: [
      {
        id: 'CH-PROJECT-ICON-01', pri: 2, scenario: 'any',
        name: 'PJ 所属 icon',
        pre: ['複数 PJ'],
        steps: [],
        expected: [
          '所属 PJ を示すバッジ or 色 (PJ 切替時の整合)',
        ],
      },
      {
        id: 'CH-GUIDANCE-IND-01', pri: 1, scenario: 'any',
        name: 'guidance indicator (scroll icon)',
        pre: ['agent に guidance あり'],
        steps: ['idle 時の head 周辺'],
        expected: ['scroll/巻物 icon が見える'],
      },
      {
        id: 'CH-XP-GAUGE-01', pri: 2, scenario: 'any',
        name: 'discipline 経験値ゲージ風',
        pre: [],
        steps: ['main UI header / status bar'],
        expected: [
          '経験値ゲージ風の indicator',
          '4種 (parallel / task tool / TDD / verdict) live badge',
        ],
      },
      {
        id: 'CH-PERSONALITY-IND-01', pri: 2, scenario: 'any',
        name: 'personality indicator',
        pre: ['preset != default'],
        steps: [],
        expected: [
          'character 上にアクセサリ等で preset を示唆 (任意)',
        ],
      },
    ]},
  ],
},

/* ============================================================
   21. EDGE CASES — 極端ケースで壊れないか
   ============================================================ */
{
  id: 'edge', zone: 'shell',
  title: 'Edge Cases — 極端ケース',
  path: '—',
  groups: [
    { id: 'eg-empty', name: '空', cases: [
      { id: 'EG-EMPTY-AGENTS-01', pri: 1, scenario: 'any',
        name: '0 agent でも crash しない', pre: ['agents={}'],
        steps: ['/'],
        expected: ['Room が空のオフィスとして描画', 'error 無し'] },
      { id: 'EG-EMPTY-PJ-01', pri: 1, scenario: 'any',
        name: '0 PJ',
        pre: ['daemon に PJ 未登録'],
        steps: [],
        expected: ['空の指令室 hint', '"PJ を作成" CTA'] },
      { id: 'EG-EMPTY-STREAM-01', pri: 1, scenario: 'idle',
        name: 'stream 0件',
        pre: ['scenario=idle'],
        steps: ['/'],
        expected: ['LiveRail が空 hint', 'crash 無し'] },
    ]},

    { id: 'eg-many', name: '大量', cases: [
      { id: 'EG-MANY-WT-01', pri: 1, scenario: 'any',
        name: '50+ worktree',
        pre: [],
        steps: ['/worktree'],
        expected: ['scroll virtual or pagination', 'カクつかない', 'subroom は表示制限 (4件) で OK'] },
      { id: 'EG-MANY-STREAM-01', pri: 1, scenario: 'active',
        name: 'stream 1000+ event',
        pre: [],
        steps: ['LiveRail を観察'],
        expected: ['scroll 制限 or virtual list', 'メモリ膨張無し'] },
      { id: 'EG-MANY-MS-01', pri: 1, scenario: 'any',
        name: 'milestone 50件',
        pre: [],
        steps: ['/plan'],
        expected: ['全件描画', 'scroll OK'] },
      { id: 'EG-MANY-FINDINGS-01', pri: 1, scenario: 'failed',
        name: 'finding 200件',
        pre: [],
        steps: ['/consistency'],
        expected: ['filter で絞れる', '描画パフォーマンス OK'] },
      { id: 'EG-MANY-SESSIONS-01', pri: 1, scenario: 'any',
        name: 'sessions 500件',
        pre: [],
        steps: ['/sessions'],
        expected: ['pagination or infinite scroll'] },
    ]},

    { id: 'eg-text', name: '極端な文字列', cases: [
      { id: 'EG-LONG-NAME-01', pri: 1, scenario: 'any',
        name: 'agent name 100 文字',
        pre: [],
        steps: ['nameplate 表示確認'],
        expected: ['truncate', 'overflow しない', 'tooltip で全文'] },
      { id: 'EG-LONG-BUBBLE-01', pri: 1, scenario: 'active',
        name: 'tool 名 500 文字',
        pre: [],
        steps: ['speech bubble 確認'],
        expected: ['28文字 truncate'] },
      { id: 'EG-LONG-PATH-01', pri: 1, scenario: 'any',
        name: 'PJ path 300 文字',
        pre: [],
        steps: ['StatusBar 右端'],
        expected: ['truncate (中央 …)', '全文 tooltip'] },
      { id: 'EG-RTL-01', pri: 2, scenario: 'any',
        name: 'RTL 文字 (アラビア等)',
        pre: ['user note に RTL'],
        steps: [],
        expected: ['崩れない', 'direction 維持'] },
      { id: 'EG-CONTROL-01', pri: 2, scenario: 'any',
        name: 'control char / null byte',
        pre: [],
        steps: ['stream に \\x00 含む文字列'],
        expected: ['エスケープして表示', 'crash 無し'] },
    ]},

    { id: 'eg-network', name: 'ネットワーク異常', cases: [
      { id: 'EG-SLOW-NET-01', pri: 1, scenario: 'any',
        name: 'slow 3G (DevTools)',
        pre: ['Network throttling: Slow 3G'],
        steps: ['mutation 実行'],
        expected: ['skeleton/spinner', 'optimistic update', 'timeout でエラー'] },
      { id: 'EG-PARTIAL-WS-01', pri: 1, scenario: 'any',
        name: 'WS 半切断 (受信のみ/送信のみ)',
        pre: [],
        steps: [],
        expected: ['切断検知し reconnect', 'banner'] },
      { id: 'EG-OUT-OF-ORDER-01', pri: 2, scenario: 'any',
        name: 'WS message 順序逆',
        pre: [],
        steps: ['ws inject で順序逆転'],
        expected: ['state が壊れない (idempotent merge)'] },
      { id: 'EG-DUP-MSG-01', pri: 2, scenario: 'any',
        name: 'WS 同一 message 重複',
        pre: [],
        steps: [],
        expected: ['dedup', 'count が二重にならない'] },
    ]},

    { id: 'eg-browser', name: 'ブラウザ状態', cases: [
      { id: 'EG-REFRESH-MID-01', pri: 1, scenario: 'any',
        name: 'mutation 中に refresh',
        pre: ['plan 編集 → save 直後'],
        steps: ['即 F5'],
        expected: ['整合性保持 (再 fetch で正常)', 'duplicate write 無し'] },
      { id: 'EG-MULTI-TAB-01', pri: 1, scenario: 'any',
        name: '同 daemon に複数 tab',
        pre: [],
        steps: ['tab1 と tab2 で同 PJ', 'tab1 で plan 編集'],
        expected: ['tab2 にも即反映', 'conflict 無し'] },
      { id: 'EG-LS-FULL-01', pri: 2, scenario: 'any',
        name: 'localStorage 満杯',
        pre: [],
        steps: ['仮想的に quota exceed'],
        expected: ['error catch', 'fallback で動く'] },
      { id: 'EG-LS-DISABLED-01', pri: 2, scenario: 'any',
        name: 'localStorage 無効 (private mode 等)',
        pre: [],
        steps: [],
        expected: ['UI 動作可能 (memory fallback)'] },
      { id: 'EG-NARROW-01', pri: 2, scenario: 'any',
        name: '360px 幅',
        pre: [],
        steps: ['DevTools mobile emulation'],
        expected: ['Phase 1 は desktop 想定なので最低限崩れない', 'h scroll allowed'] },
      { id: 'EG-WIDE-01', pri: 2, scenario: 'any',
        name: '3840px ultrawide',
        pre: [],
        steps: [],
        expected: ['max-width で頭打ち or 適切に広がる', 'Room デスク間隔妥当'] },
    ]},
  ],
},

/* ============================================================
   22. SECURITY / AUTH / DAEMON
   ============================================================ */
{
  id: 'security', zone: 'shell',
  title: 'Security / Daemon 接続',
  path: 'daemon + ~/.claude-loom/daemon-token',
  groups: [
    { id: 'sec-bind', name: 'bind / token', cases: [
      { id: 'SEC-BIND-01', pri: 0, scenario: 'any',
        name: 'daemon は 127.0.0.1 のみ',
        pre: [],
        steps: ['ss/netstat で listen 確認', '別 host から curl 試行'],
        expected: ['0.0.0.0 で listen していない', '外部 access 拒否'] },
      { id: 'SEC-TOKEN-01', pri: 0, scenario: 'any',
        name: 'token なしで API 拒否',
        pre: [],
        steps: ['curl 127.0.0.1:5757/projects (token なし)'],
        expected: ['401 or 403'] },
      { id: 'SEC-TOKEN-WRONG-01', pri: 0, scenario: 'any',
        name: 'wrong token 拒否',
        pre: [],
        steps: ['curl で fake token'],
        expected: ['401'] },
      { id: 'SEC-TOKEN-FILE-01', pri: 1, scenario: 'any',
        name: 'token file chmod 600',
        pre: ['~/.claude-loom/daemon-token 存在'],
        steps: ['stat で確認'],
        expected: ['mode = 600 (rw owner only)'] },
      { id: 'SEC-XSS-01', pri: 0, scenario: 'any',
        name: 'XSS: PM message に <script>',
        pre: [],
        steps: ['<script>alert(1)</script> を user note に', '画面に表示'],
        expected: ['script 実行されない', 'text として表示'] },
    ]},

    { id: 'sec-mode', name: 'mode / dev', cases: [
      { id: 'SEC-DEV-MODE-01', pri: 1, scenario: 'any',
        name: 'GET /mode で確認可能',
        pre: ['daemon 稼働'],
        steps: ['curl /mode'],
        expected: ['{"mode": "prod"} or "dev"'] },
      { id: 'SEC-DEV-CHECK-01', pri: 1, scenario: 'any',
        name: 'dev daemon が prod と衝突しない',
        pre: ['prod daemon 稼働中'],
        steps: ['pnpm dev を起動試行'],
        expected: ['pre-flight check が止める'] },
      { id: 'SEC-MOCK-PROD-01', pri: 1, scenario: 'any',
        name: 'production build で ?mock= 無視',
        pre: ['daemon 経由の prod build'],
        steps: ['?mock=active で開く'],
        expected: ['real WS data が使われる', 'fixture 注入されない'] },
    ]},
  ],
},

/* ============================================================
   23. INSTALL / UNINSTALL — Quick start 動作
   ============================================================ */
{
  id: 'install', zone: 'shell',
  title: 'Install / Uninstall',
  path: 'install.sh / uninstall.sh',
  groups: [
    { id: 'in-install', name: 'install', cases: [
      { id: 'IN-FRESH-01', pri: 0, scenario: 'any',
        name: 'fresh install が成功',
        pre: ['clean home dir'],
        steps: ['./install.sh'],
        expected: [
          '~/.claude/ に symlink',
          'settings.json に hooks 配線',
          'pnpm install + build が走る',
          '完了表示',
        ] },
      { id: 'IN-CLAUDE-HOME-01', pri: 1, scenario: 'any',
        name: 'CLAUDE_HOME override',
        pre: ['custom CLAUDE_HOME'],
        steps: ['CLAUDE_HOME=/x ./install.sh'],
        expected: ['/x 配下に配置'] },
      { id: 'IN-NO-BUILD-01', pri: 1, scenario: 'any',
        name: 'LOOM_NO_BUILD=1',
        pre: [],
        steps: ['LOOM_NO_BUILD=1 ./install.sh'],
        expected: ['pnpm install/build を skip'] },
      { id: 'IN-RE-INSTALL-01', pri: 1, scenario: 'any',
        name: '再 install で idempotent',
        pre: ['1回 install 済'],
        steps: ['もう一度 ./install.sh'],
        expected: ['error 無し', 'symlink 重複しない'] },
    ]},
    { id: 'in-uninstall', name: 'uninstall', cases: [
      { id: 'IN-UN-CONFIRM-01', pri: 0, scenario: 'any',
        name: 'confirm 経由 uninstall',
        pre: ['install 済'],
        steps: ['./uninstall.sh'],
        expected: ['確認プロンプト', 'yes で symlink 削除', '.claude-loom/ は保持'] },
      { id: 'IN-UN-PURGE-01', pri: 1, scenario: 'any',
        name: '--purge-state で全削除',
        pre: [],
        steps: ['./uninstall.sh --yes --purge-state'],
        expected: ['.claude-loom/ も削除'] },
      { id: 'IN-UN-PRESERVE-01', pri: 1, scenario: 'any',
        name: 'デフォルトで state 保持',
        pre: ['retro / personality 設定済'],
        steps: ['./uninstall.sh --yes'],
        expected: ['再 install で設定復活'] },
    ]},
  ],
},

/* ============================================================
   24. PHILOSOPHY — 製品コンセプトの満たし方
   ============================================================ */
{
  id: 'philosophy', zone: 'shell',
  title: '製品コンセプト — 「マルチエージェント開発が見える」',
  path: 'README + SCREEN_REQUIREMENTS',
  groups: [
    { id: 'ph-watching', name: '「実際に見える」体験', cases: [
      {
        id: 'PH-PARALLEL-VISIBLE-01', pri: 0, scenario: 'active',
        name: '並列稼働が一目で分かる',
        pre: ['複数 agent が同時 busy'],
        steps: ['/'],
        expected: [
          '複数 desk が同時に busy 表示',
          'PARALLEL メトリクスも数値で示す',
          '"今 N体動いてる" が直感的',
        ],
      },
      {
        id: 'PH-EMOTIONAL-01', pri: 1, scenario: 'idle',
        name: '感情的な絵 (idle は寝てる)',
        pre: ['scenario=idle'],
        steps: [],
        expected: [
          '寝てる絵で「今は休憩中」が一発で伝わる',
          'ColdStart カードと相補的',
        ],
      },
      {
        id: 'PH-WATCHABLE-01', pri: 1, scenario: 'active',
        name: '別ディスプレイで眺められる UX',
        pre: ['PM が指示出してる最中'],
        steps: ['動作を 5分間眺める'],
        expected: [
          '視線が固定されない (適度な動き)',
          'flicker しない',
          '何が起きてるか視線移動で分かる',
        ],
      },
      {
        id: 'PH-CHARACTER-LOVE-01', pri: 2, scenario: 'any',
        name: 'キャラ愛着 (§6.1 最優先)',
        pre: [],
        steps: ['1日使った感想'],
        expected: [
          '13 体を区別できる',
          '自分の agent への愛着が芽生える',
          'タイプミスの猫が可愛い等の情緒',
        ],
      },
      {
        id: 'PH-PIXEL-WORLD-01', pri: 1, scenario: 'any',
        name: 'ピクセル世界観の一貫性',
        pre: [],
        steps: ['全画面巡回'],
        expected: [
          'Room の世界観が Plan/Gantt/Consistency でも崩れない',
          'Gantt bar も RPG 調',
          'modern web UI に化けない',
        ],
        link: 'S6',
      },
    ]},

    { id: 'ph-discipline', name: '"標準フロー" の見える化', cases: [
      {
        id: 'PH-FLOW-VISIBLE-01', pri: 1, scenario: 'active',
        name: 'spec → plan → TDD → review → retro が画面上で追える',
        pre: ['一通り使う'],
        steps: [],
        expected: [
          '今どのフェーズか分かる',
          'phase indicator (Plan / TDD タグ / review 状態 / retro session)',
        ],
      },
      {
        id: 'PH-DOC-DRIFT-01', pri: 0, scenario: 'failed',
        name: 'doc 整合性自動検出が機能',
        pre: ['SPEC.md 変更'],
        steps: [],
        expected: [
          '黙ってドリフトしない (toast + badge)',
          'agent が自動 flag',
        ],
      },
      {
        id: 'PH-TDD-VISIBLE-01', pri: 1, scenario: 'active',
        name: 'TDD ループが見える',
        pre: ['Dev が TDD 中'],
        steps: [],
        expected: [
          'RED/GREEN/REFACTOR フェーズが nameplate or tag で見える',
          'violations は warning',
        ],
      },
    ]},
  ],
},

/* ============================================================
   25. MAIN ブランチ実装状況 — 3層トラッキング (handoff to claude code)
   各 case は UI 描画 / Wire 配線 / Backend 動作 を独立に評価。
   現状 (2026-05-16, commit a7a754d) の予想初期値はメモに記載。
   ============================================================ */
{
  id: 'mainstatus', zone: 'shell',
  title: 'MAIN ブランチ実装状況 — 14 件の致命的ギャップ',
  path: 'github.com/yutron24ah/claude-loom@main / UI Status Report.md',
  groups: [
    { id: 'ms-pm-chat', name: 'PM Chat — 最重要', cases: [
      {
        id: 'MS-PM-CHAT-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'PM チャット: 入力→送信→PM 応答',
        link: 'Phase 5 t17',
        pre: ['PMChatPanel.tsx mount 済'],
        steps: [
          '入力欄に "進捗教えて" 入力',
          '⌘+Enter or 送信ボタンクリック',
          'PM の応答を待つ',
        ],
        expected: [
          'U: 入力欄/送信ボタン/メッセージログ描画',
          'W: onSend → usePMSession.say() → POST /pm/say 配線',
          'B: claude CLI spawn + stdout pipe で実応答が流れる (現状 [stub] echo)',
        ],
      },
      {
        id: 'MS-PM-START-01', pri: 0, scenario: 'idle',
        layers: ['ui', 'wire', 'backend'],
        name: 'PM 起動: ColdStart "▶ PM を起動"',
        pre: ['scenario=idle, pm.running=false'],
        steps: ['▶ PM を起動 クリック', 'PM busy 状態に遷移を待つ'],
        expected: [
          'U: ColdStart カード + start button 描画',
          'W: onStart → usePMSession.start() → POST /pm/start 配線',
          'B: 実 PM session が立ち上がり、scenario.pm.running=true、stream にイベント',
        ],
      },
      {
        id: 'MS-PM-APPROVAL-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'Tool permission 承認',
        pre: ['pendingApprovals 1件以上'],
        steps: ['Approval modal/toast が出る → allow をクリック'],
        expected: [
          'U: PMApprovalModal/Toast が出る',
          'W: onPermission → usePMSession.permission() 配線',
          'B: PM が実際に処理続行 (broadcaster.emitPmPermissionResolved は実装あり、claude CLI 側で受信→続行する経路は未確認)',
        ],
      },
      {
        id: 'MS-PM-PHASE-IND-01', pri: 1, scenario: 'active',
        layers: ['ui', 'wire', 'backend'],
        name: 'PM phase indicator (spec/impl/retro)',
        link: 'M0.11.6 / M0.11.7',
        pre: [],
        steps: ['PMChatPanel header を確認'],
        expected: [
          'U: phase ラベル (spec / impl / retro / idle) 表示',
          'W: scenario.pm.phase を読む',
          'B: daemon が PM phase を track して WS で broadcast',
        ],
      },
    ]},

    { id: 'ms-agent-detail', name: 'AgentDetailPanel — メモ / 注目', cases: [
      {
        id: 'MS-AGENT-MEMO-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '「メモ」ボタンが動く',
        pre: ['agent クリックで AgentDetailPanel open'],
        steps: ['「メモ」ボタンクリック'],
        expected: [
          'U: メモボタン描画 ✅',
          'W: onClick がメモ編集モード/モーダル開く (現状 noop)',
          'B: useNoteMutations.upsert で daemon の note table に書込、再表示時復元',
        ],
      },
      {
        id: 'MS-AGENT-ATTN-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '★ 注目フラグ toggle',
        pre: [],
        steps: ['★ 注目 ボタンクリック'],
        expected: [
          'U: トグル UI + aria-pressed ✅',
          'W: onAttentionToggle 親から渡されている (AppShell mount 箇所要確認)',
          'B: subagents_attention table への persist、リロード後復元',
        ],
      },
      {
        id: 'MS-AGENT-NOTES-SUB-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'AgentDetailNotes sub-component',
        pre: [],
        steps: ['Notes 欄を編集 → blur'],
        expected: [
          'U: notes 入力欄描画',
          'W: useNoteMutations 経由 save',
          'B: daemon notes table 永続化',
        ],
      },
    ]},

    { id: 'ms-worktree', name: 'Worktree — 作成/削除/lock', cases: [
      {
        id: 'MS-WT-CREATE-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'worktree 作成 + 用途 5 種選択',
        pre: ['/worktree'],
        steps: ['create クリック → branch 名 + 用途 (parallel/exp/branch-cmp/hotfix/temp-review) 選択 → 作成'],
        expected: [
          'U: create modal が出て用途 5 種 radio/dropdown',
          'W: useWorktreeMutations.create() 呼出',
          'B: 実 git worktree add が走り、subagent 割当',
        ],
      },
      {
        id: 'MS-WT-DELETE-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '削除 + uncommitted check',
        pre: ['未コミット変更ある worktree'],
        steps: ['delete クリック'],
        expected: [
          'U: confirm modal + uncommitted 警告',
          'W: useWorktreeMutations.delete() 呼出',
          'B: 実 git worktree remove + lock 状態確認',
        ],
      },
      {
        id: 'MS-WT-LOCK-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'lock / unlock',
        pre: [],
        steps: ['lock → 書込試行'],
        expected: [
          'U: 鍵 indicator',
          'W: useWorktreeMutations.lock()',
          'B: 書込試行で worktree_lock_warning toast emit',
        ],
      },
      {
        id: 'MS-WT-SUBROOM-VIZ-01', pri: 1, scenario: 'active',
        layers: ['ui', 'wire', 'backend'],
        name: 'subroom 可視化 (Room 内 mini cat)',
        pre: ['scenario.worktrees 1件以上 + parentAgent=dev'],
        steps: ['/'],
        expected: [
          'U: dev デスク上方に SubroomClone が並ぶ',
          'W: scenario.worktrees から positions 計算',
          'B: daemon が worktree → subagent mapping を track',
        ],
      },
    ]},

    { id: 'ms-retro', name: 'Retro — GUI から起動', cases: [
      {
        id: 'MS-RETRO-START-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'GUI 新 retro 起動ボタン',
        pre: ['/retro'],
        steps: ['「新 retro」ボタン or CTA をクリック'],
        expected: [
          'U: 起動 CTA が画面に存在',
          'W: mutation 経由で daemon に retro start を伝える',
          'B: 4 lens 並列 spawn → Stage 1 開始',
        ],
      },
      {
        id: 'MS-RETRO-STAGE-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'Stage 1/2/3 進行表示',
        pre: ['retro 走行中'],
        steps: [],
        expected: [
          'U: stage indicator (1: lens / 2: counter / 3: aggregate)',
          'W: WS event で stage 更新を受信',
          'B: retro_stage_complete event を broadcaster が emit',
        ],
      },
      {
        id: 'MS-RETRO-DECIDE-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'finding 1-click decision',
        pre: ['Stage 3 表示'],
        steps: ['accept クリック'],
        expected: [
          'U: 4 ボタン (accept/reject/defer/discuss)',
          'W: mutation 経由で daemon に decision 通知',
          'B: pending.json 更新 + learned_guidance 生成',
        ],
      },
      {
        id: 'MS-RETRO-ARCHIVE-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'archive markdown render',
        pre: ['過去 retro 1件以上'],
        steps: ['過去 retro を開く'],
        expected: [
          'U: markdown が画面内 render',
          'W: docs/retro/<id>-report.md を fetch',
          'B: daemon が file 読み出して serve',
        ],
      },
    ]},

    { id: 'ms-consistency', name: 'Consistency — actions 4 種', cases: [
      {
        id: 'MS-CONS-MANUAL-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '手動 check 実行 (SPEC 変更検知バッジ)',
        pre: ['SPEC.md 変更検知済'],
        steps: ['badge / manual run ボタンを探してクリック'],
        expected: [
          'U: 検知バッジ + 手動 trigger UI 存在',
          'W: useConsistencyMutations.run() 経由',
          'B: phase-a-runner / phase-b-runner 実行',
        ],
      },
      {
        id: 'MS-CONS-ACK-01', pri: 1, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'Acknowledge → plan_items 自動転記',
        pre: ['finding 1件'],
        steps: ['Acknowledge クリック'],
        expected: [
          'U: ack button + status update',
          'W: useConsistencyMutations.acknowledge()',
          'B: finding-to-plan.ts 経由で plan_items に追加、PLAN.md にも反映',
        ],
      },
      {
        id: 'MS-CONS-DISMISS-UNDO-01', pri: 1, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'Dismiss + undo (trash bin)',
        pre: [],
        steps: ['Dismiss → undo'],
        expected: [
          'U: dismiss → undo toast',
          'W: undo で復元 mutation',
          'B: soft-delete + 復元 path',
        ],
      },
      {
        id: 'MS-CONS-OPEN-EDITOR-01', pri: 2, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'Open in Editor (vscode://...)',
        pre: ['VSCode URL handler 登録済'],
        steps: ['Open in Editor クリック'],
        expected: [
          'U: link/button 存在',
          'W: window.open("vscode://...")',
          'B: file path が正しく vscode に渡る',
        ],
      },
    ]},

    { id: 'ms-customization', name: 'Customization — preset / custom text', cases: [
      {
        id: 'MS-CUST-MODEL-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '13 agent の model 切替',
        pre: ['/customization'],
        steps: ['loom-pm の model を opus → sonnet に → 保存'],
        expected: [
          'U: dropdown 描画',
          'W: useCustomizationMutations.upsert()',
          'B: user-prefs.json / project-prefs.json に書込',
        ],
      },
      {
        id: 'MS-CUST-PRESET-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'personality preset 切替',
        pre: [],
        steps: ['preset radio で friendly-mentor 選択 → 保存'],
        expected: [
          'U: 4 preset 選択 UI',
          'W: mutation 呼出',
          'B: prefs file 書込 + 次回 agent 起動で適用',
        ],
      },
      {
        id: 'MS-CUST-CUSTOM-TEXT-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'custom personality free-form + preview',
        pre: [],
        steps: ['custom テキスト入力 → 合成 prompt プレビュー確認 → 保存'],
        expected: [
          'U: free-form textarea + preview pane',
          'W: 合成ロジックが client/daemon 側で実装',
          'B: prefs に書込',
        ],
      },
      {
        id: 'MS-CUST-SCOPE-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'scope (user vs project) toggle',
        pre: [],
        steps: ['scope=project に切替 → 保存'],
        expected: [
          'U: scope indicator + toggle',
          'W: 適切な mutation route',
          'B: project-prefs.json のみ書込 (user-prefs.json 無変更)',
        ],
      },
    ]},

    { id: 'ms-coexistence', name: 'Coexistence Mode — 設定 UI', cases: [
      {
        id: 'MS-CO-SECTION-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'ProjectSettings に Coexistence section',
        pre: ['/project-settings'],
        steps: [],
        expected: [
          'U: mode (full/coexist/custom) radio + 5 feature group toggle 表示',
          'W: useProjectSettingsMutation 経由 save',
          'B: project.json に書込 (daemon/src/routes/coexistence.ts は実装あり)',
        ],
      },
      {
        id: 'MS-CO-DETECT-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '他 plugin 検出表示 + 再実行',
        pre: ['~/.claude/plugins/ に他 plugin'],
        steps: ['検出結果一覧 + 再検出ボタン'],
        expected: [
          'U: 検出 list 表示',
          'W: 再検出 mutation',
          'B: 検出 logic 実行',
        ],
      },
    ]},

    { id: 'ms-guidance', name: 'learned_guidance — audit trail / 重複検出', cases: [
      {
        id: 'MS-GU-AUDIT-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'audit trail 完全表示',
        pre: ['/guidance'],
        steps: ['agent 絞込で詳細を見る'],
        expected: [
          'U: from_retro / from_finding_id / category / added_at / TTL / use_count 表示',
          'W: useScenario.guidance から full shape 取得',
          'B: daemon が audit trail を保持',
        ],
      },
      {
        id: 'MS-GU-DUP-HINT-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '重複 / 矛盾検出 hint',
        pre: ['類似 guidance 複数'],
        steps: [],
        expected: [
          'U: hint バッジ表示',
          'W: client side or daemon で重複検出',
          'B: similarity logic',
        ],
      },
      {
        id: 'MS-GU-VIEWS-CONFLICT-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire'],
        name: 'GuidanceView と LearnedGuidanceView の役割整理',
        pre: [],
        steps: ['両ファイルを比較', '役割の重複/分担を確認'],
        expected: [
          'U: 2 ファイル併存だがどちらかが意図不明 (要 deduplicate or rename)',
          'W: routing から両方到達可能か確認',
        ],
      },
    ]},

    { id: 'ms-notifications', name: 'Toast 8 種 — emit パス', cases: [
      {
        id: 'MS-TOAST-FINDING-01', pri: 0, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'consistency_finding_new toast',
        pre: ['SPEC.md 編集'],
        steps: [],
        expected: [
          'U: warning toast UI ✅ (toastBus は実装あり)',
          'W: WS event 受信 → toastBus.push',
          'B: broadcaster.emitConsistencyFinding 経由で WS broadcast',
        ],
      },
      {
        id: 'MS-TOAST-FAILED-01', pri: 0, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'subagent_failed toast',
        pre: [],
        steps: [],
        expected: ['U: error toast', 'W: WS event handler', 'B: broadcaster emit'],
      },
      {
        id: 'MS-TOAST-DISC-01', pri: 1, scenario: 'failed',
        layers: ['ui', 'wire', 'backend'],
        name: 'discipline_violation_critical toast',
        pre: [],
        steps: [],
        expected: ['U/W/B 全層配線'],
      },
      {
        id: 'MS-TOAST-WT-LOCK-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'worktree_lock_warning toast',
        pre: ['locked worktree への書込試行'],
        steps: [],
        expected: ['U/W/B 全層配線'],
      },
      {
        id: 'MS-TOAST-RECONNECT-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'daemon_reconnected (3s auto)',
        pre: ['切断→復活'],
        steps: [],
        expected: ['U: success toast / 3s 消去', 'W: WS reopen で push', 'B: daemon 再接続検知'],
      },
      {
        id: 'MS-TOAST-PJ-ADD-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'project_added toast',
        pre: ['新規 PJ 検出'],
        steps: [],
        expected: ['U/W/B 全層配線'],
      },
      {
        id: 'MS-TOAST-RETRO-STAGE-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'retro_stage_complete toast',
        pre: ['retro Stage 1 完了'],
        steps: [],
        expected: ['U/W/B 全層配線'],
      },
    ]},

    { id: 'ms-multiproject', name: 'Multi-Project — switcher', cases: [
      {
        id: 'MS-PJ-SWITCHER-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'TopBar project switcher dropdown',
        link: 'B7 Phase C deferred',
        pre: ['複数 PJ 登録'],
        steps: ['TopBar ◆ <project> ▾ をクリック'],
        expected: [
          'U: dropdown 展開 (現状は直 /project-settings 遷移、dropdown 未実装)',
          'W: PJ 選択で scenario 切替',
          'B: daemon が PJ list を提供 + 切替 mutation',
        ],
      },
      {
        id: 'MS-PJ-PM-PERSIST-01', pri: 1, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'PJ 切替後も PM 常時表示 (singleton)',
        pre: [],
        steps: ['PJ 切替'],
        expected: [
          'U: PM 猫が Room に残る',
          'W: PJ 切替で agents は入れ替わるが PM は残す logic',
          'B: PM session が cross-PJ singleton として保持',
        ],
      },
      {
        id: 'MS-PJ-ARCHIVE-01', pri: 2, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: 'PJ アーカイブ',
        pre: [],
        steps: ['PJ archive 操作'],
        expected: ['U/W/B 全層配線、DB は残す'],
      },
    ]},

    { id: 'ms-animation', name: 'Animation — cat-walker', cases: [
      {
        id: 'MS-CAT-WALKER-01', pri: 2, scenario: 'active',
        layers: ['ui', 'wire', 'backend'],
        name: 'cat-walker @keyframes 適用',
        link: 'M3',
        pre: ['agent.walkTo 定義された scenario'],
        steps: ['Room を観察'],
        expected: [
          'U: shell.css に @keyframes cat-walk-trip + .cat-walker class',
          'W: DeskStation が walkTo prop 受けて CSS var --walk-dx/--walk-dy 注入',
          'B: scenario.agents[id].walkTo が WS 経由で流れてくる',
        ],
      },
    ]},

    { id: 'ms-summary', name: '集計サマリ', cases: [
      {
        id: 'MS-SUMMARY-01', pri: 0, scenario: 'any',
        layers: ['ui', 'wire', 'backend'],
        name: '実装率達成: UI 90% / Wire 80% / Backend 70%',
        pre: [],
        steps: [
          '本セクション全 case の status 集計を確認',
          'Phase 2 entry checklist に転記',
        ],
        expected: [
          'U: UI 描画 layer のみで 90% 以上 pass',
          'W: Wire 配線 layer で 80% 以上 pass',
          'B: Backend 動作 layer で 70% 以上 pass (claude CLI spawn 完了で大幅改善)',
        ],
      },
    ]},
  ],
},

/* ============================================================
   13. SPIRIT — Room の ephemeral 召喚 (PR#18 / M0.X-skill-migration)
   13 agent → 3 persistent + 10 spirit に伴う新概念
   ============================================================ */
{
  id: 'spirit', zone: 'room',
  title: 'Spirit Summoning — review / retro lens は ephemeral',
  path: 'ui/src/views/room/Spirit.tsx · RoomDoor.tsx · SummonQueue.tsx',
  groups: [
    { id: 'sp-roster', name: 'ROSTER 再編', cases: [
      { id: 'SP-ROSTER-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'persistent は 3 体のみ (PM / Dev / Retro PM)',
        pre: [], steps: ['ROSTER から kind:"persistent" を filter'],
        expected: ['長さ === 3', 'id が pm / dev / retro-pm'] },
      { id: 'SP-ROSTER-02', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'spirit 10 体全員に summonedBy がある',
        pre: [], steps: ['ROSTER から kind:"spirit" を filter'],
        expected: ['長さ === 10', '全エントリに summonedBy 文字列'] },
      { id: 'SP-ROSTER-03', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'aggregator のみ writePermission: true',
        pre: [], steps: ['SKILLS.find(loom-retro).stages.find(aggregator)'],
        expected: ['writePermission === true', '他の lens / stage は falsy'] },
    ]},
    { id: 'sp-desk', name: 'Room 内 desk 撤去', cases: [
      { id: 'SP-DESK-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'review / retro lens の DeskStation は描画されない',
        pre: [], steps: ['/ で Room view', 'rev-code / rev-sec / rev-test / retro-pj 等の DeskStation を querySelector'],
        expected: ['いずれも null', 'desk は pm / dev / retro-pm の 3 つだけ'] },
      { id: 'SP-DESK-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'Summon Zone signage 表示',
        pre: [], steps: ['Room view'],
        expected: ['"⟡ 召喚エリア" の sign が右下に出る'] },
    ]},
    { id: 'sp-motion', name: 'Spirit motion (3 候補)', cases: [
      { id: 'SP-MOTION-RPG-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'spiritMode="rpg" で glow + puff in',
        pre: [], steps: ['Tweaks で RPG flavor 選択', 'spirit 描画'],
        expected: ['.room--rpg .spirit__sprite に drop-shadow filter', 'spirit-rpg-in keyframe 適用'] },
      { id: 'SP-MOTION-OFF-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'spiritMode="office" で door からスライド',
        pre: [], steps: ['Tweaks で Office flavor 選択'],
        expected: ['.room-door が右壁に描画', 'spirit-walk-in keyframe 適用'] },
      { id: 'SP-MOTION-HYB-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'spiritMode="hybrid" (default) で echo 残る',
        pre: [], steps: ['Tweaks 未操作 (default)'],
        expected: ['.spirit-echo が直近召喚分だけ描画', 'opacity ~0.32'] },
      { id: 'SP-MOTION-EXIT-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'spirit dispatch 終了で .spirit--leaving が付与',
        pre: ['spirit が 1 体 active'],
        steps: ['dispatch 完了 event 受信'],
        expected: ['target spirit に --leaving class', 'keyframe 完了後 unmount'] },
    ]},
    { id: 'sp-queue', name: '召喚キュー plaque', cases: [
      { id: 'SP-QUEUE-01', pri: 0, scenario: 'any', layers: ['ui', 'wire'],
        name: '召喚キュー 上に active / queued が並ぶ',
        pre: [], steps: ['SummonQueue 描画確認'],
        expected: ['active は緑 + pulse', 'queued は warn 黄', 'skill 識別子 (review/trio.code 等) が表示'] },
      { id: 'SP-QUEUE-02', pri: 1, scenario: 'any', layers: ['wire'],
        name: 'useDispatchQueue から live data',
        pre: [], steps: ['agent.change イベント注入', 'Task.lifetime イベント注入'],
        expected: ['キューが更新される', '完了で行が leaving に flip → 消える'] },
    ]},
    { id: 'sp-detail', name: 'AgentDetailPanel', cases: [
      { id: 'SP-DETAIL-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'spirit クリックで model 列が隠れる',
        pre: [], steps: ['spirit (rev-code) をクリック'],
        expected: ['Detail panel mount', 'MODEL 行が非表示 (skill scope は agent ではないので)'] },
    ]},
  ],
},

/* ============================================================
   14. CUSTOMIZATION-TREE — agents flat → agents + skills tree (PR#18)
   ============================================================ */
{
  id: 'customization-tree', zone: 'panel',
  title: '/customization tree navigation (schema v2)',
  path: 'ui/src/views/customization/',
  groups: [
    { id: 'ct-tree', name: '左 pane tree', cases: [
      { id: 'CT-TREE-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'Agents (3) ノード expand 時に 3 leaf',
        pre: [], steps: ['/customization', 'Agents を expand'],
        expected: ['loom-pm / loom-developer / loom-retro-pm の 3 leaf'] },
      { id: 'CT-TREE-02', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'Skills (2) ノード expand 時に loom-review + loom-retro',
        pre: [], steps: ['Skills を expand'],
        expected: ['2 child node', 'それぞれ更に sub-scope を持つ'] },
      { id: 'CT-TREE-03', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'loom-review/strategies/trio expand で code/security/test',
        pre: [], steps: ['loom-review → strategies/ → trio/ を順に expand'],
        expected: ['code / security / test の 3 leaf'] },
      { id: 'CT-TREE-04', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'loom-retro/lenses + stages 両方表示',
        pre: [], steps: ['loom-retro を expand'],
        expected: ['lenses/ 配下に 4 (pj/process/meta/researcher)', 'stages/ 配下に 2 (counter/aggregator)'] },
      { id: 'CT-TREE-05', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'aggregator leaf に WRITE badge',
        pre: [], steps: ['stages → aggregator 表示'],
        expected: ['leaf 行に黄色の WRITE badge'] },
    ]},
    { id: 'ct-editor', name: '右 pane leaf editor', cases: [
      { id: 'CT-EDIT-AGENT-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'agent leaf 選択時に MODEL 行表示',
        pre: [], steps: ['loom-developer を選択'],
        expected: ['MODEL [opus][sonnet][haiku] 行が見える', 'PERSONALITY PRESET 行も見える'] },
      { id: 'CT-EDIT-SKILL-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'skill scope 選択時に MODEL 行は非表示',
        pre: [], steps: ['skills/loom-review/strategies/trio/code を選択'],
        expected: ['MODEL 行なし', 'PERSONALITY PRESET 行はある'] },
      { id: 'CT-EDIT-PM-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'loom-pm は model 切替不可注記',
        pre: [], steps: ['loom-pm を選択'],
        expected: ['"※ PM は model 切替不可 (SPEC §3.9.16 で固定)" の注記表示'] },
      { id: 'CT-EDIT-WRITE-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'aggregator 選択時 editor 側にも WRITE badge',
        pre: [], steps: ['skills/loom-retro/stages/aggregator を選択'],
        expected: ['editor header に WRITE badge'] },
      { id: 'CT-EDIT-CUSTOM-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'CUSTOM OVERRIDE free-form 表示',
        pre: [], steps: ['loom-developer を選択'],
        expected: ['"TDD red 順序の遵守を最優先で。" のような自由テキスト表示'] },
      { id: 'CT-EDIT-LG-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'LEARNED GUIDANCE entries 数表示',
        pre: [], steps: ['任意 leaf 選択'],
        expected: ['integer 表示', 'preview ボタン存在'] },
    ]},
    { id: 'ct-schema', name: 'schema v2 永続化', cases: [
      { id: 'CT-SCHEMA-01', pri: 0, scenario: 'any', layers: ['wire', 'backend'],
        name: 'user-prefs.json が agents + skills tree shape',
        pre: [], steps: ['leaf 値変更 → 保存', 'user-prefs.json を読む'],
        expected: ['top-level に agents (3 key) + skills (loom-review / loom-retro) が存在'] },
      { id: 'CT-SCHEMA-02', pri: 1, scenario: 'any', layers: ['backend'],
        name: '旧 flat schema からの migration (compat)',
        pre: ['旧 agents.loom-reviewer.* が存在'],
        steps: ['Customization 起動'],
        expected: ['旧 key を skills.loom-review.* に lift up', '元 file は backup として残す or warn'] },
    ]},
  ],
},

/* ============================================================
   15. RETRO-LIFECYCLE — pending.json schema v3 + 4 field (PR#20+21)
   ============================================================ */
{
  id: 'retro-lifecycle', zone: 'panel',
  title: '/retro lifecycle (carryover / 3-strike / re-eval / admin)',
  path: 'ui/src/views/retro/',
  groups: [
    { id: 'rl-kpt', name: 'KPT board (4 column)', cases: [
      { id: 'RL-KPT-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'KEEP / PROBLEM / CARRYOVER / TRY の 4 列描画',
        pre: [], steps: ['/retro 表示'],
        expected: ['4 column grid', '各列が異なる枠色 (success/error/warn/accent)'] },
      { id: 'RL-KPT-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'TRY 列の item に from: refs',
        pre: [], steps: ['immediate item を確認'],
        expected: ['"← R-1" のような source ref 表示', 'P-xx (pending 由来) も同様'] },
    ]},
    { id: 'rl-pip', name: 'Carryover lifecycle pip', cases: [
      { id: 'RL-PIP-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'carryover ▢▢▢ 3 pip で 0/3 〜 3/3',
        pre: [], steps: ['CARRYOVER column の card を確認'],
        expected: ['pip が 3 個並ぶ', 'count text "N/3" 表示'] },
      { id: 'RL-PIP-02', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'carryover_count >= 3 で 赤 + auto-expire 警告',
        pre: [], steps: ['P-04 (count 3/3) を確認'],
        expected: ['pip が error 色', 'count text も error 色', 'verdict が ⏳ auto-expire'] },
      { id: 'RL-PIP-03', pri: 1, scenario: 'any', layers: ['ui'],
        name: '3-strike rule 注記表示',
        pre: [], steps: ['CARRYOVER column 末尾を確認'],
        expected: ['"※ 3-strike rule: carryover_count ≥ 3 で auto-expire flip" の注記'] },
    ]},
    { id: 'rl-verdict', name: 're-evaluation verdict badge', cases: [
      { id: 'RL-VERDICT-PROM-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'still-relevant → 🔄 promoted badge',
        pre: [], steps: ['P-07 を確認'],
        expected: ['🔄 アイコン', 'label "promoted"', 'accent 色'] },
      { id: 'RL-VERDICT-EXP-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'expired → ⏳ auto-expire badge',
        pre: [], steps: ['P-04 を確認'],
        expected: ['⏳ アイコン', 'label "auto-expire"', 'stone 色'] },
      { id: 'RL-VERDICT-DROP-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'drop → ❌ lens-drop badge',
        pre: ['lens が drop verdict を発した case'],
        steps: ['該当 card を確認'],
        expected: ['❌ アイコン', 'label "lens-drop"', 'error 色'] },
      { id: 'RL-VERDICT-NULL-01', pri: 2, scenario: 'any', layers: ['ui'],
        name: 'null verdict は badge 無し',
        pre: [], steps: ['re_evaluation_verdict === null な card を確認'],
        expected: ['badge 表示なし'] },
    ]},
    { id: 'rl-metadata', name: 'lifecycle metadata 表示', cases: [
      { id: 'RL-META-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'last_seen / re-eval 行表示',
        pre: [], steps: ['P-09 を確認'],
        expected: ['"last_seen: 2026-04-22-001"', '"re-eval: 2026-04-29-001"'] },
      { id: 'RL-META-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: '元 retro id 表示',
        pre: [], steps: ['任意 carryover card'],
        expected: ['"元: <sourceRetro>" の表示'] },
    ]},
    { id: 'rl-pending-summary', name: 'pending_summary.json 読み込み', cases: [
      { id: 'RL-PSUM-01', pri: 0, scenario: 'any', layers: ['wire'],
        name: 'pending_summary.json の carryover を CARRYOVER 列に集約',
        pre: ['pending_summary.json に 3 件 carryover'],
        steps: ['/retro mount'],
        expected: ['carryover 3 件描画'] },
      { id: 'RL-PSUM-02', pri: 1, scenario: 'any', layers: ['backend'],
        name: 'aggregator が re_evaluated_in を origin pending.json に back-fill',
        pre: ['retro 再評価で lens が判定'],
        steps: ['aggregator stage 実行', 'origin retro の pending.json 確認'],
        expected: ['re_evaluated_in field に当 retro id'] },
    ]},
    { id: 'rl-admin', name: 'Admin / Recovery section', cases: [
      { id: 'RL-ADM-TOGGLE-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: '⚙ admin で section toggle',
        pre: [], steps: ['/retro', '⚙ admin ボタン押下'],
        expected: ['admin section が expand', 'もう一度押すと collapse'] },
      { id: 'RL-ADM-RECON-01', pri: 0, scenario: 'any', layers: ['ui', 'wire', 'backend'],
        name: 'Reconstruct from archive ボタン',
        pre: ['pending.json を削除済 (or 破損)'],
        steps: ['admin 開く', 'Reconstruct ボタン押下'],
        expected: ['retro.reconstructFromArchive() invoke',
                   '応答に applied_summary + pending_summary',
                   'reconstructed_from_archive: true marker'] },
      { id: 'RL-ADM-RECON-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'reconstruct 後の finding に marker 表示',
        pre: ['reconstruct 完了'], steps: ['card を確認'],
        expected: ['"reconstructed from archive" の小 marker 表示'] },
    ]},
  ],
},

/* ============================================================
   16. GUIDANCE-SCOPE — agent-keyed + skill-keyed (PR#18)
   ============================================================ */
{
  id: 'guidance-scope', zone: 'panel',
  title: '/guidance scope hierarchy (agents + skills)',
  path: 'ui/src/views/guidance/',
  groups: [
    { id: 'gs-filter', name: 'scope filter pill', cases: [
      { id: 'GS-FILTER-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'filter pill 4 種 (all / Agents / loom-review / loom-retro)',
        pre: [], steps: ['/guidance 表示'],
        expected: ['pill 4 個', '各 count 表示', 'クリックで active が flip'] },
      { id: 'GS-FILTER-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'Agents pill で agent-keyed entries のみ表示',
        pre: [], steps: ['Agents pill クリック'],
        expected: ['全 entry の keyKind === "agent"'] },
      { id: 'GS-FILTER-03', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'loom-review pill で keyPath が skills/loom-review/...',
        pre: [], steps: ['loom-review pill クリック'],
        expected: ['全 entry の keyPath が skills/loom-review/ で始まる'] },
    ]},
    { id: 'gs-badge', name: 'card badge / key path', cases: [
      { id: 'GS-BADGE-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'AGENT / SKILL badge',
        pre: [], steps: ['任意 card 確認'],
        expected: ['緑 AGENT または accent SKILL badge'] },
      { id: 'GS-BADGE-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'aggregator scope に WRITE badge',
        pre: [], steps: ['skills/loom-retro/stages/aggregator の guidance を確認'],
        expected: ['WRITE badge 表示'] },
      { id: 'GS-KEYPATH-01', pri: 2, scenario: 'any', layers: ['ui'],
        name: 'key path 表示',
        pre: [], steps: ['任意 card 確認'],
        expected: ['"agents/loom-pm" / "skills/loom-review/strategies/trio/code" 等が見える'] },
    ]},
  ],
},

/* ============================================================
   17. SESSION-LABEL — reviewer_agent column rename (PR#18)
   ============================================================ */
{
  id: 'session-label', zone: 'panel',
  title: '/sessions reviewer column rename',
  path: 'ui/src/views/session-list/',
  groups: [
    { id: 'sl-col', name: '列ヘッダ', cases: [
      { id: 'SL-COL-01', pri: 1, scenario: 'any', layers: ['ui'],
        name: '列ヘッダが "reviewer (skill)"',
        pre: [], steps: ['/sessions'],
        expected: ['ヘッダ text が "reviewer (skill)" に変更'] },
    ]},
    { id: 'sl-val', name: '値の表記', cases: [
      { id: 'SL-VAL-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: '値が skill identifier 形式',
        pre: ['DB 値が "loom-code-reviewer"'],
        steps: ['/sessions の reviewer 列確認'],
        expected: ['表示は "loom-review/trio.code" にリネーム', 'DB 値そのまま表示はしない'] },
      { id: 'SL-VAL-02', pri: 1, scenario: 'any', layers: ['ui'],
        name: 'mapping 表に存在しない旧名は raw 表示',
        pre: ['不明な旧名'],
        steps: ['/sessions'],
        expected: ['raw 文字列 + 灰色 (unmapped) badge'] },
    ]},
  ],
},

/* ============================================================
   18. ERR-NOT-FOUND — approval.decide が NOT_FOUND throw (PR#19)
   ============================================================ */
{
  id: 'err-not-found', zone: 'cross-cutting',
  title: 'approval.decide NOT_FOUND toast',
  path: 'ui/src/hooks/usePMSession.ts · ui/src/notifications/toastBus.ts',
  groups: [
    { id: 'enf-error', name: 'error handling', cases: [
      { id: 'ENF-CATCH-01', pri: 0, scenario: 'any', layers: ['wire'],
        name: 'NOT_FOUND throw を try/catch',
        pre: ['approval event が server 側で消失'],
        steps: ['approval.decide(eventId) 呼ぶ'],
        expected: ['TRPCError code === "NOT_FOUND" を catch', 'crash しない'] },
      { id: 'ENF-TOAST-01', pri: 0, scenario: 'any', layers: ['ui'],
        name: 'NOT_FOUND で error toast',
        pre: ['ENF-CATCH-01 trigger'],
        steps: ['ENF-CATCH-01 と同条件'],
        expected: ['toast 出現',
                   'text: "approval event が見つかりません (期限切れ?)"',
                   'action button: retry'] },
      { id: 'ENF-RETRY-01', pri: 1, scenario: 'any', layers: ['wire'],
        name: 'retry action で再 invoke',
        pre: ['ENF-TOAST-01 toast 出現'],
        steps: ['retry ボタン押下'],
        expected: ['approval.decide 再呼出'] },
    ]},
  ],
},

/* ============================================================
   19. ADMIN-RECON — retro.reconstructFromArchive procedure
   ============================================================ */
{
  id: 'admin-recon', zone: 'cross-cutting',
  title: 'retro.reconstructFromArchive 配線',
  path: 'daemon/src/routes/retro.ts · daemon/src/lib/retro-reconstruct.ts',
  groups: [
    { id: 'ar-trpc', name: 'tRPC procedure', cases: [
      { id: 'AR-TRPC-01', pri: 0, scenario: 'any', layers: ['backend'],
        name: 'retro.reconstructFromArchive(retroId) export',
        pre: [], steps: ['AppRouter type 確認'],
        expected: ['procedure が型として export', 'input: { retroId: string }'] },
      { id: 'AR-OUT-01', pri: 0, scenario: 'any', layers: ['backend'],
        name: '出力に applied + pending summary + warnings',
        pre: [], steps: ['archive markdown ありの retroId で invoke'],
        expected: ['applied_summary / pending_summary / warnings の 3 key',
                   'reconstructed_from_archive: true marker'] },
      { id: 'AR-OUT-02', pri: 1, scenario: 'any', layers: ['backend'],
        name: 'archive が無い retroId は明示エラー',
        pre: [], steps: ['不正な retroId で invoke'],
        expected: ['TRPCError code: NOT_FOUND'] },
    ]},
    { id: 'ar-ui', name: 'UI 配線', cases: [
      { id: 'AR-UI-01', pri: 1, scenario: 'any', layers: ['ui', 'wire'],
        name: 'admin button から invoke',
        pre: ['/retro mount, admin expand'],
        steps: ['Reconstruct ボタン押下'],
        expected: ['retro.reconstructFromArchive invoke', '応答後 UI が pending_summary を表示更新'] },
    ]},
  ],
},

];
