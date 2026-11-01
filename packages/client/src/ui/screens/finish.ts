import type { Action, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { describe, GROUP } from '../../describe.ts'
import type { LogEntry } from '../../motion.ts'
import { FactionChip, SuitPip } from '../components.ts'

const REASON = { points: 'Thắng bằng điểm', dominance: 'Thắng bằng Dominance (điều kiện kiểm soát)', coalition: 'Thắng cùng liên minh Coalition' }
export function GameResult({ view: v }: { view: PlayerView }) {
  if (!v.winner) return null
  return html`<section class="card result" aria-label="Kết quả trận"><h2>Rừng thu đã có người chiến thắng!</h2>
    <div>${v.winner.factions.map(f => html`<${FactionChip} f=${f} />`)}</div>
    <p>${REASON[v.winner.reason]}</p><h3>Điểm cuối ván</h3>
    <ul>${v.seats.map(s => html`<li><${FactionChip} f=${s.faction} /> · ${v.score[s.faction] ?? 'Đã rời đường điểm'}</li>`)}</ul>
    <a href="./">Về sảnh / tạo ván mới →</a><p class="note">Bạn vẫn có thể xem bàn cờ và nhật ký bên dưới.</p></section>`
}

/** Only locations actually present in the public log; never infer a hidden payload. */
export function logClearings(entry: LogEntry): number[] {
  if (!entry.detail || typeof entry.detail !== 'object') return []
  const p = entry.detail as Record<string, unknown>
  const to = p.to as { kind?: string; id?: unknown } | undefined
  const values = [p.clearing, p.from, typeof p.to === 'number' ? p.to : to?.kind === 'clearing' ? to.id : undefined,
    ...(Array.isArray(p.clearings) ? p.clearings : []), ...(Array.isArray(p.wood) ? p.wood : [])]
  return [...new Set(values.filter((c): c is number => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < 12))]
}
export function GameLog({ log, selected, onSelect }: { log: LogEntry[]; selected: number | null; onSelect: (entry: LogEntry) => void }) {
  return html`<section class="card"><h3>Nhật ký</h3><p class="note">Mới nhất ở trên. Bấm dòng có ô để đánh dấu trên bàn.</p><div class="log">
    ${!log.length && html`<p>Chưa có hành động nào.</p>`}
    ${[...log].reverse().map(l => html`<div class="log-entry" key=${l.revision}>
      <span class="note">#${l.revision}</span> <${FactionChip} f=${l.faction} />
      <button class="secondary" disabled=${!logClearings(l).length} aria-pressed=${selected === l.revision} onClick=${() => onSelect(l)}>
        ${GROUP[l.type] ?? l.type}${l.detail ? `: ${describe({ type: l.type, payload: l.detail } as Action)}` : ''}</button>
    </div>`)}</div></section>`
}
export function QuickGuide() {
  return html`<details class="card guide"><summary>Hướng dẫn nhanh & chú giải</summary>
    <ol><li>Ở sảnh, tạo trận: chọn một ghế người và bot cho các ghế còn lại. Giữ liên kết ghế để vào lại.</li>
    <li>Xem “Đang chờ” ở đầu trang. Nếu là bạn, làm lựa chọn trong hộp quyết định hoặc bấm ô có viền vàng.</li>
    <li>Di chuyển: chọn ô đi, ô đến, rồi nút số chiến binh. Bấm lá bài để xem chi tiết và các cách dùng hiện có.</li>
    <li>Dùng nút kết thúc bước khi muốn chuyển tiếp. Mở danh sách đầy đủ ở thanh hành động để xem mọi lựa chọn hợp lệ.</li>
    <li>Xem bảng phe, điểm và nhật ký để theo dõi trận. Đồng hồ hết giờ thì bot chọn thay một lần.</li></ol>
    <p>Birdsong → Daylight → Evening là ba giai đoạn trong lượt. Hành động cụ thể và cách ghi điểm nằm ở bảng từng phe.</p>
    <p>Chất ô / lá: ${['fox', 'rabbit', 'mouse', 'bird'].map(s => html`<${SuitPip} suit=${s} />`)} (cáo, thỏ, chuột, chim).
    Viền vàng: có thể chọn; viền đậm: đang chọn. Quân có hình và màu riêng theo phe.</p>
    <p>3D: kéo để xoay, cuộn để phóng to; “Về góc mặc định” đặt lại góc nhìn. Chuyển 2D nếu muốn bàn phẳng.
    Âm thanh mặc định tắt; nút âm thanh phát tiếng gõ tự tổng hợp trên máy, không tải âm từ mạng.</p></details>`
}
