import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as worldEngine from '../packages/engine/world.ts';
import * as operationsEngine from '../packages/engine/operations.ts';
import {emptyPersonnel} from '../packages/engine/personnel.ts';
import {preset,type DifficultyId} from '../packages/engine/difficulty.ts';
const digest=async(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const seeds=Array.from({length:6},(_,i)=>'difficulty-balance-'+i);
const negative=new Set(['industrial_crisis','armed_conflict','humanitarian_need','security_incident']);
const positive=new Set(['political_reform','corporate_investment']);
async function simulate(seed:string,id:DifficultyId,we:any=worldEngine,oe:any=operationsEngine){
 const profile=preset(id);let world=await we.seedWorld(seed,0,digest),operations=oe.emptyOperations(),personnel=emptyPersonnel();operations.contracts=await oe.offers(seed,0,digest,profile);
 const hashes:string[]=[];
 for(let turn=1;turn<=336;turn++){
  const next=await we.worldTurn(world,operations,turn,seed,digest,profile);world=next.world;operations=next.operations;
  const result=await oe.operationsTurn(operations,personnel,turn,10000000,10,seed,digest,undefined,undefined,profile);operations=result.operations;personnel=result.personnel;
  await we.publishWorldContracts(world,operations,seed,turn,digest,profile);await we.refreshIntel(world,seed,turn,digest);
  we.validateWorld(world);
  hashes.push(await digest([we.worldCanonical(world),oe.opsCanonical(operations)]));
 }
 const contracts=operations.contracts;
 return {hashes,report:{seed,negativeEvents:world.events.filter((e:any)=>negative.has(e.type)).length,positiveEvents:world.events.filter((e:any)=>positive.has(e.type)).length,rivalClaims:world.events.filter((e:any)=>e.type==='rival_claimed').length,newContracts:contracts.length,meanOfferedRewardCents:Math.round(contracts.reduce((n:number,c:any)=>n+c.reward_cents,0)/contracts.length),finalMeanSecurity:Math.round(world.regions.reduce((n:number,r:any)=>n+r.security,0)/world.regions.length)}};
}
let baselineWorld:any,baselineOps:any;
if(process.env.DIFFICULTY_BASELINE){baselineWorld=await import(pathToFileURL(resolve(process.env.DIFFICULTY_BASELINE,'packages/engine/world.ts')).href);baselineOps=await import(pathToFileURL(resolve(process.env.DIFFICULTY_BASELINE,'packages/engine/operations.ts')).href)}
const campaigns:any[]=[];
for(const seed of seeds){for(const id of ['easy','normal','hard'] as const){const r=await simulate(seed,id);campaigns.push({difficulty:id,...r.report});if(id==='normal'&&baselineWorld){const old=await simulate(seed,id,baselineWorld,baselineOps);if(JSON.stringify(r.hashes)!==JSON.stringify(old.hashes))throw Error('Normal differs from pre-change engine: '+seed);}}}
const averages=Object.fromEntries(['easy','normal','hard'].map(id=>{const rows=campaigns.filter(r=>r.difficulty===id);return [id,Object.fromEntries(['negativeEvents','positiveEvents','rivalClaims','newContracts','meanOfferedRewardCents','finalMeanSecurity'].map(k=>[k,Math.round(rows.reduce((n,r)=>n+r[k],0)/rows.length*100)/100]))]}));
const output={turnsPerCampaign:336,seeds:seeds.length,profiles:3,normalMatchesPreviousEngine:baselineWorld?true:null,scope:'Simulação mundial sem missões do jogador. Verifica integridade e tendências; não prova sustentabilidade de todas as estratégias. Nenhum limite ou cadence base foi removido.',averages,campaigns};
writeFileSync('docs/DIFFICULTY_BALANCE.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({normalMatchesPreviousEngine:output.normalMatchesPreviousEngine,averages}));
