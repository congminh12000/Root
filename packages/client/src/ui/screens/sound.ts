import { html } from 'htm/preact'
import { useEffect, useRef, useState } from 'preact/hooks'

/** Original, locally synthesized wooden tap. No recording, asset, or network request. */
export function SoundToggle({ revision }: { revision: number }) {
  const [enabled, setEnabled] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const previous = useRef(revision)
  const tap = () => {
    const ctx = audio.current
    if (!ctx || ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + .06)
    gain.gain.setValueAtTime(.045, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .08)
    osc.connect(gain).connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + .09)
  }
  useEffect(() => {
    if (revision !== previous.current && enabled) tap()
    previous.current = revision
  }, [revision, enabled])
  useEffect(() => () => { void audio.current?.close() }, [])
  const toggle = async () => {
    if (enabled) { setEnabled(false); return }
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      setEnabled(true); tap()
    } catch { setEnabled(false) }
  }
  return html`<button class="secondary" aria-pressed=${enabled} onClick=${toggle}>Âm thanh: ${enabled ? 'bật' : 'tắt'}</button>`
}
