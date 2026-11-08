CREATE TABLE `online_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_id` text NOT NULL,
	`create_payload` text NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`state_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_creation` ON `online_campaigns` (`owner`,`request_id`);