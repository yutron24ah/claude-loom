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
 * Test prefix: GD-SCOPE-* (per SPEC §8.4, Frontend改修方針 §7 SSoT)
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { LearnedGuidanceView } from '../../../src/views/guidance/LearnedGuidanceView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// GD-SCOPE-01: pill row renders 4 pills (REQ-144)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-01: filter pill row — 4 pills render', () => {
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
// GD-SCOPE-02: active toggle — clicking pill flips active state (REQ-144)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-02: pill active toggle', () => {
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
// GD-SCOPE-03: Agents pill — filters to keyKind === "agent" only (REQ-145)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-03: Agents pill — shows only agent-keyed entries', () => {
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
// GD-SCOPE-04: loom-review pill — filters by keyPath prefix (REQ-146)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-04: loom-review pill — filters by keyPath prefix', () => {
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
// GD-SCOPE-05: loom-retro pill — filters by keyPath prefix (REQ-147)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-05: loom-retro pill — filters by keyPath prefix', () => {
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
// GD-SCOPE-06: AGENT / SKILL badge per card (REQ-148)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-06: keyKind badge per card', () => {
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
// GD-SCOPE-07: keyPath string display per card
// ---------------------------------------------------------------------------

describe('GD-SCOPE-07: keyPath display per card', () => {
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
// GD-SCOPE-08: WRITE badge on aggregator scope entry (REQ-149)
// ---------------------------------------------------------------------------

describe('GD-SCOPE-08: WRITE badge on aggregator scope', () => {
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
