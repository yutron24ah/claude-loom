/**
 * RoomView × mock=active scenario smoke test
 * -----------------------------------------------------------
 * Verifies the redesign port: when useScenario() returns an active
 * scenario, the corresponding cats render with the right DeskStatus
 * (status dot color via styled background) and the right speech-bubble
 * content (currentTool) coming from agent.change deltas.
 *
 * Replaces the equivalent visual check we'd otherwise do by opening
 * the dev server at /?mock=active in a real browser. Pairs with
 * existing room-view.test.tsx (which exercises the default idle path).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Scenario, AgentState } from '@claude-loom/redesign/api/types';
import { RoomView } from '../../../src/views/room/RoomView';

// WHY: mock the redesign hook directly. This is the seam scenarios.js → daemon
// reducer; mocking here proves the consumer wiring without spinning up a WS.
const activeAgents: Record<string, AgentState> = {
  pm: { status: 'busy', currentReasoning: 'spec を読み返してる…' },
  dev: { status: 'busy', currentTool: 'Edit', currentReasoning: 'GREEN 追加' },
  'rev-code': { status: 'review', currentTool: 'Read' },
  'rev-test': { status: 'busy', currentTool: 'Bash' },
  'rev-sec': { status: 'idle', lastSeenAt: '21分前' },
};

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  // RoomView only reads scenario.agents today; safe to return a partial.
  useScenario: () =>
    ({
      key: 'active',
      label: 'Dev サブエージェント実行中',
      now: '14:23',
      conn: 'connected',
      project: 'freee-mcp',
      branch: 'main',
      agents: activeAgents,
    }) as unknown as Scenario,
  useScenarioMockKey: () => 'active' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({ agents: activeAgents }) as unknown as Scenario,
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

describe('RoomView × scenario.active', () => {
  it('renders dev cat with currentTool bubble = "Edit"', () => {
    render(<RoomView width={1080} height={660} />);
    // The DeskStation renders the bubble text inside [data-testid="speech-bubble"].
    // active fixture sets dev.currentTool='Edit', so the bubble should contain it.
    const bubbles = screen.getAllByTestId('speech-bubble');
    const texts = bubbles.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('Edit'))).toBe(true);
  });

  it('renders rev-code cat with bubble showing currentTool = "Read"', () => {
    render(<RoomView width={1080} height={660} />);
    const bubbles = screen.getAllByTestId('speech-bubble');
    const texts = bubbles.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('Read'))).toBe(true);
  });

  it('renders all 6 desk monitors regardless of agent status', () => {
    render(<RoomView width={1080} height={660} />);
    // Even idle cats keep a desk; only the bubble + status dot differ.
    const monitors = screen.getAllByTestId('monitor-screen');
    expect(monitors).toHaveLength(6);
  });

  it('renders idle cat (rev-sec) with no speech bubble', () => {
    render(<RoomView width={1080} height={660} />);
    // active fixture leaves rev-sec in idle with lastSeenAt only.
    // It must NOT produce a bubble (no currentTool / currentReasoning).
    const bubbles = screen.getAllByTestId('speech-bubble');
    // 4 bubbles expected: pm (reasoning) + dev (Edit) + rev-code (Read) + rev-test (Bash)
    expect(bubbles).toHaveLength(4);
  });
});
