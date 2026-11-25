// Preview adapter only: deployed Worker uses authenticated identity and hosted D1.
import { createServer } from 'node:http';
import { previewOptions } from './preview-options.mjs';
const {port,host}=previewOptions();
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { sqliteD1,applyMigrations } from './sqlite-d1.mjs';
import worker from '../dist/server/index.js';
mkdirSync('data',{recursive:true});const db=new DatabaseSync('data/online-preview.sqlite');
applyMigrations(db);
const DB=sqliteD1(db);
createServer(async(req,res)=>{try{
 if(req.url==='/__mobile'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>OPERATORS mobile</title></head><body style="margin:0;overflow:hidden;background:#181818;display:flex;justify-content:center"><iframe title="OPERATORS mobile" src="/" style="display:block;width:min(390px,100%);height:100dvh;border:0"></iframe></body></html>');return}
 const origin='http://'+req.headers.host;const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview');
 const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),{DB});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Preview error')}}).listen(port,host,()=>console.log('OPERATORS preview ready'));
