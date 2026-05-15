/**
 * PMApprovalToast — med/low risk approval request toast.
 *
 * WHY: Non-blocking right-side toast for non-destructive operations.
 * High-risk approvals use PMApprovalModal instead (誤クリック防止 per redesign SSoT).
 * Principle §1: Single responsibility — only renders one approval toast.
 * Principle §6: PMPermissionRequest type guarantees risk is typed enum, not string.
 */
import type { PMPermissionRequest } from '@claude-loom/redesign/api/types';
import '../../styles/screens/pm-approval.css';

export interface PMApprovalToastProps {
  request: PMPermissionRequest;
  onPermission: (id: string, allow: boolean) => void;
}

export function PMApprovalToast({ request, onPermission }: PMApprovalToastProps): JSX.Element {
  return (
    <div
      data-testid="pm-approval-toast"
      className="pm-toast pmt-toast"
    >
      <div className="pmt-header">
        <span
          data-testid="pm-toast-risk"
          className="pmt-risk"
          style={{
            color: request.risk === 'med' ? 'var(--p-warn, #f0a500)' : 'var(--p-stone, #888)',
          }}
        >
          {request.risk}
        </span>
        <span className="pmt-from">
          {request.from} が承認待ち
        </span>
      </div>
      <div className="pmt-tool">{request.tool}</div>
      <code className="pmt-args">
        {request.args}
      </code>
      <div className="pmt-actions">
        <button
          data-testid="pm-toast-reject"
          onClick={() => onPermission(request.id, false)}
          className="pmt-btn-reject"
        >
          却下
        </button>
        <button
          data-testid="pm-toast-allow"
          onClick={() => onPermission(request.id, true)}
          className="pmt-btn-allow"
        >
          許可
        </button>
      </div>
    </div>
  );
}
