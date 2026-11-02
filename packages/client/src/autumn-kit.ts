import './ui/setup.ts'
import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { AUTUMN } from '@root/game-data'
import { changeDemo, hasRuin, initialDemo, type DemoAction, type DemoState } from './autumn/demo.ts'
import { CLEARINGS, PLOTS } from './autumn/layout.ts'
import { mountAutumn, type AutumnScene } from './autumn/scene.ts'
import { BUILDINGS, BUILDING_NAME } from './lake/layout.ts'
import { SUIT_NAME } from './names.ts'

/** autumn-kit.html: the Autumn diorama for review (UI-7, docs/07-ui/autumn-preview.md), same tools as lake-kit. */
function AutumnKit() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<AutumnScene | null>(null)
  const [state, setState] = useState<DemoState>(initialDemo)
  const [labels, setLabels] = useState(false)
  const [error, setError] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [measurement, setMeasurement] = useState('')
  const dispatch = (action: DemoAction) => setState(s => changeDemo(s, action))
  useEffect(() => {
    if (!host.current) return
    try { scene.current = mountAutumn(host.current, id => dispatch({ type: 'select', id })) }
    catch { setError(true) }
    return () => { scene.current?.dispose(); scene.current = null }
  }, [])
  useEffect(() => { scene.current?.update(state, labels) }, [state, labels])
  const plot = PLOTS.find(p => p.id === state.selected)
  const blocked = !!plot && hasRuin(state, plot)
  const measure = () => {
    if (measuring || !scene.current) return
    setMeasuring(true)
    // Let the busy label paint before the explicit, bounded GPU measurement.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ms = scene.current?.measure(30)
      if (ms) setMeasurement(`${ms.toFixed(1)} ms/khung · ~${Math.round(1000/ms)} fps · canvas ${host.current?.querySelector('canvas')?.width}×${host.current?.querySelector('canvas')?.height} px`)
      setMeasuring(false)
    }))
  }
  return html`<main class="lake-page">
    <header class="lake-heading"><div><p class="lake-eyebrow">XƯỞNG BẢN ĐỒ · 02</p><h1>Autumn <span>Rừng mùa thu</span></h1>
      <p>Bản dựng chờ duyệt · ${AUTUMN.clearings.length} clearing · ${PLOTS.length} slot · ${PLOTS.filter(p => p.ruin).length} Ruin · ${AUTUMN.paths.length} đường, đúng dữ liệu game</p></div>
      <nav aria-label="Trang xem thử"><a href="./">Sảnh</a> · <a href="./lake-kit.html">Lake</a> · <a href="./map-kit.html">Map trong trận</a> · <a href="./map-kit.html?map=classic">Bàn cổ điển</a> · <a href="./ui-kit.html">UI kit</a></nav></header>
    <div class="lake-layout"><section class="lake-stage card" aria-label="Bàn Autumn">
      <div class="lake-tools"><button class="secondary" onClick=${() => scene.current?.home()}>Về góc mặc định</button>
        <button class="secondary" onClick=${() => scene.current?.home(true)}>Nhìn từ trên</button>
        <label><input type="checkbox" checked=${labels} onChange=${(e: Event) => setLabels((e.target as HTMLInputElement).checked)} /> Hiện số clearing / slot</label></div>
      <div class="lake-canvas" ref=${host}>${error && html`<p role="alert">Không khởi tạo được WebGL. Bạn vẫn có thể xem và thử slot trong danh sách bên cạnh.</p>`}</div>
      <p class="note lake-caption">Kéo để xoay · cuộn để phóng to · bấm nền đất để chọn. Nhà nhỏ ngoài clearing, sông, cầu và vách đá là trang trí; nền đất là chỗ xây.</p>
    </section>
    <aside class="lake-panel">
      <section class="card"><p class="lake-eyebrow">THỬ CÔNG TRÌNH</p><h2>${plot ? `Clearing ${plot.clearing + 1} · slot ${plot.id}` : 'Chọn một nền đất'}</h2>
        <p class="note">Demo hình ảnh, không áp dụng luật hoặc tiêu tốn tài nguyên trong game.</p>
        <p class="lake-state" role="status">${!plot ? 'Bấm slot trên bàn hoặc trong danh sách bên dưới.' : blocked ? 'R · Ruin đang chiếm slot. Cần thử dọn trước khi đặt mẫu.' : state.buildings[plot.id] ? `Đang đặt: ${BUILDING_NAME[state.buildings[plot.id]!]}` : 'Nền trống · sẵn sàng đặt công trình mẫu.'}</p>
        <div class="lake-samples">${BUILDINGS.map(b => html`<button class="secondary" disabled=${!plot || blocked} aria-pressed=${!!plot && state.buildings[plot.id] === b} onClick=${() => dispatch({ type: 'place', building: b })}>${BUILDING_NAME[b]}</button>`)}</div>
        <div class="lake-tools"><button class="secondary" disabled=${!plot} onClick=${() => plot && scene.current?.focus(plot.id)}>Xem gần slot</button><button disabled=${!plot || !state.buildings[plot.id]} onClick=${() => dispatch({ type: 'remove' })}>Gỡ công trình</button>
        <button disabled=${!blocked} onClick=${() => dispatch({ type: 'clear' })}>Thử dọn Ruin</button></div>
        <button class="secondary" onClick=${() => dispatch({ type: 'reset' })}>Khôi phục toàn cảnh</button>
      </section>
      <section class="card"><h2>Danh sách slot</h2><p class="note">Mỗi nút ứng với một nền cố định. Tab và Enter để chọn.</p>
        <div class="lake-slots">${CLEARINGS.map(c => html`<div><span>Clearing ${c.id + 1} · ${SUIT_NAME[c.suit]}</span><div>${c.plots.map(p => html`<button class="secondary" data-plot=${p.id} aria-label=${`Slot ${p.id}${hasRuin(state,p) ? ', Ruin' : ''}`} aria-pressed=${state.selected === p.id} onClick=${() => dispatch({ type: 'select', id: p.id })}>${p.id}${hasRuin(state,p) ? ' · R' : state.buildings[p.id] ? ' · nhà' : ' · trống'}</button>`)}</div></div>`)}</div>
      </section>
      <details class="card"><summary>Ghi chú bản duyệt & hiệu năng</summary><p>Clearing, chất, số slot, Ruin, 18 đường và kho item lấy từ game-data (AUTUMN). Sông, hồ, cầu, vách đá, nhà và cây là trang trí dựng bằng code theo ảnh tham chiếu của người quản lý; ảnh đó không nằm trong repo. Vị trí R trong clearing là bố trí hiển thị; luật chỉ quy định số Ruin.</p>
        <button class="secondary" disabled=${error || measuring} onClick=${measure}>${measuring ? 'Đang đo…' : 'Đo 30 khung hình'}</button><output>${measurement}</output></details>
    </aside></div></main>`
}
render(html`<${AutumnKit} />`, document.getElementById('app')!)
