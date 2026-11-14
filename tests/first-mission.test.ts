import {it,expect} from 'vitest'
import {firstMissionGuide} from '../apps/web/utils/firstMission.ts'
const steps=[{id:'recruit',title:'Recrutar',tab:'operators',done:false},{id:'squad',title:'Equipe',tab:'operators',done:false},{id:'kits',title:'Kits',tab:'infrastructure',done:false},{id:'mission',title:'Missão',tab:'contracts',done:false}]
it('primeira missão: aponta o primeiro requisito pendente usando o progresso salvo',()=>{
 const saved={steps:steps.map(s=>({...s,done:['recruit','squad'].includes(s.id)}))}
 const guide=firstMissionGuide(saved)!
 expect(guide.completed).toBe(2);expect(guide.next.id).toBe('kits');expect(guide.next.section).toBe('catalog')
 expect(firstMissionGuide(JSON.parse(JSON.stringify(saved)))).toEqual(guide)
})
it('primeira missão: contratação planejada não conta como concluída e orienta confirmação',()=>{
 const guide=firstMissionGuide({steps,pendingOrders:[{kind:'hire'},{kind:'hire'}]})!
 expect(guide.completed).toBe(0);expect(guide.next.title).toBe('Confirme as contratações');expect(guide.next.section).toBe('roster')
 expect(firstMissionGuide({steps,pendingOrders:[{kind:'hire'}]},0)!.next.section).toBe('recruitment')
 expect(firstMissionGuide({steps,pendingOrders:[{kind:'hire'}]},1)!.next.section).toBe('roster')
})
it('primeira missão: entrega em andamento leva ao estoque sem sugerir outra compra',()=>{
 const guide=firstMissionGuide({steps:steps.map(s=>({...s,done:['recruit','squad'].includes(s.id)})),agenda:[{tab:'infrastructure',title:'Kit Combate I · entrega',dueTurn:4}]})!
 expect(guide.next.section).toBe('inventory');expect(guide.completed).toBe(2)
})
it('primeira missão: missão já iniciada encerra o roteiro mesmo se requisitos atuais mudarem',()=>{
 expect(firstMissionGuide({steps:steps.map(s=>({...s,done:s.id==='mission'}))})).toBeNull()
 expect(firstMissionGuide(null)).toBeNull()
})

