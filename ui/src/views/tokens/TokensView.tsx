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
import '../../styles/screens/tokens.css';

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
    <div className="tokens-daily-bar">
      <span className="tokens-daily-bar__cost">
        ${cost.toFixed(2)}
      </span>
      {/* Bar wrapper — fixed height so bars are comparable */}
      <div className="tokens-daily-bar__track">
        {/* The bar element carries data-testid and data-cache-ratio for tests */}
        <div
          data-testid={`daily-bar-${day}`}
          data-cache-ratio={String(Math.round(cacheRatio * 100))}
          className="tokens-daily-bar__fill"
          style={{ height: `${heightPct}%` }}
        >
          {/* Cache-hit ratio marker line within the bar */}
          <div
            className="tokens-daily-bar__cache-marker"
            style={{ top: `${(1 - cacheRatio) * 100}%` }}
            title={`cache ${Math.round(cacheRatio * 100)}%`}
          />
        </div>
      </div>
      <span className="tokens-daily-bar__day">{day}</span>
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
      className="tokens-screen"
    >
      {/* Header */}
      <div className="tokens-header">
        <div className="tokens-header__title">$ TOKENS — usage + 効率分析</div>
        <span className="chip">{t.period}</span>
        <span className="tokens-header__period-hint">
          pricing: Anthropic公式 (1h cache)
        </span>
      </div>

      {/* Stat cards */}
      <div className="tokens-stat-grid">
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
          <div key={s.lbl} className="tokens-stat-card">
            <div className="tokens-stat-card__label">{s.lbl}</div>
            <div className="tokens-stat-card__value" style={{ color: s.c }}>
              {s.v}
            </div>
            <div className="tokens-stat-card__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className="tokens-chart-panel">
        <div className="tokens-chart__label">
          DAILY COST × CACHE-HIT (7d)
        </div>
        <div data-testid="daily-chart" className="tokens-chart__bars">
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
        <div className="tokens-chart__legend">
          <span>
            <span className="tokens-legend-swatch--cost" />
            cost ($/day)
          </span>
          <span>
            <span className="tokens-legend-swatch--cache" />
            cache-hit ratio
          </span>
        </div>
      </div>

      {/* Per-agent table */}
      <div data-testid="agent-table" className="tokens-agent-table">
        {/* Table header */}
        <div className="tokens-agent-table__header">
          <span>AGENT</span>
          <span>MODEL</span>
          <span className="tokens-agent-row__cell--right">INPUT</span>
          <span className="tokens-agent-row__cell--right">OUTPUT</span>
          <span className="tokens-agent-row__cell--right">CACHE R/W</span>
          <span className="tokens-agent-row__cell--right">CACHE-HIT</span>
          <span className="tokens-agent-row__cell--right">COST</span>
        </div>

        {/* Rows sorted by cost descending */}
        {[...rows].sort((a, b) => b.cost - a.cost).map(r => {
          const lowHit = r.cacheHit < 0.5;
          return (
            <div
              key={r.agentId}
              data-testid={`agent-row-${r.agentId}`}
              className="tokens-agent-row"
            >
              {/* Agent ID */}
              <div className="tokens-agent-row__name">{r.agentId}</div>
              {/* Model badge */}
              <span className="tokens-agent-row__model-badge">{r.model}</span>
              {/* Input */}
              <span className="tokens-agent-row__cell--right">{fmtN(r.input)}</span>
              {/* Output */}
              <span className="tokens-agent-row__cell--right">{fmtN(r.output)}</span>
              {/* Cache R / W */}
              <span className="tokens-agent-row__cell--right">
                {fmtN(r.cacheRead)} / {fmtN(r.cacheWrite)}
              </span>
              {/* Cache-hit % — dynamic color stays inline */}
              <span
                className="tokens-agent-row__cache-hit"
                style={{ color: lowHit ? 'var(--p-warn)' : 'var(--p-success)' }}
              >
                {Math.round(r.cacheHit * 100)}%
              </span>
              {/* Cost USD */}
              <span
                data-testid={`agent-cost-${r.agentId}`}
                className="tokens-agent-row__cost"
              >
                ${r.cost.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Efficiency hints (rule-based, always rendered for testability) */}
      <div data-testid="efficiency-hints" className="tokens-hints">
        <div className="tokens-hints__label">
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
          <div className="tokens-hints__no-hints">
            ◆ 大きな改善余地は見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
