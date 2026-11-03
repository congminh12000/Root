import { batch, signal } from '@preact/signals'
import type { Action } from '@root/game-engine'
import { roomKey } from './api.ts'
import { changesBetween, NO_CHANGES, type Changes } from './changes.ts'
import type { Message, Update } from './types.ts'

/**
 * One game's WebSocket as signals: the latest update, what it changed, a notice line and the local deadline.
 * Reconnects after a drop. The client never decides legality: `send` only passes on an element of `legal`.
 */
export function connectGame(gameId: string, token: string | null) {
  const update = signal<Update | null>(null)
  const changes = signal<Changes>(NO_CHANGES)
  const notice = signal('')
  /** Local clock time the server's turn deadline falls at, corrected for clock skew. */
  const deadline = signal<number | null>(null)
  let socket: WebSocket | null = null
  let counter = 0, seq = 0, closed = false

  function open() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const auth = token ? `&token=${encodeURIComponent(token)}` : `&key=${encodeURIComponent(roomKey())}`
    socket = new WebSocket(`${proto}://${location.host}/ws?game=${encodeURIComponent(gameId)}${auth}`)
    socket.onmessage = ev => {
      const msg = JSON.parse(ev.data) as Message
      if (msg.type === 'update') {
        batch(() => {
          deadline.value = msg.deadline === null ? null : Date.now() + (msg.deadline - msg.now)
          changes.value = changesBetween(update.value, msg, ++seq)
          update.value = msg
          notice.value = ''
        })
      } else notice.value = msg.type === 'rejected' ? `Máy chủ từ chối: ${msg.result.code}` : msg.message
    }
    socket.onclose = () => {
      if (closed) return
      notice.value = 'Mất kết nối, đang nối lại…'
      setTimeout(open, 1500)
    }
  }

  function send(action: Action) {
    const u = update.value
    if (!u || !socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: 'command', actionId: `${Date.now()}-${counter++}`, expectedRevision: u.view.revision, action }))
  }

  function undo() {
    if (update.value && socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: 'undo', expectedRevision: update.value.view.revision }))
  }
  function chat(text: string) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'chat', text }))
  }
  open()
  return { update, changes, notice, deadline, send, undo, chat, close: () => { closed = true; socket?.close() } }
}
export type GameConnection = ReturnType<typeof connectGame>
