CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS games(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,seed TEXT NOT NULL,rules_version TEXT NOT NULL,start_date TEXT NOT NULL,
 current_turn INTEGER NOT NULL CHECK(current_turn>=0),cash_cents INTEGER NOT NULL,reputation INTEGER NOT NULL CHECK(reputation BETWEEN 0 AND 100),
 status TEXT NOT NULL CHECK(status IN('active','financial_crisis')),state_version INTEGER NOT NULL CHECK(state_version>=0));
CREATE TABLE IF NOT EXISTS creation_requests(request_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL,game_id TEXT NOT NULL REFERENCES games(id));
CREATE TABLE IF NOT EXISTS advance_requests(
 game_id TEXT NOT NULL REFERENCES games(id),request_id TEXT NOT NULL,payload_json TEXT NOT NULL,requested_turns INTEGER NOT NULL,
 processed_turns INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL CHECK(status IN('processing','completed','failed','interrupted')),
 last_committed_turn INTEGER NOT NULL,interruption_reason TEXT,result_json TEXT,PRIMARY KEY(game_id,request_id));
CREATE TABLE IF NOT EXISTS countries(game_id TEXT NOT NULL REFERENCES games(id),id TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL,PRIMARY KEY(game_id,id));
CREATE TABLE IF NOT EXISTS regions(game_id TEXT NOT NULL,country_id TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(game_id,id),FOREIGN KEY(game_id,country_id) REFERENCES countries(game_id,id));
CREATE TABLE IF NOT EXISTS organizations(game_id TEXT NOT NULL REFERENCES games(id),id TEXT NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,PRIMARY KEY(game_id,id));
CREATE TABLE IF NOT EXISTS game_events(game_id TEXT NOT NULL REFERENCES games(id),turn INTEGER NOT NULL,sequence INTEGER NOT NULL,type TEXT NOT NULL,payload_json TEXT NOT NULL,PRIMARY KEY(game_id,turn,sequence));
CREATE TABLE IF NOT EXISTS turn_summaries(game_id TEXT NOT NULL REFERENCES games(id),turn INTEGER NOT NULL,summary_json TEXT NOT NULL,state_hash TEXT NOT NULL,PRIMARY KEY(game_id,turn));
CREATE TABLE IF NOT EXISTS financial_ledger(game_id TEXT NOT NULL REFERENCES games(id),source_id TEXT NOT NULL,turn INTEGER NOT NULL,amount_cents INTEGER NOT NULL,entry_type TEXT NOT NULL,PRIMARY KEY(game_id,source_id));
CREATE INDEX IF NOT EXISTS events_timeline ON game_events(game_id,turn DESC,sequence DESC);
INSERT OR IGNORE INTO schema_migrations VALUES(1);
