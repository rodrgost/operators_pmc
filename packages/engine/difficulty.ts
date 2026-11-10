import {z} from 'zod';
import archive from '../rules/difficulty.v1.json' with {type:'json'};
export const difficultyId=z.enum(['easy','normal','hard']);
export type DifficultyId=z.infer<typeof difficultyId>;
export const difficultySchema=z.object({id:difficultyId,version:z.literal('difficulty-1'),label:z.string(),description:z.string(),negativeEvents:z.number().min(0).max(3),positiveEvents:z.number().min(0).max(3),missionComplications:z.number().min(0).max(3),rivalInterest:z.number().positive().max(3),contractReward:z.number().positive().max(3)}).strict();
export type DifficultyProfile=Readonly<z.infer<typeof difficultySchema>>;
// Never edit an applied archive. Add a new version and keep this one available for old campaigns.
const profiles=Object.freeze(Object.fromEntries(Object.entries(archive.profiles).map(([id,p])=>[id,Object.freeze(difficultySchema.parse(p))])) as Record<DifficultyId,DifficultyProfile>);
export const NORMAL_V1=profiles.normal;
export const difficultyChoices=()=>Object.values(profiles);
export function preset(id:DifficultyId='normal'):DifficultyProfile {return profiles[id]}
export function savedDifficulty(id:string,version:string,snapshot:string):DifficultyProfile {
 const p=difficultySchema.parse(JSON.parse(snapshot));
 if(p.id!==id||p.version!==version)throw new Error('Invalid difficulty snapshot');
 return Object.freeze(p);
}
export const probability=(base:number,multiplier:number)=>Math.max(0,Math.min(1,base*multiplier));
export const reward=(cents:number,p:DifficultyProfile=NORMAL_V1)=>Math.round(cents*p.contractReward);
export function eventProbability(base:number,polarity:'positive'|'negative',p:DifficultyProfile=NORMAL_V1){return probability(base,polarity==='positive'?p.positiveEvents:p.negativeEvents)}
// Normal is byte-for-byte equivalent to the original cadence and ordering.
export function rivalWindow(turn:number,cadence:number,p:DifficultyProfile=NORMAL_V1){return p.rivalInterest===1?Math.floor(turn/cadence):Math.floor((turn*p.rivalInterest+1e-9)/cadence)}
export function rivalActs(turn:number,cadence:number,p:DifficultyProfile=NORMAL_V1){return turn>0&&rivalWindow(turn,cadence,p)>rivalWindow(turn-1,cadence,p)}
