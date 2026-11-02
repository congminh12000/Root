import './ui/setup.ts'
import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { BUILDINGS, BUILDING_NAME, PLOTS, VILLAGES, changeDemo, hasRuin, initialDemo, type DemoAction, type DemoState } from './lake/layout.ts'
import { mountLake, type LakeScene } from './lake/scene.ts'

function LakeKit() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<LakeScene | null>(null)
  const [state, setState] = useState<DemoState>(initialDemo)
  const [labels, setLabels] = useState(false)
  const [error, setError] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [measurement, setMeasurement] = useState('')
  const dispatch = (action: DemoAction) => setState(s => changeDemo(s, action))
  useEffect(() => {
    if (!host.current) return
    try { scene.current = mountLake(host.current, id => dispatch({ type: 'select', id })) }
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
    <header class="lake-heading"><div><p class="lake-eyebrow">XƯỞNG BẢN ĐỒ · 01</p><h1>Lake <span>Rừng bên hồ</span></h1>
      <p>Thiết kế 3D đã duyệt · 12 clearing · 22 slot · 4 Ruin</p></div>
      <nav aria-label="Trang xem thử"><a href="./">Sảnh</a> · <a href="./autumn-kit.html">Autumn</a> · <a href="./ui-kit.html">UI kit</a></nav></header>
    <div class="lake-layout"><section class="lake-stage card" aria-label="Bàn Lake">
      <div class="lake-tools"><button class="secondary" onClick=${() => scene.current?.home()}>Về góc mặc định</button>
        <button class="secondary" onClick=${() => scene.current?.home(true)}>Nhìn từ trên</button>
        <label><input type="checkbox" checked=${labels} onChange=${(e: Event) => setLabels((e.target as HTMLInputElement).checked)} /> Hiện số clearing / slot</label></div>
      <div class="lake-canvas" ref=${host}>${error && html`<p role="alert">Không khởi tạo được WebGL. Bạn vẫn có thể xem và thử slot trong danh sách bên cạnh.</p>`}</div>
      <p class="note lake-caption">Kéo để xoay · cuộn để phóng to · bấm nền đất để chọn. Nhà nhỏ ở rìa là trang trí; nền sáng là chỗ xây.</p>
    </section>
    <aside class="lake-panel">
      <section class="card"><p class="lake-eyebrow">THỬ CÔNG TRÌNH</p><h2>${plot ? `Clearing ${plot.clearing} · slot ${plot.id}` : 'Chọn một nền đất'}</h2>
        <p class="note">Demo hình ảnh, không áp dụng luật hoặc tiêu tốn tài nguyên trong game.</p>
        <p class="lake-state" role="status">${!plot ? 'Bấm slot trên bàn hoặc trong danh sách bên dưới.' : blocked ? 'R · Ruin đang chiếm slot. Cần thử dọn trước khi đặt mẫu.' : state.buildings[plot.id] ? `Đang đặt: ${BUILDING_NAME[state.buildings[plot.id]!]}` : 'Nền trống · sẵn sàng đặt công trình mẫu.'}</p>
        <div class="lake-samples">${BUILDINGS.map(b => html`<button class="secondary" disabled=${!plot || blocked} aria-pressed=${!!plot && state.buildings[plot.id] === b} onClick=${() => dispatch({ type: 'place', building: b })}>${BUILDING_NAME[b]}</button>`)}</div>
        <div class="lake-tools"><button class="secondary" disabled=${!plot} onClick=${() => plot && scene.current?.focus(plot.id)}>Xem gần slot</button><button disabled=${!plot || !state.buildings[plot.id]} onClick=${() => dispatch({ type: 'remove' })}>Gỡ công trình</button>
        <button disabled=${!blocked} onClick=${() => dispatch({ type: 'clear' })}>Thử dọn Ruin</button></div>
        <button class="secondary" onClick=${() => dispatch({ type: 'reset' })}>Khôi phục toàn cảnh</button>
      </section>
      <section class="card"><h2>Danh sách slot</h2><p class="note">Mỗi nút ứng với một nền cố định. Tab và Enter để chọn.</p>
        <div class="lake-slots">${VILLAGES.map(c => html`<div><span>Clearing ${c.id}</span><div>${c.slots.map(p => html`<button class="secondary" data-plot=${p.id} aria-label=${`Slot ${p.id}${hasRuin(state,p) ? ', Ruin' : ''}`} aria-pressed=${state.selected === p.id} onClick=${() => dispatch({ type: 'select', id: p.id })}>${p.id}${hasRuin(state,p) ? ' · R' : state.buildings[p.id] ? ' · nhà' : ' · trống'}</button>`)}</div></div>`)}</div>
      </section>
      <details class="card"><summary>Ghi chú bản duyệt & hiệu năng</summary><p>Ảnh người quản lý gửi là tham chiếu bố cục. Đây là Lake minh họa tự dựng, chưa xác nhận là bản đồ chơi chính thức. Bố cục và slot/Ruin đã được duyệt; việc nối vào game cần nguồn luật và dữ liệu riêng.</p>
        <p>Khu item và đường điểm chỉ là mô hình minh họa. Khôi phục sẽ trả lại mọi Ruin và xóa công trình mẫu.</p>
        <button class="secondary" disabled=${error || measuring} onClick=${measure}>${measuring ? 'Đang đo…' : 'Đo 30 khung hình'}</button><output>${measurement}</output></details>
    </aside></div></main>`
}
render(html`<${LakeKit} />`, document.getElementById('app')!)
