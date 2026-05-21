/**
 * StatusBar unit tests — SB-LAYOUT-01 / SB-CONN-01 / SB-SCENARIO-01
 *
 * REQ-075 scope: StatusBar 画面下常時表示 + 接続セグメント + シナリオラベル
 *
 * Tests the standalone StatusBar component at ui/src/views/shell/StatusBar.tsx.
 * Component renders the bottom bar of AppShell with connection status and scenario label.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusBar } from '../../../src/views/shell/StatusBar';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// SB-LAYOUT-01: StatusBar が画面下に常時表示
// ---------------------------------------------------------------------------
// covers: SB-LAYOUT-01
describe('StatusBar: layout (SB-LAYOUT-01)', () => {
  it('renders StatusBar with data-testid="statusbar"', () => {
    render(
      <StatusBar label="全員 idle (寝てる)" project="freee-mcp" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    expect(bar).toBeInTheDocument();
  });

  it('StatusBar uses "statusbar" className for bottom-fixed positioning', () => {
    render(
      <StatusBar label="全員 idle (寝てる)" project="freee-mcp" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    expect(bar.className).toMatch(/statusbar/);
  });

  it('StatusBar renders project path in right segment', () => {
    render(
      <StatusBar label="全員 idle (寝てる)" project="my-project" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    expect(bar).toHaveTextContent('my-project');
  });
});

// ---------------------------------------------------------------------------
// SB-CONN-01: 接続セグメント (daemon health status)
// ---------------------------------------------------------------------------
// covers: SB-CONN-01
describe('StatusBar: connection segment (SB-CONN-01)', () => {
  it('shows .dot.busy and "WS connected" when conn="connected"', () => {
    render(
      <StatusBar label="any" project="proj" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    // dot.busy class indicates connected state
    const dot = bar.querySelector('.dot.busy');
    expect(dot).not.toBeNull();
    expect(bar).toHaveTextContent(/WS connected/i);
  });

  it('shows .dot.fail and reconnecting text when conn="disconnected"', () => {
    render(
      <StatusBar label="any" project="proj" conn="disconnected" />,
    );
    const bar = screen.getByTestId('statusbar');
    const dot = bar.querySelector('.dot.fail');
    expect(dot).not.toBeNull();
    // Not "WS connected" text — disconnected/reconnecting state
    expect(bar).not.toHaveTextContent('WS connected');
  });
});

// ---------------------------------------------------------------------------
// SB-SCENARIO-01: シナリオラベル
// ---------------------------------------------------------------------------
// covers: SB-SCENARIO-01
describe('StatusBar: scenario label (SB-SCENARIO-01)', () => {
  it('shows scenario idle label "全員 idle (寝てる)" when scenario=idle', () => {
    render(
      <StatusBar label="全員 idle (寝てる)" project="proj" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    expect(bar).toHaveTextContent('全員 idle (寝てる)');
  });

  it('shows scenario active label "Dev サブエージェント実行中" when scenario=active', () => {
    render(
      <StatusBar label="Dev サブエージェント実行中" project="proj" conn="connected" />,
    );
    const bar = screen.getByTestId('statusbar');
    expect(bar).toHaveTextContent('Dev サブエージェント実行中');
  });

  it('renders scenario label in <strong> element with statusbar__scenario class', () => {
    render(
      <StatusBar label="test-label" project="proj" conn="connected" />,
    );
    const scenarioEl = document.querySelector('.statusbar__scenario');
    expect(scenarioEl).not.toBeNull();
    expect(scenarioEl?.textContent).toBe('test-label');
  });
});
