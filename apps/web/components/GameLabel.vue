<script setup lang="ts">
const props=defineProps<{
 kind?:'kit'|'mission'
 code?:string|null
 label?:string
}>()

const names=computed(()=>props.kind==='kit'?kitNames:missionTypeNames)
const known=computed(()=>Object.hasOwn(names.value,props.code??''))
const icon=computed(()=>known.value?`${props.kind}-${props.code}`:props.kind==='kit'?'kit':'missions')
const name=computed(()=>props.label??(known.value?names.value[props.code!]:props.code))
</script>

<template>
 <span class="game-label"><template v-if="kind"><GameIcon :name="icon" />&#160;</template>{{name}}</span>
</template>

<style scoped>
.game-label > .game-icon {
 width:1.1em;
 height:1.1em;
 vertical-align:-.18em;
}
</style>
