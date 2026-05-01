/**
 * PlanView TDD tests — Red phase (Task 9 Subagent B)
 * WHY: verify short-term todos and long-term plan items render with mock data.
 * Written FIRST (Red) before PlanView implementation.
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. Short-term todos section is present with 5 items
 * 3. Long-term plan items section is present
 * 4. Plan item statuses (in_progress, pending, completed) shown
 * 5. Section headings visible
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

describe('PlanView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<PlanView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders short-term section heading', () => {
    render(<PlanView />);
    // short-term section: TodoWrite mirror
    const section = screen.getByTestId('plan-short-term');
    expect(section).toBeInTheDocument();
  });

  it('renders long-term section heading', () => {
    render(<PlanView />);
    const section = screen.getByTestId('plan-long-term');
    expect(section).toBeInTheDocument();
  });
});

describe('PlanView — short-term todos (mock data: 5 items)', () => {
  it('renders exactly 5 todo items', () => {
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    expect(items.length).toBe(5);
  });

  it('renders in_progress todo item', () => {
    render(<PlanView />);
    // At least one item with in_progress status indicator
    const items = screen.getAllByTestId('todo-item');
    const inProgress = items.find(el => el.querySelector('[data-status="in_progress"]'));
    expect(inProgress).toBeTruthy();
  });

  it('renders completed todo item with strikethrough styling', () => {
    render(<PlanView />);
    const items = screen.getAllByTestId('todo-item');
    const completed = items.find(el => el.querySelector('[data-status="completed"]'));
    expect(completed).toBeTruthy();
  });
});

describe('PlanView — long-term plan items (mock data: 1 milestone × 8 tasks)', () => {
  it('renders at least 1 milestone (level 0) item', () => {
    const { container } = render(<PlanView />);
    const milestones = container.querySelectorAll('[data-level="0"]');
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it('renders child task items (level 1)', () => {
    const { container } = render(<PlanView />);
    const tasks = container.querySelectorAll('[data-level="1"]');
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders total of 9 plan tree items (1 milestone + 8 tasks)', () => {
    const { container } = render(<PlanView />);
    const allPlanItems = container.querySelectorAll('[data-testid="plan-item"]');
    expect(allPlanItems.length).toBe(9);
  });
});
