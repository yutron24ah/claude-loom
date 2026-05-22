/**
 * AgentDetailPanel × scenario.active smoke test
 * -------------------------------------------------------
 * REQ-067: AgentDetailPanel redesign port — useScenario-driven rendering.
 *
 * Verifies that the redesigned AgentDetailPanel:
 * - renders agent identity (name, role, breed, quote) from RosterEntry
 * - renders agent status from scenario.agents[agentId]
 * - renders currentTool + currentReasoning from scenario state
 * - renders stream tail filtered by agent name (who === agent.name)
 * - renders token usage from scenario.tokens.byAgent matched by agentId
 * - fires onClose when close button is clicked
 *
 * WHY: replaces hardcoded fixture assertions — actual data comes from
 * useScenario() hook which is mocked here to prove the consumer wiring.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';
import { ROSTER } from '../../../src/data/roster';
import { AgentDetailPanel } from '../../../src/views/room/AgentDetailPanel';

// WHY: mock AgentDetailNotes to avoid tRPC provider requirement in unit tests.
vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: mock useScenario to provide a controlled active scenario
// without spinning up a WebSocket or daemon.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'active',
      label: 'Dev サブエージェント実行中',
      now: '14:23',
      conn: 'connected',
      project: 'claude-loom',
      branch: 'feat/redesign-room-mvp',
      agents: {
        pm: { status: 'busy', currentReasoning: 'spec を読み返してる' },
        dev: {
          status: 'busy',
          currentTool: 'Edit',
          currentReasoning: 'GREEN 追加',
          lastSeenAt: 'now',
        },
      },
      stream: [
        {
          ts: '14:23:08',
          who: 'サバ',
          kind: 'reason',
          text: 'user.service.test.ts は user 作成時の唯一性チェックが先',
        },
        {
          ts: '14:23:09',
          who: 'サバ',
          kind: 'tool',
          tool: 'Read',
          text: 'src/services/user.service.test.ts',
        },
        {
          ts: '14:23:13',
          who: 'サバ',
          kind: 'tool',
          tool: 'Edit',
          text: '+ it("rejects duplicate email", …',
        },
        // Message from a different agent — must NOT appear in dev panel
        {
          ts: '14:23:15',
          who: 'ニケ',
          kind: 'reason',
          text: 'PM 専用のメッセージ',
        },
      ],
      tokens: {
        period: '2026-05-11',
        byAgent: [
          {
            agentId: 'dev',
            model: 'sonnet',
            input: 380000,
            output: 92000,
            cacheWrite: 64000,
            cacheRead: 2400000,
          },
          {
            agentId: 'pm',
            model: 'sonnet',
            input: 50000,
            output: 10000,
            cacheWrite: 0,
            cacheRead: 0,
          },
        ],
        daily: [],
      },
      guidance: [],
      gantt: { windowLabel: '', nowPct: 0, rows: [] },
    }) as unknown as Scenario,
  useScenarioMockKey: () => 'active' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({}) as unknown as Scenario,
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

const devCat = ROSTER.find((r) => r.id === 'dev')!;

// covers: AP-OPEN-01, AP-CLOSE-01, AP-Z-INDEX-01, AD-OPEN-FROM-ROOM-01, AD-CLOSE-X-01, AD-PROFILE-01
describe('AgentDetailPanel × scenario.active', () => {
  it('renders agent name + role + breed + quote', () => {
    render(<AgentDetailPanel agent={devCat} onClose={() => {}} />);
    // agent name
    expect(screen.getByText('サバ')).toBeInTheDocument();
    // role
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    // breed
    expect(screen.getByText(/サバトラ/)).toBeInTheDocument();
    // quote
    expect(screen.getByText(/RED → GREEN/)).toBeInTheDocument();
  });

  it('renders agent status (busy) from scenario.agents[agentId]', () => {
    render(<AgentDetailPanel agent={devCat} onClose={() => {}} />);
    // status chip or label should show 'busy'
    expect(screen.getByTestId('agent-detail-status')).toHaveTextContent('busy');
  });

  it('renders currentTool + currentReasoning bubble from scenario state', () => {
    render(<AgentDetailPanel agent={devCat} onClose={() => {}} />);
    // currentTool badge
    expect(screen.getByTestId('agent-detail-current-tool')).toHaveTextContent('Edit');
    // currentReasoning text
    expect(screen.getByTestId('agent-detail-current-reasoning')).toHaveTextContent('GREEN 追加');
  });

  it('renders history (stream tail) filtered by agentId (who === agent.name)', () => {
    render(<AgentDetailPanel agent={devCat} onClose={() => {}} />);
    // dev cat name is "サバ" — 3 stream entries have who='サバ'
    expect(screen.getByText(/user.service.test.ts は user 作成時の唯一性チェックが先/)).toBeInTheDocument();
    expect(screen.getByText(/src\/services\/user.service.test.ts/)).toBeInTheDocument();
    // PM message must NOT appear (different who)
    expect(screen.queryByText(/PM 専用のメッセージ/)).not.toBeInTheDocument();
  });

  it('renders token usage from scenario.tokens.byAgent matched by agentId', () => {
    render(<AgentDetailPanel agent={devCat} onClose={() => {}} />);
    // input 380000 → display as "380k" or "380,000" etc.
    // We check for the token section to be present with dev's data
    const tokenSection = screen.getByTestId('agent-detail-tokens');
    expect(tokenSection).toBeInTheDocument();
    // Verify dev's input tokens appear (380k)
    expect(tokenSection).toHaveTextContent('380');
  });

  it('onClose prop callback invoked when close button clicked', () => {
    const onClose = vi.fn();
    render(<AgentDetailPanel agent={devCat} onClose={onClose} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
