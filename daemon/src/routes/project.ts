// daemon/src/routes/project.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { projects } from "../db/schema.js";

const db = createDBClient();

export const projectRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["active", "archived"]).optional(),
      })
    )
    .query(async ({ input }) => {
      if (input.status !== undefined) {
        return await db
          .select()
          .from(projects)
          .where(eq(projects.status, input.status));
      }
      return await db.select().from(projects);
    }),

  current: publicProcedure
    .input(z.object({ rootPath: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.rootPath, input.rootPath))
        .get();
      return result ?? null;
    }),

  upsert: publicProcedure
    .input(
      z.object({
        name: z.string(),
        rootPath: z.string(),
        specPath: z.string().optional(),
        planPath: z.string().optional(),
        rulesPath: z.string().optional(),
        methodology: z.string().optional(),
        maxDevelopers: z.number().int().optional(),
        maxReviewers: z.number().int().optional(),
        maxCodeReviewers: z.number().int().optional(),
        maxSecurityReviewers: z.number().int().optional(),
        maxTestReviewers: z.number().int().optional(),
        status: z.string(),
        lastActiveAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = new Date();
      const values = {
        ...input,
        createdAt: now,
        lastActiveAt: input.lastActiveAt ?? now,
      };
      const [result] = await db
        .insert(projects)
        .values(values)
        .onConflictDoUpdate({
          target: projects.rootPath,
          set: {
            name: input.name,
            specPath: input.specPath,
            planPath: input.planPath,
            rulesPath: input.rulesPath,
            methodology: input.methodology,
            maxDevelopers: input.maxDevelopers,
            maxReviewers: input.maxReviewers,
            maxCodeReviewers: input.maxCodeReviewers,
            maxSecurityReviewers: input.maxSecurityReviewers,
            maxTestReviewers: input.maxTestReviewers,
            status: input.status,
            lastActiveAt: input.lastActiveAt ?? now,
          },
        })
        .returning();
      return result;
    }),

  archive: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(projects)
        .set({ status: "archived" })
        .where(eq(projects.projectId, input.projectId));
      return { success: true };
    }),

  /**
   * getDetail: return all fields for a single project by projectId.
   * Returns null if project not found (caller decides how to handle).
   */
  getDetail: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, input.projectId))
        .get();
      return result ?? null;
    }),

  /**
   * updateSettings: patch editable fields on an existing project.
   * Only fields explicitly provided in input are updated.
   * Throws NOT_FOUND if projectId does not exist.
   *
   * WHY: Separate from upsert — settings update must fail loudly on missing
   * project (fail fast at boundaries, SPEC principle 9).
   */
  updateSettings: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        name: z.string().optional(),
        specPath: z.string().optional(),
        planPath: z.string().optional(),
        rulesPath: z.string().optional(),
        methodology: z.string().optional(),
        maxDevelopers: z.number().int().positive().optional(),
        maxReviewers: z.number().int().positive().optional(),
        maxCodeReviewers: z.number().int().positive().optional(),
        maxSecurityReviewers: z.number().int().positive().optional(),
        maxTestReviewers: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { projectId, ...fields } = input;

      // Fail fast: ensure project exists before updating
      const existing = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, projectId))
        .get();

      if (!existing) {
        throw new TRPCErrorClass({
          code: "NOT_FOUND",
          message: `Project not found: ${projectId}`,
        });
      }

      // Build update set from provided fields only
      const updateSet: Partial<typeof projects.$inferInsert> = {};
      if (fields.name !== undefined) updateSet.name = fields.name;
      if (fields.specPath !== undefined) updateSet.specPath = fields.specPath;
      if (fields.planPath !== undefined) updateSet.planPath = fields.planPath;
      if (fields.rulesPath !== undefined) updateSet.rulesPath = fields.rulesPath;
      if (fields.methodology !== undefined) updateSet.methodology = fields.methodology;
      if (fields.maxDevelopers !== undefined) updateSet.maxDevelopers = fields.maxDevelopers;
      if (fields.maxReviewers !== undefined) updateSet.maxReviewers = fields.maxReviewers;
      if (fields.maxCodeReviewers !== undefined) updateSet.maxCodeReviewers = fields.maxCodeReviewers;
      if (fields.maxSecurityReviewers !== undefined) updateSet.maxSecurityReviewers = fields.maxSecurityReviewers;
      if (fields.maxTestReviewers !== undefined) updateSet.maxTestReviewers = fields.maxTestReviewers;

      const [updated] = await db
        .update(projects)
        .set(updateSet)
        .where(eq(projects.projectId, projectId))
        .returning();

      return updated;
    }),
});
