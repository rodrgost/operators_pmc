<script setup lang="ts">
const props=defineProps<{kind:'kit'|'mission';all:string}>()
const value=defineModel<string>({required:true})
const names=computed(()=>props.kind==='kit'?kitNames:missionTypeNames)
const richOptions=import.meta.client && CSS.supports('appearance','base-select')
</script>

<template>
 <span class="select-wrap" :class="{'with-icon':!richOptions&&value}">
  <GameIcon v-if="!richOptions&&value" class="select-icon" :name="`${kind}-${value}`" />
  <select v-model="value" class="game-label-select">
   <component v-if="richOptions" :is="'button'" type="button" class="selected-label">
    <component :is="'selectedcontent'" />
   </component>
   <option value="">{{all}}</option>
   <option v-for="(label,code) in names" :key="code" :value="code">
    <GameLabel v-if="richOptions" :kind="kind" :code="code" />
    <template v-else>{{label}}</template>
   </option>
  </select>
 </span>
</template>

<style scoped>
.select-wrap {
 display:block;
 position:relative;
}
.game-label-select {
 width:100%;
}
.select-wrap.with-icon .game-label-select {
 padding-inline-start:2.25em;
}
.select-icon {
 position:absolute;
 inset-inline-start:.75em;
 top:50%;
 width:1.1em;
 height:1.1em;
 transform:translateY(-50%);
 pointer-events:none;
}
@supports (appearance:base-select) {
 .game-label-select,.game-label-select::picker(select) {
  appearance:base-select;
 }
 .game-label-select::picker(select) {
  border:1px solid var(--command-line);
  border-radius:.5rem;
  background:var(--command-surface);
  color:#edf2f3;
 }
 .selected-label {
  padding:0;
  border:0;
  background:none;
  color:inherit;
  font:inherit;
 }
 .game-label-select option {
  gap:.5em;
  padding:.5em .75em;
 }
 .game-label-select option:hover,.game-label-select option:focus-visible {
  background:var(--command-raised);
 }
}
</style>
