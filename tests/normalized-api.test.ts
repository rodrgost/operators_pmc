import {it,expect} from 'vitest';
import {buildNormalizedApp} from '../apps/api/src/normalized-app.ts';
it('API local compartilha recrutamento e salários com a aplicação Worker',async()=>{
 const app=buildNormalizedApp({databasePath:':memory:'});try{
  const create=await app.inject({method:'POST',url:'/api/v1/games',payload:{requestId:'create',name:'Local PMC',seed:'local'}});expect(create.statusCode).toBe(201);
  const g=create.json();const path='/api/v1/games/'+g.id;
  const p=(await app.inject(path+'/personnel')).json();expect(p.candidates).toHaveLength(6);
  const hired=await app.inject({method:'POST',url:path+'/recruitment/hire',headers:{origin:'http://127.0.0.1:3000'},payload:{requestId:'hire',expectedVersion:0,candidateId:p.candidates[0].id,weeks:4}});expect(hired.statusCode).toBe(201);
  const denied=await app.inject({method:'POST',url:path+'/advance',headers:{origin:'https://external.example'},payload:{}});expect(denied.statusCode).toBe(403);
 }finally{await app.close()}
});
