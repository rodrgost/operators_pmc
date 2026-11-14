import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';

// Run after static generation: every asset belongs to the same complete build.
export function buildPwa(root='apps/web/.output/public') {
 const files=[];
 function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(!['sw.js','200.html','404.html'].includes(entry.name))files.push(path)}}
 walk(root);files.sort();
 const hash=createHash('sha256');for(const file of files)hash.update(relative(root,file)).update(readFileSync(file));
 const cache='operators-shell-'+hash.digest('hex').slice(0,16);
 const urls=files.map(file=>'/'+relative(root,file).replaceAll('\\','/'));
 writeFileSync(join(root,'sw.js'),`const CACHE=${JSON.stringify(cache)};
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Let an update wait until existing game windows close; never reload an active campaign.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('operators-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return;
 }
 if(!ASSETS.includes(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});
`);
 return {cache,assets:urls};
}
