<script setup lang="ts">
const props=defineProps<{name:string}>()
const paths:Record<string,string>={command:'M4 20V10l8-6 8 6v10H4ZM9 20v-7h6v7',missions:'m12 3 8 4v5c0 5-8 9-8 9S4 17 4 12V7l8-4Zm-4 9 3 3 5-6',company:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',world:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 5 4 13 0 18-4-5-4-13 0-18Z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',check:'m5 12 4 4L19 6',alert:'m12 3 10 18H2L12 3Zm0 6v5m0 3v1',cross:'m6 6 12 12M18 6 6 18',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1',kit:'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-10-2h2v5h-2v-5'}
Object.assign(paths,{
 'kit-combat':'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 2v5m0 10v5M2 12h5m10 0h5',
 'kit-recon':'m3 14 2-7h4l1 4h4l1-4h4l2 7m-11 2a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm11 0a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-11 0h4',
 'kit-medical':'M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z',
 'kit-technical':'M21 7a5 5 0 0 1-6.5 4.8L7 19.5a2 2 0 1 1-2.8-2.8l7.7-7.5A5 5 0 0 1 17 3l-3 3 1 2 2 1 3-3Z',
 'kit-communication':'M12 12v9m-4 0h8M8 14a6 6 0 0 1 0-8m8 0a6 6 0 0 1 0 8M5 17A10 10 0 0 1 5 3m14 0a10 10 0 0 1 0 14m-6-7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
 'kit-logistics':'M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10m-4.5-16 9 4',
 'mission-security':'m12 3 8 4v5c0 5-8 9-8 9S4 17 4 12V7l8-4Z',
 'mission-escort':'m3 7 4 5-4 5m6-10 4 5-4 5m9-8 3 3-3 3-3-3 3-3Z',
 'mission-reconnaissance':'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 'mission-extraction':'M11 4H4v16h7m-1-8h11m-4-4 4 4-4 4',
 'mission-recovery':'M8 9V4h8v5m-3-5v2M4 11h16v9H4v-9Zm0 0 2-2h12l2 2m-10 4h4',
 'mission-rescue':'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 6l3 3m6 6 3 3m0-12-3 3m-6 6-3 3',
})
</script>
<template><svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="paths[props.name]||paths.info" /></svg></template>
