import {it,expect} from 'vitest';
import {nextTurnCount} from '../apps/web/utils/turnSelection.ts';
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
 expect(nextTurnCount(1,{pendingOrders:[{kind:'activity',dueTurn:4}],agenda:[{dueTurn:28}]})).toBe(3);
 expect(nextTurnCount(1,{pendingOrders:[{dueTurn:9},{dueTurn:5}],agenda:[{dueTurn:3}]})).toBe(2);
 expect(nextTurnCount(1,{pendingOrders:[{kind:'hire',dueTurn:null},{dueTurn:5}]})).toBe(1);
});
it('prazos que exigem decisão param antes de vencer, mantendo um período para agir',()=>{
 expect(nextTurnCount(2,{agenda:[{dueTurn:10,requiresAction:true},{dueTurn:28}]})).toBe(7);
 expect(nextTurnCount(9,{agenda:[{dueTurn:10,requiresAction:true},{dueTurn:28}]})).toBe(1);
});
