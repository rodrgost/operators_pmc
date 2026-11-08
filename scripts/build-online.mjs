import { readFileSync,writeFileSync,readdirSync,mkdirSync,cpSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const root='apps/web/.output/public',assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain'};
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else{const key='/'+path.relative(root,p).split(path.sep).join('/');assets[key]={type:mime[path.extname(p)]||'application/octet-stream',data:readFileSync(p).toString('base64')}}}}
walk(root);writeFileSync('worker/assets.generated.ts','export const assets:Record<string,{type:string;data:string}>='+JSON.stringify(assets)+';\n');
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
await build({entryPoints:['worker/index.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
cpSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Worker ESM + interface Nuxt incorporada; '+Object.keys(assets).length+' arquivos.');
