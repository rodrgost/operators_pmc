CREATE TABLE `online_pending_orders` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`scope` text NOT NULL,
	`kind` text NOT NULL,
	`target` text,
	`command_json` text NOT NULL,
	`payload_json` text NOT NULL,
	`title` text NOT NULL,
	`cost_cents` integer NOT NULL,
	`created_turn` integer NOT NULL,
	`status` text NOT NULL,
	`committed_turn` integer,
	`result_json` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `online_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pending_orders_status` ON `online_pending_orders` (`game_id`,`status`);