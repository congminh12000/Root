import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearPrompt, clearTargets } from '../src/ui/screens/clear-games.ts'

const bot = { kind: 'bot', connected: true }
const done = { winner: ['eyrie'], seats: [bot] }
const running = { winner: null, seats: [bot] }
const online = { winner: null, seats: [{ kind: 'human', connected: true }, bot] }

test('finished deletes only games with a winner; all deletes everything', () => {
  assert.deepEqual(clearTargets([done, running], 'finished'), [done])
  assert.deepEqual(clearTargets([done, running], 'all'), [done, running])
})

test('nothing to delete gives no prompt, so the button stays off', () => {
  assert.equal(clearPrompt([], 'all'), null)
  assert.equal(clearPrompt([running], 'finished'), null)
})

test('the prompt counts games, warns about running and connected games, and says it cannot be undone', () => {
  assert.match(clearPrompt([running], 'all')!, /^Xoá 1 trận khỏi máy chủ\?/)
  assert.equal(clearPrompt([done, running], 'finished'), 'Xoá 1 trận đã kết thúc khỏi máy chủ? Không thể hoàn tác.')
  const all = clearPrompt([done, running, online], 'all')!
  assert.match(all, /tất cả 3 trận/)
  assert.match(all, /2 trận đang chơi dở, 1 trận có người đang kết nối/)
  assert.match(all, /Không thể hoàn tác/)
})
