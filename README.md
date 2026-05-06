# claude-loom

> Read this in: **English** | [日本語](README.ja.md)

**A central command room plugin for Claude Code** — drop in a full agile dev team (PM, Developer, Reviewers) backed by a real-time GUI that lets you actually watch them work.

![status: Phase 1 MVP complete](https://img.shields.io/badge/status-Phase%201%20MVP-brightgreen) ![license: MIT](https://img.shields.io/badge/license-MIT-blue) ![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-orange)

---

## What is claude-loom?

claude-loom is a Claude Code plugin built on **two pillars**:

1. **Agent harness** — a pre-wired agile team (PM / Developer / Code · Security · Test Reviewers) with TDD discipline, retrospective protocol, and document-consistency watching baked in.
2. **Visualization GUI** — a pixel-RPG-style "command room" that shows what every agent is doing right now, with a Plan view, Gantt chart, session list, and per-agent detail panel.

Together they turn Claude Code from a single-window chat into a **multi-agent dev studio you can actually see**.

## How does it change your dev experience?

| Vanilla Claude Code | With claude-loom |
|---|---|
| One agent, one terminal | A full agile team running in parallel as subagents |
| You hand-roll workflow each project | `spec → plan → TDD → review → retro` is standard |
| Multi-agent activity is invisible (read terminal logs) | Real-time GUI shows each agent as a sprite in a room |
| `PLAN.md` and code drift apart silently | Bi-directional sync between PLAN view and the file |
| You forget to update README/SPEC after changes | The PM agent flags doc-consistency violations automatically |
| Manual context switch between projects | Multi-project central command room |

## Features

- **13 specialized subagents** — PM, Developer, single-mode Reviewer (default), Code/Security/Test reviewer trio (opt-in), 4 retro lens judges + counter-arguer + aggregator + retro PM
- **9 skills** — `loom-tdd-cycle`, `loom-review`, `loom-review-trio`, `loom-retro`, `loom-test`, `loom-status`, `loom-worktree`, `loom-write-plan`, `loom-debug`
- **9 slash commands** — `/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, `/loom-mode`, `/loom-stop`, `/loom`
- **Real-time GUI** — pixel-RPG room view, Plan + Gantt with bi-directional file sync, Session list, Agent Detail (React + Phaser/SVG)
- **Local daemon** — Node.js + Fastify + tRPC + Drizzle + SQLite, binds to `127.0.0.1` only, auto-shuts after 30 min idle
- **Retro protocol** — 4-lens × 3-stage (parallel critique → counter-argument → aggregation) for echo-chamber-resistant self-improvement
- **Customization layer** — per-agent model + personality preset (4 included: `default`, `friendly-mentor`, `strict-drill`, `detective`)
- **Coexistence mode** — `full` / `coexist` / `custom` for staged adoption into existing projects
- **Worktree integration** — parallel dev / safe experiments / hotfix isolation in isolated git worktrees

## Requirements

- [Claude Code](https://claude.com/claude-code) (latest)
- Node.js LTS (20 or 22 recommended)
- pnpm

## Installation

```bash
git clone https://github.com/yutron24ah/claude-loom.git
cd claude-loom
./install.sh
pnpm install
```

`install.sh` symlinks agents, slash commands, and skills under `~/.claude/` and wires the loom hooks into `~/.claude/settings.json`. `pnpm install` brings in daemon + UI dependencies.

If your Claude Code config lives somewhere non-standard:

```bash
CLAUDE_HOME=/path/to/your/claude-config ./install.sh
```

## Quick start

In any project directory, launch Claude Code and run:

```
/loom-pm       # enter PM mode (this session becomes the PM)
/loom-spec     # spec phase — reads SPEC.md, confirms task with you
/loom-go       # implementation phase — PM dispatches developers
/loom-retro    # retrospective after a milestone (4-lens / 3-stage protocol)
/loom-status   # snapshot of harness + repo state
```

Full slash command reference is in [CLAUDE.md](CLAUDE.md).

## Launching the GUI

Running any trigger slash command — `/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, or `/loom-mode` — **automatically starts the daemon on cold-start and opens the central command room** in your browser at `http://127.0.0.1:5757`. If the daemon is already running (warm-start), the browser is not opened again.

### Opt-out

| scope | method |
|---|---|
| session | set `LOOM_NO_UI=1` environment variable |
| project (persistent) | set `ui.auto_launch: false` in `<project>/.claude-loom/project-prefs.json` |
| headless auto-detect | SSH / no DISPLAY / no browser command → browser open skipped, URL printed to terminal |

### `/loom` (URL helper)

Running `/loom` prints the daemon URL and copies it to the clipboard (cross-platform). Use it when you want to open another tab or share the URL.

### Development workflow

claude-loom runs in two modes, controlled by the `LOOM_DEV_MODE` environment variable:

| | **prod mode** (default) | **dev mode** |
|---|---|---|
| Trigger | SessionStart hook auto-launch | `pnpm --filter @claude-loom/daemon dev` |
| Access URL | `http://127.0.0.1:5757` | API: `http://127.0.0.1:5757`, UI: `http://127.0.0.1:5173` |
| Static serving | daemon serves `ui/dist` | skipped — Vite provides hot-reload UI |
| Use case | end-user consumption | UI development with HMR |

For hot-reload during UI development:

```bash
pnpm --filter @claude-loom/daemon dev   # daemon (API only): http://127.0.0.1:5757
pnpm --filter @claude-loom/ui dev       # UI (Vite + HMR):   http://127.0.0.1:5173
```

The `pnpm dev` script auto-injects `LOOM_DEV_MODE=1` and runs a pre-flight check to guard against accidentally starting a dev daemon when a prod daemon is already running. Check `GET /mode` for the current mode at runtime. See [SPEC.md §3.2.2](SPEC.md) for full role-separation details.

## Customization

Tune each agent's model and personality via prefs files:

```
~/.claude-loom/user-prefs.json              # cross-project defaults
<project>/.claude-loom/project-prefs.json   # project-specific overrides
```

```json
{
  "agents": {
    "loom-pm":        { "model": "opus",   "personality": "detective" },
    "loom-developer": { "model": "sonnet", "personality": "friendly-mentor" }
  }
}
```

Coding principles, TDD discipline, and SPEC consistency are **invariant** — only delivery style is tunable. See [SPEC.md](SPEC.md) §3.6.5 / §6.9.4.

## Coexistence with existing projects

Three modes let you adopt claude-loom incrementally:

| mode | enabled features | use case |
|---|---|---|
| `full` (default) | all | greenfield / claude-loom is the main harness |
| `coexist` | core only | minimal install on top of an existing setup |
| `custom` | user-specified | fine-grained per-feature toggle |

Switch with `/loom-mode <mode>` after install.

## Uninstall

```bash
./uninstall.sh        # confirms before removing
./uninstall.sh --yes  # skip confirmation
./uninstall.sh --yes --purge-state   # also remove .claude-loom/ local state
```

By default `.claude-loom/` (retro learned guidance, personality prefs) is preserved so re-installs keep your settings.

## Architecture

```
Claude Code session  →  bash hooks  →  daemon (tRPC + SQLite)  →  React + Phaser UI
        (Layer 1)         (Layer 2)            (Layer 3)               (Layer 4)
```

Daemon binds to `127.0.0.1` only, auth via nanoid token in `~/.claude-loom/daemon-token` (chmod 600). Full architecture in [SPEC.md](SPEC.md) §3.

## Documentation

- **[SPEC.md](SPEC.md)** — product specification (Single Source of Truth)
- **[PLAN.md](PLAN.md)** — milestone roadmap
- **[CLAUDE.md](CLAUDE.md)** — agent working guide (read by Claude Code itself)
- **[docs/SCREEN_REQUIREMENTS.md](docs/SCREEN_REQUIREMENTS.md)** — UI requirements
- **[docs/COMMIT_GUIDE.md](docs/COMMIT_GUIDE.md)** — commit & branch conventions

## Status

Phase 1 MVP complete (functional + verification + aesthetic) + **Ceremony Reduction Trinity** (M0.11.5 lazy daemon auto-launch + M0.11.6 PM auto-spec entry + M0.11.7 PM auto-go entry) closure 達成。design principle「context から intent 読めるなら ceremony 強制せえ」を SPEC §3.6.13 に SSoT 化。

Phase 2 entry 前に [Phase 2 Entry Checklist](PLAN.md#phase-2-entry-checklist-formal-codifyretro-2026-05-06-002-f-pj-002-由来-ssot) (HARD blocker 3 項目 + Soft blocker 3 項目) で reconciliation。Phase 2 詳細 — see [PLAN.md](PLAN.md)。

## License

[MIT](LICENSE) © 2026 Koki Mogi
