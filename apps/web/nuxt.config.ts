export default defineNuxtConfig({
  compatibilityDate: '2026-11-08',
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/main.css'],
  runtimeConfig: { apiBase: process.env.API_BASE || 'http://127.0.0.1:3001', public: { storageMode: process.env.NUXT_PUBLIC_STORAGE_MODE || 'server' } },
  app: { head: { title: 'OPERATORS — PMC Command', meta: [{ name: 'description', content: 'Centro de comando estratégico de uma companhia militar privada.' }] } }
})
