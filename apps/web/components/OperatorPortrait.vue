<script setup lang="ts">
const props=defineProps<{name:string;specialization:string;level:number}>()
const initials=computed(()=>props.name.trim().split(/\s+/).filter(Boolean).map(part=>part[0]).filter((_,index,all)=>index===0||index===all.length-1).join('').slice(0,2).toLocaleUpperCase('pt-BR'))
</script>
<template><div :class="['operator-portrait',specialization]" aria-hidden="true"><GameIcon name="company" /><strong>{{initials}}</strong><small>L{{level}}</small></div></template>
