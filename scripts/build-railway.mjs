import { buildPwa } from './build-pwa.mjs';
import { build } from 'esbuild';
import { readdirSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

mkdirSync('apps/web/public', { recursive: true });
const migrations = readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort().map(name => ({ name, sql: readFileSync('drizzle/' + name, 'utf8') }));
await build({ entryPoints: ['scripts/browser-game-worker.mjs'], outfile: 'apps/web/public/browser-game-worker.js', bundle: true, platform: 'browser', format: 'iife', target: 'es2022', minify: true,
 plugins: [{ name: 'migrations', setup(builder) {
  builder.onResolve({ filter: /^operators:migrations$/ }, () => ({ path: 'migrations', namespace: 'operators' }));
  builder.onLoad({ filter: /.*/, namespace: 'operators' }, () => ({ contents: 'export default ' + JSON.stringify(migrations), loader: 'js' }));
 } }]
});
copyFileSync('node_modules/sql.js/dist/sql-wasm.wasm', 'apps/web/public/sql-wasm.wasm');
// A new filename prevents an older service worker from supplying cached game rules.
const workerHash = createHash('sha256').update(readFileSync('apps/web/public/browser-game-worker.js')).digest('hex').slice(0,16);
const workerUrl = '/browser-game-worker.' + workerHash + '.js';
copyFileSync('apps/web/public/browser-game-worker.js', 'apps/web/public' + workerUrl);
const result = spawnSync(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate', 'apps/web'], { stdio: 'inherit', env: { ...process.env, NUXT_PUBLIC_STORAGE_MODE: 'browser', NUXT_PUBLIC_BROWSER_WORKER_URL: workerUrl } });
process.exitCode = result.status ?? 1;
if (result.status === 0) { const pwa=buildPwa(); console.log('PWA offline: '+pwa.assets.length+' arquivos, '+pwa.cache); }
