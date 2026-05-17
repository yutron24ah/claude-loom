/**
 * daemon/src/lib/retro-reconstruct.ts
 *
 * Retro state durability fallback: archive markdown を parse して
 * applied_summary / pending_summary を再構築する utility。
 *
 * SPEC §3.9.12 (Retro state durability) の補完、M0.11.2 t7。
 *
 * 用途: `.claude-loom/retro/<retro_id>/pending.json` が消失 / 破損した場合、
 * git-tracked な `docs/retro/<retro_id>-report.md` から状態を re-construct する
 * fallback path。primary mechanism は pending.json 直接読み (retro-pm Stage 0)、
 * 本 module は失敗時の safety net。
 *
 * Parser は **best-effort**: archive markdown format は AGGREGATOR_TEMPLATE
 * (skills/loom-retro/SKILL.md) が定める structure に依拠するが、人手編集 / 旧
 * format に対しても graceful degrade する (missing fields は default 値、
 * unparseable lines は skip + WARN log)。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedFinding {
  finding_id: string;
  lens: string;
  category: string;
  severity?: "low" | "medium" | "high";
  proposal_type?: "structural" | "symptomatic" | "record-only";
  summary: string;
  /** "auto-applied" section に含まれていたか */
  applied: boolean;
  /** Action items section に含まれていたか (pending approval) */
  pending: boolean;
}

export interface ParsedArchive {
  retro_id: string;
  total_findings: number;
  findings: ParsedFinding[];
  /** parse 中に skip した line 数 (best-effort durability indicator) */
  warnings: string[];
}

export interface ReconstructedAppliedSummary {
  schema_version: 2;
  retro_id: string;
  generated_at: number;
  total_retro_sessions: 1;
  applied_findings: Array<{
    finding_id: string;
    origin_retro_id: string;
    category: string;
    proposal_type?: "structural" | "symptomatic" | "record-only";
    summary: string;
    /** archive markdown 由来は commit_sha 不在 (reconstruct fallback marker) */
    applied_in: {
      commit_sha: null;
      milestone_tag: null;
      applied_at: number;
      apply_type: "record-only";
    };
    reconstructed_from_archive: true;
  }>;
}

export interface ReconstructedPendingSummary {
  schema_version: 1;
  retro_id: string;
  generated_at: number;
  total_retro_sessions_scanned: 1;
  pending_findings: Array<{
    finding_id: string;
    origin_retro_id: string;
    lens: string;
    category: string;
    risk: "low" | "medium" | "high" | "medium-high";
    summary: string;
    status: "pending" | "expired";
    /** archive reconstruction では正確な count 不明、保守的に 1 (lens scan で正規化される) */
    carryover_count: 1;
    last_seen_in: string;
    expired_at: null;
    re_evaluated_in: null;
    reconstructed_from_archive: true;
  }>;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse archive markdown to extract findings.
 *
 * Expected format (from AGGREGATOR_TEMPLATE in skills/loom-retro/SKILL.md):
 *
 * ```
 * ## Findings by lens
 * ### pj-axis
 * - [finding-id] severity:H category:X — description (proposal_type: structural | symptomatic | record-only)
 *   - target_artifact: ..., evidence: ...
 *   - suggestion: ...
 *
 * ## Auto-applied
 * - [finding-id] applied to: <path:line>, reason: <auto-apply rule>
 *
 * ## Action items
 * - [finding-id] requires user approval — proposal: ...
 * ```
 *
 * Best-effort: missing sections / variant formatting は warning log + partial parse。
 */
export function parseArchiveMarkdown(content: string, retroId: string): ParsedArchive {
  const warnings: string[] = [];
  const findings: ParsedFinding[] = [];
  const findingIdToParsed = new Map<string, ParsedFinding>();

  const lines = content.split("\n");

  let currentSection: "findings" | "auto-applied" | "action-items" | null = null;
  let currentLens: string | null = null;

  for (const line of lines) {
    // Section header detection
    if (/^##\s+Findings\s+by\s+lens/i.test(line)) {
      currentSection = "findings";
      currentLens = null;
      continue;
    }
    if (/^##\s+Auto-applied/i.test(line)) {
      currentSection = "auto-applied";
      continue;
    }
    if (/^##\s+Action\s+items/i.test(line)) {
      currentSection = "action-items";
      continue;
    }
    if (/^##\s+/.test(line)) {
      // Other top-level section — exit findings/applied/action-items scope
      currentSection = null;
      continue;
    }

    // Lens subsection (### pj-axis, ### process-axis, etc.)
    if (currentSection === "findings" && /^###\s+(\S+)/.test(line)) {
      const m = line.match(/^###\s+(\S+)/);
      if (m) currentLens = m[1];
      continue;
    }

    // Finding line: - [finding-id] severity:H category:X — description (proposal_type: ...)
    if (currentSection === "findings" && currentLens && line.trimStart().startsWith("- [")) {
      const findingMatch = line.match(/-\s*\[([^\]]+)\]\s*(.*)/);
      if (!findingMatch) {
        warnings.push(`Unparseable finding line in ${currentLens}: ${line.slice(0, 80)}`);
        continue;
      }
      const findingId = findingMatch[1];
      const rest = findingMatch[2];

      const severityMatch = rest.match(/severity:(\w+)/i);
      const categoryMatch = rest.match(/category:(\S+)/i);
      const proposalTypeMatch = rest.match(/proposal_type:\s*(structural|symptomatic|record-only)/i);
      const summaryMatch = rest.match(/—\s*(.+?)(?:\s*\(|$)/);

      const parsed: ParsedFinding = {
        finding_id: findingId,
        lens: currentLens,
        category: categoryMatch?.[1] ?? "unknown",
        severity: normalizeSeverity(severityMatch?.[1]),
        proposal_type: proposalTypeMatch
          ? (proposalTypeMatch[1].toLowerCase() as "structural" | "symptomatic" | "record-only")
          : undefined,
        summary: summaryMatch?.[1].trim() ?? "(no summary extracted)",
        applied: false,
        pending: false,
      };
      findings.push(parsed);
      findingIdToParsed.set(findingId, parsed);
      continue;
    }

    // Auto-applied: - [finding-id] applied to: ...
    if (currentSection === "auto-applied" && line.trimStart().startsWith("- [")) {
      const m = line.match(/-\s*\[([^\]]+)\]/);
      if (m) {
        const existing = findingIdToParsed.get(m[1]);
        if (existing) {
          existing.applied = true;
        } else {
          warnings.push(`Auto-applied references unknown finding: ${m[1]}`);
        }
      }
      continue;
    }

    // Action items: - [finding-id] requires user approval ...
    if (currentSection === "action-items" && line.trimStart().startsWith("- [")) {
      const m = line.match(/-\s*\[([^\]]+)\]/);
      if (m) {
        const existing = findingIdToParsed.get(m[1]);
        if (existing) {
          existing.pending = true;
        } else {
          warnings.push(`Action items references unknown finding: ${m[1]}`);
        }
      }
      continue;
    }
  }

