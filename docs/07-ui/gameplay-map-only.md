# Gameplay "chỉ có map"

Kế hoạch người quản lý duyệt ngày 02/11/2026. Luật không đổi; chỉ đổi cách chơi:
- Khi chơi chỉ còn **map full màn hình**.
- Quanh bàn được lấp kín bằng rừng, sông, nước hợp với map.
- Zoom có giới hạn.
- **Mọi thao tác diễn ra trên map.**

**Đã chốt:**
- **Thông tin phụ:** tay bài luôn hiện ở mép dưới; bảng phe và nhật ký mở trong ngăn kéo, đồng hồ nằm ở góc trạng thái.
- **Chọn map:** người chơi chọn giữa Autumn diorama (UI-7) và bàn cổ điển (UI-3).
- **Bỏ bàn 2D.**
- **Thiết bị:** máy tính và tablet cảm ứng ngang hàng.

## Lộ trình

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| G0 | Merge Autumn (PR #15), sửa ảnh gốc ui-kit (PR #16) | Xong |
| G1 | Stage, camera có giới hạn, apron; màn trận full màn hình với quân thật | Xong, chờ duyệt |
| G2 | Menu tại ô, chọn slot, đi bằng chạm hoặc kéo, chọn số quân, bong bóng hành động chung | Xong |
| G3 | Callout quyết định gắn ô, thông tin ô bằng nhấn giữ, xúc xắc tại ô | Xong |
| G4 | HUD nổi (góc trạng thái, menu, khay bài luôn hiện, bảng phe, nhật ký); bỏ cột bên | Xong |
| G5 | Theme bàn cổ điển cài `MapTheme`; chọn map ở sảnh và trong menu  | Xong |
| G6 | Tablet: kích thước chạm, mức chất lượng, xoay máy | Xong |
| G7 | Bỏ 2D, dọn code cũ, cập nhật style guide và checklist | Xong |

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
- **Màn trận:** map phủ toàn màn hình, thanh trạng thái nổi ở trên. Từ G4 không còn cột bên; thông tin nằm ở HUD nổi (xem mục G4).
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

## G2: thao tác trên map

- **`map/stage.ts`:** chiếu ô ra tọa độ màn hình (`project`), báo khi camera đổi (`onView`), kéo quân (`setDraggable`; bắt đầu kéo trên ô có quân đi được thì camera bỏ qua cử chỉ đó, thả lên ô khác thì báo nước đi).
- **`ui/screens/map-view.ts`:** lớp phủ `overlay` bám theo camera.
- **`ui/screens/callouts.ts`:**
  - Nút ô cho bàn phím và trình đọc màn hình. Chuột và cảm ứng đi xuyên xuống map.
  - Menu tại ô (hoặc tại ô đến khi di chuyển): hành động ở ô, gợi ý ô đến, chip số quân 44 px, phím Esc, phím số, Enter.
  - Bong bóng hành động chung ở mép trên; nhóm lớn gập lại; ẩn khi hộp quyết định đang mở.
- Phím tắt chuyển từ `ActionBar` sang menu tại ô để không gửi hai lần.

**Kiểm chứng:** chơi Marquise trên server thử chỉ bằng map (ngăn bên đóng): tới lượt 22 với 12 lần kéo quân (8 lần qua chip số quân + Enter), 11 hành động tại ô, 9 hành động chung, 13 hộp quyết định; không lỗi, không bị server từ chối.

## G3: quyết định, thông tin và xúc xắc tại ô

- **`interaction/decisions.ts`:** `Decision.clearing` là ô nơi quyết định diễn ra, lấy từ pending hoặc trận đánh đang diễn ra. Test: Ambush, chọn lá battle, chịu hit, Field Hospitals, Outrage luôn có ô; chọn leader thì không.
- **`DecisionCallout`** (`decision.ts`): cùng nội dung với hộp quyết định (tiêu đề, điều khoản, dòng battle, lá bài, nút), nhưng neo tại ô và không che map. Hộp giữa màn chỉ còn cho lựa chọn không gắn ô: leader, nhân vật, rừng cho pawn, bỏ bài.
- **Thông tin ô:**
  - Rê chuột lên ô khoảng 0,45 giây, hoặc nhấn giữ 0,5 giây trên cảm ứng; khung hiện cạnh ô.
  - Nhấn giữ thì không tính là chạm chọn.
- **Xúc xắc** hiện tại ô đang đánh; nếu ô đó đang có khung quyết định thì xúc xắc nằm dưới ô.
- **Sửa lỗi:** `compileAsync` có thể báo lỗi khi bản cập nhật ván thay quân giữa lúc biên dịch. Lỗi được bắt lại; khung kế tiếp tự biên dịch phần còn thiếu.

**Kiểm chứng:**
- Marquise, chỉ dùng map, tới lượt 30: Outrage và Field Hospitals ×4 hiện tại ô; bỏ bài ×3 ở giữa màn; rê chuột hiện thông tin ô; không lỗi.
- Vagabond: chọn nhân vật và rừng ở giữa màn.

## G4: HUD nổi

Mã ở `packages/client/src/ui/screens/hud.ts`, ghép trong `game.ts`.

- **Góc trên trái:** lượt, phase, bước, đồng hồ; "Đến lượt bạn" hoặc phe đang được chờ; tên quyết định của người khác kèm điều khoản; nút "Mở lại quyết định" khi bạn gập hộp quyết định; thông báo kết nối.
- **Góc trên phải:** nút ☰ mở menu: về sảnh, mã trận, "Về góc mặc định", "Tất cả lựa chọn (n)", "Hướng dẫn nhanh", âm thanh.
- **Mép phải:** huy hiệu bốn phe với điểm và số lá; phe đang tới lượt có viền vàng. Chạm để mở bảng phe đó, chạm lại để đóng.
- **Mép dưới:** dải "Bài của bạn" (viền vàng khi có lá dùng được); chạm hoặc vuốt lên để mở quạt bài.
- **Góc dưới trái:** chip "Nhật ký · n" mở ngăn nhật ký; bấm một dòng để đánh dấu ô trên map.
- **Một ngăn mỗi lúc.** Chạm ra ngoài hoặc Esc là đóng; chạm nút HUD khác thì chuyển ngăn.
- "Tất cả lựa chọn" là đường dự phòng: liệt kê mọi phần tử của `legal`, gom theo loại.
- Bong bóng hành động chung nằm giữa mép trên, giữa ô trạng thái và menu. Màn hẹp hơn 1100 px thì bong bóng xuống dưới ô trạng thái.


## G5: chọn map

- **Hai theme cài `MapTheme`:** `map/autumn-theme.ts` (Autumn diorama) và `map/classic-theme.ts` (bàn cổ điển UI-3, bỏ mặt bàn gỗ, rừng apron bao quanh; bàn này không có sông hồ nên apron chỉ có rừng và trảng cỏ). Cả hai dùng cùng topology `AUTUMN`.
- **Cây của bàn cổ điển dựng sau khung hình đầu** như Autumn (`buildClassicScenery(...).plantTrees`); vị trí cây vẫn rút số ngẫu nhiên theo thứ tự cũ nên bàn trông như trước.
- **Chọn map** ở sảnh (khung "Bản đồ" khi tạo trận) và trong menu ☰ giữa trận; đổi là map dựng lại tại chỗ. Lựa chọn lưu trong `localStorage` (`root-map`) của máy đó, không gửi server, không ảnh hưởng luật (`map/choice.ts`).
- `map-kit.html?map=classic` mở bàn cổ điển cho test; `visual/map.spec.ts` kiểm tra không lộ nền và ngân sách tải cho cả hai map; `test/map.test.ts` kiểm tra hình học apron cho cả hai.
- **Sửa lỗi:** neo HTML của ô (menu tại ô, phím) tính sai vị trí trước khung hình đầu vì ma trận camera chưa cập nhật; giờ `project` tự cập nhật và overlay vẽ lại ngay sau khung hình đầu.

## G6: tablet

- **Mức chất lượng tự động** (`map/quality.ts`): máy có con trỏ chính là ngón tay (`pointer: coarse`) dùng pixel ratio tối đa 1,5, bóng đổ 1024 và 4.500 cây apron; máy tính dùng tối đa 2, bóng 2048, 7.500 cây. Bàn, quân và mọi thứ thuộc lượt chơi giống nhau ở mọi mức. Canvas ghi mức ở `data-quality`.
- **Vùng chạm ≥ 44 px** trên màn cảm ứng: nút trong menu tại ô, bong bóng, hộp quyết định, nút đóng, dòng nhật ký, chọn map. Script chơi thử iPad kiểm tra không còn nút nào nhỏ hơn.
- **Xoay máy:** `ResizeObserver` tính lại khung nhìn và giới hạn zoom; test iPad xoay ngang ↔ dọc và kiểm tra vẫn không lộ nền.
- **Chơi thử bằng chạm** (iPad Pro 11 giả lập, ngang rồi dọc): chạm ô, menu tại ô, bong bóng, quyết định tại ô; tới lượt 10, không lỗi console.
- Xúc xắc tại ô được kẹp trong màn hình hẹp.

## G7: bỏ 2D, dọn code cũ

- **Đã xoá:** bàn 2D SVG (`board.ts`), `board-view.ts`, bàn 3D cũ có mặt gỗ (`board3d.ts`), trang `board-kit.html` và test của nó (ảnh gốc `board-2d.png`). Bàn cổ điển giờ chỉ còn dạng theme (`map/classic-theme.ts`), kiểm tra bằng `map-kit.html?map=classic`.
- **Đã gỡ khỏi màn trận:** `ActionBar` (chỉ giữ `FullList` cho "Tất cả lựa chọn"), `DecisionBar` (thay bằng góc trạng thái), `Scores` (thay bằng huy hiệu phe và quân điểm trên track), CSS của bố cục cột và bàn SVG.
- `changedClearings` chuyển sang `net/changes.ts`.
- **Quân điểm trên track in của Autumn diorama** (`Placement.score`, `autumn/layout.ts` `scoreSpace`); phe cùng ô điểm xếp chồng; dominance rời track. Bàn cổ điển không in track nên điểm chỉ ở huy hiệu.
- **Không có WebGL:** thông báo rõ và HUD vẫn chạy, nên vẫn theo dõi và chơi được bằng danh sách (menu ☰ → "Tất cả lựa chọn", nhật ký, bảng phe).
- **Tốc độ tải** sau G4–G7, đo trên M1 Pro (Chromium Playwright, GPU, trung vị 5 lần, ms từ lúc mount): Autumn build 41, khung đầu 123, xong hết 233; bản G3 cùng cách đo: 40 / 121 / 235. Bàn cổ điển: build 50, khung đầu 101, xong hết 162.

