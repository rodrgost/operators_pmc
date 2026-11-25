import {newsStatus,acknowledgeNews,type NewsState} from '../utils/navigationNews'
export function useNavigationNews(){
 const states=useState<Record<string,NewsState>>('navigation-news',()=>({}))
 const storageKey=(id:string)=>'operators-navigation-seen-v2:'+id
 function sync(id:string,cursors:Record<string,number>,baselineTurn=Infinity){
  const latest=Object.fromEntries(Object.entries(cursors).filter(([key])=>key.includes(':')))
  let seen=states.value[id]?.seen
  if(!seen){try{const stored=JSON.parse(localStorage.getItem(storageKey(id))||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored))seen=Object.fromEntries(Object.entries(stored).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)).map(([key,value])=>[key,Number(value)]))}catch{} }
  // On first access, preserve deliveries from the latest advance of an existing save.
  if(!seen)seen=Object.fromEntries(Object.entries(latest).filter(([,cursor])=>cursor<=baselineTurn+1))
  seen=Object.fromEntries(Object.entries(seen).filter(([key])=>key in latest))
  states.value={...states.value,[id]:{latest,seen,attention:[]}}
  persist(id)
 }
 function persist(id:string){try{localStorage.setItem(storageKey(id),JSON.stringify(states.value[id].seen))}catch{}}
 function markRead(id:string,key:string){
  const state=states.value[id]
  if(!state?.latest[key]||state.seen[key]===state.latest[key])return
  states.value={...states.value,[id]:acknowledgeNews(state,key)}
  persist(id)
 }
 function status(id:string,key:string){
  return newsStatus(states.value[id],key)
 }
 return {sync,markRead,status}
}
