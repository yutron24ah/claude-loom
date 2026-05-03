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
 * enabled gate: only fire query when WS connection is 'connected'.
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

/**
 * Query token usage summary + series from daemon and poll every 30 seconds.
 */
export function useTokenUsage(sinceMs?: number): UseTokenUsageResult {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  const since = sinceMs ?? DEFAULT_SINCE_MS();

  const summaryResult = trpc.token.getUsageSummary.useQuery(
    { sinceMs: since },
    { enabled: isConnected },
  );

  const seriesResult = trpc.token.getUsageSeries.useQuery(
    { sinceMs: since },
    { enabled: isConnected },
  );

  const utils = trpc.useUtils();

  // WHY: setInterval-based polling per SPEC §6.10 (30 s).
  // useRef avoids stale closure over utils reference.
  const utilsRef = useRef(utils);
  utilsRef.current = utils;

  useEffect(() => {
    if (!isConnected) return;

    const id = setInterval(() => {
      void utilsRef.current.token.getUsageSummary.invalidate();
      void utilsRef.current.token.getUsageSeries.invalidate();
    }, TOKEN_POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [isConnected]);

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
