<script setup lang="ts">
const props=defineProps<{id:string}>()
const ids=['gov-valdoria','gov-karsen','gov-solmar','gov-norvik','gov-arken','corp-meridian','corp-helion','corp-nexa','civil-relief','faction-north','pmc-iron','pmc-wolf','pmc-aegis']
const organizationId=computed(()=>ids.includes(props.id)?props.id:ids.includes('gov-'+props.id)?'gov-'+props.id:null)
</script>
<template><img v-if="organizationId" class="organization-emblem" :src="'/images/organizations/'+organizationId+'.png'" alt="" width="64" height="48" loading="lazy" /></template>
