/**
 * CharSheet — character sheet for all 13 cat agents.
 * WHY: ported from ui/prototype/char-sheet.jsx; shows breed/name/quote per agent.
 * Grouped by core / review / retro-lens / retro-stage with section dividers (pixel RPG aesthetic).
 * M0.11.4 t15: rewritten to use rpg-frame / rpg-title / CatSprite (Phase B SSoT).
 * M0.18 t0: updated for new GroupType split ('retro' → 'retro-lens' + 'retro-stage').
 */
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';
import type { GroupType } from '../room/roster';

export interface CharSheetProps {
  width?: number;
}

const GROUP_TITLE: Record<GroupType, { jp: string; en: string }> = {
  core:         { jp: 'コア — PJ 駆動',          en: 'CORE' },
  review:       { jp: 'レビュアー — 監視猫',       en: 'REVIEWERS' },
  'retro-lens': { jp: 'Retro Lens — 観察役 4体', en: 'RETRO LENSES' },
  'retro-stage':{ jp: 'Retro Stage — 仕上げ 2体', en: 'RETRO STAGES' },
};

const GROUPS: GroupType[] = ['core', 'review', 'retro-lens', 'retro-stage'];

export function CharSheet({ width = 920 }: CharSheetProps): JSX.Element {
  return (
    <div
      data-testid="char-sheet"
      className="rpg-frame pixel"
      style={{ width, padding: 16 }}
    >
      {/* Title */}
      <div className="rpg-title" style={{ marginBottom: 4 }}>
        13 agent — キャラクターシート
      </div>
      <div className="rpg-label" style={{ marginBottom: 14 }}>
        全員に猫種・名前・一言性格を付与
      </div>

      {GROUPS.map((g) => {
        const members = ROSTER.filter((r) => r.group === g);
        const title = GROUP_TITLE[g];
        return (
          <div key={g} style={{ marginBottom: 14 }}>
            {/* Section divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ height: 2, flex: 1, background: 'var(--p-border)' }} />
              <div className="rpg-label" style={{ display: 'flex', gap: 4 }}>
                <span>{title.en}</span>
                <span>·</span>
                <span>{title.jp}</span>
              </div>
              <div style={{ height: 2, flex: 1, background: 'var(--p-border)' }} />
            </div>

            {/* Agent cards — 4-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {members.map((cat) => (
                <div
                  key={cat.id}
                  data-testid="agent-card"
                  className="rpg-frame-tight"
                  style={{ padding: 10 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {/* CatSprite — Phase B SSoT */}
                    <div style={{ background: 'var(--p-tint)', border: '1px solid var(--p-border)', padding: 2 }}>
                      <CatSprite
                        data-testid="cat-sprite"
                        size={48}
                        fur={cat.fur}
                        cheek={cat.cheek}
                        hat={cat.hat}
                        pose="sit"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{cat.name}</div>
                      <div className="rpg-label" style={{ marginTop: 1 }}>{cat.role}</div>
                      <div style={{ fontSize: 9, color: 'var(--p-text-muted)', marginTop: 2 }}>{cat.breed}</div>
                    </div>
                  </div>
                  {/* quote */}
                  <div style={{
                    fontSize: 9, fontStyle: 'italic', color: 'var(--p-text)',
                    marginTop: 6, padding: '4px 6px',
                    background: 'var(--p-tint)',
                    border: '1px dashed var(--p-border)', lineHeight: 1.4,
                  }}>
                    「{cat.quote}」
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
