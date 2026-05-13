/**
 * PMApprovalModal — high risk approval request modal.
 *
 * WHY: Central blocking modal for destructive operations (rm -rf / git push --force
 * / DROP TABLE etc.). Reject is the visually prominent default (誤クリック防止).
 * Principle §1: Single responsibility — only renders the high-risk blocking modal.
 * Principle §6: Only rendered for high risk; caller guarantees this via risk enum.
 */
import type { PMPermissionRequest } from '@claude-loom/redesign/api/types';

export interface PMApprovalModalProps {
  request: PMPermissionRequest;
  onPermission: (id: string, allow: boolean) => void;
}

export function PMApprovalModal({ request, onPermission }: PMApprovalModalProps): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-testid="pm-approval-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="高リスク操作の承認要求"
        style={{
          background: 'var(--p-bg2, #1e2128)',
          border: '1px solid var(--p-error, #e53e3e)',
          borderRadius: 8,
          padding: '24px 28px',
          minWidth: 340,
          maxWidth: 480,
        }}
      >
        <div
          data-testid="pm-modal-risk-badge"
          style={{
            color: 'var(--p-error, #e53e3e)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          ⚠ HIGH RISK · 確認が必要
        </div>
        <div style={{ fontSize: 12, color: 'var(--p-text-muted, #888)', marginBottom: 12 }}>
          {request.from} が以下を実行しようとしています
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{request.tool}</div>
        <pre
          style={{
            fontSize: 11,
            background: 'var(--p-bg1, #0d1117)',
            padding: '8px 12px',
            borderRadius: 4,
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {request.args}
        </pre>
        <div style={{ fontSize: 12, color: 'var(--p-text-muted, #888)', marginBottom: 16 }}>
          この操作は破壊的です。本当に許可しますか?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {/* WHY: reject is first / visually prominent — accidental clicks should reject */}
          <button
            data-testid="pm-modal-reject"
            onClick={() => onPermission(request.id, false)}
            autoFocus
            style={{
              padding: '6px 18px',
              background: 'var(--p-error, #e53e3e)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            却下 (推奨)
          </button>
          <button
            data-testid="pm-modal-allow"
            onClick={() => onPermission(request.id, true)}
            style={{
              padding: '6px 18px',
              background: 'transparent',
              color: 'var(--p-text, #ccc)',
              border: '1px solid var(--p-border, #444)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            許可する
          </button>
        </div>
      </div>
    </div>
  );
}
