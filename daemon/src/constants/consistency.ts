/**
 * SSoT enum constants for doc-consistency tables (SPEC §7.3)
 * WHY: §3.6.10 — string literal SSoT. All code referencing
 * spec_changes.status / consistency_findings.status / severity / finding_type
 * MUST import from this file — never use raw string literals.
 *
 * Primary SSoT file: daemon/src/constants/consistency.ts
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// spec_changes.status
// ---------------------------------------------------------------------------
export const SPEC_CHANGE_STATUS = {
  PENDING: "pending",
  ANALYZED: "analyzed",
  DISMISSED: "dismissed",
} as const;

export type SpecChangeStatus =
  (typeof SPEC_CHANGE_STATUS)[keyof typeof SPEC_CHANGE_STATUS];

export const SpecChangeStatusSchema = z.enum([
  SPEC_CHANGE_STATUS.PENDING,
  SPEC_CHANGE_STATUS.ANALYZED,
  SPEC_CHANGE_STATUS.DISMISSED,
]);

// ---------------------------------------------------------------------------
// consistency_findings.status
// ---------------------------------------------------------------------------
export const FINDING_STATUS = {
  OPEN: "open",
  ACKNOWLEDGED: "acknowledged",
  FIXED: "fixed",
  DISMISSED: "dismissed",
} as const;

export type FindingStatus =
  (typeof FINDING_STATUS)[keyof typeof FINDING_STATUS];

export const FindingStatusSchema = z.enum([
  FINDING_STATUS.OPEN,
  FINDING_STATUS.ACKNOWLEDGED,
  FINDING_STATUS.FIXED,
  FINDING_STATUS.DISMISSED,
]);

// ---------------------------------------------------------------------------
// consistency_findings.severity
// ---------------------------------------------------------------------------
export const FINDING_SEVERITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type FindingSeverity =
  (typeof FINDING_SEVERITY)[keyof typeof FINDING_SEVERITY];

export const FindingSeveritySchema = z.enum([
  FINDING_SEVERITY.HIGH,
  FINDING_SEVERITY.MEDIUM,
  FINDING_SEVERITY.LOW,
]);

// ---------------------------------------------------------------------------
// consistency_findings.finding_type
// ---------------------------------------------------------------------------
export const FINDING_TYPE = {
  TERM_REMOVED: "term_removed",
  TERM_RENAMED: "term_renamed",
  SECTION_CHANGED: "section_changed",
  SEMANTIC_DRIFT: "semantic_drift",
  TERM_MENTION: "term_mention",
} as const;

export type FindingType =
  (typeof FINDING_TYPE)[keyof typeof FINDING_TYPE];

export const FindingTypeSchema = z.enum([
  FINDING_TYPE.TERM_REMOVED,
  FINDING_TYPE.TERM_RENAMED,
  FINDING_TYPE.SECTION_CHANGED,
  FINDING_TYPE.SEMANTIC_DRIFT,
  FINDING_TYPE.TERM_MENTION,
]);
