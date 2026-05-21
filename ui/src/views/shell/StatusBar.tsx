/**
 * StatusBar — AppShell 画面下常時表示バー
 *
 * WHY standalone component:
 * Extracted from routing/AppShell.tsx inline definition to enable
 * isolated unit testing (SB-LAYOUT-01 / SB-CONN-01 / SB-SCENARIO-01).
 * AppShell imports this component unchanged; no behavioral diff.
 */
import type { ConnectionStatus } from '@claude-loom/redesign/api/types';
import { APP_COPY } from '../../routing/constants';

export interface StatusBarProps {
  label: string;
  project: string;
  conn: ConnectionStatus;
}

export function StatusBar({ label, project, conn }: StatusBarProps): JSX.Element {
  return (
    <div data-testid="statusbar" className="statusbar">
      <span className="seg">
        <span className={`dot ${conn === 'connected' ? 'busy' : 'fail'}`} />
        {conn === 'connected' ? APP_COPY.wsConnected : APP_COPY.wsReconnecting}
      </span>
      <span className="seg">
        scenario: <strong className="statusbar__scenario">{label}</strong>
      </span>
      <span className="seg">events seen</span>
      <span className="right">
        {APP_COPY.brand} @ <code>~/work/{project}</code>
      </span>
    </div>
  );
}
