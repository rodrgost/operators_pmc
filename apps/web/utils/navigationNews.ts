export type NewsState={latest:Record<string,number>;seen:Record<string,number>;attention:string[]}
export function newsStatus(state:NewsState|undefined,key:string){
 if(!state)return '';
 const matches=(section:string)=>section===key||section.startsWith(key+'.');
 if(state.attention.some(matches))return 'attention';
 return Object.keys(state.latest).some(section=>matches(section)&&state.latest[section]>(state.seen[section]??0))?'new':'';
}
export function acknowledgeNews(state:NewsState,key:string){
 // Acknowledging a parent must never consume the unread subsections.
 return {...state,seen:{...state.seen,[key]:state.latest[key]??0}};
}
