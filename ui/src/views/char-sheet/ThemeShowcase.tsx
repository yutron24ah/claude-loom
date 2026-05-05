/**
 * ThemeShowcase — 3 theme palette (default / dusk / night) preview.
 * WHY: Design tool that previews the 3 RPG color themes side-by-side with
 * swatches and mini-room previews. Ported from char-sheet.jsx ThemeShowcase.
 * M0.11.4 t15: uses rpg-frame / rpg-title / .theme-dusk / .theme-night classes.
 */
import { CatSprite } from '../../components/CatSprite';

export interface ThemeShowcaseProps {
  width?: number;
}

/** WHY typed constant: avoids string literals scattered across render logic */
const THEME_CARDS = [
  {
    id: '' as const,
    className: '',
    name: 'noon — 昼',
    jp: 'ぽっぷ・明るい開発室',
    desc: 'Kintai DS の indigo + 白 + slate を尊重。OAuth 画面と地続き。',
  },
  {
    id: 'dusk' as const,
    className: 'theme-dusk',
    name: 'dusk — 夕暮れ',
    jp: '暖かい・少し秘密基地っぽい',
    desc: '紫の屋内灯。集中の時間。',
  },
  {
    id: 'night' as const,
    className: 'theme-night',
    name: 'night — 深夜',
    jp: 'ダークな秘密基地',
    desc: '黒基調・ネオン青。観賞用に強い。',
  },
] as const;

/** Color tokens to sample in each swatch row */
const SWATCH_TOKENS = [
  'var(--p-bg-sky)',
  'var(--p-wall)',
  'var(--p-bg-floor)',
  'var(--p-accent)',
  'var(--p-success)',
  'var(--p-error)',
] as const;

export function ThemeShowcase({ width = 920 }: ThemeShowcaseProps): JSX.Element {
  return (
    <div
      data-testid="theme-showcase"
      className="rpg-frame pixel"
      style={{ width, padding: 16 }}
    >
      <div className="rpg-title" style={{ marginBottom: 4 }}>
        3つの世界観 — 時間帯切替
      </div>
      <div className="rpg-label" style={{ marginBottom: 14 }}>
        System default · 朝 9-17 noon / 17-22 dusk / 22-9 night（Tweaks で固定可）
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {THEME_CARDS.map((t) => (
          <div
            key={t.id || 'noon'}
            data-testid="theme-card"
            className={`${t.className} rpg-frame-tight`}
            style={{
              padding: 10,
              background: 'var(--p-bg-sky)',
              color: 'var(--p-text)',
            }}
          >
            {/* Header panel */}
            <div style={{
              background: 'var(--p-paper)',
              border: '2px solid var(--p-border)',
              padding: 8, marginBottom: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--p-text)' }}>{t.name}</div>
              <div style={{ fontSize: 10, color: 'var(--p-text-muted)', marginTop: 2 }}>{t.jp}</div>
              <div style={{ fontSize: 9, color: 'var(--p-text-muted)', marginTop: 6 }}>{t.desc}</div>
            </div>

            {/* Mini room preview */}
            <div style={{
              height: 80,
              background: 'var(--p-wall)',
              border: '2px solid var(--p-border)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 36,
                background: 'var(--p-bg-floor)',
              }} />
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 28, height: 6,
                background: 'var(--p-rug)',
              }} />
              <div style={{ position: 'absolute', left: 14, bottom: 18 }}>
                <CatSprite size={32} pose="work" hat="leader" />
              </div>
              <div style={{ position: 'absolute', left: 50, bottom: 18 }}>
                <CatSprite size={32} pose="work" hat="headband" fur="#b8a98c" />
              </div>
              <div style={{ position: 'absolute', right: 14, bottom: 18 }}>
                <CatSprite size={32} pose="sit" hat="visor" fur="#e8e2d2" />
              </div>
            </div>

            {/* Color swatches */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {SWATCH_TOKENS.map((token, i) => (
                <div
                  key={i}
                  data-testid="color-swatch"
                  style={{
                    width: 18, height: 18,
                    background: token,
                    border: '1px solid var(--p-border)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
