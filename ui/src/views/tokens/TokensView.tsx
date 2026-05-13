/**
 * TokensView — usage + cost dashboard (M0.15 t9 redesign port).
 *
 * WHY: Replaces the old TokenMeterView (useTokenUsage-based hardcoded fixture)
 * with a redesign-driven view that sources all data from useScenario().
 * Visual SSoT: redesign/screens/tokens.jsx.
 *
 * Renders:
 *   - 7-day daily cost bar chart with cost label + cache-hit ratio marker
 *   - per-agent table: model, input/output, cache R/W, cache-hit %, cost USD
 *   - top stat cards: total cost, input tokens, output tokens, cache-hit avg
 *   - efficiency hints (rule-based): low cache-hit days + opus over-spec agents
 *
 * Data source: useScenario().tokens + useScenario().pricing only (no legacy hooks).
 *
 * REQ-068: M0.15 t9 acceptance criteria.
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { TokensByAgent, Pricing, ModelId } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Pure helpers (no side effects)
// ---------------------------------------------------------------------------

/** Format token count as compact human string (1.2M / 380k / 142). */
function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

/** Compute USD cost from agent token row + model pricing. */
function costOf(t: TokensByAgent, modelId: ModelId, pricing: Pricing): number {
  const p = pricing[modelId] ?? pricing.sonnet;
  return (
    t.input    * p.input    +
    t.output   * p.output   +
    t.cacheWrite * p.cacheWrite +
    t.cacheRead  * p.cacheRead
  ) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DailyBarProps {
  day: string;
  cost: number;
  cacheRatio: number;
  heightPct: number;
}

/** Single vertical bar in the 7-day cost chart. */
function DailyBar({ day, cost, cacheRatio, heightPct }: DailyBarProps): JSX.Element {
  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
    >
      <span style={{ fontSize: 9, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
        ${cost.toFixed(2)}
      </span>
      {/* Bar wrapper — fixed height so bars are comparable */}
      <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
        {/* The bar element carries data-testid and data-cache-ratio for tests */}
        <div
          data-testid={`daily-bar-${day}`}
          data-cache-ratio={String(Math.round(cacheRatio * 100))}
          style={{
            width: '100%',
            height: `${heightPct}%`,
            background: 'var(--p-accent)',
            border: '1.5px solid var(--p-border)',
            position: 'relative',
            minHeight: 2,
          }}
        >
          {/* Cache-hit ratio marker line within the bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(1 - cacheRatio) * 100}%`,
              height: 2,
              background: 'var(--p-success)',
            }}
            title={`cache ${Math.round(cacheRatio * 100)}%`}
          />
        </div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{day}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TokensView(): JSX.Element {
  const sc = useScenario();
  const t = sc.tokens;
  const pricing = sc.pricing;

  // Compute per-row derived metrics
  const rows = t.byAgent.map(r => {
    const total  = r.input + r.output + r.cacheWrite + r.cacheRead;
    const cacheHit = total > 0 ? r.cacheRead / (r.input + r.cacheRead) : 0;
    const cost   = costOf(r, r.model as ModelId, pricing);
    return { ...r, total, cacheHit, cost };
  });

  const totals = rows.reduce(
    (a, r) => ({
      input:      a.input      + r.input,
      output:     a.output     + r.output,
      cacheWrite: a.cacheWrite + r.cacheWrite,
      cacheRead:  a.cacheRead  + r.cacheRead,
      cost:       a.cost       + r.cost,
    }),
    { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0 },
  );

  const avgCacheHit = rows.length > 0
    ? rows.reduce((a, r) => a + r.cacheHit, 0) / rows.length
    : 0;

  const maxDailyCost = Math.max(...t.daily.map(d => d.cost), 0.01);

  // Efficiency hint flags
  const lowCacheHitDays = t.daily.filter(d => d.cacheRatio < 0.7);
  const opusOverspecRows = rows.filter(
    r => r.model === 'opus' && r.output < 30_000,
  );
  const hasHints = lowCacheHitDays.length > 0 || opusOverspecRows.length > 0;

  return (
    <div
      data-testid="tokens-view"
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        overflow: 'auto',
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>$ TOKENS — usage + 効率分析</div>
        <span className="chip">{t.period}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--p-text-muted)' }}>
          pricing: Anthropic公式 (1h cache)
        </span>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            lbl: 'TOTAL COST',
            v:   '$' + totals.cost.toFixed(2),
            sub: '≈ ¥' + Math.round(totals.cost * 150).toLocaleString(),
            c:   'var(--p-accent)',
          },
          {
            lbl: 'INPUT TOK',
            v:   fmtN(totals.input + totals.cacheRead),
            sub: 'incl. cached',
            c:   'var(--p-text)',
          },
          {
            lbl: 'OUTPUT TOK',
            v:   fmtN(totals.output),
            sub: 'billed at higher rate',
            c:   'var(--p-text)',
          },
          {
            lbl: 'CACHE HIT',
            v:   Math.round(avgCacheHit * 100) + '%',
            sub: avgCacheHit > 0.7 ? '良好' : '要改善',
            c:   avgCacheHit > 0.7 ? 'var(--p-success)' : 'var(--p-warn)',
          },
        ].map(s => (
          <div
            key={s.lbl}
            style={{
              padding: 12,
              background: 'var(--p-paper)',
              border: '2px solid var(--p-border)',
              boxShadow: '3px 3px 0 0 var(--p-shadow)',
            }}
          >
            <div style={{ fontSize: 8, color: 'var(--p-text-muted)', letterSpacing: '0.08em' }}>
              {s.lbl}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: s.c,
                fontFamily: 'ui-monospace, monospace',
                marginTop: 2,
              }}
            >
              {s.v}
            </div>
            <div style={{ fontSize: 9, color: 'var(--p-text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div
        style={{
          background: 'var(--p-paper)',
          border: '2px solid var(--p-border)',
          padding: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: 'var(--p-text-muted)',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          DAILY COST × CACHE-HIT (7d)
        </div>
        <div
          data-testid="daily-chart"
          style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}
        >
          {t.daily.map(d => (
            <DailyBar
              key={d.day}
              day={d.day}
              cost={d.cost}
              cacheRatio={d.cacheRatio}
              heightPct={(d.cost / maxDailyCost) * 100}
            />
          ))}
        </div>
        {/* Legend */}
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: 'var(--p-text-muted)',
            display: 'flex',
            gap: 16,
          }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 8,
                background: 'var(--p-accent)',
                marginRight: 4,
                verticalAlign: 'middle',
              }}
            />
            cost ($/day)
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 2,
                background: 'var(--p-success)',
                marginRight: 4,
                verticalAlign: 'middle',
              }}
            />
            cache-hit ratio
          </span>
        </div>
      </div>

      {/* Per-agent table */}
      <div
        data-testid="agent-table"
        style={{ background: 'var(--p-paper)', border: '2px solid var(--p-border)' }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 80px 90px 90px 100px 90px 90px',
            fontSize: 9,
            color: 'var(--p-text-muted)',
            letterSpacing: '0.06em',
            padding: '6px 10px',
            borderBottom: '2px solid var(--p-border)',
            background: 'var(--p-tint)',
          }}
        >
          <span>AGENT</span>
          <span>MODEL</span>
          <span style={{ textAlign: 'right' }}>INPUT</span>
          <span style={{ textAlign: 'right' }}>OUTPUT</span>
          <span style={{ textAlign: 'right' }}>CACHE R/W</span>
          <span style={{ textAlign: 'right' }}>CACHE-HIT</span>
          <span style={{ textAlign: 'right' }}>COST</span>
        </div>

        {/* Rows sorted by cost descending */}
        {[...rows].sort((a, b) => b.cost - a.cost).map(r => {
          const lowHit = r.cacheHit < 0.5;
          return (
            <div
              key={r.agentId}
              data-testid={`agent-row-${r.agentId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 80px 90px 90px 100px 90px 90px',
                alignItems: 'center',
                padding: '8px 10px',
                borderBottom: '1px dashed var(--p-border)',
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {/* Agent ID */}
              <div
                style={{
                  fontWeight: 700,
                  fontFamily: 'system-ui',
                }}
              >
                {r.agentId}
              </div>
              {/* Model badge */}
              <span
                style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  border: '1px solid var(--p-border)',
                  width: 'fit-content',
                }}
              >
                {r.model}
              </span>
              {/* Input */}
              <span style={{ textAlign: 'right' }}>{fmtN(r.input)}</span>
              {/* Output */}
              <span style={{ textAlign: 'right' }}>{fmtN(r.output)}</span>
              {/* Cache R / W */}
              <span style={{ textAlign: 'right' }}>
                {fmtN(r.cacheRead)} / {fmtN(r.cacheWrite)}
              </span>
              {/* Cache-hit % */}
              <span
                style={{
                  textAlign: 'right',
                  color: lowHit ? 'var(--p-warn)' : 'var(--p-success)',
                  fontWeight: 700,
                }}
              >
                {Math.round(r.cacheHit * 100)}%
              </span>
              {/* Cost USD */}
              <span
                data-testid={`agent-cost-${r.agentId}`}
                style={{ textAlign: 'right', fontWeight: 700 }}
              >
                ${r.cost.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Efficiency hints (rule-based, always rendered for testability) */}
      <div
        data-testid="efficiency-hints"
        style={{
          marginTop: 12,
          padding: 12,
          background: 'var(--p-paper)',
          border: '2px dashed var(--p-warn)',
          fontSize: 10,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: 'var(--p-warn)',
            letterSpacing: '0.06em',
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          効率改善ヒント (rule-based)
        </div>

        {/* Low cache-hit days */}
        {lowCacheHitDays.map(d => (
          <div key={d.day}>
            ◆ <b>{d.day}</b> の cache-hit が {Math.round(d.cacheRatio * 100)}%。
            system prompt + tool def を session 単位で固定すると改善する可能性あり。
          </div>
        ))}

        {/* Opus over-spec agents */}
        {opusOverspecRows.map(r => {
          const savings =
            r.cost - r.cost * (pricing.sonnet.output / pricing.opus.output);
          return (
            <div key={r.agentId}>
              ◆ <b>{r.agentId}</b> は output が少なく、opus を sonnet に下げて $
              {savings.toFixed(2)}/週 節約できる可能性。
            </div>
          );
        })}

        {/* No hints fallback */}
        {!hasHints && (
          <div style={{ color: 'var(--p-text-muted)' }}>
            ◆ 大きな改善余地は見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
