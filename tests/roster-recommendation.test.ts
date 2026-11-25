import {expect,it} from 'vitest'
import {rosterRecommendation} from '../apps/web/utils/rosterRecommendation.ts'

const ready={employment:{end_turn:140},health:100,fatigue:0,restTurns:0,availability:'available'}

it('prioriza tratamento ou descanso conforme a indisponibilidade',()=>{
 expect(rosterRecommendation({...ready,health:30,availability:'recovery_needed'},100,5,false)).toBe('recovery')
 expect(rosterRecommendation({...ready,health:80,fatigue:90,restTurns:4,availability:'exhausted'},100,2,false)).toBe('rest')
 expect(rosterRecommendation(ready,100,0,false)).toBeNull()
})

it('sugere renovar vínculo encerrado, próximo do fim ou curto demais para a atividade',()=>{
 expect(rosterRecommendation({...ready,employment:null},100,0,false)).toBe('renew')
 expect(rosterRecommendation(ready,135,0,false)).toBe('renew')
 expect(rosterRecommendation({...ready,health:5,availability:'recovery_needed'},136,8,false)).toBe('renew')
})

it('omite recomendações quando há ordem agendada ou reserva',()=>{
 expect(rosterRecommendation({...ready,health:30},100,5,true)).toBeNull()
 expect(rosterRecommendation({...ready,health:30,reservation:{kind:'mission'}},100,5,false)).toBeNull()
})
