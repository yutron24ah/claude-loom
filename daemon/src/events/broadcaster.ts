import { EventEmitter } from "node:events";
import type {
  LoomEvent,
  AgentChangeEvent,
  PlanChangeEvent,
  FindingNewEvent,
  ApprovalRequestEvent,
  RawEvent,
  LearnedGuidanceChangeEvent,
  WorktreeChangeEvent,
  DisciplineMetricUpdateEvent,
  TodoChangeEvent,
  PlanConflictEvent,
  SessionChangeEvent,
  SpecChangeDetectedEvent,
} from "./types.js";

class Broadcaster extends EventEmitter {
  emitAgentChange(payload: AgentChangeEvent["payload"]) {
    const event: AgentChangeEvent = {
      type: "agent.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("agent.change", event);
    this.emit("*", event);
  }

  emitPlanChange(payload: PlanChangeEvent["payload"]) {
    const event: PlanChangeEvent = {
      type: "plan.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("plan.change", event);
    this.emit("*", event);
  }

  emitFindingNew(payload: FindingNewEvent["payload"]) {
    const event: FindingNewEvent = {
      type: "finding.new",
      timestamp: Date.now(),
      payload,
    };
    this.emit("finding.new", event);
    this.emit("*", event);
  }

  emitApprovalRequest(payload: ApprovalRequestEvent["payload"]) {
    const event: ApprovalRequestEvent = {
      type: "approval.request",
      timestamp: Date.now(),
      payload,
    };
    this.emit("approval.request", event);
    this.emit("*", event);
  }

  emitRaw(payload: RawEvent["payload"]) {
    const event: RawEvent = {
      type: "event.raw",
      timestamp: Date.now(),
      payload,
    };
    this.emit("event.raw", event);
    this.emit("*", event);
  }

  emitLearnedGuidanceChange(payload: LearnedGuidanceChangeEvent["payload"]) {
    const event: LearnedGuidanceChangeEvent = {
      type: "learned_guidance.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("learned_guidance.change", event);
    this.emit("*", event);
  }

  emitWorktreeChange(payload: WorktreeChangeEvent["payload"]) {
    const event: WorktreeChangeEvent = {
      type: "worktree.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("worktree.change", event);
    this.emit("*", event);
  }

  emitDisciplineMetricUpdate(payload: DisciplineMetricUpdateEvent["payload"]) {
    const event: DisciplineMetricUpdateEvent = {
      type: "discipline_metric.update",
      timestamp: Date.now(),
      payload,
    };
    this.emit("discipline_metric.update", event);
    this.emit("*", event);
  }

  emitTodoChange(payload: TodoChangeEvent["payload"]) {
    const event: TodoChangeEvent = {
      type: "todo.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("todo.change", event);
    this.emit("*", event);
  }

  emitPlanConflict(payload: PlanConflictEvent["payload"]) {
    const event: PlanConflictEvent = {
      type: "plan.conflict",
      timestamp: Date.now(),
      payload,
    };
    this.emit("plan.conflict", event);
    this.emit("*", event);
  }

  emitSessionChange(payload: SessionChangeEvent["payload"]) {
    const event: SessionChangeEvent = {
      type: "session.change",
      timestamp: Date.now(),
      payload,
    };
    this.emit("session.change", event);
    this.emit("*", event);
  }

  // WHY: M4 t7 — SPEC §7.5 Step 3 badge notification. Fired immediately after
  // spec_changes INSERT in ingest.ts so the UI can display the badge without
  // waiting for Phase A analysis to complete.
  emitSpecChangeDetected(payload: SpecChangeDetectedEvent["payload"]) {
    const event: SpecChangeDetectedEvent = {
      type: "spec_change_detected",
      timestamp: Date.now(),
      payload,
    };
    this.emit("spec_change_detected", event);
    this.emit("*", event);
  }
}

// Singleton instance
export const broadcaster = new Broadcaster();
broadcaster.setMaxListeners(100);
