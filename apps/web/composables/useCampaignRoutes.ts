import type {Ref} from 'vue'

// Hash routes also work in the offline/static distribution without server rewrites.
export function useCampaignRoutes(options:{game:Ref<any>;tab:Ref<string>;sections:Ref<Record<string,string>>;financeSection:Ref<string>;select:(id:string)=>Promise<boolean>;home:()=>Promise<void>;isLocked?:()=>boolean}){
 const {game,tab,sections,financeSection}=options
 const previousScrollRestoration=window.history.scrollRestoration
 window.history.scrollRestoration='manual'
 const paths:Record<string,string>={overview:'command',world:'world',contracts:'missions/contracts',operations:'missions/operations',operators:'company/operators',infrastructure:'company/logistics',finance:'company/finance'}
 let restoring=false,current='',sequence=0
 const positions=new Map<string,number>()
 const key=()=>game.value?'#/campaign/'+encodeURIComponent(game.value.id)+'/'+paths[tab.value]+(sections.value[tab.value]?'/'+sections.value[tab.value]:''):''
 function remember(){if(current)positions.set(current,window.scrollY)}
 async function move(){
  if(restoring)return
  const next=key();if(next===current)return
  remember();current=next
  window.history.pushState(null,'',window.location.pathname+window.location.search+next)
  const ticket=++sequence
  await nextTick();if(ticket===sequence)window.scrollTo({top:positions.get(next)||0,behavior:'instant'})
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
   const defaults:Record<string,string>={operators:'roster',infrastructure:'headquarters',world:'regions',operations:'missions',finance:'summary'}
   sections.value={...sections.value,[destination]:match[3]||defaults[destination]||''}
   if(destination==='finance')financeSection.value=sections.value.finance
   tab.value=destination;current=key()
   await nextTick();window.scrollTo({top:positions.get(current)||0,behavior:'instant'})
  }finally{restoring=false}
 }
 watch([()=>game.value?.id,tab,()=>sections.value[tab.value]],move,{flush:'post'})
 watch(financeSection,value=>{sections.value={...sections.value,finance:value}})
 window.addEventListener('popstate',restore)
 onBeforeUnmount(()=>{window.removeEventListener('popstate',restore);window.history.scrollRestoration=previousScrollRestoration})
 return restore
}
