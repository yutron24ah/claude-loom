import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration for claude-loom UI.
 * WHY: tokens.css CSS variables are exposed here as named Tailwind utilities
 * so we can write `bg-bg1 text-fg1 p-sp-4 rounded-card` etc.
 * Colors use the `rgb(var(--x) / <alpha-value>)` pattern to support opacity modifiers
 * like `bg-bg1/80` for semi-transparent overlays (AppShell panel overlay pattern).
 * Theme switching (pop / dusk / night) is handled by [data-theme="..."] attribute
 * on <html>, which overrides the CSS variables — Tailwind utilities pick up the
 * overridden values automatically without needing separate dark: variants.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- semantic color aliases (primary usage) ----
        bg: 'rgb(var(--bg) / <alpha-value>)',
        bg1: 'rgb(var(--bg1) / <alpha-value>)',
        bg2: 'rgb(var(--bg2) / <alpha-value>)',
        bg3: 'rgb(var(--bg3) / <alpha-value>)',
        fg1: 'rgb(var(--fg1) / <alpha-value>)',
        fg2: 'rgb(var(--fg2) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        // ---- primitives (available for explicit use) ----
        surface: 'rgb(var(--surface) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
      },
      spacing: {
        // --sp-1 through --sp-10, usage: p-sp-1, m-sp-4, gap-sp-2, etc.
        'sp-1': 'var(--sp-1)',
        'sp-2': 'var(--sp-2)',
        'sp-3': 'var(--sp-3)',
        'sp-4': 'var(--sp-4)',
        'sp-5': 'var(--sp-5)',
        'sp-6': 'var(--sp-6)',
        'sp-7': 'var(--sp-7)',
        'sp-8': 'var(--sp-8)',
        'sp-9': 'var(--sp-9)',
        'sp-10': 'var(--sp-10)',
      },
      fontSize: {
        // usage: text-fs-xs, text-fs-body, etc.
        'fs-xs': 'var(--fs-xs)',
        'fs-sm': 'var(--fs-sm)',
        'fs-body': 'var(--fs-body)',
        'fs-md': 'var(--fs-md)',
        'fs-base': 'var(--fs-base)',
        'fs-h1': 'var(--fs-h1)',
      },
      borderRadius: {
        // usage: rounded-card, rounded-ctrl, rounded-pill
        card: 'var(--radius-card)',
        ctrl: 'var(--radius-ctrl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        // usage: shadow-token
        token: 'var(--shadow)',
      },
      fontFamily: {
        // usage: font-sans
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
};

export default config;
