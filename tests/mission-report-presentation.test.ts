import {expect,it} from 'vitest'
import {missionCashImpact} from '../apps/web/utils/missionReportPresentation.ts'

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
