# Style guide: "Bàn cờ mô hình thật"

Hợp đồng phong cách cho bàn cờ, quân, bảng và mọi màn hình. Từ 02/11/2026 hướng là **bàn cờ mô hình thật** (người quản lý duyệt trên ảnh demo, [reference/tabletop/](reference/tabletop/)). Bảng màu và cách phân biệt phe giữ từ bản "Rừng thu vẽ tay" ([reference/style-lakeside.jpg](reference/style-lakeside.jpg)). Muốn đổi mục nào trong file này thì cần người quản lý duyệt, sau đó cập nhật `tokens.ts` trong cùng thay đổi.

## 1. Tinh thần

Như ảnh chụp cận một bàn Root thu nhỏ trên bàn thật, phong cách indie ấm áp: quân **gỗ sơn còn thấy vân**, bàn là **sa bàn** phủ cỏ rắc với đường cát nén, cây là **xốp mô hình**, nước là **nhựa đổ** bóng, lá bài và HUD là **bìa, giấy, gỗ**. Nắng chiều mềm từ góc trên bên trái, bóng tiếp xúc rõ, ống kính tilt-shift nhẹ làm cảnh trông tí hon. Rõ ràng để chơi vẫn đứng trước đẹp: quân, ô, nhãn luôn đọc được.

## 2. Bảng màu (giá trị gốc cho `tokens.ts`)

Màu lấy từ ảnh tham khảo. Mỗi màu có tên theo vai trò, không theo màu sắc.

| Token | Hex | Dùng cho |
|---|---|---|
| `ink` | `#2a2118` | Viền, chữ chính, bóng đổ |
| `paper` | `#f4ecd8` | Nền trang, nền bảng |
| `paper-raised` | `#fffaf0` | Thẻ, hộp thoại |
| `meadow` | `#8f9a4c` | Cỏ, nền ô (clearing) |
| `meadow-light` | `#aeb063` | Cỏ sáng, viền ô được chọn |
| `pine` | `#244232` | Thông, rừng |
| `pine-light` | `#3d6b48` | Mặt sáng của cây |
| `path` | `#c9a66b` | Đường đất |
| `path-edge` | `#9c7a45` | Mép đường |
| `water` | `#3f86c6` | Hồ, sông |
| `water-shallow` | `#7cb8de` | Nước nông, gợn sóng |
| `rock` | `#8d8a82` | Đá, ruin |
| `wood` | `#7a5232` | Cầu cảng, gỗ, nút chính |
| `autumn-orange` | `#e0662b` | Cây thu, điểm nhấn |
| `autumn-gold` | `#e9b23a` | Cây thu, điểm, thông báo |
| `roof-red` | `#b84a32` | Mái nhà, cảnh báo |
| `roof-blue` | `#3b4f73` | Mái nhà, thông tin |

**Màu phe và chất** giữ giá trị hiện có trong `names.ts`, chỉnh độ sáng nếu cần để nổi trên nền cỏ. Phe và chất luôn có **hình dạng riêng** đi kèm màu:

| | Màu | Hình phân biệt |
|---|---|---|
| Marquise de Cat | cam `#d9772b` | Tai mèo nhọn, công trình mái dốc |
| Eyrie Dynasties | xanh dương `#2f6fd1` | Mỏ chim, roost hình tổ |
| Woodland Alliance | xanh lá `#3a9e4f`, **viền sáng** vì dễ chìm vào cỏ | Tai thỏ dài, base hình lều |
| Vagabond | xám `#6b6b6b` | Áo choàng, gậy |
| Cáo / thỏ / chuột / chim | `#d6453d` / `#e8c33a` / `#e98a3c` / `#7cb2d8` | Biểu tượng con vật riêng trên pip và ô |

**Icon** (`ui/icons.ts`): phe là đầu mèo, đầu chim, lá cờ khởi nghĩa (Alliance; không dùng tai thỏ để khỏi trùng icon chất thỏ), người áo choàng; chất là mặt cáo, thỏ, chuột, chim. Mảng phẳng màu `--icon-fill` cộng viền mực.

