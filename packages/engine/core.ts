import type { State, Summary, Event } from '../domain/index.ts';
import { rules, countries, RULES_VERSION } from '../rules/index.ts';
// Shared pure rules; adapters provide SHA-256 through their platform APIs.
export const drawInput = (seed:string, turn:number, subsystem:string, entityId:string, key:string) => [seed,RULES_VERSION,turn,subsystem,entityId,key];
export const stateInput = (state:State) => [state.turn,state.cashCents,state.reputation,state.status];
export const drawFromHash = (hex:string) => parseInt(hex.slice(0,13),16)/0x10000000000000;
export function gameDate(startDate:string,turn:number){return new Date(Date.parse(startDate)+turn*rules.hoursPerTurn*3600000).toISOString()}
export function resolveTurn(state:State,startDate:string,bulletinDraw:number,hash:string):{state:State;summary:Summary}{
 const next={...state,turn:state.turn+1};const events:Event[]=[];
 const add=(type:string,title:string,description:string,important=false)=>events.push({turn:next.turn,sequence:events.length,type,title,description,important});
 add('turn_completed','Turno concluído',`Janela de ${rules.hoursPerTurn} horas processada.`);
 if(next.turn%4===0){const country=countries[Math.floor(bulletinDraw*countries.length)];add('public_bulletin',`Boletim · ${country.name}`,'Atualização pública registrada. A simulação de crises e contratos será incorporada nas próximas fases.');}
 if(next.turn%rules.turnsPerWeek===0)add('weekly_close','Fechamento semanal',`Semana ${next.turn/rules.turnsPerWeek} encerrada. Nenhuma despesa operacional contratada nesta fase.`,true);
 return {state:next,summary:{turn:next.turn,date:gameDate(startDate,next.turn),events,stateHash:hash}};
}
