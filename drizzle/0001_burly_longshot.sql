CREATE TABLE `online_commands` (
	`game_id` text NOT NULL,
	`request_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`requested_turns` integer NOT NULL,
	`processed_turns` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`last_turn` integer NOT NULL,
	`result_version` integer NOT NULL,
	PRIMARY KEY(`game_id`, `request_id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "online_command_progress" CHECK("online_commands"."processed_turns" BETWEEN 0 AND "online_commands"."requested_turns" AND "online_commands"."requested_turns" BETWEEN 1 AND 28),
	CONSTRAINT "online_command_status" CHECK("online_commands"."status" IN ('processing','completed','interrupted','failed'))
);
--> statement-breakpoint
CREATE TABLE `online_events` (
	`game_id` text NOT NULL,
	`turn` integer NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`important` integer NOT NULL,
	PRIMARY KEY(`game_id`, `turn`, `sequence`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "online_event_order" CHECK("online_events"."turn" >= 1 AND "online_events"."sequence" >= 0),
	CONSTRAINT "online_event_important" CHECK("online_events"."important" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `online_games` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`creation_request_id` text NOT NULL,
	`creation_payload` text NOT NULL,
	`name` text NOT NULL,
	`seed` text NOT NULL,
	`rules_version` text NOT NULL,
	`start_date` text NOT NULL,
	`current_turn` integer DEFAULT 0 NOT NULL,
	`cash_cents` integer NOT NULL,
	`reputation` integer NOT NULL,
	`status` text NOT NULL,
	`state_version` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`active_request` text,
	`commit_token` text NOT NULL,
	`created_order` integer NOT NULL,
	CONSTRAINT "online_game_turn" CHECK("online_games"."current_turn" >= 0),
	CONSTRAINT "online_game_reputation" CHECK("online_games"."reputation" BETWEEN 0 AND 100),
	CONSTRAINT "online_game_revision" CHECK("online_games"."revision" >= 0 AND "online_games"."state_version" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `online_game_creation` ON `online_games` (`owner`,`creation_request_id`);--> statement-breakpoint
CREATE INDEX `online_game_owner` ON `online_games` (`owner`,`created_order`);--> statement-breakpoint
CREATE TABLE `online_ledger` (
	`game_id` text NOT NULL,
	`source_id` text NOT NULL,
	`entry_type` text NOT NULL,
	`turn` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	PRIMARY KEY(`game_id`, `source_id`, `entry_type`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `online_ledger_turn` ON `online_ledger` (`game_id`,`turn`);--> statement-breakpoint
CREATE TABLE `online_turn_summaries` (
	`game_id` text NOT NULL,
	`turn` integer NOT NULL,
	`date` text NOT NULL,
	`state_hash` text NOT NULL,
	PRIMARY KEY(`game_id`, `turn`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE cascade
);
