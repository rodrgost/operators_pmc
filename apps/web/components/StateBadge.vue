<script setup lang="ts">
import {gameStatus} from '../utils/gameStatus'
const props=defineProps<{status:string;label:string}>()
const state=computed(()=>gameStatus(props.status))
</script>
<template><span :class="['state-badge',state.tone]"><GameIcon :name="state.icon" />{{label}}</span></template>
