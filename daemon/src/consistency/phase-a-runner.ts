/**
 * phase-a-runner.ts — Phase A orchestration (SPEC §7.4, §7.5 Step 5 partial)
 * WHY: Separates orchestration (file IO + DB writes) from pure extraction logic
 * (phase-a-screening.ts). SRP — this module owns the side-effectful path.
 *
 * Accepts a pre-injected DB client for testability (no module-level singleton).
 */
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { createDBClient } from "../db/client.js";
import { specChanges, consistencyFindings } from "../db/schema.js";
import { extractTerms, screenRelatedDocs } from "../lib/phase-a-screening.js";
import { SPEC_CHANGE_STATUS, FINDING_STATUS } from "../constants/consistency.js";

// Inferred DB type from createDBClient return
type DB = ReturnType<typeof createDBClient>;

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

/**
 * Result of Phase A analysis.
 * WHY struct (not bare number[]): Phase B needs candidateFiles to know which
 * files to forward to claude -p. Returning both avoids a second DB round-trip.
 */
export interface PhaseAResult {
  /** IDs of inserted consistency_findings rows. */
  insertedIds: number[];
  /** File paths that had at least one screening hit (candidate for Phase B). */
  candidateFiles: string[];
}

/**
 * Run Phase A analysis for a given spec_changes row.
 *
 * Steps:
 *  1. Fetch the spec_changes row to get the diff
 *  2. Extract removed terms from the diff
 *  3. Read each related doc file (absolute paths already resolved by caller)
 *  4. Screen all files for mentions of removed terms
 *  5. INSERT consistency_findings for each hit
 *  6. UPDATE spec_changes.status → 'analyzed', set analyzedAt
 *
 * Returns PhaseAResult with inserted finding IDs and candidate file paths.
 *
 * @param specChangeId  Primary key of the spec_changes row to analyse
 * @param projectId     Project identifier (passed through to finding context)
 * @param relatedDocPaths  Absolute file paths to related docs (already glob-resolved)
 * @param db  Pre-injected DB client (required for testability — no module singleton)
 */
export async function runPhaseA(
  specChangeId: number,
  projectId: string,
  relatedDocPaths: string[],
  db: DB,
): Promise<PhaseAResult> {
  // 1. Fetch spec change row
  const [specChange] = await db
    .select()
    .from(specChanges)
    .where(eq(specChanges.id, specChangeId));

  if (!specChange) {
    throw new Error(`SpecChange id=${specChangeId} not found`);
  }

  // 2. Extract removed terms from diff
  const { removed: removedTerms } = extractTerms(specChange.diff);

  // 3. Load related doc file contents (skip files that fail to read — best effort)
  const filePathsContent = new Map<string, string>();
  for (const filePath of relatedDocPaths) {
    try {
      const content = await readFile(filePath, "utf-8");
      filePathsContent.set(filePath, content);
    } catch {
      // WHY: doc files may not exist (e.g. path from project.json that hasn't been created).
      // Skip silently — Phase A is a best-effort screening, not a hard requirement.
    }
  }

  // 4. Screen for mentions of removed terms
  const screeningFindings = screenRelatedDocs(removedTerms, filePathsContent);

  // 5. Insert consistency_findings rows
  const insertedIds: number[] = [];
  const candidateFilesSet = new Set<string>();
  const now = new Date();

  for (const sf of screeningFindings) {
    const [inserted] = await db
      .insert(consistencyFindings)
      .values({
        specChangeId,
        targetPath: sf.targetPath,
        severity: sf.severity,
        findingType: sf.findingType,
        description: sf.description,
        status: FINDING_STATUS.OPEN,
        createdAt: now,
      })
      .returning();

    insertedIds.push(inserted.id);
    // Track which files had hits — Phase B will re-analyze these for semantic drift
    candidateFilesSet.add(sf.targetPath);
  }

  // 6. Update spec_changes status → analyzed
  await db
    .update(specChanges)
    .set({
      status: SPEC_CHANGE_STATUS.ANALYZED,
      analyzedAt: now,
    })
    .where(eq(specChanges.id, specChangeId));

  return {
    insertedIds,
    candidateFiles: Array.from(candidateFilesSet),
  };
}
