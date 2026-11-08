CREATE TABLE `online_intel_analyses` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`topic` text NOT NULL,
	`requested_turn` integer NOT NULL,
	`due_turn` integer NOT NULL,
	`cost_cents` integer NOT NULL,
	`status` text NOT NULL,
	`completed_turn` integer,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intel_analysis_due` ON `online_intel_analyses` (`game_id`,`status`,`due_turn`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_pending_analysis` ON `online_intel_analyses` (`game_id`,`target_type`,`target_id`,`topic`) WHERE "online_intel_analyses"."status"='pending';--> statement-breakpoint
CREATE TABLE `online_intel_current` (
	`game_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`topic` text NOT NULL,
	`source` text NOT NULL,
	`record_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `target_type`, `target_id`, `topic`, `source`),
	FOREIGN KEY (`game_id`,`record_id`) REFERENCES `online_intel_records`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `online_intel_records` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`topic` text NOT NULL,
	`level` integer NOT NULL,
	`estimate_json` text NOT NULL,
	`confidence` integer NOT NULL,
	`source` text NOT NULL,
	`collected_turn` integer NOT NULL,
	`valid_until_turn` integer NOT NULL,
	`supersedes_id` text,
	`origin_id` text,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`supersedes_id`) REFERENCES `online_intel_records`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "intel_record_bounds" CHECK("online_intel_records"."level" BETWEEN 0 AND 3 AND "online_intel_records"."confidence" BETWEEN 0 AND 100 AND "online_intel_records"."valid_until_turn">="online_intel_records"."collected_turn")
);
--> statement-breakpoint
CREATE INDEX `intel_target_history` ON `online_intel_records` (`game_id`,`target_type`,`target_id`,`topic`,`collected_turn`);--> statement-breakpoint
CREATE TABLE `online_mission_intelligence` (
	`game_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `mission_id`),
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `online_games` ADD `intelligence_initialized` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `online_games` ADD `intelligence_version` text DEFAULT 'intelligence-0.1' NOT NULL;