import { createFetch } from 'ofetch';

export default defineNuxtPlugin(() => {
 if (useRuntimeConfig().public.storageMode !== 'browser') return;
 const worker = new Worker('/browser-game-worker.js');
 const pending = new Map<number, { resolve: (response: Response) => void; reject: (error: Error) => void }>();
 let serial = 0;
 worker.onmessage = ({ data }) => {
  const entry = pending.get(data.id);
  if (!entry) return;
  pending.delete(data.id);
  entry.resolve(new Response(data.response.body, { status: data.response.status, headers: data.response.headers }));
 };
 worker.onerror = () => {
  for (const entry of pending.values()) entry.reject(new Error('Não foi possível iniciar o salvamento no navegador. Atualize a página.'));
  pending.clear();
 };
 const nativeFetch = globalThis.fetch.bind(globalThis);
 const browserFetch: typeof fetch = async (input, options) => {
  const request = new Request(new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin), options);
  if (new URL(request.url).origin !== location.origin || !new URL(request.url).pathname.startsWith('/api/v1/')) return nativeFetch(input, options);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const run = () => new Promise<Response>((resolve, reject) => {
   const id = ++serial;
   pending.set(id, { resolve, reject });
   worker.postMessage({ id, request: { url: request.url, method: request.method, headers: [...request.headers], body } });
  });
  return navigator.locks ? navigator.locks.request('operators-campaign-save', run) : run();
 };
 Object.defineProperty(globalThis, '$fetch', { value: createFetch({ fetch: browserFetch, Headers, AbortController }), writable: true, configurable: true });
});
