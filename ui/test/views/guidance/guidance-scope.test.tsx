/**
 * LearnedGuidanceView — GD-SCOPE-* scope filter + badge + keyPath tests
 * WHY: Verifies scope filter pills, keyKind badge, keyPath display, and WRITE badge
 * for aggregator scope.
 *
 * REQ-144: scope filter pill 4 values (all / Agents (3) / loom-review / loom-retro)
 * REQ-145: Agents pill filters to keyKind === "agent" entries only
 * REQ-146: loom-review pill filters keyPath starting with skills/loom-review/
 * REQ-147: loom-retro pill filters keyPath starting with skills/loom-retro/
 * REQ-148: AGENT (green) / SKILL (accent) kind badge per card
 * REQ-149: aggregator scope (skills/loom-retro/stages/aggregator) shows WRITE badge
 *
 * Test prefix: GS-* (was GD-SCOPE-*, renamed per m0.19-t2e naming mismatch resolution)
 * GS-FILTER-01 = pill 4種 + active toggle
 * GS-FILTER-02 = Agents pill filter
 * GS-FILTER-03 = loom-review / loom-retro pill filter
 * GS-BADGE-01  = AGENT/SKILL badge per card
 * GS-BADGE-02  = aggregator WRITE badge
 * GS-KEYPATH-01 = key path display
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { LearnedGuidanceView } from '../../../src/views/guidance/LearnedGuidanceView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// GS-FILTER-01: pill row renders 4 pills (REQ-144)
// ---------------------------------------------------------------------------

// covers: GS-FILTER-01
describe('filter pill row — 4 pills render (REQ-144)', () => {
  it('renders exactly 4 scope filter pills', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    expect(pills).toHaveLength(4);
  });

  it('pill labels include all / Agents / loom-review / loom-retro', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const labels = pills.map((p) => p.textContent ?? '');
    expect(labels.some((l) => l.includes('all'))).toBe(true);
    expect(labels.some((l) => l.includes('Agents'))).toBe(true);
    expect(labels.some((l) => l.includes('loom-review'))).toBe(true);
    expect(labels.some((l) => l.includes('loom-retro'))).toBe(true);
  });

  it('Agents pill shows count of agent-keyed entries in parentheses', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const agentsPill = pills.find((p) => (p.textContent ?? '').includes('Agents'));
    expect(agentsPill).toBeTruthy();
    // Should have count like "Agents (3)"
    expect(agentsPill!.textContent).toMatch(/Agents\s*\(\d+\)/);
  });
});

// ---------------------------------------------------------------------------
// GS-FILTER-01: active toggle — clicking pill flips active state (REQ-144)
// ---------------------------------------------------------------------------

// covers: GS-FILTER-01
describe('pill active toggle (REQ-144)', () => {
  it('"all" pill is active by default', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const allPill = pills.find((p) => (p.textContent ?? '').includes('all'));
    expect(allPill).toBeTruthy();
    expect(allPill!.getAttribute('data-active')).toBe('true');
  });

  it('clicking Agents pill sets it as active', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const agentsPill = pills.find((p) => (p.textContent ?? '').includes('Agents'))!;
    fireEvent.click(agentsPill);
    expect(agentsPill.getAttribute('data-active')).toBe('true');
  });

  it('clicking Agents pill deactivates all pill', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const allPill = pills.find((p) => (p.textContent ?? '').includes('all'))!;
    const agentsPill = pills.find((p) => (p.textContent ?? '').includes('Agents'))!;
    fireEvent.click(agentsPill);
    expect(allPill.getAttribute('data-active')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// GS-FILTER-02: Agents pill — filters to keyKind === "agent" only (REQ-145)
// ---------------------------------------------------------------------------

// covers: GS-FILTER-02
describe('Agents pill — shows only agent-keyed entries (REQ-145)', () => {
  it('Agents pill shows only items with data-keykind="agent"', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const agentsPill = pills.find((p) => (p.textContent ?? '').includes('Agents'))!;
    fireEvent.click(agentsPill);

    const items = screen.getAllByTestId('guidance-item');
    items.forEach((item) => {
      expect(item.getAttribute('data-keykind')).toBe('agent');
    });
  });

  it('Agents pill results contain no skill-keyed entries', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const agentsPill = pills.find((p) => (p.textContent ?? '').includes('Agents'))!;
    fireEvent.click(agentsPill);

    const items = screen.getAllByTestId('guidance-item');
    const hasSkill = items.some((item) => item.getAttribute('data-keykind') === 'skill');
    expect(hasSkill).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GS-FILTER-03: loom-review pill — filters by keyPath prefix (REQ-146)
// ---------------------------------------------------------------------------

// covers: GS-FILTER-03
describe('loom-review pill — filters by keyPath prefix (REQ-146)', () => {
  it('loom-review pill shows only items with keyPath starting with skills/loom-review/', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const reviewPill = pills.find((p) => (p.textContent ?? '').includes('loom-review'))!;
    fireEvent.click(reviewPill);

    const items = screen.getAllByTestId('guidance-item');
    items.forEach((item) => {
      const keyPath = item.getAttribute('data-keypath') ?? '';
      expect(keyPath.startsWith('skills/loom-review/')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// GS-FILTER-03: loom-retro pill — filters by keyPath prefix (REQ-147)
// ---------------------------------------------------------------------------

// covers: GS-FILTER-03
describe('loom-retro pill — filters by keyPath prefix (REQ-147)', () => {
  it('loom-retro pill shows only items with keyPath starting with skills/loom-retro/', () => {
    render(<LearnedGuidanceView />);
    const pills = screen.getAllByTestId('scope-filter-pill');
    const retroPill = pills.find((p) => (p.textContent ?? '').includes('loom-retro'))!;
    fireEvent.click(retroPill);

    const items = screen.getAllByTestId('guidance-item');
    items.forEach((item) => {
      const keyPath = item.getAttribute('data-keypath') ?? '';
      expect(keyPath.startsWith('skills/loom-retro/')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// GS-BADGE-01: AGENT / SKILL badge per card (REQ-148)
// ---------------------------------------------------------------------------

// covers: GS-BADGE-01
describe('keyKind badge per card (REQ-148)', () => {
  it('each card shows a keyKind badge (data-testid="keykind-badge")', () => {
    render(<LearnedGuidanceView />);
    const items = screen.getAllByTestId('guidance-item');
    // At least some items should have keykind-badge
    const badges = screen.getAllByTestId('keykind-badge');
    expect(badges.length).toBeGreaterThanOrEqual(items.length);
  });

  it('AGENT badge text is "AGENT"', () => {
    render(<LearnedGuidanceView />);
    const badges = screen.getAllByTestId('keykind-badge');
    const agentBadges = badges.filter((b) => b.textContent === 'AGENT');
    expect(agentBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('SKILL badge text is "SKILL"', () => {
    render(<LearnedGuidanceView />);
    const badges = screen.getAllByTestId('keykind-badge');
    const skillBadges = badges.filter((b) => b.textContent === 'SKILL');
    expect(skillBadges.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// GS-KEYPATH-01: keyPath string display per card
// ---------------------------------------------------------------------------

// covers: GS-KEYPATH-01
describe('keyPath display per card (GS-KEYPATH-01)', () => {
  it('each card shows a keyPath element (data-testid="guidance-keypath")', () => {
    render(<LearnedGuidanceView />);
    const keypaths = screen.getAllByTestId('guidance-keypath');
    const items = screen.getAllByTestId('guidance-item');
    expect(keypaths.length).toBe(items.length);
  });

  it('keyPath values include agent-path examples', () => {
    render(<LearnedGuidanceView />);
    const keypaths = screen.getAllByTestId('guidance-keypath');
    const texts = keypaths.map((el) => el.textContent ?? '');
    // At least one should be an agent path like "agents/loom-pm" or similar
    const hasAgentPath = texts.some((t) => t.startsWith('agents/'));
    expect(hasAgentPath).toBe(true);
  });

  it('keyPath values include skill-path examples', () => {
    render(<LearnedGuidanceView />);
    const keypaths = screen.getAllByTestId('guidance-keypath');
    const texts = keypaths.map((el) => el.textContent ?? '');
    // At least one should be a skill path like "skills/loom-review/..."
    const hasSkillPath = texts.some((t) => t.startsWith('skills/'));
    expect(hasSkillPath).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GS-BADGE-02: WRITE badge on aggregator scope entry (REQ-149)
// ---------------------------------------------------------------------------

// covers: GS-BADGE-02
describe('WRITE badge on aggregator scope (REQ-149)', () => {
  it('at least one card has data-testid="write-badge"', () => {
    render(<LearnedGuidanceView />);
    const writeBadges = screen.getAllByTestId('write-badge');
    expect(writeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('WRITE badge is on the aggregator keyPath entry', () => {
    render(<LearnedGuidanceView />);
    // Find item with aggregator keyPath
    const items = screen.getAllByTestId('guidance-item');
    const aggregatorItem = items.find(
      (item) =>
        (item.getAttribute('data-keypath') ?? '').includes('aggregator'),
    );
    expect(aggregatorItem).toBeTruthy();
    // The aggregator item should contain a write-badge
    const writeBadge = aggregatorItem!.querySelector('[data-testid="write-badge"]');
    expect(writeBadge).toBeTruthy();
  });
});
