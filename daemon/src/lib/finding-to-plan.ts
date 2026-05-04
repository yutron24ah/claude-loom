/**
 * finding-to-plan.ts — Pure function converting a ConsistencyFinding to a NewPlanItem.
 *
 * WHY: SPEC §7.5 Step 6 — When the user acknowledges a consistency finding,
 * the finding is promoted to a long-term plan_items entry so it is tracked
 * alongside normal planning work. This pure function handles the shape
 * conversion, making it independently testable and reusable.
 *
 * §3.6.10: All string literals (title prefix, source value) come from
 * constants/consistency.ts SSoT — no inline string literals here.
 *
 * Pure function contract: no side effects, no DB access. Callers
 * (acknowledgeAndCreatePlanItem mutation) handle persistence.
 */
import type { ConsistencyFinding, NewPlanItem } from "../db/schema.js";
import {
  FINDING_TO_PLAN_TITLE_PREFIX,
  PLAN_ITEM_SOURCE,
} from "../constants/consistency.js";

// Maximum characters of finding.description included in the plan_item title.
// WHY: UI display width constraint — prevents title overflow in plan view.
const TITLE_DESCRIPTION_MAX_LEN = 80;

/**
 * Convert a ConsistencyFinding into a NewPlanItem shape (no id field).
 *
 * Title format: `[整合性] <targetPath>: <description.slice(0,80)>`
 * Body format:  structured summary with severity / findingType / description / suggestedChange.
 * status:       'todo'
 * source:       PLAN_ITEM_SOURCE.CONSISTENCY
 * parentId:     null (root-level plan item)
 * position:     0 (caller may override after insertion if needed)
 * sourcePath:   finding.targetPath (the affected doc file)
 *
 * WHY projectId as explicit param: findings are not directly project-scoped
 * (they link via specChangeId). The caller must supply the projectId for the
 * plan_items row — making it explicit in the signature prevents the empty-string
 * anti-pattern and ensures the function signature communicates its requirements.
 *
 * @param finding   - The consistency finding to promote to a plan item.
 * @param projectId - Target project_id for the resulting plan_items row.
 * @returns A NewPlanItem shape ready for DB insertion.
 */
export function findingToPlanItem(
  finding: ConsistencyFinding,
  projectId: string,
): NewPlanItem {
  const truncatedDescription = finding.description.slice(0, TITLE_DESCRIPTION_MAX_LEN);

  const title =
    `${FINDING_TO_PLAN_TITLE_PREFIX} ${finding.targetPath}: ${truncatedDescription}`;

  const suggestedChangeSection = finding.suggestedChange
    ? `\n\n**提案された修正:**\n${finding.suggestedChange}`
    : "";

  const body =
    `**severity:** ${finding.severity}\n` +
    `**type:** ${finding.findingType}\n\n` +
    `**説明:**\n${finding.description}` +
    suggestedChangeSection;

  return {
    projectId,
    source: PLAN_ITEM_SOURCE.CONSISTENCY,
    sourcePath: finding.targetPath,
    parentId: null,
    title,
    body,
    status: "todo",
    position: 0,
    updatedAt: new Date(),
  };
}
