<script setup lang="ts">
const installEvent=shallowRef<any>(null)
const browserStorage=useRuntimeConfig().public.storageMode==='browser'
const installing=ref(false)
function available(event:Event){event.preventDefault();installEvent.value=event}
function installed(){installEvent.value=null}
async function install(){
 const event=installEvent.value;if(!event)return
 installing.value=true
 try{await event.prompt();await event.userChoice}finally{installEvent.value=null;installing.value=false}
}
onMounted(()=>{window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',installed)})
onBeforeUnmount(()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',installed)})
</script>
<template><button v-if="browserStorage&&installEvent" class="secondary action-block" :disabled="installing" @click="install">Instalar OPERATORS</button></template>
