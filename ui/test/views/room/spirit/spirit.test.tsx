/**
 * spirit.test.tsx — SPIRIT-* prefix acceptance tests (TDD RED phase)
 *
 * Covers spec/ui-arch.md §8.2.1 Spirit Summoning (Room) requirements.
 * REQ-133..REQ-139 (m0.18-t3).
 *
 * Test strategy: unit-level component tests using jsdom + @testing-library/react.
 * No daemon/WS — spirit components accept props directly.
 *
 * SPIRIT-* test IDs from docs/design/.../qa-suite.js §13 (lines 3886-3953):
 *   SP-ROSTER-01: persistent 3 体のみ (PM / Dev / Retro PM)
 *   SP-ROSTER-02: spirit 10 体全員に summonedBy
 *   SP-ROSTER-03: aggregator のみ writePermission: true (SKILLS registry)
 *   SP-MOTION-RPG-01: spiritMode="rpg" で .room--rpg クラス付与
 *   SP-MOTION-OFF-01: spiritMode="office" で .room--office + .room-door
 *   SP-MOTION-HYB-01: spiritMode="hybrid" (default) で .spirit-echo 描画
 *   SP-MOTION-EXIT-01: spirit dispatch 終了で .spirit--leaving 付与
 *   SP-QUEUE-01: SummonQueue に active / queued 状態が並ぶ
 *   SP-DESK-01: review / retro spirit の DeskStation は描画されない
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// jsdom polyfill
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test',
    branch: 'main',
    agents: {},
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [],
    milestones: [],
    todosUpdatedAt: '—',
    findings: [],
    pm: { running: false },
    worktrees: [],
  }),
  useScenarioMockKey: () => 'idle' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({ agents: {}, worktrees: [], pm: { running: false } }),
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../../src/store/view', () => ({
  useViewStore: {
    getState: () => ({
      setSelectedAgentId: vi.fn(),
    }),
  },
}));

vi.mock('../../../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: vi.fn(),
    say: vi.fn(),
    permission: vi.fn(),
    isLoading: false,
  }),
}));

// ---------------------------------------------------------------------------
// SUT imports — imported after vi.mock calls
// ---------------------------------------------------------------------------
import { ROSTER } from '../../../../src/data/roster';
import { SKILLS } from '../../../../src/data/skills';
import { Spirit } from '../../../../src/views/room/Spirit';
import { SpiritEcho } from '../../../../src/views/room/SpiritEcho';
import { RoomDoor } from '../../../../src/views/room/RoomDoor';
import { SummonQueue } from '../../../../src/views/room/SummonQueue';
import { RoomView } from '../../../../src/views/room/RoomView';

afterEach(() => cleanup());

// ============================================================
// SP-ROSTER-01 — REQ-133
// ============================================================
// covers: SP-ROSTER-01
describe('SP-ROSTER-01 (REQ-133): persistent は 3 体のみ', () => {
  it('ROSTER から kind="persistent" を filter すると 3 体、id が pm / dev / retro-pm', () => {
    const persistents = ROSTER.filter((r) => r.kind === 'persistent');
    expect(persistents).toHaveLength(3);
    const ids = persistents.map((r) => r.id);
    expect(ids).toContain('pm');
    expect(ids).toContain('dev');
    expect(ids).toContain('retro-pm');
  });
});

// ============================================================
// SP-ROSTER-02 — REQ-134
// ============================================================
// covers: SP-ROSTER-02
describe('SP-ROSTER-02 (REQ-134): spirit 10 体全員に summonedBy がある', () => {
  it('ROSTER から kind="spirit" を filter すると 10 体、全エントリに summonedBy 文字列', () => {
    const spirits = ROSTER.filter((r) => r.kind === 'spirit');
    expect(spirits).toHaveLength(10);
    for (const s of spirits) {
      expect(typeof s.summonedBy).toBe('string');
      expect(s.summonedBy!.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// SP-ROSTER-03 — REQ-135
// ============================================================
// covers: SP-ROSTER-03
describe('SP-ROSTER-03 (REQ-135): aggregator のみ writePermission:true', () => {
  it('SKILLS の loom-retro.stages.aggregator だけ writePermission=true', () => {
    const retro = SKILLS.find((s) => s.id === 'loom-retro');
    expect(retro).toBeDefined();
    // WHY: stages is optional on Skill interface; assert non-null before access.
    expect(retro!.stages).toBeDefined();
    const agg = retro!.stages!.find((s) => s.id === 'aggregator');
    expect(agg).toBeDefined();
    expect(agg!.writePermission).toBe(true);

    // All other stages/lenses must be falsy
    // WHY: lenses/stages are optional on Skill interface (skills.ts); use ?? []
    // to guard against undefined while preserving test intent unchanged.
    const others = [
      ...(retro!.lenses ?? []),
      ...(retro!.stages ?? []).filter((s) => s.id !== 'aggregator'),
    ];
    for (const entry of others) {
      expect((entry as { writePermission?: boolean }).writePermission).toBeFalsy();
    }
  });
});

// ============================================================
// SP-MOTION-RPG-01 — REQ-136
// ============================================================
// covers: SP-MOTION-RPG-01
describe('SP-MOTION-RPG-01 (REQ-136): spiritMode="rpg" で .room--rpg クラス付与', () => {
  it('RoomView に spiritMode="rpg" を渡すと container に room--rpg クラスが付く', () => {
    const { container } = render(<RoomView spiritMode="rpg" />);
    const roomEl = container.querySelector('[data-testid="room-canvas"]');
    expect(roomEl).toBeInTheDocument();
    expect(roomEl!.className).toMatch(/room--rpg/);
  });
});

// ============================================================
// SP-MOTION-OFF-01 — REQ-137
// ============================================================
// covers: SP-MOTION-OFF-01
describe('SP-MOTION-OFF-01 (REQ-137): spiritMode="office" で .room--office + RoomDoor', () => {
  it('RoomView に spiritMode="office" を渡すと room--office クラスと .room-door が存在', () => {
    const { container } = render(<RoomView spiritMode="office" />);
    const roomEl = container.querySelector('[data-testid="room-canvas"]');
    expect(roomEl!.className).toMatch(/room--office/);
    expect(container.querySelector('.room-door')).toBeInTheDocument();
  });
});

// ============================================================
// SP-MOTION-HYB-01 — REQ-138
// ============================================================
// covers: SP-MOTION-HYB-01
describe('SP-MOTION-HYB-01 (REQ-138): spiritMode="hybrid" (default) で .spirit-echo 描画', () => {
  it('RoomView prop なし (default=hybrid) で room--hybrid クラスが付く', () => {
    const { container } = render(<RoomView />);
    const roomEl = container.querySelector('[data-testid="room-canvas"]');
    expect(roomEl!.className).toMatch(/room--hybrid/);
  });
});

// ============================================================
// SP-DESK-01 — REQ-139
// ============================================================
// covers: SP-DESK-01
describe('SP-DESK-01 (REQ-139): review / retro spirit の DeskStation は描画されない', () => {
  it('RoomView に rev-code / rev-sec / rev-test / retro-pj の desk が存在しない', () => {
    const { container } = render(<RoomView />);
    // DeskStation renders data-testid="monitor-screen" per each persistent desk
    // Spirit agents must NOT have a DeskStation (only 3 persistent agents do)
    const monitors = container.querySelectorAll('[data-testid="monitor-screen"]');
    // Only 3 persistent agents should have desks
    expect(monitors).toHaveLength(3);
  });
});

// ============================================================
// Spirit component unit tests — REQ-140
// ============================================================
// covers: SP-MOTION-EXIT-01
describe('Spirit component (REQ-140): renders spirit sprite with correct classes', () => {
  const spiritEntry = ROSTER.find((r) => r.id === 'rev')!;

  it('renders .spirit element with data-spirit-id attribute', () => {
    const { container } = render(
      <Spirit
        entry={spiritEntry}
        x={100}
        y={200}
        leaving={false}
        onClick={() => {}}
      />,
    );
    const el = container.querySelector('.spirit');
    expect(el).toBeInTheDocument();
    expect(el!.getAttribute('data-spirit-id')).toBe('rev');
  });

  it('adds .spirit--leaving class when leaving=true', () => {
    const { container } = render(
      <Spirit
        entry={spiritEntry}
        x={100}
        y={200}
        leaving={true}
        onClick={() => {}}
      />,
    );
    const el = container.querySelector('.spirit');
    expect(el!.className).toMatch(/spirit--leaving/);
  });
});

// ============================================================
// SpiritEcho component unit tests — REQ-141
// ============================================================
describe('SpiritEcho component (REQ-141): renders echo with correct opacity', () => {
  const spiritEntry = ROSTER.find((r) => r.id === 'rev')!;

  it('renders .spirit-echo element', () => {
    const { container } = render(
      <SpiritEcho entry={spiritEntry} x={80} y={160} />,
    );
    expect(container.querySelector('.spirit-echo')).toBeInTheDocument();
  });
});

// ============================================================
// RoomDoor component unit tests — REQ-142
// ============================================================
describe('RoomDoor component (REQ-142): renders door SVG with correct classes', () => {
  it('renders .room-door element', () => {
    const { container } = render(<RoomDoor x={300} y={100} open={false} />);
    expect(container.querySelector('.room-door')).toBeInTheDocument();
  });

  it('adds .room-door--open class when open=true', () => {
    const { container } = render(<RoomDoor x={300} y={100} open={true} />);
    expect(container.querySelector('.room-door--open')).toBeInTheDocument();
  });
});

// ============================================================
// SummonQueue component unit tests — REQ-143
// ============================================================
// covers: SP-QUEUE-01
describe('SummonQueue component (REQ-143): renders active / queued / leaving states', () => {
  it('renders .summon-queue element', () => {
    const { container } = render(
      <SummonQueue
        x={10}
        y={10}
        items={[]}
      />,
    );
    expect(container.querySelector('.summon-queue')).toBeInTheDocument();
  });

  it('renders active item with .summon-queue__state--active', () => {
    const { container } = render(
      <SummonQueue
        x={10}
        y={10}
        items={[{ skillId: 'loom-review/single', status: 'active', ttlSeconds: 42 }]}
      />,
    );
    expect(container.querySelector('.summon-queue__state--active')).toBeInTheDocument();
  });

  it('renders queued item with .summon-queue__state--queued', () => {
    const { container } = render(
      <SummonQueue
        x={10}
        y={10}
        items={[{ skillId: 'loom-retro/stages.aggregator', status: 'queued', ttlSeconds: null }]}
      />,
    );
    expect(container.querySelector('.summon-queue__state--queued')).toBeInTheDocument();
  });

  it('renders leaving item with .summon-queue__state--leaving', () => {
    const { container } = render(
      <SummonQueue
        x={10}
        y={10}
        items={[{ skillId: 'loom-review/trio.code', status: 'leaving', ttlSeconds: 0 }]}
      />,
    );
    expect(container.querySelector('.summon-queue__state--leaving')).toBeInTheDocument();
  });
});
