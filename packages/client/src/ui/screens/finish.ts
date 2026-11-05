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
/** Controls and legend for the map-only screen; opened from the HUD menu. */
export function QuickGuide() {
  return html`<section class="guide"><h3>Hướng dẫn nhanh & chú giải</h3>
    <p><b>Ván đầu:</b> ở sảnh, chọn một ghế người và ba ghế bot. Mở liên kết của ghế mình; làm theo yêu cầu đặt quân hoặc chọn nhân vật ở đầu ván.</p>
    <ol><li>Ô có viền vàng là nơi bạn làm được gì đó: chạm ô để mở menu ngay tại ô.</li>
    <li>Di chuyển: kéo quân từ ô này sang ô khác, hoặc chạm ô đi rồi ô đến; chọn số chiến binh bằng chip số hay phím số, Enter để xác nhận.</li>
    <li>Hành động nằm ở nút Lựa chọn góc dưới phải (Marquise thấy mặt trời ghi số hành động Daylight còn lại); Continue để qua bước khi được phép, Undo sáng khi có thể hoàn tác. Bài trên tay luôn hiện ở mép dưới. Chạm từng lá để xem và dùng; vuốt ngang nếu có nhiều lá.</li>
    <li>Quyết định trong trận đánh hiện ngay tại ô đang đánh. Rê chuột hoặc nhấn giữ một ô để xem trong ô có gì.</li>
    <li>Đối thủ ở mép trái theo thứ tự lượt; phe của bạn ở góc dưới trái. Chạm huy hiệu để mở bảng phe. Nhật ký, chat và cài đặt ở góc trên phải.</li></ol>
    <p><b>Điều khiển:</b> kéo để di bản đồ, kéo chuột phải (hoặc Shift + kéo) để xoay, cuộn hoặc chụm hai ngón để phóng to; phím mũi tên, + − và 0 về góc mặc định.</p>
    <p><b>Khi chưa biết bấm đâu:</b> đọc ô trạng thái giữa mép trên để biết đang chờ ai. Nếu tới bạn, xem nút Lựa chọn và ô có viền vàng; cài đặt → “Tất cả lựa chọn” luôn có đủ hành động hợp lệ. Nhấn Esc để đóng ngăn hoặc huỷ lựa chọn đang xem.</p>
    <p>Birdsong (bình minh) → Daylight (ban ngày) → Evening (buổi tối) là ba giai đoạn trong lượt. Hết giờ thì bot chọn thay bạn một lần.</p>
    <p>Chất ô / lá: ${['fox', 'rabbit', 'mouse', 'bird'].map(s => html`<${SuitPip} suit=${s} />`)} (cáo, thỏ, chuột, chim).
    Viền vàng: có thể chọn; viền đậm: đang chọn. Quân có hình và màu riêng theo phe.
    Âm thanh mặc định tắt; tiếng gõ tự tổng hợp trên máy, không tải từ mạng.</p></section>`
}
