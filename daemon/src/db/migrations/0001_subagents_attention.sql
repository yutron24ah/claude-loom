-- Migration: add attention column to subagents table
-- WHY: M3.2 t2 — markAttention mutation requires a persistent flag per subagent.
-- Using integer(boolean) per SQLite convention (0=false, 1=true).
ALTER TABLE `subagents` ADD `attention` integer NOT NULL DEFAULT false;
