export default defineNuxtConfig({
  compatibilityDate: '2026-11-08',
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/main.css'],
  runtimeConfig: { apiBase: process.env.API_BASE || 'http://127.0.0.1:3001', public: { storageMode: process.env.NUXT_PUBLIC_STORAGE_MODE || 'server' } },
  app: { head: { title: 'OPERATORS — PMC Command', link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }, { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }, { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, { rel: 'manifest', href: '/manifest.webmanifest' }], meta: [{ name: 'theme-color', content: '#080808' }, { name: 'apple-mobile-web-app-title', content: 'OPERATORS' }, { name: 'description', content: 'Centro de comando estratégico de uma companhia militar privada.' }] } }
})
