import Fastify from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { handleApi } from '../../../worker/api.ts';
// @ts-expect-error Local JavaScript adapter intentionally has no declaration file.
import { sqliteD1,applyMigrations } from '../../../scripts/sqlite-d1.mjs';
export function buildNormalizedApp(options:{databasePath?:string;logger?:boolean}={}){
 const path=options.databasePath??process.env.DATABASE_PATH??'data/online-preview.sqlite';
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);applyMigrations(db);const DB=sqliteD1(db);
 const app=Fastify({logger:options.logger??false,bodyLimit:16384});
 app.addHook('onClose',async()=>{db.close()});
 app.route({method:['GET','POST','PATCH','DELETE'],url:'/api/*',handler:async(req,reply)=>{
  const origin=req.headers.origin;
  if(origin&&!['http://127.0.0.1:3000','http://localhost:3000'].includes(origin))return reply.code(403).send({code:'ORIGIN_DENIED',message:'Origem não autorizada.'});
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
  headers.set('oai-authenticated-user-id','local-preview');
  const body=['GET','HEAD'].includes(req.method)?undefined:typeof req.body==='string'?req.body:JSON.stringify(req.body);
  const response=await handleApi(new Request((origin??'http://127.0.0.1:3000')+req.url,{method:req.method,headers,body}),{DB});
  reply.code(response.status);response.headers.forEach((value,key)=>reply.header(key,value));return reply.send(await response.text());
 }});return app;
}
