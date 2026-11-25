import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'

function fixture(hash=''){
 const watchers:any[]=[],listeners:Record<string,any>={},pushes:string[]=[],scrolls:number[]=[]
 const game={value:null as any},tab={value:'overview'},sections={value:{} as Record<string,string>},financeSection={value:'summary'}
 const window={location:{hash,pathname:'/',search:''},history:{pushState:(_a:any,_b:any,url:string)=>{pushes.push(url);window.location.hash=url.slice(url.indexOf('#'))}},addEventListener:(name:string,fn:any)=>listeners[name]=fn,removeEventListener:()=>{}}
 const scrollContainer={value:{scrollTop:0,scrollTo:({top}:any)=>{scrolls.push(top);scrollContainer.value.scrollTop=top}}}
 const source=readFileSync('apps/web/composables/useCampaignRoutes.ts','utf8').replace('export function','function')
 const ctx:any={exports:{},window,watch:(sources:any,fn:any)=>watchers.push({sources,fn}),nextTick:async()=>{},onBeforeUnmount:()=>{}}
 runInNewContext(ts.transpileModule(source+';globalThis.setup=useCampaignRoutes',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx)
 const restore=ctx.setup({game,tab,sections,financeSection,scrollContainer,select:async(id:string)=>{game.value={id};return true},home:async()=>{game.value=null}})
 return {game,tab,sections,financeSection,scrollContainer,window,pushes,scrolls,restore,move:()=>watchers[0].fn(),pop:()=>listeners.popstate()}
}
it('navegação: link direto abre companhia e subseção, sem criar entrada extra',async()=>{
 const h=fixture('#/campaign/g/company/operators/recruitment');await h.restore()
 expect(h.game.value.id).toBe('g');expect(h.tab.value).toBe('operators');expect(h.sections.value.operators).toBe('recruitment');expect(h.pushes).toHaveLength(0)
})
it('navegação: Voltar restaura seção e rolagem da tela anterior',async()=>{
 const h=fixture('#/campaign/g/company/operators/recruitment');await h.restore();h.scrollContainer.value.scrollTop=420
 h.tab.value='contracts';await h.move();expect(h.window.location.hash).toBe('#/campaign/g/missions/contracts');expect(h.scrollContainer.value.scrollTop).toBe(0)
 h.window.location.hash='#/campaign/g/company/operators/recruitment';await h.pop()
 expect(h.tab.value).toBe('operators');expect(h.scrollContainer.value.scrollTop).toBe(420);expect(h.pushes).toHaveLength(1)
})
it('navegação: raiz volta às campanhas e finanças restaura livro-razão',async()=>{
 const h=fixture('#/campaign/g/company/finance/ledger');await h.restore();expect(h.financeSection.value).toBe('ledger')
 h.window.location.hash='';await h.pop();expect(h.game.value).toBeNull()
})
