DROP INDEX `one_rival_contract`;--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_rival_contract` ON `online_world_rival_jobs` (`game_id`,`contract_id`) WHERE "online_world_rival_jobs"."status"='active';--> statement-breakpoint
CREATE INDEX `world_jobs_contract_history` ON `online_world_rival_jobs` (`game_id`,`contract_id`,`started_turn`,`id`);