CREATE TABLE `online_hq_modules_next` (
 `game_id` text NOT NULL REFERENCES `online_games`(`id`),
 `type` text NOT NULL,
 `level` integer NOT NULL,
 `target_level` integer,
 `due_turn` integer,
 PRIMARY KEY (`game_id`, `type`),
 CONSTRAINT `hq_levels` CHECK ((level BETWEEN 1 AND 5 OR type = 'intelligence' AND level = 0) AND (target_level IS NULL OR target_level = level + 1 AND target_level <= 5))
);
--> statement-breakpoint
INSERT INTO `online_hq_modules_next` SELECT * FROM `online_hq_modules`;
--> statement-breakpoint
DROP TABLE `online_hq_modules`;
--> statement-breakpoint
ALTER TABLE `online_hq_modules_next` RENAME TO `online_hq_modules`;
