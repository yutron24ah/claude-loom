// daemon/src/routes/project.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
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
});
