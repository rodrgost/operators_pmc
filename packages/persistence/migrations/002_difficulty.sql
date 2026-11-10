ALTER TABLE `games` ADD `difficulty` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `difficulty_version` text DEFAULT 'difficulty-1' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `difficulty_json` text DEFAULT '{"id":"normal","version":"difficulty-1","label":"Normal","description":"Equilíbrio original do jogo. Todos os multiplicadores permanecem em 1.","negativeEvents":1,"positiveEvents":1,"missionComplications":1,"rivalInterest":1,"contractReward":1}' NOT NULL;--> statement-breakpoint
CREATE TRIGGER local_difficulty_immutable
BEFORE UPDATE OF difficulty,difficulty_version,difficulty_json ON games
WHEN NEW.difficulty IS NOT OLD.difficulty OR NEW.difficulty_version IS NOT OLD.difficulty_version OR NEW.difficulty_json IS NOT OLD.difficulty_json
BEGIN
 SELECT RAISE(ABORT,'Campaign difficulty is immutable');
END;

INSERT INTO schema_migrations VALUES(2);
