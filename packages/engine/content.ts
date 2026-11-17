import catalog from '../rules/content.v1.json' with {type:'json'};
export {catalog};
// Independent, keyed text selection; never consumes or replaces a simulation draw.
export function textIndex(key:unknown,length:number){if(length<1)throw Error('Empty content pool');const source=JSON.stringify([catalog.version,key]);let h=2166136261;for(let i=0;i<source.length;i++){h^=source.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)%length;}
export function pickText<T>(pool:readonly T[],key:unknown):T{return pool[textIndex(key,pool.length)]!;}
// Appearance uses an independent key, keeping portraits stable across hiring and reloads.
const femaleNames=new Set('Ana Camila Elisa Helena Joana Maya Adriana Alice Beatriz Cecília Clara Diana Ester Fernanda Inês Isabel Júlia Lara Letícia Lídia Lívia Lorena Luana Manuela Marina Natália Patrícia Raquel Renata Rita Sara Sofia Teresa Valentina Yasmin Astrid Elena Eva Irina Leah Nadia Nora'.split(' '));
function portraitCount(gender:string,specialization?:string){
 const combat=specialization!==undefined&&!['medic','technical'].includes(specialization);
 return combat?(gender==='female'?13:17):(gender==='female'?4:6);
}
export function operatorAppearance(name:string,specialization?:string){
 const gender=femaleNames.has(name.trim().split(/\s+/)[0]!)?'female':'male';
 return {gender,portraitVariant:1+textIndex([name,'portrait'],portraitCount(gender,specialization))};
}
export function operatorPortrait(name:string,specialization:string,gender?:string,portraitVariant?:number){
 const fallback=operatorAppearance(name),sex=gender==='female'||gender==='male'?gender:fallback.gender;
 const count=portraitCount(sex,specialization);
 const variant=Number.isInteger(portraitVariant)&&(portraitVariant ?? 0)>=1&&(portraitVariant ?? 0)<=count?portraitVariant!:1+textIndex([name,'portrait'],portraitCount(sex));
 const group=specialization==='medic'?'medicos':specialization==='technical'?'tecnicos':'combate';
 const suffix='_'+variant;
 return `/images/operadores/${group}/${group}_${sex==='female'?'mulher':'homem'}${suffix}.webp`;
}
export function operatorIdentity(id:string,specialization?:string){const name=pickText(catalog.firstNames,[id,'first'])+' '+pickText(catalog.lastNames,[id,'last']);return {...operatorAppearance(name,specialization),catalogVersion:catalog.version,name,callsign:pickText(catalog.callsigns,[id,'callsign'])};}
// Scan the full catalog on collision: bounded, deterministic, and independent of simulation draws.
export function uniqueOperatorName(preferred:string,key:string,used:ReadonlySet<string>){
 if(!used.has(preferred))return preferred;
 const size=catalog.firstNames.length*catalog.lastNames.length,start=textIndex([key,'unique-name'],size);
 for(let offset=0;offset<size;offset++){
  const index=(start+offset)%size;
  const name=catalog.firstNames[Math.floor(index/catalog.lastNames.length)]+' '+catalog.lastNames[index%catalog.lastNames.length];
  if(!used.has(name))return name;
 }
 throw new Error('Catálogo de nomes de operadores esgotado.');
}
export function contractContent(type:string,id:string,region:string,client:string,source:'commercial'|'world_event'){
 const entries=catalog.contracts[type as keyof typeof catalog.contracts];if(!entries)throw Error('Unknown contract content type');
 const chosen=pickText(entries,[id,type,'contract']);
 return {catalogVersion:catalog.version,title:chosen.title,objective:chosen.objective,briefing:`${client} solicita apoio em ${region}. ${chosen.objective}.`,context:source==='world_event'?'Demanda vinculada a uma ocorrência do país. Consulte a notícia de origem e as estimativas de inteligência.':'Oferta comercial periódica. Consulte as estimativas de inteligência e os requisitos antes de aceitar.'};
}
export function worldNarrative(type:string,key:unknown,region:string,hasOrigin:boolean){const pool=catalog.worldEvents[type as keyof typeof catalog.worldEvents];if(!pool)throw Error('Unknown world text type');return pickText(pool,key).replaceAll('{region}',region)+(hasOrigin?' Este registro integra uma sequência de acontecimentos do país.':' Uma nova ocorrência foi registrada no histórico do país.');}
export function reportNarrative(outcome:string,key:unknown,stage?:string){const pool=catalog.reports[outcome as keyof typeof catalog.reports];if(!pool)throw Error('Unknown report outcome');const prefix=stage?catalog.stages[stage as keyof typeof catalog.stages]:null;return (prefix?pickText(prefix,[key,'stage'])+' ':'')+pickText(pool,[key,'outcome']);}
