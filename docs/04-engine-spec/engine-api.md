# API của engine

`@root/game-engine` là TypeScript thuần, không phụ thuộc UI hay Node. Server, bot và test dùng chung các hàm dưới đây.

| Hàm | Việc |
|---|---|
| `createGame(options, rng)` | Standard Setup §5.1. Kiểm tra Reach, xếp chỗ ngồi ngẫu nhiên, xáo và chia bài, đặt ruin và item supply, rồi xếp các bước setup của từng phe vào `pending`. |
| `legalActions(state, faction)` | Mọi `Action` phe đó được làm lúc này. Rỗng nếu không phải lượt quyết định của phe đó. |
| `applyCommand(state, command, rng)` | Kiểm tra rồi áp dụng một `GameCommand` (thứ tự kiểm tra ở dưới). Không bao giờ sửa `state` đầu vào; trả về state mới cùng `CommandResult`. |
| `currentActor(state)` | Phe đang được chờ: chủ của quyết định trên đỉnh `pending`, nếu không có thì là người tới lượt. |
| `viewFor(state, faction \| null)` | `PlayerView` đã che thông tin ẩn. `null` là khán giả. |
| `replay(record)` | Dựng lại trận từ `GameRecord` mà không cần seed. |
| `seededRng`, `recordingRng`, `replayRng` | Nguồn ngẫu nhiên của server, bản có ghi lại, và bản phát lại. |

## Thứ tự kiểm tra command

1. `gameId` đúng trận, không thì trả `wrong-game`.
2. `actionId` đã gặp trong 64 lệnh gần nhất: trả `ok` với `duplicate: true`, không làm gì thêm. Nhờ vậy lệnh gửi lại sau reconnect chỉ được áp dụng một lần.
3. `expectedRevision` phải bằng `meta.revision`, không thì trả `stale-revision`.
4. Trận đã có người thắng: trả `game-over`.
5. `playerId` phải có ghế trong trận, không thì trả `unknown-player`.
6. Phe của người gửi phải là `currentActor`, không thì trả `not-your-turn`.
7. `{ type, payload }` phải trùng một phần tử của `legalActions`, không thì trả `illegal-action`. Đây là đường kiểm tra luật duy nhất, nên luật chỉ cần viết một lần, trong phần sinh hành động hợp lệ.
8. Áp dụng trên bản sao, tăng `revision`, ghi `actionId`.

## Ngẫu nhiên và replay

- Engine chỉ gọi `rng.int(n)`. Server giữ seed và bọc RNG bằng `recordingRng` để ghi lại mọi giá trị.
- `GameRecord` gồm `options`, các giá trị ngẫu nhiên của `createGame`, và mỗi command kèm các giá trị ngẫu nhiên nó đã dùng.
- `replay` báo lỗi nếu thiếu, thừa hoặc lệch giá trị ngẫu nhiên, hay nếu có command bị từ chối. Test chạy 200 trận setup ngẫu nhiên và so trạng thái sau replay với trạng thái gốc.

## Setup

- Các bước setup là `PendingDecision` loại `setup`, xếp theo thứ tự A–D: Marquise, Eyrie, Alliance, Vagabond.
- Bước không cần lựa chọn tự chạy khi lên đỉnh stack: garrison của Marquise, toàn bộ setup của Alliance, quest/ruin/item của Vagabond.
- Bước cần lựa chọn:
  - Marquise: chọn góc đặt keep; đặt 3 công trình, mỗi lần một cái.
  - Eyrie: chọn góc đặt roost; chọn leader.
  - Vagabond: chọn nhân vật; chọn khu rừng đặt pawn.
- Hết setup thì `stage = 'play'` và lượt 1 bắt đầu ở Birdsong của `seats[0]`.

## Chưa có

Hành động trong lượt chơi (Birdsong, Daylight, Evening) sẽ có từ bước 2 (luật chung) và bước 3–6 (từng phe). Hiện `legalActions` trả rỗng khi đã vào giai đoạn chơi.
