import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.LOOM_DB_PATH ?? `${process.env.HOME}/.claude-loom/loom.db`,
  },
});
