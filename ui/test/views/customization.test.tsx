/**
 * CustomizationView TDD tests — Red phase (Task 9 Subagent C)
 * WHY: verify customization shows 13 agents with model + personality selectors.
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('CustomizationView — personality selector', () => {
  it('renders personality display for each agent (data-testid=personality-display)', () => {
    render(<CustomizationView />);
    const displays = screen.getAllByTestId('personality-display');
    expect(displays).toHaveLength(13);
  });

  it('renders scope badge for each agent (data-testid=scope-badge)', () => {
    render(<CustomizationView />);
    const badges = screen.getAllByTestId('scope-badge');
    expect(badges).toHaveLength(13);
  });
});
