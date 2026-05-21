/**
 * SubroomClone TDD tests — M0.11.4 t9
 * WHY: verify ghost cat button for worktree sub-agent renders correct
 * DOM structure, passes props to CatSprite, shows status dot variant,
 * and fires onClick handler.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L131-141
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SubroomClone } from '../../../src/views/room/SubroomClone';
import { ROSTER } from '../../../src/data/roster';

afterEach(() => {
  cleanup();
});

const devCat = ROSTER.find((r) => r.id === 'dev')!;

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
// covers: WC-POS-01
describe('SubroomClone — basic render', () => {
  it('renders a button with className subroom-clone', () => {
    const { container } = render(
      <SubroomClone x={100} y={200} cat={devCat} branch="feat/oauth" />
    );
    const btn = container.querySelector('button.subroom-clone');
    expect(btn).not.toBeNull();
  });

  it('positions the button via left/top inline style', () => {
    const { container } = render(
      <SubroomClone x={100} y={200} cat={devCat} branch="feat/oauth" />
    );
    const btn = container.querySelector('button.subroom-clone') as HTMLButtonElement;
    expect(btn.style.left).toBe('100px');
    expect(btn.style.top).toBe('200px');
  });

  it('renders .subroom-clone__sprite wrapper', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    expect(container.querySelector('.subroom-clone__sprite')).not.toBeNull();
  });

  it('renders .subroom-clone__label wrapper', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    expect(container.querySelector('.subroom-clone__label')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch text
// ---------------------------------------------------------------------------
describe('SubroomClone — branch label', () => {
  it('shows @{branch} text in label', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    expect(container.querySelector('.subroom-clone__label')?.textContent).toContain('@feat/oauth');
  });

  it('shows @{branch} for a different branch', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="fix/test-flake" />
    );
    expect(container.querySelector('.subroom-clone__label')?.textContent).toContain('@fix/test-flake');
  });
});

// ---------------------------------------------------------------------------
// Status dot variant
// ---------------------------------------------------------------------------
describe('SubroomClone — status dot', () => {
  it('applies --busy dot class when status is busy (default)', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    expect(container.querySelector('.subroom-clone__dot--busy')).not.toBeNull();
  });

  it('applies --review dot class when status is review', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" status="review" />
    );
    expect(container.querySelector('.subroom-clone__dot--review')).not.toBeNull();
  });

  it('applies --idle dot class when status is idle', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" status="idle" />
    );
    expect(container.querySelector('.subroom-clone__dot--idle')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onClick
// ---------------------------------------------------------------------------
// covers: WC-CLICK-01
describe('SubroomClone — onClick', () => {
  it('fires onClick when button is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" onClick={handleClick} />
    );
    const btn = container.querySelector('button.subroom-clone') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onClick is not provided', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    const btn = container.querySelector('button.subroom-clone') as HTMLButtonElement;
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CatSprite — size=36 / pose=work
// ---------------------------------------------------------------------------
describe('SubroomClone — CatSprite props', () => {
  it('renders a CatSprite SVG inside .subroom-clone__sprite', () => {
    const { container } = render(
      <SubroomClone x={0} y={0} cat={devCat} branch="feat/oauth" />
    );
    const sprite = container.querySelector('.subroom-clone__sprite');
    expect(sprite?.querySelector('svg')).not.toBeNull();
  });
});