**Huy hiệu chất** (`ui/suit-badge.ts`, `SuitBadge`): đĩa màu chất trong vòng viền nhạt cùng màu, mép mực mảnh; con vật là bóng mực đặc, mắt khoét lộ màu đĩa, thu nhỏ để chừa khoảng trống tới viền. Cáo, thỏ, chuột là chất của ô (§2.2); chim là mặt chim nhìn thẳng, chỉ có trên lá (wild, §2.2.2). Tự vẽ, không đồ lại dấu chất in của Leder. Dùng ở dải đầu và chi phí lá bài, chip lá, pip chất, nhãn ô trên cả hai bản đồ; một chuỗi SVG cho cả HTML và sprite canvas.

Màu cho trạng thái giao diện: chọn được = `autumn-gold`; đang chọn = viền `ink` dày cộng ánh `autumn-gold`; không hợp lệ = giảm độ bão hòa 60%; lỗi = `roof-red`.

## 3. Chất liệu và hình

Mọi vật 3D lấy vật liệu theo **vai trò** từ `board/look.ts` (`mat(role, màu)`), không tự tạo vật liệu riêng:

| Vai trò | Dùng cho | Cảm giác |
|---|---|---|
| `painted-wood` | quân, công trình, token, mái nhà, vòng chất | sơn màu, vân gỗ mờ bên dưới, hơi bóng |
| `raw-wood` | cầu, thuyền, khúc gỗ, thân cây | gỗ mộc, vân rõ, nhám |
| `flock` | mặt sa bàn, cỏ | cỏ rắc, sần, không bóng |
| `foam` | tán cây | xốp mô hình, sần mạnh |
| `sand` | đường, ô, slot, bìa in | cát nén, hạt mịn |
| `stone` | đá, vách, ruin | thạch cao sơn |
| `resin` | sông, hồ | nhựa đổ trong, bóng, gợn |
| `card` | lá bài, nhãn bìa | bìa có thớ |

- **Kết cấu sinh bằng code** (`board/texture-gen.ts`, seed cố định), chạy trong worker; không dùng ảnh chụp, không tải từ mạng.
- **Không còn viền mực** trong 3D. Độ rõ đến từ ánh sáng, bóng tiếp xúc và độ tương phản màu. Trong HTML, viền 2 px `ink` vẫn giữ cho thẻ và nút.
- **Hình khối** bo tròn như đồ gỗ tiện, không góc sắc. Phe vẫn phân biệt bằng **hình** (tai mèo, mỏ chim, tai thỏ, áo choàng) cộng màu.
- **Mật độ:** rừng dày ở vùng rừng, thưa quanh ô; ô và đường luôn thoáng để đặt quân.

## 4. Ánh sáng, camera và hậu kỳ

- **Ánh sáng** (`light` trong `tokens.ts`): nắng ấm `light.sun` thấp từ trên trái, bóng dài và mềm; ánh trời ấm; môi trường studio nhẹ cho độ bóng của sơn và nhựa; sương ấm che apron xa. Tone mapping ACES.
- **Hậu kỳ** (`map/post.ts`, tham số `grade` trong `tokens.ts`):
  - bóng tiếp xúc (GTAO);
  - tilt-shift: mờ dần ra hai mép trên dưới, zoom càng gần càng mờ, tối đa `grade.tiltMax` px để quân và nhãn đọc được;
  - chỉnh màu ấm, vignette, hạt nhẹ.
  - Không bloom, không lens flare.
- **Nhãn** (số ô, số quân, điểm) vẽ sau hậu kỳ, luôn sắc nét.
- **Mức chất lượng** (`map/quality.ts`): `full` đủ hiệu ứng; `tablet` bỏ GTAO; `low` (máy không có GPU) không hậu kỳ. Hiệu ứng nạp sau khung hình đầu, không bao giờ làm chậm lúc mở trận. Sau khi tải xong 5 giây, đo nhịp khung hình lúc đang thao tác hoặc hoạt ảnh: hai cửa sổ 2 giây liên tiếp dưới 45 fps hạ `full` → `tablet`, dưới 24 fps hạ `tablet` → `low`. Chờ 5 giây sau mỗi lần hạ; bỏ qua lúc đứng yên/tab ẩn. `?quality=` giữ cố định mức để duyệt hình.
- **Camera** nhìn gần như từ trên xuống, cho phép xoay và phóng to có giới hạn, có nút về góc mặc định. Chuyển cảnh camera ≤ 400 ms.

## 5. Chữ

