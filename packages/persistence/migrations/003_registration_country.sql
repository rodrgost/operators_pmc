ALTER TABLE games ADD registration_country_id TEXT CHECK(registration_country_id IS NULL OR registration_country_id IN ('valdoria','karsen','solmar','norvik','arken'));
CREATE TRIGGER games_registration_immutable BEFORE UPDATE OF registration_country_id ON games
WHEN NEW.registration_country_id IS NOT OLD.registration_country_id BEGIN SELECT RAISE(ABORT,'Company registration country is immutable'); END;
INSERT INTO schema_migrations VALUES(3);
