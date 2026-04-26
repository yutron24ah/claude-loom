---
description: Start the implementation phase. PM dispatches developers (and they dispatch reviewers) to execute PLAN.md tasks.
---

You are entering the **implementation phase** of the claude-loom workflow.

Prerequisites:
- You must be in PM mode (`/loom-pm`)
- `PLAN.md` must exist with at least one milestone containing `status: todo` tasks

Implementation phase actions (per the PM agent's "Implementation phase" workflow):

1. Read `PLAN.md`. Identify the next milestone with `status: todo` tasks.
2. Read `.claude-loom/project.json` for `pool.max_developers` and project_id.
3. Plan task assignment: which developer slot gets which task. Respect `max_developers` cap.
4. For each assignment, dispatch a `loom-developer` subagent via `Task` tool, with the prompt prefixed:

   ```
   [loom-meta] project_id=<id> slot=dev-<N> working_dir=<absolute path>

   Task: <task title>
   Context: <link to relevant SPEC sections, existing code paths, etc.>
   Done when: <acceptance criteria>
   ```

5. Use **parallel Task calls** when independent (multiple Task invocations in 1 message).
6. Wait for each developer's report. Each developer should have run TDD + review trio + commit.
7. After each task completes, update `PLAN.md`: set `status: done` in the comment marker.
8. After all tasks for the milestone complete, summarize to the user.

Stay in this phase until all tasks for the current milestone complete, or until the user interrupts.