- Tiêu đề, tên phe, số điểm: **Pangolin**. Chữ thường, bảng, nhật ký: **Be Vietnam Pro**. Cả hai đóng gói sẵn, chạy offline.
- Cỡ chữ: 12 / 14 / 16 / 20 / 28 px. Số dùng `tabular-nums`.
- Số ô giữ huy hiệu sprite. Số quân và phe cai quản dùng thẻ bìa nhỏ nghiêng trên chân gỗ, mặt giấy có icon phe và chữ mực; quay quanh trục đứng theo camera. Mặt chữ vẽ sau hậu kỳ để luôn sắc nét.

## 6. Thành phần HTML

- **Thẻ / bảng:** giấy: nền `paper-raised` phủ thớ giấy (`--grain-paper`, nhiễu SVG sinh trong CSS), viền 2 px `ink`, bo góc 10 px, bóng mềm như giấy đặt trên bàn (`shadow.card`). Ngăn kéo và hộp quyết định có viền gỗ như khay.
- **Nút chính:** gỗ có vân (`--grain-wood` trên chuyển sắc `wood-light` → `wood`), chữ `paper`, viền `ink`; hover sáng hơn một nấc; bấm lún 2 px. Nút phụ là giấy. Nút có kiểu riêng (neo ô, huy hiệu, dải bài) giữ kiểu của nó.
- **Lá bài** (`ui/card-face.ts`): viền ngoài 1 px (mini), 1.5 px (full), bằng một nửa trước đây. Chữ nội dung nhỏ, weight 400; tiêu đề có khoảng thở với viền. Ô nội dung các lá dùng một lần (Ambush, dùng ngay và chế tạo item) là giấy vàng nhạt `paper-effect`, viền mực mảnh với vài vết rách/nếp gấp nhỏ; các lá lâu dài, dominance và quest giữ kiểu khung riêng.
  Bố cục: bố cục theo lá in, tỉ lệ 63:88, hai cỡ (`mini` 92 px cho tay bài và hộp quyết định, `full` 260 px cho khung chi tiết).
  - **Dải đầu màu chất:** huy hiệu chất bên trái; chi phí chế tạo bên phải, mỗi chi phí là một huy hiệu chất nhỏ, `?` ba màu trên ô gỗ là bất kỳ. Quest để hai item yêu cầu ở chỗ này.
  - **Vùng tranh** (`ui/card-art.ts`): Ambush dùng bốn tranh indie do imagegen tạo và người quản lý chọn ngày 03/11/2026, lưu chung trong `src/assets/cards/ambush-woodland.png`; vùng cắt theo thứ tự chim/thỏ/cáo/chuột, cả hai lá chim cùng tranh. Các lá còn lại: cảnh tự sinh bằng code, cùng nét mực và màu phẳng với bàn cờ, không dùng art chính thức. Nền theo chất (cáo: nông trại, thỏ: đồi và hang, chuột: ruộng và cối xay, chim: tán cây và trời). Vật chính theo loại: item trên bục, cờ phe có vương miện cho dominance, biểu tượng riêng (`MOTIF`) cho lá lâu dài và dùng ngay, bảng ghim hai item cho quest. Seed theo id lá; bản sao chẵn lật cảnh.
  - **Tấm gỗ** góc dưới trái: item và điểm, hoặc biểu tượng loại lá (lá = lâu dài, lửa = dùng ngay, mắt = ambush, vương miện = dominance, sao + lá = quest).
  - **Lá Ambush** (§4.3.1) theo bố cục lá in riêng: dải đầu hẹp, huy hiệu chất treo xuống dưới dải, tên lá chữ lớn bên phải; không có chi phí và tấm gỗ; tranh kéo xuống tận đáy lá, dùng tranh indie được chọn theo chất: chim dưới tán cây, thỏ giữa cỏ thu, cáo sau thân cây, chuột bên cối xay; một khung giấy mép rách ở đáy gồm dòng nghiêng nơi được chơi ("Có thể ambush ở ô …", chim là ô bất kỳ) và, ở cỡ `full`, hiệu ứng.
  - **Khung giấy** góc vát: tên gốc tiếng Anh bằng Pangolin; cỡ `mini` thêm một dòng loại lá, cỡ `full` thêm hiệu ứng tiếng Việt; số điều khoản giữ trong source để đối chiếu, không hiện trên lá hay mô tả chi tiết (`ui/card-text.ts`). Câu tiếng Anh in gốc xem trong "Bản in tiếng Anh" của khung chi tiết.
  - **Chất liệu:** cả mặt lá phủ thớ bìa; tranh có ánh sáng từ trên, bóng dưới chân vật chính và vignette nhẹ; tấm gỗ có vân; rê chuột qua lá có vệt phản quang chạy ngang.
