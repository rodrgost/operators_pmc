import { build } from 'esbuild';
import { readdirSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('apps/web/public', { recursive: true });
const migrations = readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort().map(name => ({ name, sql: readFileSync('drizzle/' + name, 'utf8') }));
await build({ entryPoints: ['scripts/browser-game-worker.mjs'], outfile: 'apps/web/public/browser-game-worker.js', bundle: true, platform: 'browser', format: 'iife', target: 'es2022', minify: true,
 plugins: [{ name: 'migrations', setup(builder) {
  builder.onResolve({ filter: /^operators:migrations$/ }, () => ({ path: 'migrations', namespace: 'operators' }));
  builder.onLoad({ filter: /.*/, namespace: 'operators' }, () => ({ contents: 'export default ' + JSON.stringify(migrations), loader: 'js' }));
 } }]
});
copyFileSync('node_modules/sql.js/dist/sql-wasm.wasm', 'apps/web/public/sql-wasm.wasm');
const result = spawnSync(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate', 'apps/web'], { stdio: 'inherit', env: { ...process.env, NUXT_PUBLIC_STORAGE_MODE: 'browser' } });
process.exitCode = result.status ?? 1;
