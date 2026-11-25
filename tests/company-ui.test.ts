import {it,expect} from 'vitest'
import {candidateList,kitCatalogGroups,squadStatus,kitPurchaseIssue} from '../apps/web/composables/companyUi.ts'
import {missionFitScore,missionFitWeights} from '../apps/web/utils/missionFitScore.ts'
it('companhia: filtra e compara candidatos sem alterar o mercado',()=>{
 const rows=[{id:'a',specialization:'recon',salaryCents:300,signingBonusCents:500,level:2,attributes:{leadership:10}},{id:'b',specialization:'medic',salaryCents:100,signingBonusCents:200,level:1,attributes:{leadership:60}}]
 expect(candidateList(rows).map(c=>c.id)).toEqual(['b','a']);expect(candidateList(rows,'recon')).toHaveLength(1);expect(candidateList(rows,'','leadership')[0].id).toBe('b');expect(candidateList(rows,'','level')[0].id).toBe('a');expect(rows[0].id).toBe('a')
})
it('recrutamento: busca nomes e codinomes sem depender de acentos e calcula adequação pelos pesos da missão',()=>{
 const rows=[{id:'a',name:'João Reis',callsign:'Falcão',specialization:'recon',salaryCents:300},{id:'b',name:'Maria Luz',specialization:'medic',salaryCents:100}]
 expect(candidateList(rows,'','','joao').map(c=>c.id)).toEqual(['a'])
 expect(candidateList(rows,'','',' FALCAO ').map(c=>c.id)).toEqual(['a'])
 expect(candidateList(rows,'medic','','falcao')).toHaveLength(0)
 const weights=missionFitWeights('security')
 expect(weights.length).toBeGreaterThan(0)
 expect(missionFitScore(weights,Object.fromEntries(weights.map(([key])=>[key,80])))).toBe(80)
})
it('companhia: seis categorias mantêm as variantes separadas e ordenadas',()=>{
 const catalog=['combat','recon','medical','technical','communication','logistics'].flatMap(category=>[3,1,2].map(quality=>({id:category+quality,category,quality,priceCents:quality*quality*100})))
 const groups=kitCatalogGroups(catalog)
 expect(groups).toHaveLength(6);expect(groups[0].variants.map(v=>v.quality)).toEqual([1,2,3]);expect(kitCatalogGroups(catalog,'medical')).toHaveLength(1);expect(catalog[0].quality).toBe(3)
})
it('companhia: prontidão explica reservas e liderança sem declarar equipe pronta',()=>{
 const view=squadStatus({memberIds:['a','b'],effectiveLeaderId:null},[{id:'a',availability:'mission'},{id:'b',availability:'available'}])
 expect(view.available).toBe(1);expect(view.issues).toHaveLength(2)
})
it('companhia: compra explica quantidade, caixa, armazenagem e dívida',()=>{
 const item={priceCents:100,weight:2},data={headquarters:{arrearsCents:0},load:0,loadCapacity:4}
 expect(kitPurchaseIssue(item,2,data,200)).toBe('');expect(kitPurchaseIssue(item,3,data,1000)).toContain('armazenagem');expect(kitPurchaseIssue(item,2,data,100)).toContain('Caixa');expect(kitPurchaseIssue(item,0,data,1000)).toContain('quantidade');expect(kitPurchaseIssue(item,1,{...data,headquarters:{arrearsCents:1}},1000)).toContain('manutenção')
})
