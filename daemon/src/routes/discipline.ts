/**
 * tRPC sub-router: discipline
 * SPEC §3.6.8 — process discipline metrics + violations
 * M1.5 Task 8: Q6 UI backend
 *
 * Procedures:
 *  - metrics.live: query — direct 5-min events table aggregate
 *  - metrics.history: query — milestone-unit aggregate (skeleton in M1.5)
 *  - violations.list: query — events table filter (skeleton in M1.5)
 *  - violations.ack: mutation — ack flag in event payload JSON
 *
 * NOTE M1.5: simple aggregates only. Full violation detection logic is M3/M4 retro lens.
 * NOTE: After metrics update, call broadcaster.emitDisciplineMetricUpdate() — TODO (Task 9 events wire-up)
 */
import { z } from "zod";
import { gte, and, eq, desc } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { events } from "../db/schema.js";

// ---------------------------------------------------------------------------
// Zod output schemas
// ---------------------------------------------------------------------------

export const liveMetricsSchema = z.object({
  windowMinutes: z.number(),
  parallelRate: z.number(),      // count of subagent_dispatch events in window
  taskToolStatus: z.boolean(),   // true if latest event within 5 min
  tddViolations: z.number(),     // feat commit before test commit count (simple)
  reviewerVerdictCoverage: z.number(), // reviewer dispatch count / expected ratio (0-1)
  capturedAt: z.date(),
});

export const historicalMetricsSchema = z.object({
  milestone: z.string(),
  parallelRate: z.number(),
  tddViolations: z.number(),
  reviewerVerdictCoverage: z.number(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
});

export const violationSchema = z.object({
  violationId: z.string(),
  type: z.string(),
  description: z.string(),
  eventId: z.number(),
  detectedAt: z.date(),
  acked: z.boolean(),
});

export type LiveMetrics = z.infer<typeof liveMetricsSchema>;
export type HistoricalMetrics = z.infer<typeof historicalMetricsSchema>;
export type Violation = z.infer<typeof violationSchema>;

// ---------------------------------------------------------------------------
// DB client (module-level singleton, same pattern as other routes)
// ---------------------------------------------------------------------------
const db = createDBClient();

const LIVE_WINDOW_MINUTES = 5;

// ---------------------------------------------------------------------------
// metrics sub-router
// ---------------------------------------------------------------------------
const metricsRouter = router({
  /**
   * live: aggregate events in the last 5 minutes
   * M1.5: simple count-based metrics
   */
  live: publicProcedure.query(async () => {
    const now = new Date();
    const windowMs = LIVE_WINDOW_MINUTES * 60 * 1000;
    const windowStart = new Date(now.getTime() - windowMs);

    // Fetch recent events in the 5-minute window
    const recentEvents = await db
      .select()
      .from(events)
      .where(gte(events.createdAt, windowStart))
      .all();

    // parallel rate: count of subagent_dispatch events in window (simple proxy)
    const parallelRate = recentEvents.filter(
      (e) => e.eventType === "subagent_dispatch" || e.eventType === "pre_tool"
    ).length;

    // taskToolStatus: is the latest event within 5 minutes?
    const latestEvent = await db
      .select({ createdAt: events.createdAt })
      .from(events)
      .orderBy(desc(events.createdAt))
      .limit(1)
      .get();
    const taskToolStatus = latestEvent
      ? latestEvent.createdAt.getTime() >= windowStart.getTime()
      : false;

    // tddViolations: simple count of feat commits before test commits in window
    // M1.5: approximate via event_type pattern; full logic is M3/M4
    const featEvents = recentEvents.filter((e) =>
      e.eventType === "commit" &&
      typeof (e.payload as Record<string, unknown>)?.message === "string" &&
      ((e.payload as Record<string, unknown>).message as string).startsWith("feat")
    );
    const testEvents = recentEvents.filter((e) =>
      e.eventType === "commit" &&
      typeof (e.payload as Record<string, unknown>)?.message === "string" &&
      ((e.payload as Record<string, unknown>).message as string).startsWith("test")
    );
    // naive: if feat > test in window, flag as potential violations
    const tddViolations = Math.max(0, featEvents.length - testEvents.length);

    // reviewerVerdictCoverage: reviewer_dispatch count / expected (simple ratio)
    const reviewerDispatchCount = recentEvents.filter(
      (e) => e.eventType === "reviewer_dispatch"
    ).length;
    const developerDispatchCount = recentEvents.filter(
      (e) => e.eventType === "developer_dispatch" || e.eventType === "subagent_dispatch"
    ).length;
    const reviewerVerdictCoverage =
      developerDispatchCount > 0
        ? Math.min(1, reviewerDispatchCount / developerDispatchCount)
        : 1;

    const result: LiveMetrics = {
      windowMinutes: LIVE_WINDOW_MINUTES,
      parallelRate,
      taskToolStatus,
      tddViolations,
      reviewerVerdictCoverage,
      capturedAt: now,
    };

    // TODO: broadcaster.emitDisciplineMetricUpdate(result) — wire-up in Task 9

    return result;
  }),

  /**
   * history: milestone-unit aggregate
   * M1.5: skeleton — returns empty array or basic aggregate by tag
   */
  history: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        milestone: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // M1.5 skeleton: full milestone tagging is M3/M4
      // Return a single aggregate covering all events (no milestone segmentation yet)
      const allEvents = await db.select().from(events).all();

      if (allEvents.length === 0) {
        return [] as HistoricalMetrics[];
      }

      const tag = input.milestone ?? "all";

      const featCommits = allEvents.filter(
        (e) =>
          e.eventType === "commit" &&
          typeof (e.payload as Record<string, unknown>)?.message === "string" &&
          ((e.payload as Record<string, unknown>).message as string).startsWith("feat")
      );
      const testCommits = allEvents.filter(
        (e) =>
          e.eventType === "commit" &&
          typeof (e.payload as Record<string, unknown>)?.message === "string" &&
          ((e.payload as Record<string, unknown>).message as string).startsWith("test")
      );

      const reviewerDispatches = allEvents.filter(
        (e) => e.eventType === "reviewer_dispatch"
      ).length;
      const developerDispatches = allEvents.filter(
        (e) => e.eventType === "developer_dispatch" || e.eventType === "subagent_dispatch"
      ).length;

      const parallelEvents = allEvents.filter(
        (e) => e.eventType === "subagent_dispatch" || e.eventType === "pre_tool"
      );

      const result: HistoricalMetrics = {
        milestone: tag,
        parallelRate: parallelEvents.length,
        tddViolations: Math.max(0, featCommits.length - testCommits.length),
        reviewerVerdictCoverage:
          developerDispatches > 0
            ? Math.min(1, reviewerDispatches / developerDispatches)
            : 1,
        periodStart: allEvents.length > 0 ? allEvents[0].createdAt : null,
        periodEnd: allEvents.length > 0 ? allEvents[allEvents.length - 1].createdAt : null,
      };

      return [result];
    }),
});

