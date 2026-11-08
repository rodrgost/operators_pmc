import Fastify from 'fastify';
import { ZodError } from 'zod';
import { GameService } from '../../../packages/application/index.ts';
import { openDatabase } from '../../../packages/persistence/index.ts';
import { DomainError } from '../../../packages/domain/index.ts';
import { createGameSchema, advanceSchema, resumeSchema, paginationSchema } from '../../../packages/contracts/index.ts';
export function buildApp(options:{databasePath?:string;logger?:boolean}={}){
 const db=openDatabase(options.databasePath??process.env.DATABASE_PATH??'data/operators.sqlite');
 const service=new GameService(db);const app=Fastify({logger:options.logger??false,bodyLimit:16384});
 // The foundation supports one trusted local user. Refuse browser requests from arbitrary sites.
 app.addHook('onRequest',async(req)=>{
  const origin=req.headers.origin;
  if(origin&&!['http://127.0.0.1:3000','http://localhost:3000'].includes(origin))throw new DomainError('ORIGIN_DENIED','Origem não autorizada.',403);
 });
 app.setErrorHandler((error,req,reply)=>{
  if(error instanceof ZodError)return reply.code(400).send({code:'INVALID_REQUEST',message:'Dados inválidos.',issues:error.issues});
  if(error instanceof DomainError)return reply.code(error.statusCode).send({code:error.code,message:error.message});
  if(error instanceof Error && 'statusCode' in error&&error.statusCode===400)return reply.code(400).send({code:'INVALID_REQUEST',message:'Requisição inválida.'});
  req.log.error(error);return reply.code(500).send({code:'INTERNAL_ERROR',message:'Não foi possível concluir a operação.'});
 });
 app.get('/api/v1/health',async()=>({status:'ok',phase:'foundation',rulesVersion:'0.1.0'}));
 app.get('/api/v1/games',async()=>service.list());
 app.post('/api/v1/games',async(req,reply)=>reply.code(201).send(service.create(createGameSchema.parse(req.body))));
 app.get<{Params:{id:string}}>('/api/v1/games/:id',async req=>service.project(service.get(req.params.id)));
 app.get<{Params:{id:string}}>('/api/v1/games/:id/dashboard',async req=>({...service.project(service.get(req.params.id)),events:service.timeline(req.params.id,0,8)}));
 app.post<{Params:{id:string}}>('/api/v1/games/:id/advance',async req=>service.advance(req.params.id,advanceSchema.parse(req.body)));
 app.get<{Params:{id:string;requestId:string}}>('/api/v1/games/:id/advances/:requestId',async req=>service.result(req.params.id,req.params.requestId));
 app.post<{Params:{id:string;requestId:string}}>('/api/v1/games/:id/advances/:requestId/resume',async req=>service.resume(req.params.id,req.params.requestId,resumeSchema.parse(req.body).expectedVersion));
 app.get<{Params:{id:string}}>('/api/v1/games/:id/timeline',async req=>{const page=paginationSchema.parse(req.query);return service.timeline(req.params.id,page.offset,page.limit)});
 app.get<{Params:{id:string;turn:string}}>('/api/v1/games/:id/turns/:turn/summary',async req=>{const turn=Number(req.params.turn);if(!Number.isInteger(turn)||turn<1)throw new DomainError('INVALID_TURN','Turno inválido.',400);return service.summary(req.params.id,turn)});
 app.get<{Params:{id:string}}>('/api/v1/games/:id/world/countries',async req=>service.world(req.params.id));
 app.get<{Params:{id:string}}>('/api/v1/games/:id/finances/ledger',async req=>service.ledger(req.params.id));
 app.addHook('onClose',async()=>db.close());return app;
}
