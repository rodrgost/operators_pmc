import {newsStatus,acknowledgeNews,type NewsState} from '../utils/navigationNews'
export function useNavigationNews(){
 const states=useState<Record<string,NewsState>>('navigation-news',()=>({}))
 const storageKey=(id:string)=>'operators-navigation-seen-v1:'+id
 function sync(id:string,latest:Record<string,number>,alerts:any[]=[]){
  let seen=states.value[id]?.seen
  if(!seen){try{const stored=JSON.parse(localStorage.getItem(storageKey(id))||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored))seen=Object.fromEntries(Object.entries(stored).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)).map(([key,value])=>[key,Number(value)]))}catch{} }
  // Establish a baseline on first access; old campaign history isn't new.
  if(!seen)seen={...latest}
  const routes:Record<string,string>={decisions:'operations.decisions','salary-debt':'finance.summary','hq-debt':'infrastructure.headquarters',renewals:'operators.roster',unfit:'operators.roster',equipment:'infrastructure.inventory',runway:'finance.summary'}
  states.value={...states.value,[id]:{latest,seen,attention:alerts.map(a=>routes[a.id]).filter(Boolean)}}
  persist(id)
 }
 function persist(id:string){try{localStorage.setItem(storageKey(id),JSON.stringify(states.value[id].seen))}catch{}}
 function markRead(id:string,key:string){const state=states.value[id];if(!state)return;states.value={...states.value,[id]:acknowledgeNews(state,key)};persist(id)}
 function status(id:string,key:string){return newsStatus(states.value[id],key)}
 return {sync,markRead,status}
}
