import { buildApp } from './app.ts';
const app=buildApp({logger:true});
await app.listen({host:'127.0.0.1',port:Number(process.env.PORT??3001)});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{void app.close().then(()=>process.exit(0))});
