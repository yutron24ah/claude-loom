/**
 * PMApprovalToast — med/low risk approval request toast.
 *
 * WHY: Non-blocking right-side toast for non-destructive operations.
 * High-risk approvals use PMApprovalModal instead (誤クリック防止 per redesign SSoT).
 * Principle §1: Single responsibility — only renders one approval toast.
 * Principle §6: PMPermissionRequest type guarantees risk is typed enum, not string.
 */
import type { PMPermissionRequest } from '@claude-loom/redesign/api/types';

export interface PMApprovalToastProps {
  request: PMPermissionRequest;
  onPermission: (id: string, allow: boolean) => void;
}

export function PMApprovalToast({ request, onPermission }: PMApprovalToastProps): JSX.Element {
  return (
    <div
      data-testid="pm-approval-toast"
      className="pm-toast"
      style={{
        background: 'var(--p-bg2, #1e2128)',
        border: '1px solid var(--p-border, #333)',
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
        minWidth: 240,
        maxWidth: 320,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          data-testid="pm-toast-risk"
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: request.risk === 'med' ? 'var(--p-warn, #f0a500)' : 'var(--p-stone, #888)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {request.risk}
        </span>
        <span style={{ fontSize: 11, color: 'var(--p-text-muted, #888)' }}>
          {request.from} が承認待ち
        </span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{request.tool}</div>
      <code
        style={{
          display: 'block',
          fontSize: 10,
          background: 'var(--p-bg1, #0d1117)',
          padding: '2px 6px',
          borderRadius: 3,
          marginBottom: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {request.args}
      </code>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          data-testid="pm-toast-reject"
          onClick={() => onPermission(request.id, false)}
          style={{
            fontSize: 11,
            padding: '3px 10px',
            background: 'var(--p-error, #e53e3e)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          却下
        </button>
        <button
          data-testid="pm-toast-allow"
          onClick={() => onPermission(request.id, true)}
          style={{
            fontSize: 11,
            padding: '3px 10px',
            background: 'var(--p-accent, #4a8fc4)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          許可
        </button>
      </div>
    </div>
  );
}
