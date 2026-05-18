/**
 * ui/src/data/roster.ts — 13-agent full metadata roster (SSoT).
 *
 * WHY this file vs ui/src/views/room/roster.ts:
 * This file is the canonical SSoT for all components (Phase B+).
 * The `ui/src/views/room/roster.ts` re-exports from here for
 * backward-compat consumers that import from the old path.
 *
 * M0.18 Phase 0 schema update:
 * - kind: 'persistent' | 'spirit' — 3 persistent + 10 ephemeral spirits
 * - summonedBy: string | null — skill identifier for spirits, null for persistent
 * - group: 'core' | 'review' | 'retro-lens' | 'retro-stage' (was 'retro')
 *   WHY split 'retro': lenses and stages have different UX in Customization tree
 *   and Room Spirit Summoning (Phase 1 consumers need this distinction).
 *
 * Ported from docs/design/2026-05-17-m0.18-ui-rework/project/cat.jsx ROSTER.
 */

export type HatType =
  | 'leader'
  | 'visor'
  | 'wizard'
  | 'goggles'
  | 'headband'
  | 'scarf'
  | 'bowtie'
  | 'cap'
  | 'antenna'
  | null;

export type GroupType = 'core' | 'review' | 'retro-lens' | 'retro-stage';

export type PoseType = 'sit' | 'walk' | 'work';

export type KindType = 'persistent' | 'spirit';

export interface RosterEntry {
  id: string;
  kind: KindType;
  /** skill identifier path for spirits (e.g. "loom-review/single"), null for persistent */
  summonedBy: string | null;
  role: string;
  jp: string;
  name: string;
  breed: string;
  quote: string;
  hat: HatType;
  fur: string;   // hex color
  cheek: string; // hex color
  group: GroupType;
}

// 13-agent roster: 3 persistent + 10 ephemeral spirits
// Persistent: always in the room (PM / Developer / Retro PM)
// Spirit: summoned via skills, vanishes after work — summonedBy is the skill identifier
// Data ported verbatim from design source to preserve visual identity consistency.
export const ROSTER: readonly RosterEntry[] = [
  // ---- Persistent (3) — desk + name plate -------------------------------------
  { id: 'pm',             kind: 'persistent', summonedBy: null, role: 'PM',                jp: 'プロジェクトマネージャー', name: 'ニケ',    breed: 'ブリティッシュショートヘア', quote: '落ち着いて、まず仕様から。',   hat: 'leader',   fur: '#cdd2d8', cheek: '#f4a3b3', group: 'core' },
  { id: 'dev',            kind: 'persistent', summonedBy: null, role: 'Developer',         jp: 'デベロッパー',           name: 'サバ',    breed: 'サバトラ',                  quote: 'RED → GREEN、まず落とすの。', hat: 'headband', fur: '#b8a98c', cheek: '#f4a3b3', group: 'core' },
  { id: 'retro-pm',      kind: 'persistent', summonedBy: null, role: 'Retro PM',          jp: '振り返り進行役',         name: 'ヨミ',    breed: 'アビシニアン',              quote: '今日もお疲れさま。集合〜。',  hat: 'leader',   fur: '#c89668', cheek: '#f4a3b3', group: 'core' },

  // ---- Review spirits (4) — loom-review skill ---------------------------------
  { id: 'rev',            kind: 'spirit', summonedBy: 'loom-review/single',        role: 'Reviewer',          jp: '汎用レビュアー',         name: 'ハカセ',  breed: 'アメリカンショートヘア',    quote: 'verdict は証拠とともに。',    hat: 'goggles',  fur: '#cfc7b4', cheek: '#f4a3b3', group: 'review' },
  { id: 'rev-code',      kind: 'spirit', summonedBy: 'loom-review/trio.code',     role: 'Code Reviewer',     jp: 'コードレビュアー',       name: 'ペン',    breed: 'ハチワレ',                  quote: 'そのcatch、握り潰してない？', hat: 'visor',    fur: '#e8e2d2', cheek: '#f4a3b3', group: 'review' },
  { id: 'rev-sec',       kind: 'spirit', summonedBy: 'loom-review/trio.security', role: 'Security Reviewer', jp: 'セキュリティレビュアー', name: 'シノビ',  breed: '黒白ハチワレ',              quote: 'secret、commitしてない？',    hat: 'scarf',    fur: '#3a3340', cheek: '#ff8aa3', group: 'review' },
  { id: 'rev-test',      kind: 'spirit', summonedBy: 'loom-review/trio.test',     role: 'Test Reviewer',     jp: 'テストレビュアー',       name: 'メメ',    breed: 'ロシアンブルー',            quote: 'そのテスト、本当に落ちる？',  hat: 'bowtie',   fur: '#a3b1bd', cheek: '#f4a3b3', group: 'review' },

  // ---- Retro lens spirits (4) — loom-retro skill, lenses -----------------------
  { id: 'retro-pj',      kind: 'spirit', summonedBy: 'loom-retro/lenses.pj-axis',       role: 'PJ Judge',       jp: 'プロジェクト審判', name: 'リケ',    breed: 'ノルウェージャン',          quote: '成果物として見ようか。',      hat: 'wizard',   fur: '#e8d6b3', cheek: '#f4a3b3', group: 'retro-lens' },
  { id: 'retro-proc',    kind: 'spirit', summonedBy: 'loom-retro/lenses.process-axis',  role: 'Process Judge',  jp: 'プロセス審判',     name: 'リズ',    breed: 'ベンガル',                  quote: 'TDDの順序、ズレてない？',     hat: 'wizard',   fur: '#d8a86a', cheek: '#f4a3b3', group: 'retro-lens' },
  { id: 'retro-meta',    kind: 'spirit', summonedBy: 'loom-retro/lenses.meta-axis',     role: 'Meta Judge',     jp: 'メタ審判',         name: 'オウル',  breed: 'シャム',                    quote: 'そもそも仕組みを疑おう。',    hat: 'wizard',   fur: '#efe6d4', cheek: '#f4a3b3', group: 'retro-lens' },
  { id: 'retro-research',kind: 'spirit', summonedBy: 'loom-retro/lenses.researcher',    role: 'Researcher',     jp: '調査役',           name: 'サグ',    breed: 'メインクーン',              quote: 'ログ、全部読んでおいたよ。',  hat: 'cap',      fur: '#9c8266', cheek: '#f4a3b3', group: 'retro-lens' },

  // ---- Retro stage spirits (2) — loom-retro skill, stages ----------------------
  { id: 'retro-counter', kind: 'spirit', summonedBy: 'loom-retro/stages.counter-arguer',role: 'Counter-Arguer', jp: '反対弁論役',       name: 'アマ',    breed: 'ターキッシュアンゴラ',      quote: '本当にそうかな？反証あり。',  hat: 'antenna',  fur: '#f4f0e6', cheek: '#f4a3b3', group: 'retro-stage' },
  { id: 'retro-agg',     kind: 'spirit', summonedBy: 'loom-retro/stages.aggregator',    role: 'Aggregator',     jp: '総括役',           name: 'マル',    breed: 'スコティッシュフォールド',  quote: '結論、3行にまとめるね。',     hat: 'scarf',    fur: '#cfb597', cheek: '#f4a3b3', group: 'retro-stage' },
] as const;
