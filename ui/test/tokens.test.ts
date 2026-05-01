/**
 * tokens.css migration test (Task 4, m2-t2)
 * WHY: verify tokens.css is properly migrated from prototype with:
 *   1. hex values converted to rgb space-separated integers (for <alpha-value> Tailwind syntax)
 *   2. [data-theme="dusk"] and [data-theme="night"] theme override blocks present
 *   3. all expected CSS variables present in :root
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
