<script setup lang="ts">
const props=withDefaults(defineProps<{title:string;busy?:boolean;error?:string}>(),{busy:false,error:''})
const emit=defineEmits(['close'])
const dialog=ref<HTMLDialogElement|null>(null)
let observer:MutationObserver|undefined
let previousFocus:HTMLElement|null=null
let previousCard:HTMLElement|null=null
function syncScroll(){document.documentElement.classList.toggle('focus-dialog-open',!!document.querySelector('dialog.focus-dialog[open]'))}
function requestClose(event?:Event){event?.preventDefault();if(!props.busy)emit('close')}
onMounted(()=>{
 previousFocus=document.activeElement as HTMLElement|null
 previousCard=previousFocus?.closest<HTMLElement>('[data-action-card]')??null
 const el=dialog.value!
 const ancestors:HTMLElement[]=[]
 for(let parent=el.parentElement;parent;parent=parent.parentElement)ancestors.push(parent)
 function syncVisibility(){
  const visible=ancestors.every(parent=>!parent.hidden&&getComputedStyle(parent).display!=='none')
  if(visible&&!el.open)el.showModal()
  else if(!visible&&el.open)el.close()
  syncScroll()
 }
 observer=new MutationObserver(syncVisibility)
 for(const parent of ancestors)observer.observe(parent,{attributes:true,attributeFilter:['style','hidden']})
 syncVisibility()
})
onBeforeUnmount(()=>{
 observer?.disconnect()
 dialog.value?.close()
 syncScroll()
 const focusAfterClose=document.activeElement
 nextTick(()=>{
  if(document.querySelector('dialog[open]')||(document.activeElement!==focusAfterClose&&document.activeElement!==document.body))return
  if(previousFocus?.isConnected&&!previousFocus.matches(':disabled')&&previousFocus.getClientRects().length){
   previousFocus.focus({preventScroll:true})
  }else if(previousCard?.isConnected&&previousCard.getClientRects().length){
   if(!previousCard.hasAttribute('tabindex'))previousCard.tabIndex=-1
   previousCard.focus({preventScroll:true})
  }
 })
})
</script>
<template>
 <dialog ref="dialog" class="focus-dialog" :class="{'focus-dialog-with-footer':$slots.footer}" :aria-label="title" @cancel="requestClose">
  <header class="focus-dialog-heading"><h2>{{title}}</h2><button type="button" class="secondary" :disabled="busy" :aria-label="'Fechar '+title" autofocus @click="requestClose()">Fechar ✕</button></header>
  <div class="focus-dialog-content"><p v-if="error" class="error" role="alert">{{error}}</p><slot /></div>
  <footer v-if="$slots.footer" class="focus-dialog-footer"><slot name="footer" /></footer>
 </dialog>
</template>
<style>
html.focus-dialog-open{overflow:hidden}
dialog.focus-dialog{box-sizing:border-box;width:min(960px,calc(100vw - 48px));max-width:none;max-height:calc(100dvh - 48px);padding:0;border:1px solid #3b5058;border-radius:18px;background:#101b20;color:#e7ebed;overflow:auto;overscroll-behavior:contain}
dialog.focus-dialog::backdrop{background:rgb(0 0 0 / 78%)}
.focus-dialog-heading{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;background:#101b20;border-bottom:1px solid #3b5058}
.focus-dialog-heading h2{margin:0;font-size:var(--text-section);overflow-wrap:anywhere}
.focus-dialog-heading button{flex-shrink:0}
.focus-dialog-content{padding:24px;min-width:0}
.focus-dialog-content .inline-action{margin:0;border:0;padding:0}
.focus-dialog-content .candidate-comparison{overflow-x:auto}
@media(max-width:640px){dialog.focus-dialog{width:100%;height:100dvh;max-height:100dvh;margin:0;border:0;border-radius:0}.focus-dialog-heading{padding:14px 16px}.focus-dialog-content{padding:16px}}

.focus-dialog-heading{height:auto;min-height:0;color:inherit;padding:var(--space-4) var(--space-6)}
.focus-dialog-heading h2{font-size:var(--text-section);line-height:1.3}
.focus-dialog-content{padding:var(--space-6);font-size:var(--text-body);line-height:1.5}
.focus-dialog-content .inline-action>.personnel-actions{position:static;bottom:auto;background:transparent;padding:0;margin-top:var(--space-4)}
.focus-dialog-content .inline-action>h2{font-size:var(--text-section);margin:0 0 var(--space-4)}
.focus-dialog-content .inline-action>h3{font-size:var(--text-subtitle);margin:0 0 var(--space-3)}
.focus-dialog-content .inline-action>p{margin:var(--space-3) 0}
.focus-dialog-content .inline-action>button:first-child{display:none}
.focus-dialog-content .intel-panel{margin:0}
@media(max-width:640px){.focus-dialog-heading,.focus-dialog-content{padding:var(--space-4)}}
dialog.focus-dialog-with-footer{overflow:hidden}
dialog.focus-dialog-with-footer[open]{display:flex;flex-direction:column}
.focus-dialog-with-footer .focus-dialog-heading,.focus-dialog-footer{flex-shrink:0}
.focus-dialog-with-footer .focus-dialog-content{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.focus-dialog-footer{display:block;margin:0;padding:var(--space-3) var(--space-6);border-top:1px solid var(--command-line);background:#101b20}
@media(max-width:640px){.focus-dialog-footer{padding:var(--space-2) var(--space-4) calc(var(--space-2) + env(safe-area-inset-bottom,0px))}}
</style>
