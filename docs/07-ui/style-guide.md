# Style guide: "Rừng thu vẽ tay"

Hợp đồng phong cách cho bàn cờ, quân, bảng và mọi màn hình. Nguồn cảm hứng: [reference/style-lakeside.jpg](reference/style-lakeside.jpg) (chỉ tham khảo phong cách). Khi có điều không rõ, so với ảnh đó trước. Muốn đổi mục nào trong file này thì cần người quản lý duyệt, sau đó cập nhật `tokens.ts` trong cùng thay đổi.

## 1. Tinh thần

Tranh minh họa hoạt hình nhìn từ trên cao, như bản đồ trong sách truyện: ấm, rõ, nhiều chi tiết nhỏ nhưng không rối. Mọi thứ có **viền mực sẫm**, **màu phẳng chia 2–3 sắc độ**, ánh sáng dịu từ **góc trên bên trái**. Không dùng hiệu ứng ảnh thật (không phản chiếu gương, không bloom, không DOF mạnh).

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

Màu cho trạng thái giao diện: chọn được = `autumn-gold`; đang chọn = viền `ink` dày cộng ánh `autumn-gold`; không hợp lệ = giảm độ bão hòa 60%; lỗi = `roof-red`.

## 3. Nét và hình

- **Viền mực:** quân và công trình dày bằng 4–6% chiều cao vật; thẻ và nút trong HTML viền 2 px màu `ink`. Trong 3D dùng viền "inverted hull" hoặc pass phát hiện cạnh, độ dày không đổi khi zoom.
- **Đổ bóng kiểu hoạt hình (toon):** 3 nấc sáng (sáng, giữa, tối), không chuyển mượt. Bóng đổ mềm, màu `ink` 25%.
- **Hình khối tròn, hơi phình**, không góc nhọn sắc; mái nhà và cây có phần chồng lớp như ảnh tham khảo.
- **Kết cấu nhẹ:** cỏ có đốm sắc độ, đường đất có mép sẫm, nước có vệt gợn trắng ngắn. Kết cấu sinh bằng code và seed cố định, không dùng ảnh chụp.
- **Rừng:** khoảng 80% thông nhiều tầng (`pine`/`pineLight`), còn lại cây tròn xanh và một ít cây thu (`autumnOrange`/`autumnGold`), như ảnh tham khảo.
- **Mật độ:** rừng dày ở vùng rừng (forest) của bản đồ, thưa quanh ô; ô và đường luôn thoáng để đặt quân.

## 4. Ánh sáng và camera

- Một nguồn sáng chính ấm (`#ffe2b0`) từ trên bên trái, ánh sáng nền bán cầu (trời ấm, đất nâu). Không dùng nhiều đèn màu.
- Camera mặc định nhìn gần như từ trên xuống (nghiêng khoảng 55–65°), giống ảnh tham khảo; cho phép xoay và phóng to có giới hạn, có nút về góc mặc định.
- Chuyển cảnh camera mượt, ngắn (≤ 400 ms).

## 5. Chữ

- Tiêu đề, tên phe, số điểm: **Pangolin**. Chữ thường, bảng, nhật ký: **Be Vietnam Pro**. Cả hai đóng gói sẵn, chạy offline.
- Cỡ chữ: 12 / 14 / 16 / 20 / 28 px. Số dùng `tabular-nums`.
- Nhãn trên bàn 3D (số ô, số quân) là sprite có nền tròn và viền `ink`, luôn quay mặt về camera.

## 6. Thành phần HTML

- **Thẻ / bảng:** nền `paper-raised`, viền 2 px `ink`, bo góc 10 px, bóng `0 3px 0 ink 20%` (bóng lệch kiểu in).
- **Nút chính:** nền `wood`, chữ `paper`, viền `ink`; khi hover sáng hơn một nấc; khi bấm lún 2 px.
- **Lá bài** (`ui/card-face.ts`): bố cục theo lá in, tỉ lệ 63:88, hai cỡ (`mini` 92 px cho tay bài và hộp quyết định, `full` 260 px cho khung chi tiết).
  - **Dải đầu màu chất:** huy hiệu tròn viền mực có icon chất bên trái; chi phí chế tạo bên phải, mỗi pip là ô gỗ có icon chất, `?` ba màu là bất kỳ. Quest để hai item yêu cầu ở chỗ này.
  - **Vùng tranh** (`ui/card-art.ts`): cảnh tự sinh bằng code, cùng nét mực và màu phẳng với bàn cờ, không dùng art chính thức. Nền theo chất (cáo: nông trại, thỏ: đồi và hang, chuột: ruộng và cối xay, chim: tán cây và trời). Vật chính theo loại: item trên bục, mắt trong bụi cho ambush, cờ phe có vương miện cho dominance, biểu tượng riêng (`MOTIF`) cho lá lâu dài và dùng ngay, bảng ghim hai item cho quest. Seed theo id lá; bản sao chẵn lật cảnh.
  - **Tấm gỗ** góc dưới trái: item và điểm, hoặc biểu tượng loại lá (lá = lâu dài, lửa = dùng ngay, mắt = ambush, vương miện = dominance, sao + lá = quest).
  - **Khung giấy** góc vát: tên gốc tiếng Anh bằng Pangolin; cỡ `mini` thêm một dòng loại lá, cỡ `full` thêm hiệu ứng tiếng Việt kèm điều khoản (`ui/card-text.ts`). Câu tiếng Anh in gốc xem trong "Bản in tiếng Anh" của khung chi tiết.
- **Chip phe:** hình con vật + tên; luôn có cả màu và hình.
- **Hộp quyết định:** quyết định gắn một ô (ambush, chia hit, Field Hospitals…) hiện thành callout ngay tại ô đó; chỉ lựa chọn không gắn ô (leader, nhân vật, bỏ bài) mới nổi giữa màn. Luôn có tiêu đề nói rõ ai đang quyết định gì và điều khoản luật liên quan (vd §4.3.1).

### 6.1 HUD trên màn trận (G4)

Màn trận chỉ có map, full màn hình (`gameplay-map-only.md`). Mọi thông tin khác là lớp nổi nhỏ ở mép, không bao giờ thành cột cố định:

- **Vị trí cố định:** trạng thái ở góc trên trái, menu ☰ góc trên phải, huy hiệu phe dọc mép phải, dải "Bài của bạn" giữa mép dưới, chip nhật ký góc dưới trái. Bong bóng hành động chung ở giữa mép trên (màn hẹp: ngay dưới ô trạng thái).
- **Vẻ ngoài:** nền `paper-a96`, viền 2 px `ink`, bo `r-md`, bóng `shadow-card`; ngăn đang mở dùng `shadow-raised`. Huy hiệu phe có viền trái màu phe và icon phe (không chỉ màu); phe đang tới lượt có viền `autumn-gold`.
- **Một ngăn mỗi lúc:** tay bài (dưới), bảng phe / tất cả lựa chọn / hướng dẫn (phải), nhật ký (trái). Chạm ra ngoài hoặc Esc là đóng; chạm nút HUD khác thì chuyển ngăn. Ngăn cao theo nội dung, không phủ hết màn.
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
