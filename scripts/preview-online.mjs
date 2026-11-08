// Preview adapter only: deployed Worker uses authenticated identity and hosted D1.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync,readFileSync,mkdirSync } from 'node:fs';
import worker from '../dist/server/index.js';
mkdirSync('data',{recursive:true});const db=new DatabaseSync('data/online-preview.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS preview_migrations(name TEXT PRIMARY KEY)');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql'))){if(!db.prepare('SELECT name FROM preview_migrations WHERE name=?').get(file)){if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='online_campaigns'").get())db.exec(readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));db.prepare('INSERT INTO preview_migrations VALUES(?)').run(file)}}
const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}}}};
createServer(async(req,res)=>{try{
 if(req.url==='/__mobile'){res.writeHead(200,{'content-type':'text/html'});res.end('<html><body style="margin:0;background:#181818;display:flex;justify-content:center"><iframe title="OPERATORS mobile" src="/" style="width:390px;height:100vh;min-height:840px;border:0"></iframe></body></html>');return}
 const origin='http://'+req.headers.host;const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview');
 // Preview is routed through the Sites daemon; its external origin differs from the local host.
 if(headers.has('origin'))headers.set('origin',origin);
 const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),{DB});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Preview error')}}).listen(Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1]||3000),'0.0.0.0',()=>console.log('OPERATORS preview ready'));
