# Smoke Test Report — 2026-05-05-full

## Summary

| Field | Value |
|---|---|
| Smoke ID | 2026-05-05-full |
| Scope | full |
| Started | 2026-05-05 02:25:02 |
| Completed | 2026-05-05 02:30:02 |

## Stats

| Metric | Count |
|---|---|
| Routes Tested | 11 |
| Routes Passed | 11 |
| Routes Failed | 0 |
| Console Errors | 1 |
| Console Warnings | 22 |

## Findings

### INFO

#### F-001: /

- **Category**: rendering
- **Description**: favicon.ico returns 404 — no favicon file present in ui/public/. Not a functional failure, cosmetic only.
- **Expected**: favicon.ico loads with HTTP 200
- **Actual**: 404 Not Found @ http://localhost:5173/favicon.ico
- **Recommended action**: Add a favicon.ico to ui/public/ in a follow-up polish task (low priority)

#### F-002: /*

- **Category**: console-error
- **Description**: React Router v7 future flag warnings emitted on every navigation (v7_startTransition and v7_relativeSplatPath). These are upgrade-readiness hints, not functional errors. Appear on all 11 routes.
- **Expected**: No React Router deprecation warnings
- **Actual**: 2 React Router future flag warnings per navigation (22 total across 11 routes)
- **Recommended action**: Add v7_startTransition and v7_relativeSplatPath future flags to BrowserRouter config as a cleanup task

## Output Links

- Strategy: [strategy.md](strategy.md)
- Screenshots: [screenshots/](screenshots/)
- Console log: [console.log](console.log)
- Findings (machine-readable): [findings.json](findings.json)

## Recommended Next Action

loom-developer dispatch recommended (via PM) to address 0 failed route(s) and 2 finding(s).
Alternatively, add as retro carryover findings.
