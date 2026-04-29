import { z } from "zod";

// Agent state change event
export const agentChangeEventSchema = z.object({
  type: z.literal("agent.change"),
  timestamp: z.number(),
  payload: z.object({
    agentId: z.string(),
    status: z.enum(["idle", "busy", "failed", "completed"]),
    role: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type AgentChangeEvent = z.infer<typeof agentChangeEventSchema>;

// Plan item change event
export const planChangeEventSchema = z.object({
  type: z.literal("plan.change"),
  timestamp: z.number(),
  payload: z.object({
    itemId: z.string(),
    projectId: z.string(),
    status: z.enum(["todo", "in_progress", "done"]),
    title: z.string(),
  }),
});
export type PlanChangeEvent = z.infer<typeof planChangeEventSchema>;

// New consistency finding event
export const findingNewEventSchema = z.object({
  type: z.literal("finding.new"),
  timestamp: z.number(),
  payload: z.object({
    findingId: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    targetDoc: z.string(),
    message: z.string(),
  }),
});
export type FindingNewEvent = z.infer<typeof findingNewEventSchema>;

// Approval request event
export const approvalRequestEventSchema = z.object({
  type: z.literal("approval.request"),
  timestamp: z.number(),
  payload: z.object({
    eventId: z.number(),
    sessionId: z.string(),
    toolName: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type ApprovalRequestEvent = z.infer<typeof approvalRequestEventSchema>;

// Generic raw event (catch-all for hook ingestion broadcast)
export const rawEventSchema = z.object({
  type: z.literal("event.raw"),
  timestamp: z.number(),
  payload: z.object({
    eventId: z.number(),
    sessionId: z.string(),
    eventType: z.string(),
    toolName: z.string().nullable(),
  }),
});
export type RawEvent = z.infer<typeof rawEventSchema>;

// Discriminated union for all event types
export const loomEventSchema = z.discriminatedUnion("type", [
  agentChangeEventSchema,
  planChangeEventSchema,
  findingNewEventSchema,
  approvalRequestEventSchema,
  rawEventSchema,
]);
export type LoomEvent = z.infer<typeof loomEventSchema>;
