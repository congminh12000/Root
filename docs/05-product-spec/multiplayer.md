# Chơi nhiều người trong mạng LAN

Áp dụng cho `packages/server`, `packages/client` và `packages/bots`. Đây là quyết định sản phẩm, không phải luật Root. Luật chỉ nằm trong engine.

## Chạy

```bash
npm install
npm run build                          # dựng giao diện vào packages/client/dist
npm run serve -- --host 0.0.0.0        # http://<IP-LAN>:8080
```

Tùy chọn:
- `--port 8080`
- `--data data/root2`: thư mục lưu trận, đã gitignore.
- `--bot-delay 400`: số ms bot chờ trước mỗi nước.
- `--turn-seconds 90`: thời hạn cho mỗi lựa chọn của người chơi. Đặt `0` để tắt.
- `--password <khóa>`, hoặc biến môi trường `ROOT_PASSWORD`: mật khẩu phòng.
- `--max-games 20`: số trận chưa kết thúc tối đa cùng lúc. Mặc định server chỉ nghe `127.0.0.1`; dùng `--host 0.0.0.0` để máy khác trong LAN vào được.

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

## Thời hạn và mật khẩu (quyết định của người quản lý, 31/10/2026)

- **Thời hạn:** mỗi lựa chọn của ghế người có 90 giây, kể cả các quyết định xen ngang như Field Hospitals, ambush hay Outrage. Đồng hồ chạy lại sau mỗi command được chấp nhận. Hết giờ thì bot mạnh nhất hiện có chọn thay đúng một lần, rồi quyền chọn trở lại với người đó. Command của bot ghi `actionId` bắt đầu bằng `timeout-`. Server gửi `deadline` và giờ server `now` để trình duyệt đếm ngược mà không phụ thuộc đồng hồ máy khách.
- **Mật khẩu phòng:** khi đặt mật khẩu, mọi API `/api/*` (trừ `/api/config`) cần header `x-room-key`, và khán giả cần `&key=` khi mở WebSocket. Đường dẫn của từng ghế đã chứa token bí mật riêng nên không cần mật khẩu. Server so mật khẩu bằng phép so sánh thời gian hằng.
- **Giới hạn:** tạo trận vượt `--max-games` trận chưa kết thúc thì server trả về 429.

## Bàn chơi 3D

- Mặc định trang trận hiện bàn 3D vẽ bằng Three.js (`packages/client/src/board3d.ts`). Nút 2D chuyển sang bản đồ SVG; nếu trình duyệt không có WebGL thì tự dùng 2D. Lựa chọn 2D/3D được nhớ trong trình duyệt.
- Mọi hình đều do code tự dựng từ `game-data`, không dùng art chính thức: bàn gỗ, mặt đất, đường đất, cây theo từng khu rừng, viền clearing theo màu suit, quân, công trình và token. Ngẫu nhiên có seed cố định nên mọi máy thấy cùng một bàn.
- Kéo để xoay, cuộn để phóng to. Bấm vào một ô (cả 2D và 3D) để lọc các lựa chọn liên quan tới ô đó; bấm lại để bỏ lọc.
- Three.js nằm trong một chunk riêng, chỉ tải khi mở bàn 3D.

## Bot

| id | Cách chọn |
|---|---|
| `random` | Chọn ngẫu nhiên đều trong danh sách hợp lệ. Dùng để fuzz. |
| `simple` | Heuristic viết tay: ưu tiên hành động ghi điểm (xây, chế tạo, Revolt, quest), chỉ đánh khi có lợi thế quân. Chưa có tìm kiếm hay học máy. |

Bot `simple` yếu. Bản cũ (`backend/`) có tìm kiếm Monte Carlo và mô hình neural, nhưng chạy trên bộ luật thử nghiệm khác. Muốn chuyển sang thì phải viết lại phần mã hóa trạng thái cho bộ luật chính thức.

## Chưa có (cần người quản lý quyết định)

- **Tài khoản và mã hóa.** Server không có tài khoản và chạy HTTP thường, không mã hóa. Chỉ dùng trong LAN tin cậy.
- **Đổi người giữa trận, hoàn tác, chat.**
- **Hoạt ảnh và xem lá bài.** Chưa có hoạt ảnh khi di chuyển hay đánh, chưa có khung xem chi tiết lá.
