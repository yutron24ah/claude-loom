/**
 * tRPC sub-router: note
 * SPEC §6.2 — notes table operations
 * M1 Task 8 Subset C
 * M3.2 t3 — NOTE_ATTACHED_TYPE constants added (SPEC §3.6.10 — no string literals)
 * M5 t2 — NOTE_ATTACHED_TYPE moved to constants/note.ts (browser-safe, no Node.js deps)
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { notes } from "../db/schema.js";
import type { Note, NewNote } from "../db/schema.js";
import { NOTE_ATTACHED_TYPE } from "../constants/note.js";

// Re-export for consumers that import NOTE_ATTACHED_TYPE from routes/note.ts (backward compat)
export { NOTE_ATTACHED_TYPE } from "../constants/note.js";
export type { NoteAttachedType } from "../constants/note.js";

/**
 * WHY: derived from NOTE_ATTACHED_TYPE to keep enum values in sync with the constant.
 * z.nativeEnum rejects any string not present in the object, preventing typo bugs.
 * SPEC §3.6.10 — enum constraint for note attachedType.
 */
const attachedTypeEnum = z.enum([
  NOTE_ATTACHED_TYPE.PROJECT,
  NOTE_ATTACHED_TYPE.SESSION,
  NOTE_ATTACHED_TYPE.SUBAGENT,
  NOTE_ATTACHED_TYPE.TASK,
  NOTE_ATTACHED_TYPE.POOL_SLOT,
  NOTE_ATTACHED_TYPE.PLAN_ITEM,
]);

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
        // WHY: enum constraint prevents unknown attachedType values (SPEC §3.6.10)
        attachedType: attachedTypeEnum.optional(),
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
        // WHY: enum constraint prevents unknown attachedType values (SPEC §3.6.10)
        attachedType: attachedTypeEnum,
        attachedId: z.string(),
        // WHY: 10000 char max prevents DoS via oversized note payloads
        content: z.string().max(10000),
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
        // WHY: 10000 char max prevents DoS via oversized note payloads (consistent with create)
        content: z.string().max(10000),
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
