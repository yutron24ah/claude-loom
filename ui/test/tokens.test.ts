/**
 * tokens.css migration test (Task 4, m2-t2; extended M0.11.4-t3)
 * WHY: verify tokens.css is properly migrated from prototype with:
 *   1. hex values converted to rgb space-separated integers (for <alpha-value> Tailwind syntax)
 *   2. [data-theme="dusk"] and [data-theme="night"] theme override blocks present
 *   3. all expected CSS variables present in :root
 *   4. (M0.11.4-t3) RPG 3 theme palette --p-* variables present (default + .theme-dusk + .theme-night)
 *   5. (M0.11.4-t3) RPG primitive CSS classes present (.rpg-frame, .btn-px, .dot, etc.)
 *   6. (M0.11.4-t3) Room BEM primitives present (.room, .room-poster, .room-island, etc.)
 *   7. (M0.11.4-t3) Subroom primitives present (.subroom-clone, .subroom-portal)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const TOKENS_PATH = resolve(__dirname, '../src/styles/tokens.css');

let tokensContent: string;

beforeAll(() => {
  tokensContent = readFileSync(TOKENS_PATH, 'utf-8');
});

// Helper: extract the :root block content
function extractRootBlock(css: string): string {
  const match = css.match(/:root\s*\{([^}]+)\}/);
  if (!match) return '';
  return match[1];
}

// Helper: extract [data-theme="..."] block content
function extractThemeBlock(css: string, theme: string): string {
  const regex = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]+)\\}`);
  const match = css.match(regex);
  if (!match) return '';
  return match[1];
}

// Helper: check if a value is in rgb space-separated form (e.g., "248 249 251")
function isRgbSpaceSeparated(value: string): boolean {
  return /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value.trim());
}

// Helper: check if a value is a valid var() reference to another CSS variable
function isVarReference(value: string): boolean {
  return /^var\(--[a-z][a-z0-9-]*\)$/.test(value.trim());
}

// Helper: check if value is either rgb space-separated OR a var() reference to another variable
// WHY: semantic alias variables (--bg1, --fg1, etc.) may chain via var(--primary) which itself
// resolves to rgb integers. Both forms are valid for use in rgb(var(--x) / <alpha-value>).
function isRgbOrVarReference(value: string): boolean {
  return isRgbSpaceSeparated(value) || isVarReference(value);
}

// Helper: check that no standalone hex color values remain in a block
// WHY: hex values are incompatible with rgb(var(--x) / <alpha-value>) Tailwind syntax.
// Note: rgba() references in shadow values are intentionally allowed (they are not
// CSS variable values, they are used in multi-part shadow definitions).
function hasNoHexValues(block: string): boolean {
  // Extract only variable definition lines (--varname: value;) and check those for hex
  const varLines = block.match(/--[a-z][^;]+;/g) ?? [];
  return !varLines.some(line => /#[0-9a-fA-F]{3,8}/.test(line));
}

describe('tokens.css :root block', () => {
  it('contains --bg variable in rgb space-separated form', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--bg\s*:\s*([^;]+);/);
    expect(match, '--bg variable must exist in :root').toBeTruthy();
    expect(isRgbSpaceSeparated(match![1])).toBe(true);
  });

  it('contains --bg1 variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--bg1\s*:\s*([^;]+);/);
    expect(match, '--bg1 variable must exist in :root').toBeTruthy();
    // --bg1 is a semantic alias; may be rgb integer or var(--bg) reference
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --bg2 variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--bg2\s*:\s*([^;]+);/);
    expect(match, '--bg2 variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --bg3 variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--bg3\s*:\s*([^;]+);/);
    expect(match, '--bg3 variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --fg1 variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--fg1\s*:\s*([^;]+);/);
    expect(match, '--fg1 variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --fg2 variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--fg2\s*:\s*([^;]+);/);
    expect(match, '--fg2 variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --accent variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--accent\s*:\s*([^;]+);/);
    expect(match, '--accent variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --accent-hover variable as rgb or var() reference', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--accent-hover\s*:\s*([^;]+);/);
    expect(match, '--accent-hover variable must exist in :root').toBeTruthy();
    expect(isRgbOrVarReference(match![1])).toBe(true);
  });

  it('contains --border variable in rgb space-separated form', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--border\s*:\s*([^;]+);/);
    expect(match, '--border variable must exist in :root').toBeTruthy();
    expect(isRgbSpaceSeparated(match![1])).toBe(true);
  });

  it('contains --error variable in rgb space-separated form', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--error\s*:\s*([^;]+);/);
    expect(match, '--error variable must exist in :root').toBeTruthy();
    expect(isRgbSpaceSeparated(match![1])).toBe(true);
  });

  it('contains --success variable in rgb space-separated form', () => {
    const root = extractRootBlock(tokensContent);
    const match = root.match(/--success\s*:\s*([^;]+);/);
    expect(match, '--success variable must exist in :root').toBeTruthy();
    expect(isRgbSpaceSeparated(match![1])).toBe(true);
  });

  it('has no raw hex values in :root block', () => {
    const root = extractRootBlock(tokensContent);
    expect(hasNoHexValues(root)).toBe(true);
  });

  it('contains spacing variables sp-1 through sp-4', () => {
    const root = extractRootBlock(tokensContent);
    expect(root).toContain('--sp-1');
    expect(root).toContain('--sp-2');
    expect(root).toContain('--sp-3');
    expect(root).toContain('--sp-4');
  });

  it('contains font size variables', () => {
    const root = extractRootBlock(tokensContent);
    expect(root).toContain('--fs-xs');
    expect(root).toContain('--fs-sm');
    expect(root).toContain('--fs-body');
    expect(root).toContain('--fs-base');
    expect(root).toContain('--fs-h1');
  });

  it('contains border radius variables', () => {
    const root = extractRootBlock(tokensContent);
    expect(root).toContain('--radius-card');
    expect(root).toContain('--radius-ctrl');
    expect(root).toContain('--radius-pill');
  });
});

describe('tokens.css theme blocks', () => {
  it('has [data-theme="dusk"] block', () => {
    expect(tokensContent).toMatch(/\[data-theme="dusk"\]\s*\{/);
  });

  it('[data-theme="dusk"] block overrides color variables with rgb values', () => {
    const dusk = extractThemeBlock(tokensContent, 'dusk');
    expect(dusk, 'dusk theme block must not be empty').toBeTruthy();
    // dusk should have at least some variable overrides
    expect(dusk).toContain('--');
    // no hex values in dusk block
    expect(hasNoHexValues(dusk)).toBe(true);
  });

  it('[data-theme="dusk"] block overrides --bg1 or color primitives', () => {
    const dusk = extractThemeBlock(tokensContent, 'dusk');
    // dusk theme should override some color variable
    const hasColorVar = /--(?:bg|bg1|bg2|bg3|fg1|fg2|accent|border|primary)/.test(dusk);
    expect(hasColorVar).toBe(true);
  });

  it('has [data-theme="night"] block', () => {
    expect(tokensContent).toMatch(/\[data-theme="night"\]\s*\{/);
  });

  it('[data-theme="night"] block overrides color variables with rgb values', () => {
    const night = extractThemeBlock(tokensContent, 'night');
    expect(night, 'night theme block must not be empty').toBeTruthy();
    // night should have at least some variable overrides
    expect(night).toContain('--');
    // no hex values in night block
    expect(hasNoHexValues(night)).toBe(true);
  });

  it('[data-theme="night"] block overrides --bg1 or color primitives', () => {
    const night = extractThemeBlock(tokensContent, 'night');
    // night theme should override some color variable
    const hasColorVar = /--(?:bg|bg1|bg2|bg3|fg1|fg2|accent|border|primary)/.test(night);
    expect(hasColorVar).toBe(true);
  });
});

describe('tailwind-config variable expose', () => {
  it('tailwind.config.ts exists at ui root', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    let content: string;
    try {
      content = readFileSync(configPath, 'utf-8');
    } catch {
      throw new Error('tailwind.config.ts not found');
    }
    expect(content).toBeTruthy();
  });

  it('tailwind.config.ts exposes bg1 as rgb(var(--bg1) / <alpha-value>)', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('rgb(var(--bg1) / <alpha-value>)');
  });

  it('tailwind.config.ts exposes fg1 with alpha-value syntax', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('rgb(var(--fg1) / <alpha-value>)');
  });

  it('tailwind.config.ts exposes accent with alpha-value syntax', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('rgb(var(--accent) / <alpha-value>)');
  });

  it('tailwind.config.ts exposes spacing variables', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('sp-1');
    expect(content).toContain('var(--sp-1)');
  });

  it('tailwind.config.ts exposes border radius variables', () => {
    const configPath = resolve(__dirname, '../tailwind.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('var(--radius-card)');
  });
});

// ============================================================
// M0.11.4-t3: RPG 3 theme palette assertions
// WHY: Phase B/C views rely on --p-* CSS variables for Room rendering.
// These tests ensure all palette vars are present in tokens.css.
// ============================================================

describe('tokens.css RPG palette — default (cozy noon)', () => {
  it('contains --p-bg-sky in file', () => {
    expect(tokensContent).toContain('--p-bg-sky');
  });
  it('contains --p-bg-floor in file', () => {
    expect(tokensContent).toContain('--p-bg-floor');
  });
  it('contains --p-wall in file', () => {
    expect(tokensContent).toContain('--p-wall');
  });
  it('contains --p-rug in file', () => {
    expect(tokensContent).toContain('--p-rug');
  });
  it('contains --p-cat-base in file', () => {
    expect(tokensContent).toContain('--p-cat-base');
  });
  it('contains --p-cat-line in file', () => {
    expect(tokensContent).toContain('--p-cat-line');
  });
  it('contains --p-screen in file', () => {
    expect(tokensContent).toContain('--p-screen');
  });
  it('contains --p-accent in file', () => {
    expect(tokensContent).toContain('--p-accent');
  });
  it('contains --p-success in file', () => {
    expect(tokensContent).toContain('--p-success');
  });
  it('contains --p-error in file', () => {
    expect(tokensContent).toContain('--p-error');
  });
  it('contains --p-warn in file', () => {
    expect(tokensContent).toContain('--p-warn');
  });
  it('contains --p-text in file', () => {
    expect(tokensContent).toContain('--p-text');
  });
  it('contains --p-paper in file', () => {
    expect(tokensContent).toContain('--p-paper');
  });
  it('contains --p-shadow in file', () => {
    expect(tokensContent).toContain('--p-shadow');
  });
});

describe('tokens.css RPG palette — .theme-dusk', () => {
  it('has .theme-dusk class block', () => {
    expect(tokensContent).toMatch(/\.theme-dusk\s*\{/);
  });
  it('.theme-dusk overrides --p-bg-sky', () => {
    expect(tokensContent).toMatch(/\.theme-dusk[\s\S]*?--p-bg-sky/);
  });
  it('.theme-dusk overrides --p-accent', () => {
    expect(tokensContent).toMatch(/\.theme-dusk[\s\S]*?--p-accent/);
  });
  it('.theme-dusk overrides --p-rug', () => {
    expect(tokensContent).toMatch(/\.theme-dusk[\s\S]*?--p-rug/);
  });
});

describe('tokens.css RPG palette — .theme-night', () => {
  it('has .theme-night class block', () => {
    expect(tokensContent).toMatch(/\.theme-night\s*\{/);
  });
  it('.theme-night overrides --p-bg-sky', () => {
    expect(tokensContent).toMatch(/\.theme-night[\s\S]*?--p-bg-sky/);
  });
  it('.theme-night overrides --p-accent', () => {
    expect(tokensContent).toMatch(/\.theme-night[\s\S]*?--p-accent/);
  });
  it('.theme-night overrides --p-paper', () => {
    expect(tokensContent).toMatch(/\.theme-night[\s\S]*?--p-paper/);
  });
});

// ============================================================
// M0.11.4-t3: RPG primitive CSS class assertions
// WHY: Phase B Room view components reference these classes for pixel RPG chrome.
// ============================================================

describe('tokens.css RPG window chrome primitives', () => {
  it('contains .rpg-frame class', () => {
    expect(tokensContent).toMatch(/\.rpg-frame\s*\{/);
  });
  it('contains .rpg-frame-tight class', () => {
    expect(tokensContent).toMatch(/\.rpg-frame-tight\s*\{/);
  });
  it('contains .rpg-title class', () => {
    expect(tokensContent).toMatch(/\.rpg-title\s*\{/);
  });
  it('contains .rpg-label class', () => {
    expect(tokensContent).toMatch(/\.rpg-label\s*\{/);
  });
  it('contains .dot class with status variants', () => {
    expect(tokensContent).toMatch(/\.dot\s*\{/);
    expect(tokensContent).toContain('.dot.busy');
    expect(tokensContent).toContain('.dot.idle');
    expect(tokensContent).toContain('.dot.review');
    expect(tokensContent).toContain('.dot.fail');
    expect(tokensContent).toContain('.dot.tdd');
  });
  it('contains .chip class', () => {
    expect(tokensContent).toMatch(/\.chip\s*\{/);
  });
  it('contains .exp-bar class', () => {
    expect(tokensContent).toMatch(/\.exp-bar\s*\{/);
  });
  it('contains .btn-px class with color variants', () => {
    expect(tokensContent).toMatch(/\.btn-px\s*\{/);
    expect(tokensContent).toContain('.btn-px.primary');
    expect(tokensContent).toContain('.btn-px.success');
    expect(tokensContent).toContain('.btn-px.warn');
    expect(tokensContent).toContain('.btn-px.danger');
    expect(tokensContent).toContain('.btn-px.ghost');
  });
  it('contains .scanlines::after class', () => {
    expect(tokensContent).toContain('.scanlines::after');
  });
  it('contains .pixel class', () => {
    expect(tokensContent).toMatch(/\.pixel\s*\{/);
  });
});

describe('tokens.css Room BEM primitives', () => {
  it('contains .room class', () => {
    expect(tokensContent).toMatch(/\.room\s*\{/);
  });
  it('contains .room__bg class', () => {
    expect(tokensContent).toContain('.room__bg');
  });
  it('contains .room-window class', () => {
    expect(tokensContent).toMatch(/\.room-window\s*\{/);
  });
  it('contains .room-sign class with variants', () => {
    expect(tokensContent).toMatch(/\.room-sign\s*\{/);
    expect(tokensContent).toContain('.room-sign--branch');
    expect(tokensContent).toContain('.room-sign--clock');
    expect(tokensContent).toContain('.room-sign--retro');
  });
  it('contains .room-poster class', () => {
    expect(tokensContent).toMatch(/\.room-poster\s*\{/);
  });
  it('contains .room-poster BEM elements', () => {
    expect(tokensContent).toContain('.room-poster__header');
    expect(tokensContent).toContain('.room-poster__title');
    expect(tokensContent).toContain('.room-poster__body');
    expect(tokensContent).toContain('.room-poster__bar');
    expect(tokensContent).toContain('.room-poster__bar-fill');
    expect(tokensContent).toContain('.room-poster__bar-now');
    expect(tokensContent).toContain('.room-poster__check');
    expect(tokensContent).toContain('.room-poster__footer');
  });
  it('contains .room-poster check variants', () => {
    expect(tokensContent).toContain('.room-poster__check--pending');
    expect(tokensContent).toContain('.room-poster__check--in_progress');
    expect(tokensContent).toContain('.room-poster__check--completed');
  });
  // WHY: .room-island* rules deleted (M0.17 t4) — zones now rendered as SVG rects in RoomBackground.
  // Zone tint tokens now tested separately (see room-background.test.tsx).
  it('contains .room-floor-cushion class', () => {
    expect(tokensContent).toMatch(/\.room-floor-cushion\s*\{/);
  });
  it('contains .room-mode-toggle class', () => {
    expect(tokensContent).toMatch(/\.room-mode-toggle\s*\{/);
  });
  it('contains .room-modal class', () => {
    expect(tokensContent).toMatch(/\.room-modal\s*\{/);
    expect(tokensContent).toContain('.room-modal__panel');
    expect(tokensContent).toContain('.room-modal__close');
  });
});

describe('tokens.css Subroom primitives', () => {
  it('contains .subroom-clone class', () => {
    expect(tokensContent).toMatch(/\.subroom-clone\s*\{/);
  });
  it('contains .subroom-clone BEM elements', () => {
    expect(tokensContent).toContain('.subroom-clone__sprite');
    expect(tokensContent).toContain('.subroom-clone__label');
    expect(tokensContent).toContain('.subroom-clone__dot');
  });
  it('contains .subroom-clone__dot status variants', () => {
    expect(tokensContent).toContain('.subroom-clone__dot--busy');
    expect(tokensContent).toContain('.subroom-clone__dot--review');
    expect(tokensContent).toContain('.subroom-clone__dot--idle');
  });
  it('contains .subroom-portal class', () => {
    expect(tokensContent).toMatch(/\.subroom-portal\s*\{/);
    expect(tokensContent).toContain('.subroom-portal__label');
  });
});
