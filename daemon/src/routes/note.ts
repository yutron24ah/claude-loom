/**
 * tRPC sub-router: note
 * SPEC §6.2 — notes table operations
 * M1 Task 8 Subset C
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { notes } from "../db/schema.js";
import type { Note, NewNote } from "../db/schema.js";

const db = createDBClient();

export const noteRouter = router({
  /**
   * list: query notes with optional filters
   * input: { projectId not used at row-level — filter by attachedType/attachedId }
   * For project-scoped listing, caller passes attachedType='project' attachedId=projectId
   */
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        attachedType: z.string().optional(),
        attachedId: z.string().optional(),
      }),
    )
    .query(async ({ input }): Promise<Note[]> => {
      const conditions = [];

      if (input.attachedType !== undefined) {
        conditions.push(eq(notes.attachedType, input.attachedType));
      }
      if (input.attachedId !== undefined) {
        conditions.push(eq(notes.attachedId, input.attachedId));
      }

      if (conditions.length === 0) {
        return db.select().from(notes).all();
      } else if (conditions.length === 1) {
        return db.select().from(notes).where(conditions[0]).all();
      } else {
        return db
          .select()
          .from(notes)
          .where(and(...conditions))
          .all();
      }
    }),

  /**
   * create: insert a new note
   * input: Note fields minus auto-generated id and createdAt
   */
  create: publicProcedure
    .input(
      z.object({
        attachedType: z.string(),
        attachedId: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }): Promise<Note> => {
      const newNote: NewNote = {
        ...input,
        createdAt: new Date(),
      };
      const [inserted] = await db.insert(notes).values(newNote).returning();
      return inserted;
    }),

  /**
   * update: update note content by id
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }): Promise<Note> => {
      const [updated] = await db
        .update(notes)
        .set({ content: input.content })
        .where(eq(notes.id, input.id))
        .returning();
      return updated;
    }),

  /**
   * delete: remove a note by id
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const deleted = await db
        .delete(notes)
        .where(eq(notes.id, input.id))
        .returning();
      return { success: deleted.length > 0 };
    }),
});
