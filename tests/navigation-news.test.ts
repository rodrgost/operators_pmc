import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {eventSections,navigationNews} from '../worker/navigation-news.ts';
import {newsStatus,acknowledgeNews,type NewsState} from '../apps/web/utils/navigationNews.ts';
import {setup} from './online-helpers.ts';
it('novidades: classifica destinos e ignora apenas relógio e fechamento rotineiro',()=>{
 expect(eventSections('turn_completed')).toEqual([]);expect(eventSections('weekly_close')).toEqual([]);
 expect(eventSections('world_armed_conflict')).toContain('world.news');
 expect(eventSections('mission_completed')).toContain('operations.history');
 expect(eventSections('equipment_ready')).toContain('infrastructure.inventory');
 expect(eventSections('recruitment_refreshed')).toContain('operators.recruitment');
 expect(eventSections('intelligence_analysis_completed')).toContain('world.intelligence');
});
it('novidades: limpar submenu preserva irmãos e atenção não é apagada pela leitura',()=>{
 let state:NewsState={latest:{'world.news':10,'world.intelligence':20},seen:{},attention:[] as string[]};
 expect(newsStatus(state,'world')).toBe('new');
 state=acknowledgeNews(state,'world');expect(newsStatus(state,'world.news')).toBe('new');
 state=acknowledgeNews(state,'world.news');expect(newsStatus(state,'world.news')).toBe('');expect(newsStatus(state,'world')).toBe('new');
 state=acknowledgeNews(state,'world.intelligence');expect(newsStatus(state,'world')).toBe('');
 state.attention=['operations.decisions'];state=acknowledgeNews(state,'operations.decisions');expect(newsStatus(state,'operations')).toBe('attention');
});
it('novidades: leitura persiste entre acessos e é isolada por companhia',()=>{
 const storage=new Map<string,string>();let stateStore:any={};
 const source=readFileSync('apps/web/composables/useNavigationNews.ts','utf8').replace(/^import [^\n]*\n/,'');
 function mount(){const ctx:any={exports:{},newsStatus,acknowledgeNews,useState:(key:string,init:any)=>stateStore[key]??(stateStore[key]={value:init()}),localStorage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v)}};runInNewContext(ts.transpileModule(source+';exports.h=useNavigationNews();',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS}}).outputText,ctx);return ctx.exports.h}
 const mission='operations.missions:mission-1',candidate='operators.recruitment:candidate-1';
 const dossier='world.regions.karsen.intelligence:security',offer='contracts.contract-1.offer:new';
 let h=mount();h.sync('a',{[mission]:1,[candidate]:1});h.sync('b',{[mission]:1});
 const latest={[mission]:2,[candidate]:2,[dossier]:3,[offer]:5,'world.news':4};
 h.sync('a',latest);
 for(const key of ['operations','operations.missions',mission,'operators',candidate,'world','world.regions',dossier,'contracts',offer])expect(h.status('a',key)).toBe('new');
 expect(h.status('a','world.news')).toBe('');
 h.markRead('a','operations.missions');expect(h.status('a',mission)).toBe('new');
 h.markRead('a',mission);stateStore={};h=mount();
 h.sync('a',latest);h.sync('b',{[mission]:2});
 expect(h.status('a','operations')).toBe('');expect(h.status('b','operations')).toBe('new');
 expect(h.status('a',dossier)).toBe('new');
 h.sync('a',{...latest,[mission]:5});expect(h.status('a',mission)).toBe('new');
 h.sync('existing',{[mission]:2,[dossier]:3},1);
 expect(h.status('existing',mission)).toBe('');expect(h.status('existing',dossier)).toBe('new');
});
it('novidades: mercado, contratação, oferta e análise apontam para seus próprios cards',async()=>{
 const s=setup();try{
  const g=(await s.call('/games',{requestId:'create',name:'Card PMC',seed:'card-news'})).data,path='/games/'+g.id;
  await s.call(path+'/intelligence');
  const people=async()=>(await s.call(path+'/personnel')).data;
  const post=async(route:string,requestId:string,body:any)=>s.call(path+route,{requestId,expectedVersion:(await s.call(path)).data.stateVersion,...body});
  const candidate=(await people()).candidates[0].id;
  const contract=(await s.call(path+'/contracts')).data[0].id;
  expect((await navigationNews(s.DB,g.id))['operators.recruitment:'+candidate]).toBe(1);
  await post('/recruitment/hire','hire',{candidateId:candidate,weeks:4});
  await post('/intelligence/analyses','study',{targetType:'region',targetId:'karsen',topic:'security'});
  await post('/intelligence/analyses','contract-study',{targetType:'contract',targetId:contract,topic:'risk'});
  s.db.prepare('UPDATE online_contracts SET expires_turn=1 WHERE id=?').run(contract);
  expect((await post('/advance','week',{turns:28,stopOnImportant:true})).data).toMatchObject({status:'completed',currentTurn:28});
  const latest=await navigationNews(s.DB,g.id),staff=await people();
  expect(latest['operators.recruitment:'+candidate]).toBeUndefined();
  expect(latest['operators.recruitment:'+staff.candidates[0].id]).toBe(29);
  expect(latest['operators.roster:'+staff.operators[0].id]).toBeGreaterThan(0);
  expect(latest['world.regions.karsen.intelligence:security']).toBeGreaterThan(0);
  expect(latest['contracts.'+contract+'.intelligence:risk']).toBeGreaterThan(0);
  expect((await s.call(path+'/operations')).data.contracts).toContainEqual(expect.objectContaining({id:contract,status:'expired'}));
  expect(Object.entries(latest).some(([key,cursor])=>key.endsWith('.offer:new')&&cursor===29)).toBe(true);
 }finally{s.db.close()}
});
it('novidades: usa eventos de todos os turnos e ordens confirmadas; leitura não muda campanha',async()=>{
 const s=setup();try{
  const g=(await s.call('/games',{requestId:'news-create',name:'News PMC',seed:'news'})).data,path='/games/'+g.id;
  await s.call(path+'/logistics');await s.call(path+'/intelligence');
  let current=(await s.call(path)).data;
  await s.call(path+'/equipment/purchases',{requestId:'buy',expectedVersion:current.stateVersion,catalogId:'combat-1',quantity:1});
  current=(await s.call(path)).data;
  await s.call(path+'/advance',{requestId:'advance',expectedVersion:current.stateVersion,turns:4,stopOnImportant:false});
  const before=(await s.call(path)).data,news=await navigationNews(s.DB,g.id);
  expect(news['infrastructure.inventory']).toBeGreaterThan(0);expect(news['finance.ledger']).toBeGreaterThan(0);
  const center=(await s.call(path+'/command-center')).data;expect(center.navigationNews).toEqual(news);
  expect((await s.call(path)).data).toEqual(before);
  expect((await s.call(path+'/command-center',undefined,'intruder')).status).toBe(404);
 }finally{s.db.close()}
});
