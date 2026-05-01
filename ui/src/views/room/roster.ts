/**
 * ROSTER — 13-agent cat roster for claude-loom dev room.
 * WHY: single source of truth for agent visual identity (fur / cheek / hat / name / breed / quote).
 * Ported from ui/prototype/cat.jsx ROSTER export.
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

export type GroupType = 'core' | 'review' | 'retro';

export interface RosterEntry {
  id: string;
  role: string;
  jp: string;
  name: string;
  breed: string;
  quote: string;
  hat: HatType;
  fur: string;
  cheek: string;
  group: GroupType;
}

export const ROSTER: RosterEntry[] = [
  { id: 'pm',             role: 'PM',                jp: 'プロジェクトマネージャー', name: 'ニケ',    breed: 'ブリティッシュショートヘア', quote: '落ち着いて、まず仕様から。',   hat: 'leader',   fur: '#cdd2d8', cheek: '#f4a3b3', group: 'core' },
  { id: 'dev',            role: 'Developer',         jp: 'デベロッパー',           name: 'サバ',    breed: 'サバトラ',                  quote: 'RED → GREEN、まず落とすの。', hat: 'headband', fur: '#b8a98c', cheek: '#f4a3b3', group: 'core' },
  { id: 'rev',            role: 'Reviewer',          jp: '汎用レビュアー',         name: 'ハカセ',  breed: 'アメリカンショートヘア',    quote: 'verdict は証拠とともに。',    hat: 'goggles',  fur: '#cfc7b4', cheek: '#f4a3b3', group: 'review' },
  { id: 'rev-code',       role: 'Code Reviewer',     jp: 'コードレビュアー',       name: 'ペン',    breed: 'ハチワレ',                  quote: 'そのcatch、握り潰してない？', hat: 'visor',    fur: '#e8e2d2', cheek: '#f4a3b3', group: 'review' },
  { id: 'rev-sec',        role: 'Security Reviewer', jp: 'セキュリティレビュアー', name: 'シノビ',  breed: '黒白ハチワレ',              quote: 'secret、commitしてない？',    hat: 'scarf',    fur: '#3a3340', cheek: '#ff8aa3', group: 'review' },
  { id: 'rev-test',       role: 'Test Reviewer',     jp: 'テストレビュアー',       name: 'メメ',    breed: 'ロシアンブルー',            quote: 'そのテスト、本当に落ちる？',  hat: 'bowtie',   fur: '#a3b1bd', cheek: '#f4a3b3', group: 'review' },
  { id: 'retro-pm',       role: 'Retro PM',          jp: '振り返り進行役',         name: 'ヨミ',    breed: 'アビシニアン',              quote: '今日もお疲れさま。集合〜。',  hat: 'leader',   fur: '#c89668', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-research', role: 'Researcher',        jp: '調査役',                 name: 'サグ',    breed: 'メインクーン',              quote: 'ログ、全部読んでおいたよ。',  hat: 'cap',      fur: '#9c8266', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-pj',       role: 'PJ Judge',          jp: 'プロジェクト審判',       name: 'リケ',    breed: 'ノルウェージャン',          quote: '成果物として見ようか。',      hat: 'wizard',   fur: '#e8d6b3', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-proc',     role: 'Process Judge',     jp: 'プロセス審判',           name: 'リズ',    breed: 'ベンガル',                  quote: 'TDDの順序、ズレてない？',     hat: 'wizard',   fur: '#d8a86a', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-meta',     role: 'Meta Judge',        jp: 'メタ審判',               name: 'オウル',  breed: 'シャム',                    quote: 'そもそも仕組みを疑おう。',    hat: 'wizard',   fur: '#efe6d4', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-counter',  role: 'Counter-Arguer',    jp: '反対弁論役',             name: 'アマ',    breed: 'ターキッシュアンゴラ',      quote: '本当にそうかな？反証あり。',  hat: 'antenna',  fur: '#f4f0e6', cheek: '#f4a3b3', group: 'retro' },
  { id: 'retro-agg',      role: 'Aggregator',        jp: '総括役',                 name: 'マル',    breed: 'スコティッシュフォールド',  quote: '結論、3行にまとめるね。',     hat: 'scarf',    fur: '#cfb597', cheek: '#f4a3b3', group: 'retro' },
];
