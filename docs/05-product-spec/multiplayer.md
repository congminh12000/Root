# Chơi nhiều người trong mạng LAN

Áp dụng cho `packages/server`, `packages/client` và `packages/bots`. Đây là quyết định sản phẩm, không phải luật Root. Luật chỉ nằm trong engine.

## Chạy

```bash
npm install
npm run build                          # dựng giao diện vào packages/client/dist
npm run serve -- --host 0.0.0.0        # http://<IP-LAN>:8080
```

Tùy chọn: `--port 8080`, `--data data/root2` (thư mục lưu trận, đã gitignore), `--bot-delay 400` (ms trước mỗi nước của bot). Mặc định server chỉ nghe `127.0.0.1`; dùng `--host 0.0.0.0` để máy khác trong LAN vào được.

Khi sửa giao diện: chạy `npm run serve` trong một terminal và `npm run dev:client` trong terminal khác. Vite proxy `/api` và `/ws` sang cổng 8080.

## Mô hình

- **Server giữ trạng thái gốc.** Mỗi trận là một `Room` giữ `GameState`. Trình duyệt chỉ nhận `PlayerView` của ghế mình (`viewFor`), kèm danh sách hành động hợp lệ do engine tính.
- **Trình duyệt chỉ gửi ý định.** Tin nhắn gồm `{ actionId, expectedRevision, action }`. Server điền `playerId` từ token của ghế, rồi gọi `applyCommand`. Server không kiểm tra luật lần thứ hai.
- **Token của ghế.** Lúc tạo trận, mỗi ghế người chơi nhận một token ngẫu nhiên, nằm trong đường dẫn `?game=<id>&seat=<token>`. Ai có đường dẫn thì chơi được ghế đó; không có tài khoản. Không có token thì là khán giả. Token chỉ trả về một lần, trong phản hồi tạo trận.
- **Bot chạy trên server.** Bot nhận đúng `PlayerView` và danh sách hợp lệ như người chơi (`@root/bots`), không đọc deck, bài người khác, item dưới ruin hay seed.
- **Ngẫu nhiên và lưu trận.** Mỗi trận có seed riêng của server. Command thứ n dùng RNG `seed:n`, và mọi giá trị ngẫu nhiên được ghi vào `GameRecord`. File `data/root2/<id>.json` chứa record cùng seed và token. Khi khởi động, server dựng lại trận bằng `replay(record)`.
- **Nhật ký công khai.** Server chỉ ghi chi tiết cho các hành động mọi người đều thấy, như di chuyển, đánh, xây hay chế tạo. Hành động có lá úp (Mobilize, Outrage, Aid) chỉ ghi loại hành động.

## Giao thức WebSocket `/ws?game=<id>[&seat=<token>]`

| Chiều | Tin nhắn |
|---|---|
| server → client | `update { gameId, seat, view, legal, seats, log }`: gửi khi kết nối và sau mỗi command được chấp nhận |
| server → client | `rejected { actionId, result }`: engine từ chối, kèm mã lỗi (`stale-revision`, `illegal-action`…) |
| client → server | `command { actionId, expectedRevision, action }` |

HTTP: `GET /api/games` trả danh sách trận. `POST /api/games { seats: [{ faction, kind: 'human' | 'bot', name?, bot? }] }` tạo trận, trả về 400 nếu tổ hợp phe không đủ Reach (decision 0003).

## Bot

| id | Cách chọn |
|---|---|
| `random` | Chọn ngẫu nhiên đều trong danh sách hợp lệ. Dùng để fuzz. |
| `simple` | Heuristic viết tay: ưu tiên hành động ghi điểm (xây, chế tạo, Revolt, quest), chỉ đánh khi có lợi thế quân. Chưa có tìm kiếm hay học máy. |

Bot `simple` yếu. Bản cũ (`backend/`) có tìm kiếm Monte Carlo và mô hình neural, nhưng chạy trên bộ luật thử nghiệm khác. Muốn chuyển sang thì phải viết lại phần mã hóa trạng thái cho bộ luật chính thức.

## Chưa có (cần người quản lý quyết định)

- **Thời hạn cho người chơi thật.** Ghế người vắng làm trận dừng chờ, kể cả ở các quyết định xen ngang như Field Hospitals hay Outrage. Gợi ý: hết hạn thì chọn phương án "không dùng" hoặc phương án bắt buộc nhỏ nhất (timing-interrupts.md).
- **Tài khoản và bảo mật.** Server không có đăng nhập và không mã hóa (HTTP thường). Chỉ dùng trong LAN tin cậy.
- **Đổi người giữa trận, hoàn tác, chat.**
- **Bản đồ dùng hình tự vẽ đơn giản.** Chưa có hoạt ảnh hay hiển thị lá bài đầy đủ.
