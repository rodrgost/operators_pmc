import {it,expect} from 'vitest'
import {missionReadiness} from '../apps/web/composables/missionReadiness.ts'
const people={squads:[{id:'s',memberIds:['a','b']}],operators:[{id:'a',availability:'available'},{id:'b',availability:'available'}]}
const contract={minimumOperators:2,requiredEquipment:['combat','medical']}
const plan={squadId:'s',memberIds:['a','b'],reinforcementIds:[],leaderId:'a',deputyId:'b',equipmentIds:['c','m']}
it('preparação: reconhece formação e categorias obrigatórias aptas',()=>{
 expect(missionReadiness(contract,people,plan,[{id:'c',category:'combat',ready:true},{id:'m',category:'medical',ready:true}])).toEqual({teamIssues:[],missingEquipment:[]})
})
it('preparação: kit em entrega ou não selecionado não cumpre requisito',()=>{
 expect(missionReadiness(contract,people,plan,[{id:'c',category:'combat',ready:true},{id:'m',category:'medical',ready:false},{id:'other',category:'medical',ready:true}]).missingEquipment).toEqual(['medical'])
})
it('preparação: explica formação insuficiente, líder ausente e operador indisponível',()=>{
 const result=missionReadiness(contract,{...people,operators:[{id:'a',availability:'reserved'}]},{...plan,memberIds:['a'],leaderId:'b',deputyId:null},[])
 expect(result.teamIssues).toHaveLength(3)
})
it('preparação: identifica equipe alterada e substituto inválido ao retornar',()=>{
 const result=missionReadiness(contract,{...people,squads:[{id:'s',memberIds:['a']}]},{...plan,deputyId:'a'},[])
 expect(result.teamIssues).toHaveLength(2)
})
