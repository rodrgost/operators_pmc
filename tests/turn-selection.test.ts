import {it,expect} from 'vitest';
import {nextAdvance,nextTurnCount} from '../apps/web/utils/turnSelection.ts';
it('seleciona a conclusão mais próxima, incluindo intervalos fora dos presets',()=>{
 expect(nextTurnCount(1,{agenda:[{dueTurn:28},{dueTurn:4},{dueTurn:4}]})).toBe(3);
 expect(nextTurnCount(4,{agenda:[{dueTurn:28},{dueTurn:8}]})).toBe(4);
});
it('usa um turno para confirmar ordens e para agenda vazia',()=>{
 expect(nextTurnCount(1,{pendingOrders:[{id:'hire'}],agenda:[{dueTurn:4}]})).toBe(1);
 expect(nextTurnCount(1,{agenda:[]})).toBe(1);
});
it('ignora prazos vencidos e respeita o limite do lote',()=>{
 expect(nextTurnCount(5,{agenda:[{dueTurn:4},{dueTurn:5},{dueTurn:9}]})).toBe(4);
 expect(nextTurnCount(0,{agenda:[{dueTurn:60}]})).toBe(28);
});
it('planejamento com duração sugere o próximo acontecimento, contando o primeiro período',()=>{
 expect(nextTurnCount(1,{pendingOrders:[{dueTurn:4}],agenda:[{dueTurn:28}]})).toBe(3);
 expect(nextTurnCount(1,{pendingOrders:[{dueTurn:9},{dueTurn:5}],agenda:[{dueTurn:3}]})).toBe(2);
 expect(nextTurnCount(1,{pendingOrders:[{dueTurn:null},{dueTurn:5}]})).toBe(1);
});
it('prazos que exigem decisão param antes de vencer, mantendo um período para agir',()=>{
 expect(nextTurnCount(2,{agenda:[{dueTurn:10,requiresAction:true},{dueTurn:28}]})).toBe(7);
 expect(nextTurnCount(9,{agenda:[{dueTurn:10,requiresAction:true},{dueTurn:28}]})).toBe(1);
});
it('explica a parada antes do prazo e só associa eventos alcançáveis',()=>{
 const deadline={dueTurn:8,requiresAction:true,title:'Mobilizar contrato'};
 expect(nextAdvance(0,{agenda:[{dueTurn:7,title:'Salários'},deadline]})).toEqual({turns:7,item:deadline,beforeDeadline:true});
 expect(nextAdvance(0,{agenda:[{dueTurn:29,title:'Entrega'}]})).toEqual({turns:28});
 expect(nextAdvance(7,{agenda:[deadline]})).toEqual({turns:1,item:deadline,beforeDeadline:false});
});
