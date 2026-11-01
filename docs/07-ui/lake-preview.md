# Lake — thiết kế 3D đã duyệt

Ngày 01/11/2026. Theo kế hoạch người quản lý duyệt trong chat: dựng hình trước, 3D vẽ tay, dời nhà trang trí ra rìa, giữ khu item và đường điểm dạng mô hình, cho đặt/gỡ công trình mẫu. Chưa phải bản đồ chơi hoặc luật Lake chính thức; không thay thế UI-7 Autumn.

## Nguồn và phạm vi

Ảnh Lake người quản lý gửi ngày 01/11/2026 là tham chiếu bố cục. Không đưa ảnh, logo hay art của Leder vào repo hoặc dùng làm nền. Địa hình, nước, cây, nhà, bến, slot và chữ đều sinh từ code, token và icon tự vẽ. `maps/lakeside.json` cũ chỉ dùng đối chiếu số lượng, không được import vào client mới hoặc engine.

Bản dựng ở `/lake-kit.html`. Chạy `npm run build`, rồi server LAN theo AGENTS.md khi người quản lý yêu cầu. Cảnh không gọi API hoặc WebSocket, không lưu trạng thái demo và không đọc `PlayerView`.

## Bố cục và slot

Dữ liệu minh họa ở `packages/client/src/lake/layout.ts`, tọa độ chuẩn hóa x/y từ góc trên trái. Số clearing Lake không phải số clearing Autumn. Tâm, diện tích và hướng slot không đổi khi đặt/gỡ mẫu.

| Clearing | Slot | Slot Ruin |
|---|---|---|
| 1 | 1 | — |
| 2 | 1 | — |
| 3 | 2 | — |
| 4 | 1 | — |
| 5 | 3 | 5.3 |
| 6 | 1 | — |
| 7 | 3 | 7.3 |
| 8 | 3 | 8.3 |
| 9 | 3 | 9.1 |
| 10 | 1 | — |
| 11 | 1 | — |
| 12 | 2 | — |

Tổng 22 slot, trong đó 4 slot ban đầu có Ruin. Bố trí được điều chỉnh quanh vị trí tham chiếu để nền không chạm nước, đường, bến hoặc nhà. Đường chỉ là nét cảnh quan, không xác nhận adjacency. Clearing có mép đất không đều; cây chừa vùng xây và vùng đặt quân.

Slot là đất nện nằm sát mặt đất, có đá thấp quanh mép và lối vào mở. Công trình mẫu đặt đúng tâm với chân tiếp đất; nhà trang trí nhỏ hơn và đứng ngoài nền. Slot R có đá đổ và nhãn R riêng; thử dọn bỏ cả mô hình lẫn nhãn. Gỡ công trình không làm Ruin tự xuất hiện lại; khôi phục toàn cảnh mới trả về trạng thái gốc.

## Duyệt và kiểm chứng

- Danh sách HTML chọn được bằng Tab/Enter; bấm trực tiếp trên nền cũng chọn đúng slot. Có xem gần slot, xoay/zoom, góc nhìn từ trên và về camera mặc định. Mặc định ẩn số đối chiếu, R vẫn hiện.
- Demo hỗ trợ sawmill, workshop, recruiter, roost và base. Ruin chặn mọi mẫu; dọn Ruin chỉ là thao tác minh họa, không thực hiện Explore hoặc cấp item.
- Test hình học kiểm tra số lượng, ID, trùng nền, mẫu điểm trên diện tích nền với nước/đường/bến/nhà và vùng cấm cây. Test trạng thái kiểm tra đặt, đổi, gỡ, dọn, reset và thao tác không hợp lệ.
- Playwright kiểm tra hai kích thước 1440×900, 1280×800, raycast, bàn phím và mọi mẫu công trình. Ảnh sinh khi test ở `packages/client/test-results/lake-review/` (gitignored); ảnh duyệt có chủ đích ở [reference/lake-review/](reference/lake-review/).
- Cảnh tĩnh chỉ vẽ khi camera hoặc trạng thái thay đổi. Đo GPU 30 khung bằng nút trong “Ghi chú bản duyệt & hiệu năng”; số đo phụ thuộc máy, kích thước canvas và trình duyệt, không dùng số headless WebGL làm số đo M1.

**Đã được người quản lý duyệt trong chat:** đường bờ, vị trí clearing, nền xây và bốn R. Hoàn tất bước thiết kế bản dựng Lake; chưa triển khai luật Lake. Việc đưa vào game cần nguồn luật/dữ liệu và quy trình rules:guard riêng.

### Kết quả kiểm tra 01/11/2026

Typecheck, toàn bộ test, audit:rules, build và 8 test trình duyệt đều qua. Autumn 2D vẫn khớp ảnh gốc; Autumn 3D vẫn vẽ và không phát sinh lỗi JavaScript. Không sửa engine, game-data hoặc coverage luật vì không thêm hành vi gameplay.

Đo trên trình duyệt tương tác của máy phát triển: 30 khung xoay, 2,5 ms/khung (thông lượng khoảng 398 khung/giây), canvas 1574×900 px trong viewport 2560×1440. Đây là phép đo render có đồng bộ GPU; chưa phải đo FPS tương tác kéo dài hoặc canvas đầy đủ 2560×1440. Ảnh duyệt không chứa ảnh nguồn của Leder. Server Playwright và dữ liệu test tự dọn khi kết thúc; server xem thử localhost 8088 đã được người quản lý yêu cầu từ phiên trước, tiếp tục phục vụ bản duyệt.
