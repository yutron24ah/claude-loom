/**
 * M0.15 t13 — REQ-074: PMChatPanel smoke tests.
 *
 * WHY: Verify the right-column PM chat panel renders CHAT log + STREAM tab
 * and that key interactive elements are reachable.
 *
 * Pattern: render PMChatPanel directly with mock props (no tRPC provider needed
 * since the component uses prop callbacks, not hooks for PM interactions in M0.15).
 *
 * Principle §8: test behavior visible to users (log rendering, tab switch, input).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PMState, StreamMsg } from '../../../../redesign/api/types';
import { PMChatPanel } from '../../../src/views/pm-chat/PMChatPanel';

afterEach(() => {
  cleanup();
});

const MOCK_PM_IDLE: PMState = {
  running: false,
  messages: [],
  pendingApprovals: [],
};

const MOCK_PM_ACTIVE: PMState = {
  running: true,
  messages: [
    { who: 'pm', text: 'M0.15 t13 を実装します', ts: '14:23' },
    { who: 'user', text: '進めてください', ts: '14:24' },
    { who: 'pm', text: '了解しました', ts: '14:25' },
  ],
  pendingApprovals: [],
};

const MOCK_STREAM: StreamMsg[] = [
  { ts: '14:20', who: 'dev', kind: 'tool', tool: 'Edit', text: 'editing file' },
  { ts: '14:21', who: 'dev', kind: 'reason', text: 'TDD red phase' },
];

const noop = () => {};

// ---------------------------------------------------------------------------
// Render smoke tests
// ---------------------------------------------------------------------------

describe('PMChatPanel — render smoke tests (REQ-074)', () => {
  it('renders pm-chat-panel container', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-chat-panel')).toBeInTheDocument();
  });

  it('renders CHAT tab button', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-tab-chat')).toBeInTheDocument();
  });

  it('renders STREAM tab button', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-tab-stream')).toBeInTheDocument();
  });

  it('renders message log in CHAT tab (default tab)', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // 3 messages visible in chat log
    const messages = screen.getAllByTestId('pm-message');
    expect(messages).toHaveLength(3);
  });

  it('renders message text content', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByText('M0.15 t13 を実装します')).toBeInTheDocument();
    expect(screen.getByText('進めてください')).toBeInTheDocument();
  });

  it('switches to STREAM tab when STREAM button is clicked', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={MOCK_STREAM}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    // Default is CHAT — stream content not visible yet
    expect(screen.queryByTestId('pm-stream-log')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pm-tab-stream'));
    expect(screen.getByTestId('pm-stream-log')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Start button (PM not running)
// ---------------------------------------------------------------------------

describe('PMChatPanel — start button when PM is not running (REQ-074)', () => {
  it('shows start-pm button when pm.running is false', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_IDLE}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-start-button')).toBeInTheDocument();
  });

  it('does not show chat input when PM is not running', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_IDLE}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.queryByTestId('pm-chat-input')).not.toBeInTheDocument();
  });

  it('calls onStart when start button is clicked', () => {
    const onStart = vi.fn();
    render(
      <PMChatPanel
        pm={MOCK_PM_IDLE}
        stream={[]}
        onSend={noop}
        onStart={onStart}
        onPermission={noop}
      />
    );
    fireEvent.click(screen.getByTestId('pm-start-button'));
    expect(onStart).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Chat input (PM running)
// ---------------------------------------------------------------------------

describe('PMChatPanel — chat input when PM is running (REQ-074)', () => {
  it('shows chat input when pm.running is true', () => {
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={[]}
        onSend={noop}
        onStart={noop}
        onPermission={noop}
      />
    );
    expect(screen.getByTestId('pm-chat-input')).toBeInTheDocument();
  });

  it('calls onSend with typed text when send button is clicked', () => {
    const onSend = vi.fn();
    render(
      <PMChatPanel
        pm={MOCK_PM_ACTIVE}
        stream={[]}
        onSend={onSend}
        onStart={noop}
        onPermission={noop}
      />
    );
    const textarea = screen.getByTestId('pm-chat-textarea');
    fireEvent.change(textarea, { target: { value: 'テスト送信' } });
    fireEvent.click(screen.getByTestId('pm-send-button'));
    expect(onSend).toHaveBeenCalledWith('テスト送信');
  });
});
