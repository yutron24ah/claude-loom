---
description: Start the spec phase of the claude-loom workflow. Requires PM mode (run /loom-pm first if not already in PM mode).
---

You are entering the **spec phase** of the claude-loom workflow.

Prerequisites:
- You must already be in PM mode (loaded via `/loom-pm`). If not, ask the user to run `/loom-pm` first.

Spec phase actions (per the PM agent's "Spec phase" workflow):

1. Read existing `SPEC.md` if present. Summarize current state to the user in 3 sentences.
2. Ask the user: "What change / addition do you want to make to the spec?"
3. Ask clarifying questions ONE AT A TIME until you understand:
   - The goal (what business / technical outcome)
   - Constraints (deadlines, dependencies, must-not-break)
   - Success criteria (how do we know it works)
4. If proposing a new approach, give 2-3 options with tradeoffs. Recommend one.
5. Once user agrees, draft the SPEC update.
6. Run the doc consistency manual checklist (`docs/DOC_CONSISTENCY_CHECKLIST.md`).
7. Estimate developer headcount needed for implementation. Propose to user.
8. Update `PLAN.md` with new tasks for the next milestone.

Stay in this spec phase until the user signals they want to switch to implementation (`/loom-go`).
