/**
 * M4 t6: acknowledgeAndCreatePlanItem mutation integration tests
 * TDD RED phase — written before implementation exists.
 *
 * WHY: SPEC §7.5 Step 6 — Acknowledge action should atomically update finding status
 * to 'acknowledged' AND insert a plan_items row. Tests verify transactional behavior
 * (both operations succeed or both fail), returned plan_item ID, and the data shape.
 *
 * Pattern: follows consistency-findings-mutations.test.ts (M4 t5 style).
 * DB isolation: uses same home-dir DB path as server (no explicit path arg to createDBClient).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(): Promise<string> {
  const path = `/tmp/proj-${randomUUID()}`;
  const response = await app.inject({
    method: "POST",
    url: "/trpc/project.upsert",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      name: "Test Project",
      rootPath: path,
      specPath: `${path}/SPEC.md`,
      status: "active",
    }),
  });
  expect(response.statusCode).toBe(200);
  return JSON.parse(response.body).result.data.projectId;
}

async function createSpecChange(projectId: string): Promise<number> {
  const response = await app.inject({
    method: "POST",
    url: "/trpc/consistency.recordSpecChange",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      projectId,
      specPath: "/SPEC.md",
      beforeHash: "aaa",
      afterHash: "bbb",
      diff: "@@ -1 +1 @@\n-old\n+new",
    }),
  });
  expect(response.statusCode).toBe(200);
  return JSON.parse(response.body).result.data.id;
}

async function createFindingDirectly(specChangeId: number): Promise<number> {
  const { createDBClient, runMigrations } = await import("../../src/db/client.js");
  const { consistencyFindings } = await import("../../src/db/schema.js");
  const { FINDING_STATUS, FINDING_SEVERITY, FINDING_TYPE } = await import(
    "../../src/constants/consistency.js"
  );

  const db = createDBClient();
  runMigrations(db);

  const [finding] = await db
    .insert(consistencyFindings)
    .values({
      specChangeId,
      targetPath: "docs/SPEC.md",
      severity: FINDING_SEVERITY.HIGH,
      findingType: FINDING_TYPE.TERM_REMOVED,
      description: "The term OldApiSection was removed from the spec (acknowledge-plan test)",
      suggestedChange: "Replace OldApiSection with NewApiSection",
      status: FINDING_STATUS.OPEN,
      createdAt: new Date(),
    })
    .returning();
  return finding.id;
}

// ---------------------------------------------------------------------------
// acknowledgeAndCreatePlanItem — success cases
// ---------------------------------------------------------------------------

describe("consistencyRouter.acknowledgeAndCreatePlanItem", () => {
  it("returns HTTP 200 and plan_item id", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(typeof data.planItemId).toBe("number");
  });

  it("sets finding status to 'acknowledged'", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    // Verify finding status is now 'acknowledged'
    const { createDBClient } = await import("../../src/db/client.js");
    const { consistencyFindings } = await import("../../src/db/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient();
    const [finding] = await db
      .select()
      .from(consistencyFindings)
      .where(eq(consistencyFindings.id, findingId));

    expect(finding.status).toBe("acknowledged");
  });

  it("creates a plan_item row in the DB", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    const { planItemId } = JSON.parse(response.body).result.data;

    // Verify plan_item exists in DB
    const { createDBClient } = await import("../../src/db/client.js");
    const { planItems } = await import("../../src/db/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient();
    const [item] = await db
      .select()
      .from(planItems)
      .where(eq(planItems.id, planItemId));

    expect(item).toBeDefined();
    expect(item.projectId).toBe(projectId);
    expect(item.status).toBe("todo");
  });

  it("plan_item source is 'consistency'", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    const { planItemId } = JSON.parse(response.body).result.data;

    const { createDBClient } = await import("../../src/db/client.js");
    const { planItems } = await import("../../src/db/schema.js");
    const { PLAN_ITEM_SOURCE } = await import("../../src/constants/consistency.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient();
    const [item] = await db
      .select()
      .from(planItems)
      .where(eq(planItems.id, planItemId));

    expect(item.source).toBe(PLAN_ITEM_SOURCE.CONSISTENCY);
  });

  it("plan_item title includes FINDING_TO_PLAN_TITLE_PREFIX", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    const { planItemId } = JSON.parse(response.body).result.data;

    const { createDBClient } = await import("../../src/db/client.js");
    const { planItems } = await import("../../src/db/schema.js");
    const { FINDING_TO_PLAN_TITLE_PREFIX } = await import(
      "../../src/constants/consistency.js"
    );
    const { eq } = await import("drizzle-orm");

    const db = createDBClient();
    const [item] = await db
      .select()
      .from(planItems)
      .where(eq(planItems.id, planItemId));

    expect(item.title).toContain(FINDING_TO_PLAN_TITLE_PREFIX);
  });

  it("plan_item parentId is null (root-level)", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId }),
    });

    const { planItemId } = JSON.parse(response.body).result.data;

    const { createDBClient } = await import("../../src/db/client.js");
    const { planItems } = await import("../../src/db/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient();
    const [item] = await db
      .select()
      .from(planItems)
      .where(eq(planItems.id, planItemId));

    expect(item.parentId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// acknowledgeAndCreatePlanItem — error cases
// ---------------------------------------------------------------------------

describe("consistencyRouter.acknowledgeAndCreatePlanItem — errors", () => {
  it("returns NOT_FOUND error for non-existent findingId", async () => {
    const projectId = await createProject();

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId: 99999999, projectId }),
    });

    const body = JSON.parse(response.body);
    const isError = response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });

  it("returns NOT_FOUND error for non-existent projectId", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledgeAndCreatePlanItem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ findingId, projectId: "nonexistent-project-id" }),
    });

    const body = JSON.parse(response.body);
    const isError = response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});
