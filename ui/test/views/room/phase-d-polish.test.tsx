/**
 * M0.17 Round 3 Phase D polish tests
 * REQ-107..REQ-112
 *
 * Tests for 6 concrete redesign source gaps:
 * R-1: --desk-container-width token (tokens.css + room.css)
 * R-2: monitor lines 4→3 (--w40 class removed)
 * R-3: bubble kind 'tool' | 'reason' rendering
 * R-4: PMChatPanel STREAM tab uses rail__line classes + close button
 * R-5: PMChatPanel collapsed state + pm-chat-handle button
 * R-6: RoomWallDecor positioning (left:14, top:10, right:14)
 *
 * Principle §8: test behavior, not implementation.
 * Design SSoT: redesign/screens/room.jsx L18-96 (Desk) + L289-391 (PMChatPanel)
 *              + L443-444 (RoomWallDecor signs)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PMState, StreamMsg } from '../../../../redesign/api/types';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// R-2: DeskStation — monitor lines 4→3 [REQ-108]
// ---------------------------------------------------------------------------
import { DeskStation } from '../../../src/views/room/DeskStation';
import type { RosterEntry } from '../../../src/data/roster';

const testCat: RosterEntry = {
  id: 'dev',
  role: 'Developer',
  jp: 'デベロッパー',
  name: 'サバ',
  breed: 'サバトラ',
  quote: 'RED → GREEN',
  hat: 'headband',
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  group: 'core',
};

describe('DeskStation — monitor lines 3 (redesign R-2) [REQ-108]', () => {
  it('renders exactly 3 monitor lines (not 4) when active', () => {
    // WHY: redesign source room.jsx L65-68 shows 3 lines (70%/50%/85%).
    // The 4th w40 line was an extra, not present in the design SSoT.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const lines = container.querySelectorAll('.desk-station__monitor-line');
    expect(lines).toHaveLength(3);
  });

  it('does NOT render w40 line class in any monitor-line element', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const w40lines = container.querySelectorAll('.desk-station__monitor-line--w40');
    expect(w40lines).toHaveLength(0);
  });

  it('renders 3 lines with correct width classes (w70 + w50 + w85)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    expect(container.querySelector('.desk-station__monitor-line--w70')).not.toBeNull();
    expect(container.querySelector('.desk-station__monitor-line--w50')).not.toBeNull();
    expect(container.querySelector('.desk-station__monitor-line--w85')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// R-3: DeskStation — bubble kind prop [REQ-109]
// ---------------------------------------------------------------------------
describe('DeskStation — bubble kind prop (redesign R-3) [REQ-109]', () => {
  it('renders speech bubble when bubble prop with kind=tool is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'tool', text: 'Edit', sub: 'editing file' }} />
    );
    expect(container.querySelector('[data-testid="speech-bubble"]')).not.toBeNull();
  });

  it('renders speech bubble when bubble prop with kind=reason is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'reason', text: 'thinking…' }} />
    );
    expect(container.querySelector('[data-testid="speech-bubble"]')).not.toBeNull();
  });

  it('kind=tool renders bubble-tool span with tool text', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'tool', text: 'Edit' }} />
    );
    const toolSpan = container.querySelector('.desk-station__bubble-tool');
    expect(toolSpan).not.toBeNull();
    expect(toolSpan?.textContent).toBe('Edit');
  });

  it('kind=tool renders bubble-sub span with sub text (truncated to 28 chars)', () => {
    const sub = 'writing test for DeskStation component';
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'tool', text: 'Edit', sub }} />
    );
    const subSpan = container.querySelector('.desk-station__bubble-sub');
    expect(subSpan).not.toBeNull();
    // sub is 38 chars → truncated to 28 → first 27 chars + "…"
    expect(subSpan?.textContent?.length).toBeLessThanOrEqual(28);
  });

  it('kind=reason renders bubble-reason span with italic quoted text', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'reason', text: 'need to verify approach' }} />
    );
    const reasonSpan = container.querySelector('.desk-station__bubble-reason');
    expect(reasonSpan).not.toBeNull();
    // redesign wraps in quotes: '"text"'
    expect(reasonSpan?.textContent).toContain('need to verify approach');
  });

  it('kind=tool without sub renders NO bubble-sub span', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat}
        bubble={{ kind: 'tool', text: 'Bash' }} />
    );
    expect(container.querySelector('.desk-station__bubble-sub')).toBeNull();
  });

  it('does NOT render speech bubble when bubble is undefined and task is also undefined', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    expect(container.querySelector('[data-testid="speech-bubble"]')).toBeNull();
  });

  it('backward compat: task prop still renders plain speech bubble when bubble is absent', () => {
    // WHY: existing tests rely on task prop rendering. Must not break them.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} task="legacy text" />);
    expect(container.querySelector('[data-testid="speech-bubble"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// R-4: PMChatPanel STREAM tab — rail__line classes [REQ-110]
// ---------------------------------------------------------------------------
import { PMChatPanel } from '../../../src/views/pm-chat/PMChatPanel';

const MOCK_PM_ACTIVE: PMState = {
  running: true,
  messages: [{ who: 'pm', text: 'test message', ts: '14:23' }],
  pendingApprovals: [],
};

const MOCK_STREAM: StreamMsg[] = [
  { ts: '14:20', who: 'dev', kind: 'tool', tool: 'Edit', text: 'editing file' },
  { ts: '14:21', who: 'dev', kind: 'reason', text: 'TDD red phase' },
];

const noop = () => {};

describe('PMChatPanel — STREAM tab rail__line classes (redesign R-4) [REQ-110]', () => {
  it('STREAM tab renders stream items with rail__line class', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={MOCK_STREAM}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    fireEvent.click(screen.getByTestId('pm-tab-stream'));
    const lines = document.querySelectorAll('.rail__line');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('STREAM tab renders close/toggle button in tabs row', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={MOCK_STREAM}
        collapsed={false} onToggle={noop}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    // close button should be in the tabs row (▶ symbol)
    expect(screen.getByTestId('pm-chat-close')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// R-5: PMChatPanel — collapsed state + pm-chat-handle [REQ-111]
// ---------------------------------------------------------------------------
describe('PMChatPanel — collapsed state (redesign R-5) [REQ-111]', () => {
  it('renders pm-chat-handle button when collapsed=true', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={MOCK_STREAM}
        collapsed={true} onToggle={noop}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    expect(document.querySelector('.pm-chat-handle')).not.toBeNull();
  });

  it('does NOT render pm-chat-panel data-testid when collapsed=true', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={MOCK_STREAM}
        collapsed={true} onToggle={noop}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    expect(screen.queryByTestId('pm-chat-panel')).not.toBeInTheDocument();
  });

  it('calls onToggle when pm-chat-handle is clicked', () => {
    const onToggle = vi.fn();
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={[]}
        collapsed={true} onToggle={onToggle}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    fireEvent.click(document.querySelector('.pm-chat-handle')!);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('handle shows stream count badge when stream has messages', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={MOCK_STREAM}
        collapsed={true} onToggle={noop}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    const handle = document.querySelector('.pm-chat-handle');
    expect(handle?.textContent).toContain('2');
  });

  it('renders full panel (not handle) when collapsed=false', () => {
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={[]}
        collapsed={false} onToggle={noop}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    expect(screen.getByTestId('pm-chat-panel')).toBeInTheDocument();
    expect(document.querySelector('.pm-chat-handle')).toBeNull();
  });

  it('renders full panel when collapsed prop is omitted (default behavior preserved)', () => {
    // WHY: backward compat — existing tests don't pass collapsed prop
    render(
      <PMChatPanel pm={MOCK_PM_ACTIVE} stream={[]}
        onSend={noop} onStart={noop} onPermission={noop} />
    );
    expect(screen.getByTestId('pm-chat-panel')).toBeInTheDocument();
  });
});
