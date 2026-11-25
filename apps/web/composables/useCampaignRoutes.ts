import type {Ref} from 'vue'

// Hash routes also work in the offline/static distribution without server rewrites.
export function useCampaignRoutes(options:{game:Ref<any>;tab:Ref<string>;sections:Ref<Record<string,string>>;financeSection:Ref<string>;scrollContainer:Ref<HTMLElement|null>;select:(id:string)=>Promise<boolean>;home:()=>Promise<void>;isLocked?:()=>boolean}){
 const {game,tab,sections,financeSection,scrollContainer}=options
 const previousScrollRestoration=window.history.scrollRestoration
 window.history.scrollRestoration='manual'
 const paths:Record<string,string>={overview:'command',world:'world',contracts:'missions/contracts',operations:'missions/operations',operators:'company/operators',infrastructure:'company/logistics',finance:'company/finance'}
 let restoring=false,current='',sequence=0
 const positions=new Map<string,number>()
 const defaults:Record<string,string>={operators:'roster',infrastructure:'headquarters',world:'regions',operations:'missions',finance:'summary'}
 const key=()=>{
  const section=sections.value[tab.value]||defaults[tab.value]
  return game.value?'#/campaign/'+encodeURIComponent(game.value.id)+'/'+paths[tab.value]+(section?'/'+section:''):''
 }
 function remember(){if(current&&scrollContainer.value)positions.set(current,scrollContainer.value.scrollTop)}
 function restorePosition(){scrollContainer.value?.scrollTo({top:positions.get(current)||0,behavior:'instant'})}
 async function move(){
  if(restoring)return
  const next=key();if(next===current)return
  remember();current=next
  window.history.pushState(null,'',window.location.pathname+window.location.search+next)
  const ticket=++sequence
  await nextTick();if(ticket===sequence)restorePosition()
 }
 async function restore(){
  if(options.isLocked?.()){window.history.replaceState(null,'',window.location.pathname+window.location.search+current);return}
  const match=window.location.hash.match(/^#\/campaign\/([^/]+)\/(command|world|missions\/(?:contracts|operations)|company\/(?:operators|logistics|finance))(?:\/([a-z]+))?$/)
  if(window.location.hash&&!match)return
  remember();restoring=true;++sequence
  try{
   if(!match){if(game.value)await options.home();current='';return}
   const id=decodeURIComponent(match[1]),destination=Object.keys(paths).find(k=>paths[k]===match[2])!
   if(game.value?.id!==id&&!await options.select(id))return
   const requestedSection=destination==='world'&&['news','intelligence'].includes(match[3])?'regions':match[3]
   sections.value={...sections.value,[destination]:requestedSection||defaults[destination]||''}
   if(destination==='finance')financeSection.value=sections.value.finance
   tab.value=destination;current=key()
   await nextTick();restorePosition()
  }finally{restoring=false}
 }
 watch([()=>game.value?.id,tab,()=>sections.value[tab.value]],move,{flush:'pre'})
 watch(financeSection,value=>{sections.value={...sections.value,finance:value}})
 window.addEventListener('popstate',restore)
 onBeforeUnmount(()=>{window.removeEventListener('popstate',restore);window.history.scrollRestoration=previousScrollRestoration})
 return restore
}