  return {
    retro_id: retroId,
    total_findings: findings.length,
    findings,
    warnings,
  };
}

function normalizeSeverity(raw?: string): "low" | "medium" | "high" | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.startsWith("h")) return "high";
  if (lower.startsWith("m")) return "medium";
  if (lower.startsWith("l")) return "low";
  return undefined;
}

// ---------------------------------------------------------------------------
// Reconstruction
// ---------------------------------------------------------------------------

export function reconstructAppliedSummary(
  parsed: ParsedArchive,
  generatedAt: number = Date.now()
): ReconstructedAppliedSummary {
  return {
    schema_version: 2,
    retro_id: parsed.retro_id,
    generated_at: generatedAt,
    total_retro_sessions: 1,
    applied_findings: parsed.findings
      .filter((f) => f.applied)
      .map((f) => ({
        finding_id: f.finding_id,
        origin_retro_id: parsed.retro_id,
        category: f.category,
        proposal_type: f.proposal_type,
        summary: f.summary,
        applied_in: {
          commit_sha: null,
          milestone_tag: null,
          applied_at: generatedAt,
          apply_type: "record-only" as const,
        },
        reconstructed_from_archive: true as const,
      })),
  };
}

export function reconstructPendingSummary(
  parsed: ParsedArchive,
  generatedAt: number = Date.now()
): ReconstructedPendingSummary {
  return {
    schema_version: 1,
    retro_id: parsed.retro_id,
    generated_at: generatedAt,
    total_retro_sessions_scanned: 1,
    pending_findings: parsed.findings
      .filter((f) => f.pending && !f.applied)
      .map((f) => ({
        finding_id: f.finding_id,
        origin_retro_id: parsed.retro_id,
        lens: f.lens,
        category: f.category,
        risk: severityToRisk(f.severity),
        summary: f.summary,
        status: "pending" as const,
        carryover_count: 1 as const,
        last_seen_in: parsed.retro_id,
        expired_at: null,
        re_evaluated_in: null,
        reconstructed_from_archive: true as const,
      })),
  };
}

function severityToRisk(
  severity: "low" | "medium" | "high" | undefined
): "low" | "medium" | "high" | "medium-high" {
  if (severity === "high") return "high";
  if (severity === "low") return "low";
  // Default + medium fall-through
  return "medium";
}
