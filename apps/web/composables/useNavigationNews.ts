import {newsStatus,acknowledgeNews,type NewsState} from '../utils/navigationNews'
export function useNavigationNews(){
 const states=useState<Record<string,NewsState>>('navigation-news',()=>({}))
 const activeScope=useState('campaign-active-scope',()=> '')
 const storageKey=(id:string)=>'operators-navigation-seen-v1:'+id
 const ongoingOperations='operations.missions'
 function sync(id:string,cursors:Record<string,number>,hasActiveOperations:boolean){
  const latest={[ongoingOperations]:cursors[ongoingOperations]??0}
  let seen=states.value[id]?.seen
  if(!seen){try{const stored=JSON.parse(localStorage.getItem(storageKey(id))||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored))seen=Object.fromEntries(Object.entries(stored).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)).map(([key,value])=>[key,Number(value)]))}catch{} }
  // Establish a baseline on first access; old campaign history isn't new.
  if(!seen)seen={...latest}
  if(!hasActiveOperations)seen={...seen,[ongoingOperations]:latest[ongoingOperations]}
  states.value={...states.value,[id]:{latest,seen,attention:[]}}
  persist(id)
 }
 function persist(id:string){try{localStorage.setItem(storageKey(id),JSON.stringify(states.value[id].seen))}catch{}}
 function markRead(id:string,key:string){if(key!==ongoingOperations||(activeScope.value&&activeScope.value!=='operations'))return;const state=states.value[id];if(!state)return;states.value={...states.value,[id]:acknowledgeNews(state,key)};persist(id)}
 function status(id:string,key:string){
  return key===ongoingOperations?newsStatus(states.value[id],key):''
 }
 return {sync,markRead,status}
}
