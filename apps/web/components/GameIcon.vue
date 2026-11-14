<script setup lang="ts">
const props=defineProps<{name:string}>()
const paths:Record<string,string>={command:'M4 20V10l8-6 8 6v10H4ZM9 20v-7h6v7',missions:'m12 3 8 4v5c0 5-8 9-8 9S4 17 4 12V7l8-4Zm-4 9 3 3 5-6',company:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',world:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 5 4 13 0 18-4-5-4-13 0-18Z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',check:'m5 12 4 4L19 6',alert:'m12 3 10 18H2L12 3Zm0 6v5m0 3v1',cross:'m6 6 12 12M18 6 6 18',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1',kit:'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-10-2h2v5h-2v-5'}
</script>
<template><svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="paths[props.name]||paths.info" /></svg></template>
