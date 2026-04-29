import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { router, publicProcedure } from "../trpc.js";
import { broadcaster } from "../events/broadcaster.js";
import type {
  AgentChangeEvent,
  PlanChangeEvent,
  FindingNewEvent,
  ApprovalRequestEvent,
  LoomEvent,
  LearnedGuidanceChangeEvent,
  WorktreeChangeEvent,
  DisciplineMetricUpdateEvent,
} from "../events/types.js";

export const eventsRouter = router({
  // Individual event type subscriptions (recommended pattern: frontend opens only the channels it needs)
  onAgentChange: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<AgentChangeEvent>((emit) => {
        const handler = (event: AgentChangeEvent) => {
          // sessionId filter (only when input is specified)
          // metadata contains sessionId by convention; pass all events if no filter
          emit.next(event);
        };
        broadcaster.on("agent.change", handler);
        return () => {
          broadcaster.off("agent.change", handler);
        };
      });
    }),

  onPlanChange: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<PlanChangeEvent>((emit) => {
        const handler = (event: PlanChangeEvent) => {
          if (input?.projectId && event.payload.projectId !== input.projectId) return;
          emit.next(event);
        };
        broadcaster.on("plan.change", handler);
        return () => {
          broadcaster.off("plan.change", handler);
        };
      });
    }),

  onFindingNew: publicProcedure
    .subscription(() => {
      return observable<FindingNewEvent>((emit) => {
        const handler = (event: FindingNewEvent) => emit.next(event);
        broadcaster.on("finding.new", handler);
        return () => {
          broadcaster.off("finding.new", handler);
        };
      });
    }),

  onApprovalRequest: publicProcedure
    .subscription(() => {
      return observable<ApprovalRequestEvent>((emit) => {
        const handler = (event: ApprovalRequestEvent) => emit.next(event);
        broadcaster.on("approval.request", handler);
        return () => {
          broadcaster.off("approval.request", handler);
        };
      });
    }),

  // Generic subscription that streams all events (debug / monitor use)
  onAny: publicProcedure
    .subscription(() => {
      return observable<LoomEvent>((emit) => {
        const handler = (event: LoomEvent) => emit.next(event);
        broadcaster.on("*", handler);
        return () => {
          broadcaster.off("*", handler);
        };
      });
    }),

  // M1.5 Task 9C: 3 new subscription procedures

  onLearnedGuidanceChange: publicProcedure
    .subscription(() => {
      return observable<LearnedGuidanceChangeEvent>((emit) => {
        const handler = (event: LearnedGuidanceChangeEvent) => emit.next(event);
        broadcaster.on("learned_guidance.change", handler);
        return () => broadcaster.off("learned_guidance.change", handler);
      });
    }),

  onWorktreeChange: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<WorktreeChangeEvent>((emit) => {
        const handler = (event: WorktreeChangeEvent) => {
          if (input?.projectId && event.payload.projectId !== input.projectId) return;
          emit.next(event);
        };
        broadcaster.on("worktree.change", handler);
        return () => broadcaster.off("worktree.change", handler);
      });
    }),

  onDisciplineMetricUpdate: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<DisciplineMetricUpdateEvent>((emit) => {
        const handler = (event: DisciplineMetricUpdateEvent) => {
          if (input?.projectId && event.payload.projectId !== input.projectId) return;
          emit.next(event);
        };
        broadcaster.on("discipline_metric.update", handler);
        return () => broadcaster.off("discipline_metric.update", handler);
      });
    }),
});
