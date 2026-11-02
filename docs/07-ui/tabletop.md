# Đồ hoạ "bàn cờ mô hình thật" (R-series)

Người quản lý duyệt hướng này trên ảnh demo ngày 02/11/2026 ([reference/tabletop/](reference/tabletop/), `tilt-*`, `close-new`, `full-new`). Ảnh bản làm xong: `final-*.jpg` cùng thư mục. Hợp đồng phong cách ở [style-guide.md](style-guide.md) §1, §3, §4, §6.

## Đã làm

| Mốc | Nội dung | File chính |
|---|---|---|
| R0 | Style guide v2 (tinh thần, chất liệu, ánh sáng và hậu kỳ, HTML) | `style-guide.md` |
| R1 | Vật liệu theo vai trò (gỗ sơn, gỗ mộc, cỏ rắc, xốp, cát, đá, nhựa, bìa); kết cấu sinh trong worker; nắng chiều, môi trường studio, ACES, sương | `board/look.ts`, `board/texture-gen.ts`, `board/textures.worker.ts`, `board/light.ts` |
| R2 | Hậu kỳ: bóng tiếp xúc (GTAO), tilt-shift theo zoom (tối đa `grade.tiltMax`), chỉnh màu ấm, vignette, hạt; nhãn vẽ sau, luôn sắc; mức `full` / `tablet` / `low` (`?quality=` để ép) | `map/post.ts`, `map/quality.ts` |
| R3 | Nước nhựa đổ trên sông, hồ, cả trong apron | `map/apron.ts` (`resinWater`) |
| R4 | Meeple gỗ cắt theo hình con vật của phe, công trình và token là khối gỗ dán nhãn in, quân điểm là đĩa gỗ trên đường điểm in; quân ở ô đang chọn nhấc lên | `board/pieces.ts`, `board/toon.ts` (`sticker`) |
| R5 | Bàn cổ điển cùng chất liệu; cây đung đưa, nước trôi ("Cảnh động" trong menu ☰, chỉ chạy sau khi map nạp xong, tắt trên cảm ứng và khi giảm chuyển động) | `map/live.ts` |
| R6 | HUD và lá: thớ giấy, vân gỗ, bóng mềm, khay gỗ; mặt lá có thớ bìa, ánh sáng vẽ và vệt phản quang | `ui/tokens.ts` (`grain`), `style.css`, `ui/card-art.ts` |

## Tốc độ tải và khung hình

Đo trên M1 Pro, Chromium Playwright có GPU, trung vị 5 lần, ms tính từ lúc mount (cùng cách đo G7):

| | Build (chặn luồng chính) | Khung hình đầu | Xong hết |
|---|---|---|---|
| G3 (trước hướng mới) | 40 | 121 | 235 |
| Autumn bây giờ | 38 | 114 | 289 |
| Bàn cổ điển bây giờ | 47 | 97 | 221 |

- Khung hình đầu không chậm hơn trước vì những phần nặng chạy sau khung hình đầu, mỗi phần một bước:
  - môi trường phản chiếu (PMREM);
  - nhựa nước;
  - hậu kỳ, với shader biên dịch song song;
  - apron và cây.
- Kết cấu sinh trong worker, không chặn luồng chính. Nhãn dán dùng chung shader với gỗ sơn.
- "Xong hết" dài hơn vì có thêm các bước trên; trong lúc đó trận đã chơi được.

| Mức | Khung hình | ms/khung | fps |
|---|---|---|---|
| `full` | 1440×900 Retina (2880×1800 px) | 14,9 | 67 |
| `full` | 2560×1440 | 9,7 | 103 |
| `tablet` | iPad 1194×834 Retina | 1,2 | — |

GTAO là phần tốn nhất, nên tablet không dùng. Máy không có GPU (renderer phần mềm) tự xuống `low`, không hậu kỳ.

## Còn mở

- Nhãn số quân và phe cai quản vẫn là nhãn tròn nổi (sprite), chưa thành thẻ bìa dựng đứng như kế hoạch.
- Mức tự hạ khi fps thấp mới dựa trên loại renderer, chưa đo fps thật trong trận.
- Trang xem trước Lake dùng chung vật liệu và ánh sáng mới nhưng chưa được duyệt lại hình.
