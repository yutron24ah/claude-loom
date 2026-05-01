/**
 * Entry point — React 18 createRoot mount.
 * Tasks 4-9 will wrap App with providers (tRPC, router, etc.).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in DOM');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
