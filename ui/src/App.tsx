/**
 * App — top-level entry component.
 * WHY: delegates routing and shell layout to AppRouter (react-router v6).
 * Task 4 theme toggle demo replaced by AppShell + persistent Room layer (m2-t3).
 * Task 7: TRPCProvider wraps AppRouter so all views share one WS connection.
 * main.tsx imports App and renders it with React 18 createRoot — no change needed there.
 */
import { AppRouter } from './routing/routes';
import { TRPCProvider } from './trpc/provider';

export function App(): JSX.Element {
  return (
    <TRPCProvider>
      <AppRouter />
    </TRPCProvider>
  );
}
