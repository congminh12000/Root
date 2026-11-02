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

## Bổ sung ngày 02/11/2026

- Nhãn số quân (cả khi di chuyển) và phe cai quản là thẻ bìa in icon phe, màu phe và số mực trên nền giấy; có chân gỗ, quay quanh trục đứng theo camera. Mặt in ở lớp nhãn, không bị mờ bởi hậu kỳ. Số ô giữ sprite.
- Đo nhịp khung hình thực lúc thao tác/hoạt ảnh, sau tải xong 5 giây. Hai cửa sổ 2 giây liên tiếp dưới 45 fps hạ `full` → `tablet`; dưới 24 fps hạ `tablet` → `low`. Mỗi lần hạ chờ 5 giây rồi mới đo tiếp. Không tăng tự động, không lưu mức giữa các lần mở bàn.
- Bỏ qua idle và tab ẩn; khoảng khựng đơn lẻ không đủ để hạ mức vì cần hai cửa sổ chậm liên tiếp; `?quality=` khóa mức. Hạ mức đổi mật độ pixel, bản đồ bóng, tắt GTAO rồi hậu kỳ và cảnh động. Cây đã dựng được giữ lại để tránh dựng lại sa bàn giữa thao tác.
- Test thuần: `adaptive-quality.test.ts`, `placard.test.ts`. Test trình duyệt và ảnh: `visual/map.spec.ts`, `test-results/map-review/labels-*-close.png`.

## Còn mở

- Trang xem trước Lake dùng chung vật liệu và ánh sáng mới nhưng chưa được duyệt lại hình.


## Kiểm chứng bổ sung

- Typecheck, 181 test toàn repo, audit luật và build qua.
- 23 test trình duyệt qua; sau khi đưa nhãn vào phần đất trống, chạy lại 11 kiểm tra nhãn/tải/UI kit đều qua. Không nới ngưỡng ảnh hoặc thời gian test.
- Hai ảnh chuẩn UI kit cập nhật trên Mac arm64 vì hướng dẫn nhanh có thêm nội dung. Không đổi giao diện các thành phần khác.
- Ảnh duyệt mới: [nhãn Autumn](reference/tabletop/labels-review/labels-autumn-close.png), [nhãn bàn cổ điển](reference/tabletop/labels-review/labels-classic-close.png), [Autumn UI-7](reference/tabletop/labels-review/autumn-1440.png), [hướng dẫn tablet](reference/tabletop/labels-review/guide-tablet.png).
- Các ngân sách tải tự động đều qua; chưa đo lại mốc 55 fps trên GPU M1 thật. Trình duyệt headless dùng renderer phần mềm; test riêng ép `full` để kiểm tra hậu kỳ và cơ chế tự hạ.
- UI-7 chờ người quản lý duyệt hình; UI-8 chờ buổi thử người mới theo [kịch bản](new-player-session.md). Các server kiểm tra loopback đã tự tắt sau test; không mở server LAN.
