/**
 * daemon/src/lib/json-file.ts
 *
 * Atomic JSON file I/O utilities. Centralized SSoT for the per-instance JSON
 * files (prefs / pending / applied_summary / verdict_evidence) that daemon
 * routes read and write.
 *
 * Pattern: atomic write via tmp + rename (POSIX rename atomicity guarantee),
 * lazy read with default value or null fallback.
 *
 * Referenced by:
 *  - routes/prefs.ts (user-prefs.json / project-prefs.json)
 *  - routes/retro.ts (pending.json / verdict_evidence.json / applied_summary.json)
 *
 * Audit IMPORTANT-1 (2026-05-17 daemon-cleanup): 旧 atomicWriteJson /
 * readJsonOr* helpers が routes/prefs.ts + routes/retro.ts で duplicate
 * していたため、本 module で単一 SSoT 化。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { nanoid } from "nanoid";

/**
 * Write JSON data to a file atomically.
 * Steps:
 *  1. Ensure the parent directory exists (mkdirSync recursive)
 *  2. Write to a tmp file in the same directory (renames within a single
 *     directory are guaranteed atomic on POSIX)
 *  3. Rename the tmp file to the target path
 *
 * Crash safety: if the process dies after step 2 but before step 3, the
 * target file is untouched; only the tmp file is orphaned (next call
 * overwrites). The caller never sees a partially-written target file.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmpPath = join(dir, `.tmp-${nanoid(8)}.json`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
}

/**
 * Read and parse a JSON file. Returns `defaultValue` if the file is missing
 * or contains invalid JSON.
 *
 * Use when the caller has a meaningful empty/default representation (e.g.
 * empty prefs object).
 */
export function readJsonOrDefault<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Read and parse a JSON file. Returns `null` if the file is missing or
 * contains invalid JSON.
 *
 * Use when the caller wants to distinguish "file does not exist" from
 * "file exists with empty/default content".
 */
export function readJsonOrNull<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}
