import {NORMAL_V1,savedDifficulty} from '../engine/difficulty.ts';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Game } from '../domain/index.ts';
export function openDatabase(path:string){
 if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 db.exec(readFileSync(new URL('./migrations/001_foundation.sql',import.meta.url),'utf8'));if(!db.prepare('SELECT version FROM schema_migrations WHERE version=2').get()){db.exec('BEGIN IMMEDIATE');try{db.exec(readFileSync(new URL('./migrations/002_difficulty.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}if(!db.prepare('SELECT version FROM schema_migrations WHERE version=3').get())db.exec(readFileSync(new URL('./migrations/003_registration_country.sql',import.meta.url),'utf8'));return db;
}
export function transaction<T>(db:DatabaseSync,fn:()=>T):T { db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e} }
export function rowGame(row:any):Game {return {registrationCountryId:row.registration_country_id??null,difficultyProfile:savedDifficulty(row.difficulty??'normal',row.difficulty_version??'difficulty-1',row.difficulty_json??JSON.stringify(NORMAL_V1)),id:row.id,name:row.name,seed:row.seed,rulesVersion:row.rules_version,startDate:row.start_date,stateVersion:row.state_version,state:{turn:row.current_turn,cashCents:row.cash_cents,reputation:row.reputation,status:row.status}}}
