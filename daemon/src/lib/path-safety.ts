/**
 * daemon/src/lib/path-safety.ts
 *
 * Path traversal prevention utilities. Centralized SSoT for identifier
 * validation used in route inputs that are interpolated into filesystem paths.
 *
 * Pattern: zod schema for input validation + defense-in-depth runtime validator
 * (used when the value is interpolated into a path even after zod has run).
 *
 * Referenced by:
 *  - routes/prefs.ts (projectId)
 *  - routes/retro.ts (retroId)
 *
 * Audit IMPORTANT-6 (2026-05-17 daemon-cleanup): 旧 validation logic は
 * routes/prefs.ts + routes/retro.ts に duplicate していたため、本 module で
 * 単一 SSoT 化し、regex 緩和時の追従漏れを防ぐ。
 */
import { z } from "zod";

/**
 * Allowed character set for projectId (nanoid-style identifier).
 * Alphanumeric + hyphen + underscore only.
 */
export const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Allowed format for retroId (YYYY-MM-DD-NNN, matches generateRetroId).
 */
export const RETRO_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{3}$/;

/**
 * Zod schema for projectId input validation (1-64 chars).
 * Use in route input schemas.
 */
export const projectIdSchema = z
  .string()
  .regex(PROJECT_ID_PATTERN, "projectId must be alphanumeric with - or _ only")
  .min(1)
  .max(64);

/**
 * Zod schema for retroId input validation (YYYY-MM-DD-NNN).
 */
export const retroIdSchema = z
  .string()
  .regex(RETRO_ID_PATTERN, "retroId must match YYYY-MM-DD-NNN format");

/**
 * Defense-in-depth runtime validator for projectId.
 * Strips any character not matching PROJECT_ID_PATTERN and rejects if the
 * stripped value differs (meaning the original contained traversal characters).
 *
 * Use this immediately before any filesystem operation that interpolates the
 * projectId, even when the value has already been zod-validated. The cost is
 * negligible and it guards against future regression if the zod schema is
 * relaxed for any reason.
 */
export function assertSafeProjectId(projectId: string): string {
  const safe = projectId.replace(/[^A-Za-z0-9_-]/g, "");
  if (safe !== projectId || safe.length === 0) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }
  return safe;
}

/**
 * Defense-in-depth runtime validator for retroId.
 * Verifies the YYYY-MM-DD-NNN format and rejects anything else.
 */
export function assertSafeRetroId(retroId: string): string {
  if (!RETRO_ID_PATTERN.test(retroId)) {
    throw new Error(`Invalid retroId: ${retroId}`);
  }
  return retroId;
}