// ---------------------------------------------------------------------------
// violations sub-router
// ---------------------------------------------------------------------------
const violationsRouter = router({
  /**
   * list: query events table for violation-type events
   * M1.5: skeleton — filters by event_type if type provided
   */
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // M1.5 skeleton: return events with tdd_violation or reviewer_skip type
      // Full violation detection logic is M3/M4 retro lens
      const violationEventTypes = input.type
        ? [input.type]
        : ["tdd_violation", "reviewer_skip", "missing_test"];

      const allEvents = await db.select().from(events).all();

      const violations: Violation[] = allEvents
        .filter((e) => violationEventTypes.includes(e.eventType))
        .map((e) => {
          const payload = e.payload as Record<string, unknown>;
          return {
            violationId: `event-${e.id}`,
            type: e.eventType,
            description:
              typeof payload?.description === "string"
                ? payload.description
                : `Violation detected: ${e.eventType}`,
            eventId: e.id,
            detectedAt: e.createdAt,
            acked: payload?.acked === true,
          };
        });

      return violations;
    }),

  /**
   * ack: merge ack flag into event payload JSON
   */
  ack: publicProcedure
    .input(z.object({ violationId: z.string() }))
    .mutation(async ({ input }) => {
      // violationId format: "event-<id>"
      const match = input.violationId.match(/^event-(\d+)$/);
      if (!match) {
        return { success: false };
      }
      const eventId = parseInt(match[1], 10);

      const existingEvent = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .get();

      if (!existingEvent) {
        return { success: false };
      }

      const currentPayload = existingEvent.payload as Record<string, unknown>;
      const updatedPayload = { ...currentPayload, acked: true };

      await db
        .update(events)
        .set({ payload: updatedPayload })
        .where(eq(events.id, eventId));

      return { success: true };
    }),
});

// ---------------------------------------------------------------------------
// Combined discipline router
// ---------------------------------------------------------------------------
export const disciplineRouter = router({
  metrics: metricsRouter,
  violations: violationsRouter,
});
