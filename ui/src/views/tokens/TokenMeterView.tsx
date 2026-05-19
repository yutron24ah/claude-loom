/**
 * TokenMeterView — read-only token usage meter with sparkline.
 *
 * WHY: M5 t4. SPEC §2.2 Phase 1 scope: display token usage totals
 * and a sparkline chart. Polling at 30 s (SPEC §6.10) via useTokenUsage hook.
 *
 * Delegates query/polling/state to useTokenUsage hook.
 * This component is a pure render layer (SPEC §3.6 SRP principle).
 *
 * M0.11.4 Phase C t16: RPG style — rpg-frame wrapping, exp-bar for token
 * usage visualization, rpg-title + rpg-label for header/labels.
 *
 * Sparkline: self-contained SVG <rect> bars (GanttView SVG pattern reuse,
 * SPEC §3.6.9.3). Each bar height proportional to total tokens in that bucket.
 *
 * data-testid map (per task spec):
 *   token-meter-view      → outer container
 *   token-meter-input     → input token count display
 *   token-meter-output    → output token count display
 *   token-meter-cache     → cache token count display
 *   token-meter-sparkline → SVG sparkline element
 *   token-meter-loading   → loading indicator
 *   token-meter-error     → error message
 *
 * SPEC §3.6.10: TOKEN_TYPE constants imported (no raw string literals).
 */
import { useTokenUsage, TOKEN_TYPE, ACTIVE_SCENARIO_KEY } from '../../live/useTokenUsage';
import type { TokenSeriesPoint } from '../../live/useTokenUsage';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import '../../styles/screens/tokens.css';

// ---------------------------------------------------------------------------
// Sparkline constants
// ---------------------------------------------------------------------------

const SPARKLINE_W = 200;
const SPARKLINE_H = 40;
const BAR_GAP = 2;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SparklineProps {
  series: TokenSeriesPoint[];
}

/**
 * Minimal SVG sparkline — total tokens (input+output+cache) per bucket as bars.
 * WHY: GanttView pattern reuse. Self-contained SVG, no external chart library
 * (YAGNI + KISS). Bar widths computed from series length.
 */
function Sparkline({ series }: SparklineProps): JSX.Element {
  const maxTotal = Math.max(
    1, // avoid division by zero
    ...series.map((p) => p.inputTokens + p.outputTokens + p.cacheTokens),
  );

  const barW = series.length > 0
    ? Math.max(1, (SPARKLINE_W - BAR_GAP * series.length) / series.length)
    : SPARKLINE_W;

  return (
    <svg
      data-testid="token-meter-sparkline"
      width={SPARKLINE_W}
      height={SPARKLINE_H}
      aria-label="token usage sparkline"
      className="token-meter-sparkline"
    >
      {series.map((point, i) => {
        const total = point.inputTokens + point.outputTokens + point.cacheTokens;
        const barH = (total / maxTotal) * (SPARKLINE_H - 2);
        const x = i * (barW + BAR_GAP);
        const y = SPARKLINE_H - barH;
        return (
          <rect
            key={point.bucketAt}
            x={x}
            y={y}
            width={barW}
            height={barH}
            fill="var(--color-accent, #7c6af7)"
            opacity={0.8}
          />
        );
      })}
      {/* Background grid line */}
      <line
        x1={0}
        y1={SPARKLINE_H - 1}
        x2={SPARKLINE_W}
        y2={SPARKLINE_H - 1}
        stroke="var(--color-border, #333)"
        strokeWidth={1}
      />
    </svg>
  );
}

interface TokenCountProps {
  label: string;
  value: number;
  testId: string;
  /** Total for exp-bar proportion calculation — token limit approximation. */
  maxValue: number;
}

/** Single token count row (label + formatted number + exp-bar). */
function TokenCount({ label, value, testId, maxValue }: TokenCountProps): JSX.Element {
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex justify-between items-center">
        <span className="rpg-label">{label}</span>
        <span data-testid={testId} className="rpg-label font-bold tabular-nums">
          {value.toLocaleString()}
        </span>
      </div>
      {/* exp-bar for visual proportion */}
      <div className="exp-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TokenMeterView(): JSX.Element {
  // WHY: Gate polling on session activity (m0.18-t6, REQ-156..158).
  // When no Claude session is active, suppress polling to avoid unnecessary
  // daemon hits for empty data (SPEC §6.10 polling gate design).
  // ACTIVE_SCENARIO_KEY is a typed constant — no raw string literal comparison.
  const scenario = useScenario();
  const sessionActive = scenario.key === ACTIVE_SCENARIO_KEY;

  const { inputTokens, outputTokens, cacheTokens, series, isLoading, error } =
    useTokenUsage({ enabled: sessionActive });

  // WHY: max across all counts to scale exp-bars proportionally
  const maxTokens = Math.max(1, inputTokens, outputTokens, cacheTokens);

  return (
    <div
      data-testid="token-meter-view"
      className="rpg-frame flex flex-col gap-sp-3 w-full max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-sp-2">
        <span className="rpg-title">Token Usage</span>
        <span className="rpg-label ml-auto">30 s</span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div data-testid="token-meter-loading" className="rpg-label py-sp-2">
          読み込み中…
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div data-testid="token-meter-error" className="text-error text-fs-sm py-sp-2">
          接続エラー: {error.message}
        </div>
      )}

      {/* Token counts — shown regardless of loading/error so layout is stable */}
      <div className="flex flex-col gap-sp-2">
        {/* SPEC §3.6.10: labels reference TOKEN_TYPE constants */}
        <TokenCount
          label={TOKEN_TYPE.INPUT}
          value={inputTokens}
          testId="token-meter-input"
          maxValue={maxTokens}
        />
        <TokenCount
          label={TOKEN_TYPE.OUTPUT}
          value={outputTokens}
          testId="token-meter-output"
          maxValue={maxTokens}
        />
        <TokenCount
          label={TOKEN_TYPE.CACHE}
          value={cacheTokens}
          testId="token-meter-cache"
          maxValue={maxTokens}
        />
      </div>

      {/* Sparkline — always rendered even when empty (stable layout) */}
      <div className="mt-sp-1">
        <Sparkline series={series} />
      </div>
    </div>
  );
}
