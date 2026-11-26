import {expect,it} from 'vitest'
import {missionCashImpact,missionClosingReason,missionStageReason} from '../apps/web/utils/missionReportPresentation.ts'

it('saldo da missão soma as movimentações da própria missão, incluindo devolução',()=>{
 const ledger=[
  {sourceId:'mission:abc:mobilization',entryType:'mission_mobilization',amountCents:-40000},
  {sourceId:'mission:abc:advance',entryType:'mission_advance',amountCents:90000},
  {sourceId:'mission:abc:refund',entryType:'advance_refund',amountCents:-90000},
  {sourceId:'mission:abc-other:advance',entryType:'mission_advance',amountCents:200000},
  {sourceId:'salary:abc',entryType:'salary_payment',amountCents:-100000},
 ]
 expect(missionCashImpact('abc',ledger)).toEqual({netCents:-40000,mobilizationCents:40000})
 expect(missionCashImpact('abc-other',ledger)).toBeNull()
})

it('explains the change caused by the roll before considering other factors',()=>{
 expect(missionStageReason({assessment:{baseOutcome:'partial',rolledOutcome:'failure'},decisiveFactor:'condition'}))
  .toBe('O sorteio mudou o resultado de parcial para falha.')
})

it('identifies the decisive factor when the roll leaves the result unchanged',()=>{
 expect(missionStageReason({assessment:{baseOutcome:'partial',rolledOutcome:'partial'},decisiveFactor:'condition'}))
  .toContain('A condição da equipe')
})

it('explains a completed mission whose execution stage failed',()=>{
 expect(missionClosingReason({
  outcome:'completed',description:'',successPoints:4,requiredSuccessPoints:3,maximumSuccessPoints:8,
 },{outcome:'failure'})).toContain('A Execução falhou.')
})

it('explains automatic partial evacuation separately from normal completion',()=>{
 expect(missionClosingReason({
  outcome:'completed',description:'A equipe encerrou a evacuação com parte do objetivo cumprida.',
  earlyPartial:true,evacuationChoice:{automatic:true},
 })).toContain('aplicado automaticamente')
})
