import { useState } from 'react'
import { Board } from './Board'

export function MapPreview() {
  const [selected, setSelected] = useState<number | null>(null)
  return <div className="map-preview-page">
    <header className="map-preview-header">
      <a className="map-preview-brand" href="/">grove<span>THE WOODLAND</span></a>
      <nav aria-label="Điều hướng bản đồ"><a href="/">← Đấu trường</a><span>BẢN ĐỒ</span></nav>
    </header>
    <main className="map-preview-main">
      <Board selected={selected} onSelect={id => setSelected(id < 0 ? null : id)} />
      {selected !== null && <div className="map-preview-selection" role="status">
        Vùng {selected + 1}<button onClick={() => setSelected(null)} aria-label="Bỏ chọn vùng">×</button>
      </div>}
    </main>
  </div>
}
