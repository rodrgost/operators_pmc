import { it,expect } from 'vitest';
// @ts-expect-error JavaScript CLI helper has no declaration file.
import { previewOptions } from '../scripts/preview-options.mjs';
it('preview: porta padrão, argumento e ambiente com bind local',()=>{
 expect(previewOptions([],{})).toEqual({port:3000,host:'127.0.0.1'});
 expect(previewOptions(['--port','4321'],{}).port).toBe(4321);
 expect(previewOptions(['--port','4321'],{PORT:'3456'}).port).toBe(3456);
 for(const value of ['NaN','0','65536','3000.5','--other'])expect(()=>previewOptions(['--port',value],{})).toThrow();
 expect(()=>previewOptions(['--port'],{})).toThrow();
});
