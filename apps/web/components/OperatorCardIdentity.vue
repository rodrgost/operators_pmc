<script setup lang="ts">
defineProps<{
 person:{name:string;callsign?:string;specialization:string;gender?:string;portraitVariant?:number;level:number;xp?:number}
 specialty:string
 showXp?:boolean
}>()
</script>

<template>
 <div class="operator-identity">
  <OperatorPortrait :name="person.name" :gender="person.gender" :portrait-variant="person.portraitVariant" :specialization="person.specialization" />
  <div>
   <h3><span v-if="person.callsign" class="callsign-prefix">“{{person.callsign}}” </span>{{person.name}}</h3>
   <p>{{specialty}} · Nível {{person.level}}<template v-if="showXp"> · XP {{person.xp??0}}</template></p>
  </div>
 </div>
</template>

<style scoped>
.operator-identity{margin:0}
.operator-identity :deep(.operator-portrait){width:56px;height:64px}
.operator-identity p{margin:0;font-size:var(--text-caption)}
.callsign-prefix{color:#b6c9d1}
</style>
