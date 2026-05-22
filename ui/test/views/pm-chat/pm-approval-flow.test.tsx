/**
 * M0.15 t13 — REQ-074: PM approval flow tests.
 *
 * WHY: Risk-based routing is a critical UX safety mechanism:
 * - high risk → PMApprovalModal (central, blocks interaction, reject focus)
 * - med/low risk → PMApprovalToast (right-side stackable, non-blocking)
 *
 * Testing the routing logic ensures accidental dismissal of high-risk
 * operations is prevented (誤クリック防止 per redesign SSoT).
 *
 * Principle §8: test the observable routing behavior (modal vs toast),
 * not implementation details.
 * Principle §6: risk enum typing makes illegal risk values unrepresentable.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PMPermissionRequest, PMState } from '../../../../redesign/api/types';
import { PMApprovalModal } from '../../../src/views/pm-chat/PMApprovalModal';
import { PMApprovalToast } from '../../../src/views/pm-chat/PMApprovalToast';
import { PMChatPanel } from '../../../src/views/pm-chat/PMChatPanel';

afterEach(() => {
  cleanup();
});

const HIGH_RISK: PMPermissionRequest = {
  id: 'req-high',
  tool: 'Bash',
  args: 'git push --force',
  risk: 'high',
  from: 'loom-developer',
};

const MED_RISK: PMPermissionRequest = {
  id: 'req-med',
  tool: 'Bash',
  args: 'sudo apt-get install curl',
  risk: 'med',
  from: 'loom-developer',
};

const LOW_RISK: PMPermissionRequest = {
  id: 'req-low',
  tool: 'Read',
  args: 'src/main.ts',
  risk: 'low',
  from: 'loom-developer',
};

const noop = () => {};

// ---------------------------------------------------------------------------
// PMApprovalModal (high risk)
// ---------------------------------------------------------------------------

// covers: PM-APPROVAL-MODAL-01, PM-APPROVAL-ALLOW-01, PM-APPROVAL-DENY-01
describe('PMApprovalModal — high risk (REQ-074)', () => {
  it('renders modal with pm-approval-modal testid', () => {
    render(<PMApprovalModal request={HIGH_RISK} onPermission={noop} />);
    expect(screen.getByTestId('pm-approval-modal')).toBeInTheDocument();
  });

  it('shows HIGH RISK badge or label', () => {
    render(<PMApprovalModal request={HIGH_RISK} onPermission={noop} />);
    // The modal should prominently show "HIGH" risk level
    expect(screen.getByTestId('pm-modal-risk-badge')).toBeInTheDocument();
  });

  it('shows tool name and args in modal', () => {
    render(<PMApprovalModal request={HIGH_RISK} onPermission={noop} />);
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('git push --force')).toBeInTheDocument();
  });

  it('calls onPermission with allow=false when reject button is clicked', () => {
    const onPermission = vi.fn();
    render(<PMApprovalModal request={HIGH_RISK} onPermission={onPermission} />);
    fireEvent.click(screen.getByTestId('pm-modal-reject'));
    expect(onPermission).toHaveBeenCalledWith('req-high', false);
  });

  it('calls onPermission with allow=true when allow button is clicked', () => {
    const onPermission = vi.fn();
    render(<PMApprovalModal request={HIGH_RISK} onPermission={onPermission} />);
    fireEvent.click(screen.getByTestId('pm-modal-allow'));
    expect(onPermission).toHaveBeenCalledWith('req-high', true);
  });
});

// ---------------------------------------------------------------------------
// PMApprovalToast (med/low risk)
// ---------------------------------------------------------------------------

describe('PMApprovalToast — med/low risk (REQ-074)', () => {
  it('renders toast with pm-approval-toast testid', () => {
    render(<PMApprovalToast request={MED_RISK} onPermission={noop} />);
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
  });

  it('shows risk level in toast header', () => {
    render(<PMApprovalToast request={MED_RISK} onPermission={noop} />);
    expect(screen.getByTestId('pm-toast-risk')).toBeInTheDocument();
  });

  it('shows tool name in toast', () => {
    render(<PMApprovalToast request={MED_RISK} onPermission={noop} />);
    expect(screen.getByText('Bash')).toBeInTheDocument();
  });

  it('calls onPermission with allow=true when allow button clicked', () => {
    const onPermission = vi.fn();
    render(<PMApprovalToast request={LOW_RISK} onPermission={onPermission} />);
    fireEvent.click(screen.getByTestId('pm-toast-allow'));
    expect(onPermission).toHaveBeenCalledWith('req-low', true);
  });

  it('calls onPermission with allow=false when reject button clicked', () => {
    const onPermission = vi.fn();
    render(<PMApprovalToast request={MED_RISK} onPermission={onPermission} />);
    fireEvent.click(screen.getByTestId('pm-toast-reject'));
    expect(onPermission).toHaveBeenCalledWith('req-med', false);
  });
});

// ---------------------------------------------------------------------------
// PMChatPanel risk routing — high → modal, med/low → toast
// ---------------------------------------------------------------------------

describe('PMChatPanel — risk routing (REQ-074)', () => {
  it('renders PMApprovalModal (pm-approval-modal) for high risk pending approval', () => {
    const pm: PMState = {
      running: true,
      messages: [],
      pendingApprovals: [HIGH_RISK],
    };
    render(
      <PMChatPanel
        pm={pm}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-approval-modal')).toBeInTheDocument();
  });

  it('renders PMApprovalToast (pm-approval-toast) for med risk pending approval', () => {
    const pm: PMState = {
      running: true,
      messages: [],
      pendingApprovals: [MED_RISK],
    };
    render(
      <PMChatPanel
        pm={pm}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('pm-approval-modal')).not.toBeInTheDocument();
  });

  it('renders PMApprovalToast for low risk pending approval', () => {
    const pm: PMState = {
      running: true,
      messages: [],
      pendingApprovals: [LOW_RISK],
    };
    render(
      <PMChatPanel
        pm={pm}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-approval-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('pm-approval-modal')).not.toBeInTheDocument();
  });

  it('calls onPermission when accept is clicked in panel', () => {
    const onPermission = vi.fn();
    const pm: PMState = {
      running: true,
      messages: [],
      pendingApprovals: [LOW_RISK],
    };
    render(
      <PMChatPanel
        pm={pm}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={onPermission}
      />
    );
    fireEvent.click(screen.getByTestId('pm-toast-allow'));
    expect(onPermission).toHaveBeenCalledWith('req-low', true);
  });
});
