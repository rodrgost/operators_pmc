import { readFileSync,readdirSync } from 'node:fs';
// Local adapter mirrors D1: every batch is one atomic transaction.
export function sqliteD1(db,onRun=()=>{}){
 function prepare(sql){let args=[];const statement={bind(...values){args=values;return statement},execute(){
  onRun(sql,args);const query=db.prepare(sql);
  if(query.columns().length)return {results:query.all(...args),meta:{changes:0}};
  const r=query.run(...args);return {results:[],meta:{changes:Number(r.changes)}};
 },async first(){return statement.execute().results[0]??null},async all(){return statement.execute()},async run(){return statement.execute()}};return statement;}
 return {prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};
}
export function applyMigrations(db,directory='drizzle'){
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS preview_migrations(name TEXT PRIMARY KEY)');
 for(const file of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort()){
  if(db.prepare('SELECT name FROM preview_migrations WHERE name=?').get(file))continue;
  db.exec('BEGIN IMMEDIATE');try{
   // Original previews could have the first schema before migration tracking was introduced.
   const legacy=file==='0000_open_wilson_fisk.sql'&&db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='online_campaigns'").get();
   if(!legacy)db.exec(readFileSync(directory+'/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
   db.prepare('INSERT INTO preview_migrations VALUES(?)').run(file);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
 }
}
