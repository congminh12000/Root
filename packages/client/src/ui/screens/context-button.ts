import type { Action, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { contextAction } from '../../interaction/context-action.ts'

export function ContextButton({ legal, view, send, onCancel }: {
  legal: Action[]; view?: PlayerView | undefined; send: (action: Action) => void; onCancel?: (() => void) | undefined
}) {
  const next = contextAction(legal, view, !!onCancel)
  return html`<button class="context-action" disabled=${!next.action && !next.cancel}
    title=${next.cancel ? 'Bỏ lựa chọn trên bản đồ (Esc)' : next.action ? next.label : 'Hoàn thành quyết định hiện tại trước'}
    onClick=${() => { if (next.cancel) onCancel?.(); else if (next.action) send(next.action) }}>${next.label}${!next.cancel && ' ▷'}</button>`
}
