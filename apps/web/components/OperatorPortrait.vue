<script setup lang="ts">
import {operatorPortrait} from '../../../packages/engine/content'
const props=defineProps<{name:string;specialization:string;gender?:string;portraitVariant?:number}>()
const source=computed(()=>operatorPortrait(props.name,props.specialization,props.gender,props.portraitVariant))
</script>
<template><div :class="['operator-portrait',specialization]" aria-hidden="true"><img :src="source" alt="" width="76" height="86" loading="lazy" /></div></template>
