import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

export type Context = {
  token?: string;
  // Future: db / projectId added in later tasks
};

export function createContext({ req }: CreateFastifyContextOptions): Context {
  const token = req.headers["x-loom-token"] as string | undefined;
  return { token };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// auth middleware — Task 14 で本実装、M1 では skeleton
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // token verification is implemented in Task 14
  // for now, pass through
  return next();
});

export const TRPCErrorClass = TRPCError;
