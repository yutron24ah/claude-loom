/**
 * TokenMeterView — read-only token usage meter with sparkline.
 *
 * WHY: M5 t4. SPEC §2.2 Phase 1 scope: display token usage totals
 * and a sparkline chart. Polling at 30 s (SPEC §6.10) via useTokenUsage hook.
 *
 * Delegates query/polling/state to useTokenUsage hook.
 * This component is a pure render layer (SPEC §3.6 SRP principle).
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
import { useTokenUsage, TOKEN_TYPE } from '../../live/useTokenUsage';
import type { TokenSeriesPoint } from '../../live/useTokenUsage';

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
      style={{ display: 'block' }}
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
}

/** Single token count row (label + formatted number). */
function TokenCount({ label, value, testId }: TokenCountProps): JSX.Element {
  return (
    <div className="flex justify-between items-center font-mono text-fs-xs">
      <span className="text-text-muted">{label}</span>
      <span data-testid={testId} className="text-fg1 font-bold tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TokenMeterView(): JSX.Element {
  const { inputTokens, outputTokens, cacheTokens, series, isLoading, error } =
    useTokenUsage();

  return (
    <div
      data-testid="token-meter-view"
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3 w-full max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-sp-2">
        <span className="text-fs-md font-bold text-fg1">Token Usage</span>
        <span className="ml-auto text-fs-xs text-text-muted font-mono">
          30 s
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div data-testid="token-meter-loading" className="text-fg2 text-fs-sm py-sp-2">
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
      <div className="flex flex-col gap-sp-1">
        {/* SPEC §3.6.10: labels reference TOKEN_TYPE constants */}
        <TokenCount
          label={TOKEN_TYPE.INPUT}
          value={inputTokens}
          testId="token-meter-input"
        />
        <TokenCount
          label={TOKEN_TYPE.OUTPUT}
          value={outputTokens}
          testId="token-meter-output"
        />
        <TokenCount
          label={TOKEN_TYPE.CACHE}
          value={cacheTokens}
          testId="token-meter-cache"
        />
      </div>

      {/* Sparkline — always rendered even when empty (stable layout) */}
      <div className="mt-sp-1">
        <Sparkline series={series} />
      </div>
    </div>
  );
}
