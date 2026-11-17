import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {catalog,operatorAppearance,uniqueOperatorName} from '../packages/engine/content.ts';
import {market,uniqueCandidateNames,emptyPersonnel,personnelTurn} from '../packages/engine/personnel.ts';
const digest=async(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const row=(id:string,name:string)=>({id,profile_json:JSON.stringify({name,...operatorAppearance(name)}),hired:0});
const names=(rows:any[])=>rows.map(r=>JSON.parse(r.profile_json).name);
it('nomes: corrige colisões de candidatos antigos sem renomear contratados',()=>{
 const operators=[row('old','Ana Vale')],candidates=[row('a','Ana Vale'),row('b','Ana Vale')];
 const result=uniqueCandidateNames(candidates,operators),all=names([...operators,...result]);
 expect(new Set(all).size).toBe(3);
 expect(result).toEqual(uniqueCandidateNames(candidates,operators));
 expect(uniqueCandidateNames(result,operators)).toEqual(result);
 expect(names(operators)).toEqual(['Ana Vale']);expect(names(candidates)).toEqual(['Ana Vale','Ana Vale']);
 for(const c of result){const profile=JSON.parse(c.profile_json);expect(profile).toMatchObject(operatorAppearance(profile.name));}
});
it('nomes: renovação semanal evita todo o histórico de operadores',async()=>{
 const p=emptyPersonnel();p.candidates=await market('names',0,10,digest);
 p.operators=p.candidates.map(c=>({...c,health:100,fatigue:0}));
 const next=await personnelTurn(p,28,0,'names',10,digest);
 const all=names([...next.personnel.operators,...next.personnel.candidates]);
 expect(new Set(all).size).toBe(all.length);
 const original=await market('names',1,10,digest);
 const blocked=original.map(c=>row('old-'+c.id,JSON.parse(c.profile_json).name));
 const regenerated=await market('names',1,10,digest,blocked);
 expect(new Set(names([...blocked,...regenerated])).size).toBe(blocked.length+regenerated.length);
 expect(regenerated.map(c=>c.id)).toEqual(original.map(c=>c.id));
});
it('nomes: busca todo o catálogo e sinaliza esgotamento',()=>{
 const all=catalog.firstNames.flatMap(first=>catalog.lastNames.map(last=>first+' '+last));
 const used=new Set(all.slice(0,-1));
 expect(uniqueOperatorName(all[0]!,'collision',used)).toBe(all.at(-1));
 used.add(all.at(-1)!);expect(()=>uniqueOperatorName(all[0]!,'collision',used)).toThrow('esgotado');
});