- **Chip phe:** hình con vật + tên; luôn có cả màu và hình.
- **Hộp quyết định:** quyết định gắn một ô (ambush, chia hit, Field Hospitals…) hiện thành callout ngay tại ô đó; chỉ lựa chọn không gắn ô (leader, nhân vật, bỏ bài) mới nổi giữa màn. Luôn có tiêu đề nói rõ ai đang quyết định gì và điều khoản luật liên quan (vd §4.3.1).

### 6.1 HUD trên màn trận (G4)

Màn trận chỉ có map, full màn hình (`gameplay-map-only.md`). Mọi thông tin khác là lớp nổi nhỏ ở mép, không bao giờ thành cột cố định:

- **Vị trí cố định:** trạng thái ở góc trên trái, menu ☰ góc trên phải, huy hiệu phe dọc mép phải, dải "Bài của bạn" giữa mép dưới, chip nhật ký góc dưới trái. Bong bóng hành động chung ở giữa mép trên (màn hẹp: ngay dưới ô trạng thái).
- **Vẻ ngoài:** nền `paper-a96`, viền 2 px `ink`, bo `r-md`, bóng `shadow-card`; ngăn đang mở dùng `shadow-raised`. Huy hiệu phe có viền trái màu phe và icon phe (không chỉ màu); phe đang tới lượt có viền `autumn-gold`.
- **Tay bài luôn hiện:** chỉ các lá bài ở mép dưới, không khung hay tiêu đề; khoảng 1/3 chiều cao lá nằm ngoài màn hình. Hover/focus đưa riêng lá đó lên đủ mặt lá. Bấm từng lá để xem chi tiết/hành động; tay bài dài cuộn ngang. Hover nâng mặt lá trong 240 ms trên vùng bấm cố định; bàn phím có cùng phản hồi, giảm chuyển động thì đổi vị trí tức thì, không chạy transition.
- **Một ngăn mỗi lúc:** bảng phe / tất cả lựa chọn / hướng dẫn (phải), nhật ký (trái). Chạm ra ngoài hoặc Esc là đóng; chạm nút HUD khác thì chuyển ngăn. Ngăn cao theo nội dung, không phủ hết màn.
- **Menu và callout gắn ô** (menu tại ô, quyết định, xúc xắc, thông tin ô) bám theo ô khi camera di chuyển, lật xuống dưới ô khi gần mép trên, và được kẹp trong màn hình.
- **Cảm ứng:** mọi nút ≥ 44 px khi con trỏ là ngón tay; không có thao tác chỉ làm được bằng hover (thông tin ô: rê chuột hoặc nhấn giữ).

## 7. Chuyển động

Giữ các thời lượng đang dùng và đưa vào token: nảy 380 ms, vòng lan 1200 ms, di chuyển 750 ms, xúc xắc 700–850 ms, hộp thoại 180 ms. Kiểu chuyển động: có đà, hơi vượt rồi dừng (easeOutBack) cho vật xuất hiện; mượt hai đầu cho di chuyển. Tắt hết khi bật "giảm chuyển động".

## 8. Âm thanh (tùy chọn, UI-8)

Tiếng gỗ, giấy, xúc xắc gỗ; nhỏ và ngắn; mặc định tắt. Chỉ dùng âm tự làm hoặc CC0, ghi nguồn.

## 9. Không được

- Dùng art, icon, font hoặc hình lá bài chính thức của Leder.
- Viết mã màu trực tiếp ngoài `tokens.ts`.
- Phân biệt thông tin chỉ bằng màu.
- Thêm hiệu ứng hậu kỳ (bloom, phản chiếu, mờ chuyển động) làm lệch chất tranh vẽ.
- Để giao diện tự quyết luật hoặc che bớt hành động hợp lệ mà không có cách xem đủ.
