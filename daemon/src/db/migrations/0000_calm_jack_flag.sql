CREATE TABLE `agent_pool` (
	`pool_slot_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_type` text NOT NULL,
	`slot_number` integer NOT NULL,
	`status` text NOT NULL,
	`current_subagent_id` text,
	`last_active_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_pool_unique_slot` ON `agent_pool` (`project_id`,`agent_type`,`slot_number`);--> statement-breakpoint
CREATE TABLE `consistency_findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spec_change_id` integer NOT NULL,
	`target_path` text NOT NULL,
	`severity` text NOT NULL,
	`finding_type` text NOT NULL,
	`description` text NOT NULL,
	`suggested_change` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`tool_name` text,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attached_type` text NOT NULL,
	`attached_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`source` text NOT NULL,
	`source_path` text,
	`parent_id` integer,
	`title` text NOT NULL,
	`body` text,
	`status` text NOT NULL,
	`position` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`project_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`root_path` text NOT NULL,
	`spec_path` text,
	`plan_path` text,
	`rules_path` text,
	`methodology` text DEFAULT 'agile' NOT NULL,
	`max_developers` integer DEFAULT 3 NOT NULL,
	`max_reviewers` integer DEFAULT 1 NOT NULL,
	`max_code_reviewers` integer DEFAULT 1 NOT NULL,
	`max_security_reviewers` integer DEFAULT 1 NOT NULL,
	`max_test_reviewers` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_root_path_unique` ON `projects` (`root_path`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`worktree_path` text NOT NULL,
	`role` text,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spec_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`spec_path` text NOT NULL,
	`before_hash` text NOT NULL,
	`after_hash` text NOT NULL,
	`diff` text NOT NULL,
	`detected_at` integer NOT NULL,
	`analyzed_at` integer,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subagents` (
	`subagent_id` text PRIMARY KEY NOT NULL,
	`parent_session_id` text NOT NULL,
	`pool_slot_id` text,
	`agent_type` text NOT NULL,
	`prompt_summary` text,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`result_summary` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`task_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	`active_form` text NOT NULL,
	`status` text NOT NULL,
	`position` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `token_usage` (
	`session_id` text NOT NULL,
	`bucket_at` integer NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cache_tokens` integer DEFAULT 0 NOT NULL
);
