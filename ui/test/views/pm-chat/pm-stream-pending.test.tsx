/**
 * PMChatPanel — stream tab + pending approvals on mount (m0.19-t7d)
 *
 * WHY: Verify that:
 *   PM-STREAM-01:       Stream tab content reflects stream array items when
 *                       STREAM tab is active.
 *   PM-PENDING-MOUNT-01: When PM mounts with pendingApprovals already present,
 *                        the appropriate approval UI is shown immediately.
 *   PM-APPROVAL-TOAST-01: PMApprovalToast renders for med/low risk approvals
 *                          (extends pm-approval-flow; verifies the toast renders
 *                          in panel context with multiple items).
 *   PM-INLINE-01:       PMChatPanel uses collapsed=false (full-panel) layout, not
 *                       inline — the full panel data-testid is present when running.
 *
 * Design source: ui/src/views/pm-chat/PMChatPanel.tsx
 * Principle §8: test behavior visible to users.
 * Principle §1: each describe block covers one qa-suite case.
 */
// covers: PM-STREAM-01, PM-PENDING-MOUNT-01, PM-APPROVAL-TOAST-01, PM-INLINE-01
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PMState, StreamMsg } from '../../../../redesign/api/types';
import { PMChatPanel } from '../../../src/views/pm-chat/PMChatPanel';

afterEach(() => {
  cleanup();
});

const noop = () => {};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STREAM_ITEMS: StreamMsg[] = [
  { kind: 'tool', ts: '12:00', who: 'dev', tool: 'Read', text: 'reading SPEC.md' },
  { kind: 'reason', ts: '12:01', who: 'dev', tool: undefined, text: 'analyzing structure' },
  { kind: 'tool', ts: '12:02', who: 'reviewer', tool: 'Bash', text: 'running tests' },
];

const PM_ACTIVE_EMPTY: PMState = {
  running: true,
  messages: [],
  pendingApprovals: [],
};

const PM_ACTIVE_WITH_MED_PENDING: PMState = {
  running: true,
  messages: [],
  pendingApprovals: [
    {
      id: 'req-pending-001',
      tool: 'Bash',
      args: 'npm install',
      risk: 'med',
      from: 'loom-developer',
    },
  ],
};

const PM_ACTIVE_WITH_LOW_PENDING: PMState = {
  running: true,
  messages: [],
  pendingApprovals: [
    {
      id: 'req-pending-002',
      tool: 'Read',
      args: 'SPEC.md',
      risk: 'low',
      from: 'loom-developer',
    },
  ],
};

const PM_ACTIVE_MULTI_PENDING: PMState = {
  running: true,
  messages: [],
  pendingApprovals: [
    {
      id: 'req-multi-001',
      tool: 'Bash',
      args: 'pnpm test',
      risk: 'low',
      from: 'loom-developer',
    },
    {
      id: 'req-multi-002',
      tool: 'Edit',
      args: 'src/App.tsx',
      risk: 'med',
      from: 'loom-developer',
    },
  ],
};

// ---------------------------------------------------------------------------
// PM-STREAM-01: Stream tab reflects stream items
// ---------------------------------------------------------------------------

describe('PMChatPanel — stream tab content (PM-STREAM-01)', () => {
  it('shows stream items when STREAM tab is clicked', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={STREAM_ITEMS}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    fireEvent.click(screen.getByTestId('pm-tab-stream'));
    expect(screen.getByTestId('pm-stream-log')).toBeInTheDocument();
    // All stream texts visible
    expect(screen.getByText('reading SPEC.md')).toBeInTheDocument();
    expect(screen.getByText('analyzing structure')).toBeInTheDocument();
    expect(screen.getByText('running tests')).toBeInTheDocument();
  });

  it('shows "stream is quiet" hint when stream is empty on STREAM tab', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    fireEvent.click(screen.getByTestId('pm-tab-stream'));
    expect(screen.getByText(/stream is quiet/)).toBeInTheDocument();
  });

  it('STREAM tab badge shows stream item count when items present', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={STREAM_ITEMS}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // The STREAM tab shows a count badge when stream.length > 0
    const streamTab = screen.getByTestId('pm-tab-stream');
    expect(streamTab.textContent).toContain(String(STREAM_ITEMS.length));
  });

  it('STREAM tab content updates when stream grows', () => {
    const { rerender } = render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    fireEvent.click(screen.getByTestId('pm-tab-stream'));
    expect(screen.getByText(/stream is quiet/)).toBeInTheDocument();

    rerender(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[STREAM_ITEMS[0]]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByText('reading SPEC.md')).toBeInTheDocument();
    expect(screen.queryByText(/stream is quiet/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PM-PENDING-MOUNT-01: Pending approvals present at mount are shown immediately
// ---------------------------------------------------------------------------

describe('PMChatPanel — pending approvals at mount (PM-PENDING-MOUNT-01)', () => {
  it('shows med-risk toast immediately on mount without any user interaction', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_WITH_MED_PENDING}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // No tab click or interaction needed — approval is shown at mount
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
  });

  it('shows low-risk toast immediately on mount', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_WITH_LOW_PENDING}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
  });

  it('panel is still interactive (chat input visible) when pending approval present', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_WITH_MED_PENDING}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // Toast is non-blocking — chat input still accessible
    expect(screen.getByTestId('pm-chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PM-APPROVAL-TOAST-01: PMApprovalToast shown in panel for multiple non-high-risk
// ---------------------------------------------------------------------------

describe('PMChatPanel — approval toast stack (PM-APPROVAL-TOAST-01)', () => {
  it('renders multiple toasts when multiple non-high-risk approvals are pending', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_MULTI_PENDING}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // Both non-high-risk items should render as toasts
    const toasts = screen.getAllByTestId('pm-approval-toast');
    expect(toasts).toHaveLength(2);
  });

  it('no toast rendered when pendingApprovals is empty', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.queryByTestId('pm-approval-toast')).not.toBeInTheDocument();
  });

  it('no modal rendered when only non-high-risk approvals are pending', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_MULTI_PENDING}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.queryByTestId('pm-approval-modal')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('pm-approval-toast')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// PM-INLINE-01: PMChatPanel full-panel layout (overlay column, not inline)
// ---------------------------------------------------------------------------

describe('PMChatPanel — full-panel layout (PM-INLINE-01)', () => {
  it('renders the pm-chat-panel testid when PM is running (full panel mode)', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-chat-panel')).toBeInTheDocument();
  });

  it('renders the collapsed handle when collapsed=true (not the full panel)', () => {
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
        collapsed={true}
        onToggle={noop}
      />
    );
    // Collapsed renders a handle button, not the full pm-chat-panel
    expect(screen.queryByTestId('pm-chat-panel')).not.toBeInTheDocument();
    expect(screen.getByText(/◆ PM/)).toBeInTheDocument();
  });

  it('onToggle wired to collapse button when panel is collapsed', () => {
    let toggled = false;
    render(
      <PMChatPanel
        pm={PM_ACTIVE_EMPTY}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
        collapsed={true}
        onToggle={() => { toggled = true; }}
      />
    );
    fireEvent.click(screen.getByText(/◆ PM/));
    expect(toggled).toBe(true);
  });
});
