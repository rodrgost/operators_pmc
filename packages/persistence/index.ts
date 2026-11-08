import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Game } from '../domain/index.ts';
export function openDatabase(path:string){
 if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 db.exec(readFileSync(new URL('./migrations/001_foundation.sql',import.meta.url),'utf8'));return db;
}
export function transaction<T>(db:DatabaseSync,fn:()=>T):T { db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e} }
export function rowGame(row:any):Game {return {id:row.id,name:row.name,seed:row.seed,rulesVersion:row.rules_version,startDate:row.start_date,stateVersion:row.state_version,state:{turn:row.current_turn,cashCents:row.cash_cents,reputation:row.reputation,status:row.status}}}
