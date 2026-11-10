import {it,expect} from 'vitest';
import {setup,legacyFixture} from './online-helpers.ts';
it('exclui somente a companhia confirmada e seus dependentes, sem ressurreição legada',async()=>{
 const {db,call}=setup();const old=legacyFixture(db,{turns:0});
 const g=(await call('/games/'+old.id)).data;
 for(const route of ['personnel','operations','world','logistics','intelligence'])await call('/games/'+g.id+'/'+route);
 await call('/games/'+g.id+'/advance',{requestId:'advance-delete',expectedVersion:(await call('/games/'+g.id)).data.stateVersion,turns:4,stopOnImportant:false});
 const other=(await call('/games',{requestId:'other',name:'Outra PMC',seed:'other'})).data;
 expect((await call('/games/'+g.id,{confirmationName:g.name,expectedVersion:g.stateVersion},'intruder','DELETE')).status).toBe(404);
 expect((await call('/games/'+g.id,{confirmationName:'errado',expectedVersion:g.stateVersion},'owner','DELETE')).status).toBe(422);
 const latest=(await call('/games/'+g.id)).data;
 expect((await call('/games/'+g.id,{confirmationName:g.name,expectedVersion:latest.stateVersion+1},'owner','DELETE')).status).toBe(409);
 expect((await call('/games/'+g.id,{confirmationName:g.name,expectedVersion:latest.stateVersion},'owner','DELETE')).status).toBe(200);
 expect((await call('/games/'+g.id)).status).toBe(404);
 expect((await call('/games')).data.map((x:any)=>x.id)).toEqual([other.id]);
 for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'online_%'").all() as any[]){
  const columns=db.prepare(`PRAGMA table_info(${name})`).all() as any[];
  if(columns.some(x=>x.name==='game_id'))expect(db.prepare(`SELECT count(*) AS n FROM ${name} WHERE game_id=?`).get(g.id)).toEqual({n:0});
 }
 expect(db.prepare('SELECT id FROM online_campaigns WHERE id=?').get(g.id)).toBeUndefined();
});
it('impede exclusão durante processamento de turnos',async()=>{
 const {db,call}=setup();const g=(await call('/games',{requestId:'active',name:'Ativa PMC',seed:'active'})).data;
 db.prepare("UPDATE online_games SET active_request='running' WHERE id=?").run(g.id);
 expect((await call('/games/'+g.id,{confirmationName:g.name,expectedVersion:g.stateVersion},'owner','DELETE')).status).toBe(409);
 expect((await call('/games/'+g.id)).status).toBe(200);
});
