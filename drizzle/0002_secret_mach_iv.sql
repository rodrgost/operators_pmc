CREATE TABLE `online_actions` (
	`game_id` text NOT NULL,
	`request_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`result_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `request_id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `online_employment` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`operator_id` text NOT NULL,
	`salary_cents` integer NOT NULL,
	`start_turn` integer NOT NULL,
	`end_turn` integer NOT NULL,
	`next_pay_turn` integer NOT NULL,
	`arrears_cents` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employment_bounds" CHECK("online_employment"."end_turn">"online_employment"."start_turn" AND "online_employment"."salary_cents">0 AND "online_employment"."arrears_cents">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_employment` ON `online_employment` (`game_id`,`operator_id`) WHERE "online_employment"."status"='active';--> statement-breakpoint
CREATE TABLE `online_familiarity` (
	`game_id` text NOT NULL,
	`operator_low` text NOT NULL,
	`operator_high` text NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`game_id`, `operator_low`, `operator_high`),
	FOREIGN KEY (`game_id`,`operator_low`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`operator_high`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "familiarity_bounds" CHECK("online_familiarity"."operator_low"<"online_familiarity"."operator_high" AND "online_familiarity"."score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_squad_members` (
	`game_id` text NOT NULL,
	`squad_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`joined_version` integer NOT NULL,
	`joined_turn` integer NOT NULL,
	`left_turn` integer,
	PRIMARY KEY(`game_id`, `squad_id`, `operator_id`, `joined_version`),
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`,`squad_id`) REFERENCES `online_squads`(`game_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_squad` ON `online_squad_members` (`game_id`,`operator_id`) WHERE "online_squad_members"."left_turn" IS NULL;--> statement-breakpoint
CREATE TABLE `online_operators` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`profile_json` text NOT NULL,
	`health` integer DEFAULT 100 NOT NULL,
	`fatigue` integer DEFAULT 0 NOT NULL,
	`morale` integer DEFAULT 80 NOT NULL,
	`loyalty` integer DEFAULT 60 NOT NULL,
	`hired_turn` integer NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "operator_conditions" CHECK("online_operators"."health" BETWEEN 0 AND 100 AND "online_operators"."fatigue" BETWEEN 0 AND 100 AND "online_operators"."morale" BETWEEN 0 AND 100 AND "online_operators"."loyalty" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE `online_personnel_history` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`turn` integer NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`data_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `personnel_history_turn` ON `online_personnel_history` (`game_id`,`turn`);--> statement-breakpoint
CREATE TABLE `online_recruitment` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`week` integer NOT NULL,
	`profile_json` text NOT NULL,
	`salary_cents` integer NOT NULL,
	`bonus_cents` integer NOT NULL,
	`hired` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recruitment_money" CHECK("online_recruitment"."salary_cents">0 AND "online_recruitment"."bonus_cents">=0)
);
--> statement-breakpoint
CREATE INDEX `recruitment_week` ON `online_recruitment` (`game_id`,`week`);--> statement-breakpoint
CREATE TABLE `online_reservations` (
	`game_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`kind` text NOT NULL,
	`source_id` text NOT NULL,
	`start_turn` integer NOT NULL,
	`end_turn` integer NOT NULL,
	PRIMARY KEY(`game_id`, `operator_id`),
	FOREIGN KEY (`game_id`,`operator_id`) REFERENCES `online_operators`(`game_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reservation_bounds" CHECK("online_reservations"."end_turn">"online_reservations"."start_turn" AND "online_reservations"."kind" IN ('mission','rest','training','recovery'))
);
--> statement-breakpoint
CREATE TABLE `online_squads` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`specialization` text NOT NULL,
	`leader_id` text,
	`deputy_id` text,
	`directives_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `online_games` ADD `personnel_version` text DEFAULT 'personnel-0.1' NOT NULL;--> statement-breakpoint
ALTER TABLE `online_games` ADD `personnel_initialized` integer DEFAULT 0 NOT NULL;