<script setup lang="ts">
const props=defineProps<{gameId:string;newsKey:string;label:string}>()
const news=useNavigationNews()
const unread=computed(()=>news.status(props.gameId,props.newsKey)==='new')
</script>

<template>
 <button v-if="unread" type="button" class="card-news" :aria-label="'Marcar como visto: '+label" title="Marcar como visto" @click.stop="news.markRead(gameId,newsKey)">
  <NavigationBadge status="new" />
 </button>
</template>

<style scoped>
.card-news{display:inline-flex;align-items:center;justify-content:center;width:24px;min-width:24px;height:24px;min-height:24px;padding:0;background:transparent;border:0;vertical-align:middle}
.card-news :deep(.navigation-badge){margin:0}
</style>
