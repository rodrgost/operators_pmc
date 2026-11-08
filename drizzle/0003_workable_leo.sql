CREATE TABLE `online_mission_assignments` (
	`game_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`assignment_type` text NOT NULL,
	`role` text NOT NULL,
	`snapshot_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `mission_id`, `operator_id`),
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `online_contracts` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`region_id` text NOT NULL,
	`client_id` text NOT NULL,
	`source` text NOT NULL,
	`origin_event_id` text,
	`offered_turn` integer NOT NULL,
	`expires_turn` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`risk` integer NOT NULL,
	`intel_json` text NOT NULL,
	`reward_cents` integer NOT NULL,
	`minimum_operators` integer NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "contract_metrics" CHECK("online_contracts"."difficulty" BETWEEN 1 AND 100 AND "online_contracts"."risk" BETWEEN 1 AND 100 AND "online_contracts"."reward_cents">0)
);
--> statement-breakpoint
CREATE INDEX `contracts_status_expiry` ON `online_contracts` (`game_id`,`status`,`expires_turn`);--> statement-breakpoint
CREATE TABLE `online_decisions` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`mission_id` text NOT NULL,
	`stage_index` integer NOT NULL,
	`created_turn` integer NOT NULL,
	`expires_turn` integer NOT NULL,
	`fallback_action` text NOT NULL,
	`chosen_action` text,
	`resolved_turn` integer,
	`status` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_decision_per_stage` ON `online_decisions` (`game_id`,`mission_id`,`stage_index`);--> statement-breakpoint
CREATE INDEX `decisions_deadline` ON `online_decisions` (`game_id`,`status`,`expires_turn`);--> statement-breakpoint
CREATE TABLE `online_missions` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`contract_id` text NOT NULL,
	`squad_id` text NOT NULL,
	`leader_id` text NOT NULL,
	`deputy_id` text,
	`directives_json` text NOT NULL,
	`status` text NOT NULL,
	`started_turn` integer NOT NULL,
	`ended_turn` integer,
	`stage_index` integer NOT NULL,
	`stage_due_turn` integer NOT NULL,
	`delays` integer NOT NULL,
	`success_points` integer NOT NULL,
	`completed_stages` integer NOT NULL,
	`advance_cents` integer NOT NULL,
	`paid_cents` integer NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`contract_id`) REFERENCES `online_contracts`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`squad_id`) REFERENCES `online_squads`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_mission_per_contract` ON `online_missions` (`game_id`,`contract_id`);--> statement-breakpoint
CREATE INDEX `missions_status` ON `online_missions` (`game_id`,`status`);--> statement-breakpoint
CREATE TABLE `online_mission_reports` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`mission_id` text NOT NULL,
	`turn` integer NOT NULL,
	`summary_json` text NOT NULL,
	`audit_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`mission_id`) REFERENCES `online_missions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_mission_turn` ON `online_mission_reports` (`game_id`,`mission_id`,`turn`);--> statement-breakpoint
ALTER TABLE `online_games` ADD `operations_initialized` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `online_games` ADD `operations_version` text DEFAULT 'operations-0.1' NOT NULL;