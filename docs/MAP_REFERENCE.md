# Bản đồ theo ảnh người dùng — 30/10/2026

- Nền: `web/src/assets/woodland-reference.png`, giữ nguyên file người dùng cung cấp, 1311×1200.
- SHA-256: `2af52b7e6083f55a6f873366cc9761c17846c364c4b45aa99aefeefd9339df48`; đã đối chiếu trùng ảnh đầu vào.
- Không vẽ lại, đổi màu, crop hoặc thêm logo/thang điểm vào ảnh. Tên vùng, quân và trạng thái công trình được vẽ trên lớp riêng, mặc định tắt.
- Có nút phóng to/thu nhỏ 100–300%, cuộn, bật tên vùng, chọn vùng và trở về bản đồ gốc.
- Trang `/map` hoạt động độc lập với API trận đấu, không khởi động AI. Bản đồ cũng hiện ở đấu trường khi chưa có snapshot.
- Đã bỏ điểm và thanh tiến độ trên các thẻ phe ở đầu đấu trường.

`web/src/map-layout.ts` chứa 12 điểm neo hiển thị quanh các cụm nhà và 9 điểm hiển thị forest. Các điểm neo chỉ dùng cho minh họa; ID, tọa độ logic, đường đi trong engine, replay và encoding huấn luyện được giữ nguyên. Ảnh nền không xác nhận topology luật đã tương đương bản Autumn chính thức.

## Kiểm tra

- `scripts/check.sh`: 36 test Python, 4 test frontend, Ruff, ESLint, TypeScript và production build đều qua.
- Mở `/map` trên trình duyệt thực: ảnh tải đúng kích thước gốc, giữ tỷ lệ, không có tràn dọc trong vùng ảnh ở mức 100%.
- Đã thử phóng to 125%, bật tên vùng, chọn vùng và trở lại ảnh gốc.
- Kiểm tra lớp minh họa không đổi dữ liệu tọa độ replay bằng unit test.
- Chỉ chạy preview giao diện trong quá trình xác minh; không khởi động lại bot hay huấn luyện.
