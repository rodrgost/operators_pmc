CREATE TABLE `online_world_conflicts` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`region_id` text NOT NULL,
	`intensity` integer NOT NULL,
	`status` text NOT NULL,
	`started_turn` integer NOT NULL,
	`ended_turn` integer,
	`cause_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`region_id`) REFERENCES `online_world_regions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`cause_id`) REFERENCES `online_world_events`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_conflict_intensity" CHECK("online_world_conflicts"."intensity" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_world_conflict` ON `online_world_conflicts` (`game_id`,`region_id`) WHERE "online_world_conflicts"."status"='active';--> statement-breakpoint
CREATE TABLE `online_world_events` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`region_id` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`created_turn` integer NOT NULL,
	`end_turn` integer NOT NULL,
	`status` text NOT NULL,
	`origin_id` text,
	`contract_id` text,
	`summary` text NOT NULL,
	`effects_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`region_id`) REFERENCES `online_world_regions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`contract_id`) REFERENCES `online_contracts`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `world_event_region_turn` ON `online_world_events` (`game_id`,`region_id`,`created_turn`);--> statement-breakpoint
CREATE INDEX `world_event_status` ON `online_world_events` (`game_id`,`status`);--> statement-breakpoint
CREATE TABLE `online_world_influences` (
	`game_id` text NOT NULL,
	`region_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`game_id`, `region_id`, `organization_id`),
	FOREIGN KEY (`game_id`,`region_id`) REFERENCES `online_world_regions`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`organization_id`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_influence_bounds" CHECK("online_world_influences"."score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_world_rival_jobs` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`rival_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`region_id` text NOT NULL,
	`started_turn` integer NOT NULL,
	`completes_turn` integer NOT NULL,
	`status` text NOT NULL,
	`origin_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`rival_id`) REFERENCES `online_world_rivals`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`contract_id`) REFERENCES `online_contracts`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`origin_id`) REFERENCES `online_world_events`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_rival_contract` ON `online_world_rival_jobs` (`game_id`,`contract_id`);--> statement-breakpoint
CREATE INDEX `world_jobs_status` ON `online_world_rival_jobs` (`game_id`,`status`);--> statement-breakpoint
CREATE TABLE `online_world_organizations` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`goal` text NOT NULL,
	`resources` integer NOT NULL,
	`company_relation` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_org_bounds" CHECK("online_world_organizations"."resources" BETWEEN 0 AND 100 AND "online_world_organizations"."company_relation" BETWEEN -100 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_world_conflict_participants` (
	`game_id` text NOT NULL,
	`conflict_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`side` text NOT NULL,
	PRIMARY KEY(`game_id`, `conflict_id`, `organization_id`),
	FOREIGN KEY (`game_id`,`conflict_id`) REFERENCES `online_world_conflicts`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`organization_id`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `online_world_regions` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`country_id` text NOT NULL,
	`name` text NOT NULL,
	`stability` integer NOT NULL,
	`security` integer NOT NULL,
	`economy` integer NOT NULL,
	`tension` integer NOT NULL,
	`controller_id` text NOT NULL,
	`cooldown_until` integer NOT NULL,
	`last_event_id` text,
	`last_event_type` text,
	`intel_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`controller_id`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_region_bounds" CHECK("online_world_regions"."stability" BETWEEN 0 AND 100 AND "online_world_regions"."security" BETWEEN 0 AND 100 AND "online_world_regions"."economy" BETWEEN 0 AND 100 AND "online_world_regions"."tension" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_world_relations` (
	`game_id` text NOT NULL,
	`org_low` text NOT NULL,
	`org_high` text NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`game_id`, `org_low`, `org_high`),
	FOREIGN KEY (`game_id`,`org_low`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`org_high`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_relation_bounds" CHECK("online_world_relations"."org_low"<"online_world_relations"."org_high" AND "online_world_relations"."value" BETWEEN -100 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_world_rivals` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`capacity` integer NOT NULL,
	`budget_cents` integer NOT NULL,
	`reputation` integer NOT NULL,
	`specialization` text NOT NULL,
	`completed` integer NOT NULL,
	`failed` integer NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`id`) REFERENCES `online_world_organizations`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "world_rival_bounds" CHECK("online_world_rivals"."budget_cents">=0 AND "online_world_rivals"."reputation" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE `online_games` ADD `world_initialized` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `online_games` ADD `world_version` text DEFAULT 'world-0.1' NOT NULL;