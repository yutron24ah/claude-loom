/**
 * PMApprovalModal — high risk approval request modal.
 *
 * WHY: Central blocking modal for destructive operations (rm -rf / git push --force
 * / DROP TABLE etc.). Reject is the visually prominent default (誤クリック防止).
 * Principle §1: Single responsibility — only renders the high-risk blocking modal.
 * Principle §6: Only rendered for high risk; caller guarantees this via risk enum.
 */
import type { PMPermissionRequest } from '@claude-loom/redesign/api/types';
import '../../styles/screens/pm-approval.css';

export interface PMApprovalModalProps {
  request: PMPermissionRequest;
  onPermission: (id: string, allow: boolean) => void;
}

export function PMApprovalModal({ request, onPermission }: PMApprovalModalProps): JSX.Element {
  return (
    <div className="pma-overlay">
      <div
        data-testid="pm-approval-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="高リスク操作の承認要求"
        className="pma-card"
      >
        <div data-testid="pm-modal-risk-badge" className="pma-risk-badge">
          ⚠ HIGH RISK · 確認が必要
        </div>
        <div className="pma-from">
          {request.from} が以下を実行しようとしています
        </div>
        <div className="pma-tool">{request.tool}</div>
        <pre className="pma-args">
          {request.args}
        </pre>
        <div className="pma-confirm-msg">
          この操作は破壊的です。本当に許可しますか?
        </div>
        <div className="pma-actions">
          {/* WHY: reject is first / visually prominent — accidental clicks should reject */}
          <button
            data-testid="pm-modal-reject"
            onClick={() => onPermission(request.id, false)}
            autoFocus
            className="pma-btn-reject"
          >
            却下 (推奨)
          </button>
          <button
            data-testid="pm-modal-allow"
            onClick={() => onPermission(request.id, true)}
            className="pma-btn-allow"
          >
            許可する
          </button>
        </div>
      </div>
    </div>
  );
}
