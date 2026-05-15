# screens/ — Per-screen CSS pattern guide

M0.17 Round 2 Phase B establishes this pattern. Each screen view gets its own
`<screen>.css` file here. `index.css` aggregates them all with `@import`.

## Naming convention

- File: `<screen>.css` matching the view directory name (e.g. `plan.css` for `views/plan/`)
- Class prefix: `.<screen>-` for all classes in that file (screen-scoped namespace)
- BEM-like: `.<screen>-<block>__<element>--<modifier>`
- Examples: `.plan-screen`, `.plan-header__title`, `.plan-tab--active`

Collision avoidance: the `.<screen>-` prefix prevents any conflict with
`shell.css`, `room.css`, or `tokens.css` classes. Never use generic names like
`.header` or `.container` — always prefix.

## Token reuse rule

Consume existing tokens first:

```css
/* Good — reuse global RPG palette tokens */
.gantt-screen {
  background: var(--p-bg-sky);
  border: 2px solid var(--p-border);
  color: var(--p-text);
}
```

Add screen-local tokens only when no global token fits:

```css
/* OK — screen-local token defined in the same file */
:root {
  --gantt-bar-height: 14px;
  --gantt-row-gap:    4px;
}
```

Tokens available in `tokens.css`:
- `--p-bg-sky`, `--p-bg-floor`, `--p-wall` — background surfaces
- `--p-paper`, `--p-tint` — card / secondary fill
- `--p-border`, `--p-shadow` — borders and pixel-shadow
- `--p-text`, `--p-text-muted` — typography
- `--p-accent`, `--p-accent-soft` — primary brand color
- `--p-success`, `--p-warn`, `--p-error` — status colors
- `--p-stone` — neutral/idle
- `--bubble-bg`, `--bubble-border`, `--bubble-shadow` — speech bubble
- `--desk-width`, `--desk-monitor-w` etc. — room layout
- `--z-*` — z-index scale

## Dynamic inline style — what stays inline

Only values that are computed at runtime may remain as `style={{...}}` in TSX.
Everything else must be a CSS class.

Allowed inline (runtime-computed only):

```tsx
// Progress bar width — depends on m.progress float
<div className="plan-milestone__progress-fill" style={{ width: `${m.progress * 100}%` }} />

// Status color — depends on enum lookup at render time
<span className="plan-child__glyph" style={{ color: STATUS_COLOR_VAR[c.st] }} />

// Animated position — depends on canvas measurement
<div className="agent-sprite" style={{ transform: `translate(${x}px, ${y}px)` }} />
```

Not allowed inline (fixed values must become CSS classes):

```tsx
// BAD — fixed pixel size
<div style={{ padding: 16 }} />

// GOOD — class
<div className="plan-screen" />  // plan.css: padding: 16px

// BAD — token reference that never changes
<div style={{ background: 'var(--p-paper)' }} />

// GOOD — class
<div className="plan-milestone" />  // plan.css: background: var(--p-paper)
```

## Adding a new screen (follow-up devs)

1. Create `ui/src/styles/screens/<screen>.css`
2. Add `@import './<screen>.css';` to `screens/index.css` (alphabetical order)
3. In the view TSX, replace `style={{...}}` with `className="<screen>-..."` for fixed values
4. Keep inline only for runtime-computed values (see above)
5. No changes needed to `ui/src/styles/index.css` — it imports `screens/index.css` once

## Existing screen CSS files

| File | Covers | Status |
|------|--------|--------|
| `plan.css` | `views/plan/PlanView.tsx` | M0.17 Phase B template |

Screens pending (dev-9 scope): gantt, consistency, customization, retro,
sessions, project-settings, tokens, worktree, guidance, agent-detail,
pm-approval.
