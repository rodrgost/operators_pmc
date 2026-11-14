<script setup lang="ts">
const props=defineProps<{modelValue:string;items:string[][];label:string;disabled?:boolean;gameId?:string;scope?:string}>()
const news=useNavigationNews()
const emit=defineEmits(['update:modelValue'])
const routes=useState<Record<string,string>>('campaign-sections',()=>({}))
const active=useState('campaign-active-scope',()=> 'overview')
watch(()=>[routes.value[props.scope||''],active.value],()=>{
 if(active.value!==props.scope)return
 if(props.gameId&&props.scope)news.markRead(props.gameId,props.scope+'.'+(routes.value[props.scope]||props.modelValue))
 const requested=routes.value[props.scope||'']
 if(requested&&props.items.some(item=>item[0]===requested)&&requested!==props.modelValue)emit('update:modelValue',requested)
},{immediate:true})
watch(()=>props.modelValue,value=>{if(props.scope&&active.value===props.scope&&routes.value[props.scope]!==value)routes.value={...routes.value,[props.scope]:value}})
function choose(value:string){
 if(props.scope)routes.value={...routes.value,[props.scope]:value}
 emit('update:modelValue',value)
}

</script>
<template><nav class="section-nav" :aria-label="label"><button v-for="item in items" :key="item[0]" type="button" :class="{active:modelValue===item[0]}" :aria-current="modelValue===item[0]?'page':undefined" :disabled="disabled" @click="choose(item[0])">{{item[1]}}<NavigationBadge v-if="gameId&&scope" :status="news.status(gameId,scope+'.'+item[0])" /></button></nav></template>
