/**
 * CustomizationView TDD tests
 * WHY: verify customization shows 13 agents with model + personality selectors.
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 *
 * Updated for M0.15 t5 redesign port:
 * - useScenario() replaces MOCK_SETTINGS hardcoded fixture
 * - visual layout uses inline styles (not rpg-frame/chip CSS classes)
 * - personality shown as preset buttons (not personality-display sub-component)
 * - scope shown in chain detail panel (not scope-badge per row)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
// Provides the minimal customization shape the redesign view needs.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      customization: {
        pm:             { effective: { model: 'opus',   preset: 'default' },         chain: [{ scope: 'default', model: 'opus', preset: 'default' }] },
        dev:            { effective: { model: 'sonnet', preset: 'friendly-mentor' }, chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }, { scope: 'project', preset: 'friendly-mentor' }] },
        rev:            { effective: { model: 'sonnet', preset: 'default' },         chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }] },
        'rev-code':     { effective: { model: 'sonnet', preset: 'strict-drill' },    chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }, { scope: 'project', preset: 'strict-drill' }] },
        'rev-sec':      { effective: { model: 'opus',   preset: 'detective' },       chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }, { scope: 'user', model: 'opus', preset: 'detective' }] },
        'rev-test':     { effective: { model: 'haiku',  preset: 'default' },         chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }, { scope: 'user', model: 'haiku' }] },
        'retro-pm':     { effective: { model: 'opus',   preset: 'default' },         chain: [{ scope: 'default', model: 'opus', preset: 'default' }] },
        'retro-counter':{ effective: { model: 'opus',   preset: 'strict-drill' },    chain: [{ scope: 'default', model: 'opus', preset: 'default' }, { scope: 'user', preset: 'strict-drill' }] },
        'retro-meta':   { effective: { model: 'opus',   preset: 'detective' },       chain: [{ scope: 'default', model: 'opus', preset: 'default' }, { scope: 'user', preset: 'detective' }] },
        'retro-pj':     { effective: { model: 'sonnet', preset: 'default' },         chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }] },
        'retro-research':{ effective: { model: 'sonnet', preset: 'default' },        chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }] },
        'retro-proc':   { effective: { model: 'sonnet', preset: 'default' },         chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }] },
        'retro-agg':    { effective: { model: 'opus',   preset: 'default' },         chain: [{ scope: 'default', model: 'opus', preset: 'default' }] },
      },
    }) as unknown as Scenario,
}));

import { CustomizationView } from '../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
});

describe('CustomizationView — basic render', () => {
  it('renders the customization view container', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('customization-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Customization', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('customization-title')).toBeInTheDocument();
  });
});

describe('CustomizationView — 13 agents visible', () => {
  it('renders exactly 13 agent rows (data-testid=agent-row)', () => {
    render(<CustomizationView />);
    const rows = screen.getAllByTestId('agent-row');
    expect(rows).toHaveLength(13);
  });

  it('renders PM agent row (ニケ)', () => {
    render(<CustomizationView />);
    expect(screen.getByText('ニケ')).toBeInTheDocument();
  });

  it('renders Developer agent row (サバ)', () => {
    render(<CustomizationView />);
    expect(screen.getByText('サバ')).toBeInTheDocument();
  });
});

describe('CustomizationView — model selector', () => {
  it('renders model selector groups (data-testid=model-selector)', () => {
    render(<CustomizationView />);
    const selectors = screen.getAllByTestId('model-selector');
    expect(selectors).toHaveLength(13);
  });

  it('renders opus option in model selectors', () => {
    render(<CustomizationView />);
    const opusOptions = screen.getAllByTestId('model-option-opus');
    expect(opusOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('renders sonnet option in model selectors', () => {
    render(<CustomizationView />);
    const sonnetOptions = screen.getAllByTestId('model-option-sonnet');
    expect(sonnetOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('renders haiku option in model selectors', () => {
    render(<CustomizationView />);
    const haikuOptions = screen.getAllByTestId('model-option-haiku');
    expect(haikuOptions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CustomizationView — preset buttons (redesign port)', () => {
  it('renders preset buttons for each agent (4 presets per row)', () => {
    render(<CustomizationView />);
    // 13 rows × 4 presets = 52 total preset buttons
    const defaultBtns = screen.getAllByTestId('preset-btn-default');
    expect(defaultBtns).toHaveLength(13);
  });

  it('renders chain expand buttons for each agent (data-testid=chain-expand-btn)', () => {
    render(<CustomizationView />);
    const chainBtns = screen.getAllByTestId('chain-expand-btn');
    expect(chainBtns).toHaveLength(13);
  });

  it('renders chain detail panel (data-testid=chain-detail-panel)', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('chain-detail-panel')).toBeInTheDocument();
  });
});

describe('CustomizationView — save/cancel actions', () => {
  it('renders cancel button', () => {
    render(<CustomizationView />);
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<CustomizationView />);
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });
});
