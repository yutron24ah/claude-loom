/**
 * TRPCProvider — wraps children with tRPC React + TanStack Query contexts.
 *
 * WHY: provider pattern keeps context wiring out of App.tsx and makes it
 * easy to substitute a mock provider in tests.
 *
 * QueryClient is a singleton (default config). Task 10 (vertical slice) may
 * tune staleTime / gcTime per-query if needed — YAGNI for now.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { trpc, trpcClient } from './client';

const queryClient = new QueryClient();

interface TRPCProviderProps {
  children: ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps): JSX.Element {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
