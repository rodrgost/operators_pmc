import { buildNormalizedApp } from './normalized-app.ts';
const app=buildNormalizedApp({logger:true});
await app.listen({host:'127.0.0.1',port:Number(process.env.PORT??3001)});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{void app.close().then(()=>process.exit(0))});
