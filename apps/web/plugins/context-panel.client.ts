export default defineNuxtPlugin(nuxtApp => {
 nuxtApp.vueApp.directive('context-panel', {
  mounted(el: HTMLElement) {
   requestAnimationFrame(() => {
    const header = document.querySelector('.account-bar')?.getBoundingClientRect()
    const dock = document.querySelector('.turn-dock')?.getBoundingClientRect()
    const top = Math.max(16, (header?.bottom ?? 0) + 16)
    const bottom = dock?.top ?? window.innerHeight - 180
    const rect = el.getBoundingClientRect()
    if (rect.top > bottom - 80 || rect.top < top) window.scrollBy({top: rect.top - top, behavior: 'instant'})
   })
  }
 })
})
