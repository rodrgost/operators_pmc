export default defineNuxtPlugin(nuxtApp => {
 nuxtApp.vueApp.directive('context-panel', {
  mounted(el: HTMLElement, binding: {value?: string}) {
   requestAnimationFrame(() => {
    const header = document.querySelector('.account-bar')?.getBoundingClientRect()
    const dock = document.querySelector('.turn-dock')?.getBoundingClientRect()
    const top = Math.max(16, (header?.bottom ?? 0) + 16)
    const bottom = dock?.top ?? window.innerHeight - 180
    const rect = el.getBoundingClientRect()
    if (binding.value === 'fit') {
     // Keep the complete confirmation above the turn dock when it fits.
     if (rect.top < top || rect.bottom > bottom - 16) {
      const target = rect.height <= bottom - top - 16 ? Math.max(top, bottom - 16 - rect.height) : top
      window.scrollBy({top: rect.top - target, behavior: 'instant'})
     }
     return
    }
    if (rect.top > bottom - 80 || rect.top < top) window.scrollBy({top: rect.top - top, behavior: 'instant'})
   })
  }
 })
})
