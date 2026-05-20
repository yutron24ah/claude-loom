/**
 * useTokenUsage — tRPC polling hook for token usage summary + series.
 *
 * WHY: M5 t4. Centralises token usage query state so TokenMeterView
 * is a pure rendering component (SPEC §3.6 SRP principle).
 *
 * Polling semantics:
 *   - useEffect setInterval at TOKEN_POLL_INTERVAL_MS (default 30 s)
 *     matching SPEC §6.10 polling.token_usage_sec
 *   - On each interval tick, refetch summary + series queries
 *   - Cleanup interval on unmount
 *
 * enabled gate (M0.11.2 t8、retro 2026-05-04-001 F-res-003 由来):
 *   - **Caller can pass `enabled: false`** to disable polling entirely
 *     (e.g. when no active claude session is running — avoids unnecessary
 *     daemon hits for empty data, reduces UI/backend cost during idle)
 *   - Default `enabled: true` preserves M5 baseline behavior
 *   - 内部 isConnected gate (WS connected) と AND 合成: 両方 true で polling 開始
 *
 * SPEC §3.6.10: no raw string literals for token type names — consumers
 * should use TOKEN_TYPE constants from this module.
 */
import { useEffect, useRef } from 'react';
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';

// ---------------------------------------------------------------------------
// Constants — SPEC §3.6.10: token type enum (no raw strings in logic)
// ---------------------------------------------------------------------------

export const TOKEN_TYPE = {
  INPUT: 'input',
  OUTPUT: 'output',
  CACHE: 'cache',
} as const;

export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/**
 * Polling interval matching SPEC §6.10 polling.token_usage_sec = 30 s.
 * WHY: exported so tests can assert on the value without importing magic numbers.
 */
export const TOKEN_POLL_INTERVAL_MS = 30_000;

/**
 * Typed constant for the scenario key that represents an active Claude session.
 *
 * WHY: Hard constraint — raw string literals in comparisons are forbidden
 * (SPEC §3.6.10, feedback_avoid_string_literals.md). TokenMeterView uses this
 * constant (not `'active'` inline) to gate polling via `enabled`.
 *
 * Satisfies ScenarioKey from @claude-loom/redesign/api/types.
 * 'm0.18-t6 REQ-156..158' — polling gate enablement SSoT.
 */
export const ACTIVE_SCENARIO_KEY = 'active' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenSeriesPoint {
  bucketAt: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}

export interface UseTokenUsageResult {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  series: TokenSeriesPoint[];
  isLoading: boolean;
  error: Error | null;
}

// Default time window: last hour
const DEFAULT_SINCE_MS = () => Date.now() - 60 * 60 * 1000;

export interface UseTokenUsageOptions {
  /**
   * Override the time window start (default: now - 1 hour).
   */
  sinceMs?: number;
  /**
   * External enabled gate (e.g. "session is active"). When `false`, polling
   * + queries are disabled regardless of WS status. Defaults to `true` to
   * preserve M5 baseline behavior.
   *
   * Composed with internal `isConnected` gate via AND: polling only fires
   * when both are true. (M0.11.2 t8、F-res-003)
   */
  enabled?: boolean;
}

/**
 * Query token usage summary + series from daemon and poll every 30 seconds.
 *
 * @param options Optional time window override + external enabled gate.
 *                Backward compatible: `useTokenUsage()` / `useTokenUsage(ms)`
 *                continue to work (legacy positional `sinceMs` signature).
 */
export function useTokenUsage(
  sinceMsOrOptions?: number | UseTokenUsageOptions
): UseTokenUsageResult {
  // Backward-compat: legacy positional `sinceMs` signature
  const options: UseTokenUsageOptions =
    typeof sinceMsOrOptions === 'number'
      ? { sinceMs: sinceMsOrOptions }
      : sinceMsOrOptions ?? {};

  const externalEnabled = options.enabled ?? true;

  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';
  const isActive = isConnected && externalEnabled;

  const since = options.sinceMs ?? DEFAULT_SINCE_MS();

  const summaryResult = trpc.token.getUsageSummary.useQuery(
    { sinceMs: since },
    { enabled: isActive },
  );

  const seriesResult = trpc.token.getUsageSeries.useQuery(
    { sinceMs: since },
    { enabled: isActive },
  );

  const utils = trpc.useUtils();

  // WHY: setInterval-based polling per SPEC §6.10 (30 s).
  // useRef avoids stale closure over utils reference.
  const utilsRef = useRef(utils);
  utilsRef.current = utils;

  useEffect(() => {
    if (!isActive) return;

    const id = setInterval(() => {
      void utilsRef.current.token.getUsageSummary.invalidate();
      void utilsRef.current.token.getUsageSeries.invalidate();
    }, TOKEN_POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [isActive]);

  const isLoading = summaryResult.isLoading || seriesResult.isLoading;
  const error = (summaryResult.error ?? seriesResult.error) as Error | null;

  return {
    inputTokens: summaryResult.data?.inputTokens ?? 0,
    outputTokens: summaryResult.data?.outputTokens ?? 0,
    cacheTokens: summaryResult.data?.cacheTokens ?? 0,
    series: (seriesResult.data ?? []) as TokenSeriesPoint[],
    isLoading,
    error,
  };
}
