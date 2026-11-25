<script setup lang="ts">
const props = defineProps<{ target: string; section: string; turn: number }>()
const error = defineModel<string>('error')
const notice = defineModel<string>('notice')
const activeScope = useState('campaign-active-scope', () => 'overview')

function dismiss() {
  error.value = ''
  notice.value = ''
}

watch([activeScope, () => props.section, () => props.turn], dismiss)
</script>

<template>
  <Transition name="feedback">
    <div v-if="error || notice" class="feedback-anchor">
     <div class="action-feedback">
      <p v-if="error" class="error" role="alert">
        <GameIcon name="alert" />
        <span><strong>Ação não concluída</strong>{{ error }}</span>
      </p>
      <p v-if="notice" class="personnel-notice" role="status">
        <GameIcon name="check" />
        <span><strong>Comando registrado</strong>{{ notice }}</span>
      </p>
      <button type="button" class="secondary dismiss-feedback" aria-label="Fechar aviso" @click.stop="dismiss">✕</button>
     </div>
    </div>
  </Transition>
</template>

<style scoped>
.feedback-anchor {
  position: sticky;
  top: var(--space-2);
  height: 0;
  z-index: 8;
}

.action-feedback {
  position: relative;
  width: min(100%, 32rem);
  margin-inline-start: auto;
}

.action-feedback p {
  padding-inline-end: 60px;
  box-shadow: 0 8px 22px rgb(0 0 0 / 35%);
}

.dismiss-feedback {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 8px;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
}
</style>
