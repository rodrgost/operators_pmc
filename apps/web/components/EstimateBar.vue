<script setup lang="ts">
const props=defineProps<{label:string;min:number;max:number;inverse?:boolean}>()
const low=computed(()=>Math.max(0,Math.min(100,props.min)))
const high=computed(()=>Math.max(low.value,Math.min(100,props.max)))
</script>
<template><div class="estimate-bar" :class="{inverse}">
 <div class="estimate-heading"><span>{{label}}</span><strong>{{min}}–{{max}} <small>/ 100</small></strong></div>
 <div class="estimate-track" role="img" :aria-label="`${label}: faixa estimada de ${min} a ${max}, em uma escala de 0 a 100`"><span class="estimate-range" :style="{left:low+'%',width:Math.max(1,high-low)+'%'}"></span></div>
 <div class="estimate-scale" aria-hidden="true"><span>0 · baixo</span><span>50</span><span>100 · alto</span></div>
 <small class="estimate-direction">{{inverse?'Quanto menor, mais favorável':'Quanto maior, mais favorável'}}</small>
</div></template>
<style scoped>
.estimate-bar{min-width:0}.estimate-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;font-size:14px}.estimate-heading strong{font-size:20px}.estimate-heading small{font-size:11px;color:#a9b0b6;font-weight:400}.estimate-track{height:16px;position:relative;border-radius:5px;background:linear-gradient(90deg,#734c40,#81734e,#516a55);border:1px solid #68716d}.inverse .estimate-track{background:linear-gradient(90deg,#516a55,#81734e,#734c40)}.estimate-range{position:absolute;top:-4px;bottom:-4px;border:2px solid #d7e9bc;border-radius:4px;background:repeating-linear-gradient(135deg,#d7e9bc99 0px,#d7e9bc99 3px,#17241fbb 3px,#17241fbb 6px);box-sizing:border-box}.estimate-scale{display:flex;justify-content:space-between;font-size:10px;color:#afb8b5;margin-top:9px}.estimate-direction{display:block;font-size:11px;color:#bec9c1;margin-top:10px}
</style>
