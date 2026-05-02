/**
 * CharSheet — character sheet for all 13 cat agents.
 * WHY: ported from ui/prototype/char-sheet.jsx; shows breed/name/quote per agent.
 * Grouped by core / review / retro with section dividers (pixel RPG aesthetic).
 */
/**
 * WHY: CatSprite removed in M3.0 (Phaser sprites replace DOM sprites).
 * CharSheet uses a simple color circle for agent avatars (placeholder until M5).
 */
import React from 'react';
import { ROSTER } from '../room/roster';
import type { GroupType } from '../room/roster';

export interface CharSheetProps {
  width?: number;
}

const GROUP_TITLE: Record<GroupType, { jp: string; en: string }> = {
  core:   { jp: 'コア — PJ 駆動',      en: 'CORE' },
  review: { jp: 'レビュアー — 監視猫', en: 'REVIEWERS' },
  retro:  { jp: 'Retro — 観察役 7体',  en: 'RETRO BOARD' },
};

const GROUPS: GroupType[] = ['core', 'review', 'retro'];

export function CharSheet({ width = 920 }: CharSheetProps): JSX.Element {
  return (
    <div
      data-testid="char-sheet"
      style={{
        width, padding: 16,
        border: '3px solid var(--p-border, #2a2a35)',
        background: 'var(--p-paper, #f8f4ec)',
        fontFamily: 'ui-monospace, monospace',
        boxShadow: '4px 4px 0 0 var(--p-shadow, rgba(0,0,0,0.2))',
      }}
    >
      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4, color: 'var(--p-text, #1a1a2e)' }}>
        13 agent — キャラクターシート
      </div>
      <div style={{ fontSize: 9, color: 'var(--p-text-muted, #64748b)', letterSpacing: '0.06em', marginBottom: 14, textTransform: 'uppercase' }}>
        全員に猫種・名前・一言性格を付与
      </div>

      {GROUPS.map((g) => {
        const members = ROSTER.filter((r) => r.group === g);
        const title = GROUP_TITLE[g];
        return (
          <div key={g} style={{ marginBottom: 14 }}>
            {/* Section divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ height: 2, flex: 1, background: 'var(--p-border, #2a2a35)' }} />
              <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase' }}>
                {title.en}
              </div>
              <div style={{ height: 2, flex: 1, background: 'var(--p-border, #2a2a35)' }} />
            </div>

            {/* Agent cards — 4-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {members.map((cat) => (
                <div
                  key={cat.id}
                  data-testid="agent-card"
                  style={{
                    padding: 10,
                    border: '2px solid var(--p-border, #2a2a35)',
                    background: 'var(--p-tint, #f0e8d8)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {/* Agent avatar circle — CatSprite replaced by Phaser sprite in M3.0.
                        Pixel art avatar restoration is M5 (frontend-design). */}
                    <div style={{
                      background: 'var(--p-tint, #e8e0d0)',
                      border: '1px solid var(--p-border, #2a2a35)', padding: 2,
                      width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: cat.fur ?? 'var(--p-accent, #6366f1)',
                        border: '2px solid var(--p-border, #2a2a35)',
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--p-text, #1a1a2e)' }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--p-text-muted, #64748b)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {cat.role}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--p-text-muted, #64748b)', marginTop: 2 }}>
                        {cat.breed}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9, fontStyle: 'italic', color: 'var(--p-text, #1a1a2e)',
                    marginTop: 6, padding: '4px 6px',
                    background: 'var(--p-tint, #e8e0d0)',
                    border: '1px dashed var(--p-border, #2a2a35)', lineHeight: 1.4,
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
