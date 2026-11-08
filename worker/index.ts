import { handleApi } from './api.ts';
import { assets } from './assets.generated.ts';
export default { async fetch(request:Request,env:any){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return handleApi(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Método não permitido',{status:405});
 const key=url.pathname==='/'?'/index.html':url.pathname;
 const asset=assets[key]??(!key.includes('.')?assets['/index.html']:undefined);
 if(!asset)return new Response('Não encontrado',{status:404});
 const bytes=Uint8Array.from(atob(asset.data),(c)=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':key.startsWith('/_nuxt/')?'public, max-age=31536000, immutable':'no-cache','x-content-type-options':'nosniff','referrer-policy':'same-origin'}});
}};
