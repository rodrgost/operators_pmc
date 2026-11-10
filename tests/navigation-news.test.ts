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
 const source=readFileSync('apps/web/composables/useNavigationNews.ts','utf8').replace(/^import .*\n/,'');
 function mount(){const ctx:any={exports:{},newsStatus,acknowledgeNews,useState:(key:string,init:any)=>stateStore[key]??(stateStore[key]={value:init()}),localStorage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v)}};runInNewContext(ts.transpileModule(source+';exports.h=useNavigationNews();',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS}}).outputText,ctx);return ctx.exports.h}
 let h=mount();h.sync('a',{'world.news':1});h.sync('b',{'world.news':1});
 h.sync('a',{'world.news':2,'world.intelligence':3});expect(h.status('a','world')).toBe('new');
 h.markRead('a','world.news');stateStore={};h=mount();h.sync('a',{'world.news':2,'world.intelligence':3});expect(h.status('a','world.news')).toBe('');expect(h.status('a','world.intelligence')).toBe('new');expect(h.status('b','world')).toBe('');
 h.sync('a',{'world.news':4,'world.intelligence':3});expect(h.status('a','world.news')).toBe('new');
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
