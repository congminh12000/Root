# Checklist giao diện để chơi được

Trạng thái ngày 02/11/2026 (sau G1–G7, gameplay chỉ có map). **Xong** = đã theo style-guide và đã kiểm tra; **Có** = dùng được nhưng chưa theo style-guide; **Một phần** = có nhưng thiếu; **Chưa** = chưa có. Cột "Mốc" ứng với lộ trình trong [README.md](README.md). Mục đánh dấu ★ là **bắt buộc** để một người chơi trọn ván với bot mà không cần danh sách thả xuống chung.

## A. Vào trận

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Sảnh: chọn phe, người hay bot, mức bot, tạo trận, link từng ghế | Xong | UI-2 |
| ★ | Nhập mật khẩu phòng, vào lại trận cũ, danh sách trận | Xong | UI-2 |
| | Chọn thời gian mỗi nước khi tạo trận | Chưa | UI-2 |
| ★ | Setup: chọn leader Eyrie, nhân vật Vagabond, đặt keep và quân ban đầu bằng bấm trên bàn | Xong | UI-6 |

## B. Bàn cờ

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Ô (clearing) có chất, số ô, slot công trình, ruin | Xong | UI-3 |
| ★ | Đường đi, rừng (forest), Vagabond trong rừng | Xong | UI-3 |
| ★ | Quân, công trình, token của 4 phe phân biệt bằng màu và hình | Xong | UI-3 |
| ★ | Số quân rõ khi đông; hover/bấm ô xem chi tiết (ai cai quản, quân, token) | Xong | UI-4 |
| ★ | Cai quản (rule) của từng ô hiển thị được | Xong | UI-4 |
| ★ | Đánh dấu ô/quân có thể chọn cho hành động đang làm | Xong | UI-4 |
| | Camera: góc mặc định, xoay, phóng to có giới hạn, không lộ nền, nút về góc mặc định | Xong | G1 |
| ★ | Map full màn hình, rừng/sông/hồ phủ quanh bàn; chọn Autumn diorama hoặc bàn cổ điển | Xong | G1, G5 |
| | Bàn 2D dự phòng | Đã bỏ; không có WebGL thì chơi bằng HUD | G7 |
| | Hoạt ảnh quân đi theo đường, ô thay đổi, xúc xắc | Xong | UI-3 (restyle) |
| ★ | Bản đồ Autumn theo phong cách đã chốt | Chờ duyệt (`/autumn-kit.html`) | UI-7 |

## C. Thao tác

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Di chuyển: kéo quân sang ô khác, hoặc chạm ô đi → ô đến → chip số quân | Xong | G2 |
| ★ | Đánh: chọn ô → chọn phe bị đánh | Xong | UI-4 |
| ★ | Xây, recruit, đặt token, spread sympathy, revolt bằng bấm ô | Xong | UI-4 |
| ★ | Chế tạo: chọn lá trong tay, thấy công trình chế tạo dùng được | Một phần | UI-5 |
| ★ | Menu tại ô và bong bóng hành động chung trên map (thay thanh hành động) | Xong | G2 |
| ★ | Luôn có lối xem đủ mọi hành động hợp lệ (menu ☰ → Tất cả lựa chọn) | Xong | G4 |
| ★ | Báo khi server từ chối, mất kết nối, đang nối lại | Xong | UI-2 |
| | Phím tắt (Esc huỷ chọn, Enter xác nhận, số để chọn số quân) | Xong | UI-4 |

## D. Bài và bảng phe

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Tay bài dạng quạt: chất, chi phí, đánh dấu lá dùng được | Xong | UI-5 |
| ★ | Xem chi tiết lá bài | Xong | UI-5 (restyle) |
| ★ | Mặt lá theo bố cục lá in (dải chất, chi phí, tranh tự sinh, tấm gỗ, khung chữ tiếng Việt), cả 54 lá và 15 quest | Xong | C1–C3 |
| ★ | Play area (lá persistent đã chế tạo), dominance có thể lấy | Xong | UI-5 |
| ★ | Marquise: track sawmill/workshop/recruiter kèm điểm, kho gỗ, keep | Xong | UI-5 |
| ★ | Eyrie: decree 4 cột, leader, track roost, đánh dấu cột đã làm | Xong | UI-5 |
| ★ | Alliance: track sympathy kèm điểm, supporter, base, officer | Xong | UI-5 |
| ★ | Vagabond: túi item (tươi, úp, hỏng), track trà/tiền/túi, quan hệ, quest | Xong | UI-5 |
| ★ | Đối thủ: số lá trên tay, bảng phe thu gọn, bài được cho xem | Xong | UI-5 |
| | Item supply, quest đang mở, deck và chồng bỏ | Xong | UI-5 |

## E. Quyết định xen ngang

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Ambush và phá ambush | Xong | UI-6 |
| ★ | Chia hit lên quân, công trình, token; Vagabond chọn item hỏng | Xong | UI-6 |
| ★ | Field Hospitals, Outrage, bỏ bớt supporter, chọn thứ tự hiệu ứng | Xong | UI-6 |
| ★ | Lá battle (Armorers, Sappers…), bỏ bài khi quá 5 lá | Xong | UI-6 |
| ★ | Người đang chờ thấy ai đang quyết định gì | Xong | UI-6 |

## F. Theo dõi ván

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Góc trạng thái: lượt mấy, phase, bước, đang chờ ai, đồng hồ | Xong | G4 |
| ★ | Điểm: quân điểm trên track in của Autumn diorama và huy hiệu phe; dominance, coalition | Xong | G4, G7 |
| ★ | Nhật ký dễ đọc, bấm một dòng thì đánh dấu ô liên quan | Xong | UI-8 |
| ★ | Màn kết thúc: ai thắng, vì sao, điểm cuối | Xong | UI-8 |
| | Khán giả xem trận | Xong | UI-2 |
| | Hướng dẫn nhanh, chú giải ký hiệu; ván đầu, đang chờ ai và lối xem đủ lựa chọn | Xong | UI-8 |
| ★ | Người mới tự chơi hết ván với bot, có phiếu thử thực tế | Chưa; kịch bản ở `new-player-session.md` | UI-8 |
| | Âm thanh tùy chọn | Xong | UI-8 |

## G. Chất lượng chung

| | Mục | Hiện tại | Mốc |
|---|---|---|---|
| ★ | Token, font tiếng Việt offline, icon, ui-kit, ảnh so sánh | Xong | UI-1 |
| ★ | Mọi chữ tiếng Việt, thuật ngữ luật giữ tên gốc khi cần | Có | mọi mốc |
| ★ | Dùng bằng bàn phím, có nhãn cho trình đọc màn hình | Một phần | mọi mốc |
| ★ | Giảm chuyển động | Có | mọi mốc |
| ★ | Desktop 1280–1920 px; tablet ngang và dọc (chạm, chụm, xoay máy, nút ≥ 44 px) | Xong | G6 |
| | ≥ 55 fps trên M1 ở 1440p (cả hậu kỳ): 67 fps ở 1440×900 Retina | Xong | UI-3, R7 |
| ★ | Đồ hoạ bàn cờ mô hình thật: vật liệu, ánh sáng, hậu kỳ, quân gỗ, HUD giấy/gỗ | Xong | R0–R6 |
