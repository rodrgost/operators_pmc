export function useActionFeedback() {
 const feedbackTarget=ref('')
 function captureAction(event: MouseEvent) {
  if (!(event.target instanceof Element) || !event.target.closest('button')) return
  const card=event.target.closest<HTMLElement>('[data-action-card]')
  feedbackTarget.value=card?.id ? '#'+card.id : ''
 }
 return {feedbackTarget,captureAction}
}
