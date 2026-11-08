export interface State { turn:number; cashCents:number; reputation:number; status:'active'|'financial_crisis'; }
export interface Event { turn:number; sequence:number; type:string; title:string; description:string; important:boolean; }
export interface Summary { turn:number; date:string; events:Event[]; stateHash:string; }
export interface Game { id:string; name:string; seed:string; rulesVersion:string; startDate:string; stateVersion:number; state:State; }
export interface AdvanceResult { requestId:string; requestedTurns:number; processedTurns:number; currentTurn:number; stateVersion:number; status:'processing'|'completed'|'interrupted'|'failed'; reason:string|null; }
export class DomainError extends Error { constructor(public code:string, message:string, public statusCode=409){super(message)} }
