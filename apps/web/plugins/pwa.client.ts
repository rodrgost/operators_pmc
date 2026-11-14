export default defineNuxtPlugin(() => {
 if (import.meta.dev || useRuntimeConfig().public.storageMode !== 'browser' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
 // HTTP cache must not hold a stale worker after a local rebuild.
 navigator.serviceWorker.register('/sw.js', {scope:'/',updateViaCache:'none'}).catch(error=>console.warn('Não foi possível preparar o modo offline.',error));
});
