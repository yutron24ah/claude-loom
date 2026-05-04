import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import superjson from "superjson";
import { getOrCreateToken, verifyToken } from "./security/token.js";

export type Context = {
  token?: string;
  // Future: db / projectId added in later tasks
};

export function createContext({ req }: CreateFastifyContextOptions): Context {
  const token = req.headers["x-loom-token"] as string | undefined;
  return { token };
}

// WHY: superjson transformer must match the ui client (wsLink transformer: superjson).
// Without this, all WS responses produce TransformResultError — the server sends raw
// JSON while the client expects superjson envelope format (bug-2 root cause).
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// Eagerly load/create the daemon auth token at module init
const expectedToken = getOrCreateToken();

// auth middleware — Task 14 本実装: header token verify
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!verifyToken(ctx.token, expectedToken)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
  }
  return next();
});

export const TRPCErrorClass = TRPCError;
