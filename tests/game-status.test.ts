import {it,expect} from 'vitest'
import {gameStatus} from '../apps/web/utils/gameStatus.ts'
it('estados visuais: prontidão, atenção, execução e falha usam símbolo além de cor',()=>{
 expect(gameStatus('ready')).toEqual({tone:'ready',icon:'check'})
 expect(gameStatus('awaiting_decision')).toEqual({tone:'attention',icon:'alert'})
 expect(gameStatus('mission')).toEqual({tone:'active',icon:'clock'})
 expect(gameStatus('failed')).toEqual({tone:'danger',icon:'alert'})
 expect(gameStatus('planned')).toEqual({tone:'attention',icon:'clock'})
 expect(gameStatus('unknown')).toEqual({tone:'neutral',icon:'info'})
})
