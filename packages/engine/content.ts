import catalog from '../rules/content.v1.json' with {type:'json'};
export {catalog};
// Independent, keyed text selection; never consumes or replaces a simulation draw.
export function textIndex(key:unknown,length:number){if(length<1)throw Error('Empty content pool');const source=JSON.stringify([catalog.version,key]);let h=2166136261;for(let i=0;i<source.length;i++){h^=source.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)%length;}
export function pickText<T>(pool:readonly T[],key:unknown):T{return pool[textIndex(key,pool.length)]!;}
export function operatorIdentity(id:string){return {catalogVersion:catalog.version,name:pickText(catalog.firstNames,[id,'first'])+' '+pickText(catalog.lastNames,[id,'last']),callsign:pickText(catalog.callsigns,[id,'callsign'])};}
export function contractContent(type:string,id:string,region:string,client:string,source:'commercial'|'world_event'){
 const entries=catalog.contracts[type as keyof typeof catalog.contracts];if(!entries)throw Error('Unknown contract content type');
 const chosen=pickText(entries,[id,type,'contract']);
 return {catalogVersion:catalog.version,title:chosen.title,objective:chosen.objective,briefing:`${client} solicita apoio em ${region}. ${chosen.objective}.`,context:source==='world_event'?'Demanda vinculada a uma ocorrência regional. Consulte a notícia de origem e as estimativas de inteligência.':'Oferta comercial periódica. Consulte as estimativas de inteligência e os requisitos antes de aceitar.'};
}
export function worldNarrative(type:string,key:unknown,region:string,hasOrigin:boolean){const pool=catalog.worldEvents[type as keyof typeof catalog.worldEvents];if(!pool)throw Error('Unknown world text type');return pickText(pool,key).replaceAll('{region}',region)+(hasOrigin?' Este registro integra uma sequência de acontecimentos regionais.':' Uma nova ocorrência foi registrada no histórico regional.');}
export function reportNarrative(outcome:string,key:unknown,stage?:string){const pool=catalog.reports[outcome as keyof typeof catalog.reports];if(!pool)throw Error('Unknown report outcome');const prefix=stage?catalog.stages[stage as keyof typeof catalog.stages]:null;return (prefix?pickText(prefix,[key,'stage'])+' ':'')+pickText(pool,[key,'outcome']);}
