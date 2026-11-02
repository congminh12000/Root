# Gameplay "chỉ có map"

Kế hoạch người quản lý duyệt ngày 02/11/2026. Luật không đổi; chỉ đổi cách chơi:
- Khi chơi chỉ còn **map full màn hình**.
- Quanh bàn được lấp kín bằng rừng, sông, nước hợp với map.
- Zoom có giới hạn.
- **Mọi thao tác diễn ra trên map.**

**Đã chốt:**
- **Thông tin phụ:** tay bài, bảng phe, nhật ký, đồng hồ là lớp nổi thu gọn được.
- **Chọn map:** người chơi chọn giữa Autumn diorama (UI-7) và bàn cổ điển (UI-3).
- **Bỏ bàn 2D.**
- **Thiết bị:** máy tính và tablet cảm ứng ngang hàng.

## Lộ trình

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| G0 | Merge Autumn (PR #15), sửa ảnh gốc ui-kit (PR #16) | Xong |
| G1 | Stage, camera có giới hạn, apron; màn trận full màn hình với quân thật | Xong, chờ duyệt |
| G2 | Menu tại ô, chọn slot, đi bằng chạm hoặc kéo, chọn số quân, bong bóng hành động chung | |
| G3 | Callout quyết định gắn ô, thông tin ô bằng nhấn giữ, xúc xắc tại ô | |
| G4 | HUD nổi (góc trạng thái, menu, ngăn tay bài, bảng phe, nhật ký); bỏ cột bên | |
| G5 | Theme bàn cổ điển cài `MapTheme`; chọn map ở sảnh và trong menu | |
| G6 | Tablet: kích thước chạm, mức chất lượng, xoay máy | |
| G7 | Bỏ 2D, dọn code cũ, cập nhật style guide và checklist | |

## G1: map full màn hình, không khoảng trống

- **`map/limits.ts`** (thuần, có test): camera trực giao nên không bao giờ thấy đường chân trời.
  - Zoom xa nhất vừa cả bàn; gần nhất cho một clearing chiếm khoảng 60% chiều cao.
  - Nghiêng từ 0,04 tới 0,87 rad (khoảng 50°). Tâm nhìn bị kẹp trong bàn.
  - Bán kính apron tính từ vùng nhìn xa nhất với mọi tỉ lệ màn hình 0,45–2,6, cộng 12% biên.
  - `test/map.test.ts` kiểm hơn 1.000 tổ hợp: không camera nào thấy ra ngoài apron.
- **`map/camera-rig.ts`:**
  - Chuột: kéo trái để di, kéo phải (hoặc Shift + kéo) để xoay, lăn để zoom về phía con trỏ.
  - Cảm ứng: một ngón để di, hai ngón chụm để zoom và xoay.
  - Phím: mũi tên, `+`, `-`, `0`.
- **`map/apron.ts`:** nền rừng vẽ tay quanh bàn.
  - Dải cỏ mờ dần ở mép bàn để bàn hòa vào đất.
  - Sông và hồ của map chảy tiếp ra ngoài.
  - Cây có viền mực sát mép bàn, cây đơn giản ở xa.
  - Màu nền scene là màu rừng.
- **`map/theme.ts`, `map/autumn-theme.ts`:** theme quyết định cảnh, apron và chỗ đứng của quân (`Placement` trong `board/pieces.ts`). Autumn: công trình đứng trên các slot đã duyệt, quân ở nửa trước clearing, token phía sau quân.
- **`map/stage.ts`:** renderer, quân, vòng sáng, hoạt ảnh; chỉ vẽ khi có thay đổi.
- **Màn trận:** map phủ toàn màn hình, thanh trạng thái nổi ở trên. Các bảng cũ tạm nằm trong ngăn nổi bên phải ("Hiện bảng"/"Ẩn bảng") cho tới G2–G4.
- **`map-kit.html`:** map trên ván mẫu, không cần server, để kiểm tra và đo.

### Tốc độ tải (yêu cầu bắt buộc của người quản lý)

Đo trên M1 Pro, trang `map-kit.html`; các mốc `performance` có sẵn trong code: `map:build`, `map:scenery`, `map:apron`, `map:compile`, `map:first-frame`, `map:complete`.

| Chỉ số | Trước | Sau sửa |
|---|---|---|
| Dựng phần chặn luồng chính (`map:build`) | ~100 ms | ~35–46 ms |
| Khung hình đầu (tính từ lúc bắt đầu dựng map) | ~222 ms, có ~166 ms đứng hình do biên dịch shader | ~125–131 ms, shader biên dịch song song |
| Map đầy đủ (cây, apron) | cùng lúc với khung đầu | thêm từng phần sau khung đầu |

**Đã sửa:**
- **Biên dịch shader bằng `compileAsync`,** không chặn trang.
- **Cây và apron dựng sau khung đầu,** mỗi khung một phần và biên dịch trước khi hiện. Cây là phần dùng số ngẫu nhiên cuối cùng, nên rừng vẫn y hệt bản đã duyệt.
- **Màn trận tải module map ngay khi mở trang,** song song với kết nối, thay vì đợi bản cập nhật đầu tiên.

**Lưu ý khi đo:** trong khung trình duyệt tích hợp (bị ẩn) số đo trên trang trận dao động mạnh (50–180 ms). CPU profile trên Chromium sạch cho thấy dựng map trong trận (41 ms) ngang trang kit (34 ms).

**Ngân sách kiểm tra tự động** (`visual/map.spec.ts`): `map:build` < 120 ms, `map:apron` < 80 ms, khung đầu xuất hiện trước khi map đầy đủ.

### Kiểm chứng G1

- `visual/map.spec.ts`, 4 test:
  - Desktop 1440 và 1280: zoom xa nhất, nghiêng và xoay tối đa rồi kéo về góc, zoom gần nhất, phím `0` về góc mặc định. Điểm ảnh màu giấy dưới 0,5%; mức nền khoảng 0,1% là nhãn và ô điểm trên bàn.
  - iPad ngang và dọc: chụm hai ngón làm zoom tăng hơn 1,3 lần, kéo một ngón thì di bàn.
- Ảnh duyệt ở [reference/map-review/](reference/map-review/).
- Đo trên M1 Pro: 3,2–3,6 ms mỗi khung ở canvas 2880×1800 (khung 1440×900, mật độ ×2).
- Test này chạy chậm trong Chromium không đầu (WebGL bằng CPU, khoảng 1,3 phút mỗi test desktop); không dùng số đo đó làm hiệu năng thật.
