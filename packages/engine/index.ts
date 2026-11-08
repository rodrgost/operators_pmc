import { createHash } from 'node:crypto';
import type { State } from '../domain/index.ts';
import { drawInput, stateInput, drawFromHash, resolveTurn } from './core.ts';
export { gameDate } from './core.ts';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function draw(seed:string,turn:number,subsystem:string,entityId:string,key:string){return drawFromHash(digest(drawInput(seed,turn,subsystem,entityId,key)))}
export function stateHash(state:State){return digest(stateInput(state))}
export function advanceTurn(state:State,seed:string,startDate:string){
 const next={...state,turn:state.turn+1};
 return resolveTurn(state,startDate,draw(seed,next.turn,'bulletin','world','country'),stateHash(next));
}
