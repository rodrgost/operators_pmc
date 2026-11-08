CREATE TABLE `online_equipment` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`condition` integer NOT NULL,
	`supplies` integer NOT NULL,
	`status` text NOT NULL,
	`mission_id` text,
	`due_turn` integer,
	`task` text,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "equipment_bounds" CHECK("online_equipment"."condition" BETWEEN 0 AND 100 AND "online_equipment"."supplies" BETWEEN 0 AND 100),
	CONSTRAINT "equipment_status" CHECK("online_equipment"."status" IN ('in_delivery','available','reserved','in_use','maintenance','destroyed'))
);
--> statement-breakpoint
CREATE INDEX `equipment_status_due` ON `online_equipment` (`game_id`,`status`,`due_turn`);--> statement-breakpoint
CREATE TABLE `online_facility_activities` (
	`game_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`attribute` text NOT NULL,
	`started_turn` integer NOT NULL,
	`minimum_end_turn` integer NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`game_id`, `operator_id`),
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `online_headquarters` (
	`game_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`activated_turn` integer NOT NULL,
	`arrears_cents` integer DEFAULT 0 NOT NULL,
	`last_bill_turn` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hq_arrears" CHECK("online_headquarters"."arrears_cents">=0)
);
--> statement-breakpoint
CREATE TABLE `online_hq_modules` (
	`game_id` text NOT NULL,
	`type` text NOT NULL,
	`level` integer NOT NULL,
	`target_level` integer,
	`due_turn` integer,
	PRIMARY KEY(`game_id`, `type`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hq_levels" CHECK("online_hq_modules"."level" BETWEEN 1 AND 5 AND ("online_hq_modules"."target_level" IS NULL OR "online_hq_modules"."target_level"="online_hq_modules"."level"+1 AND "online_hq_modules"."target_level"<=5))
);
--> statement-breakpoint
CREATE TABLE `online_mission_equipment` (
	`game_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`status` text NOT NULL,
	`returned_turn` integer,
	PRIMARY KEY(`game_id`, `mission_id`, `equipment_id`),
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`equipment_id`) REFERENCES `online_equipment`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_kit_mission` ON `online_mission_equipment` (`game_id`,`equipment_id`) WHERE "online_mission_equipment"."status"='assigned';--> statement-breakpoint
CREATE TABLE `online_training_progress` (
	`game_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`attribute` text NOT NULL,
	`progress` integer NOT NULL,
	PRIMARY KEY(`game_id`, `operator_id`, `attribute`),
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "training_progress_bounds" CHECK("online_training_progress"."progress" BETWEEN 0 AND 99)
);
--> statement-breakpoint
ALTER TABLE `online_games` ADD `logistics_initialized` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `online_games` ADD `logistics_version` text DEFAULT 'logistics-0.1' NOT NULL;