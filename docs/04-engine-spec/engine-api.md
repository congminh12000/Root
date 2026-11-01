# API của engine

`@root/game-engine` là TypeScript thuần, không phụ thuộc UI hay Node. Server, bot và test dùng chung các hàm dưới đây.

| Hàm | Việc |
|---|---|
| `createGame(options, rng)` | Standard Setup §5.1. Kiểm tra Reach, xếp chỗ ngồi ngẫu nhiên, xáo và chia bài, đặt ruin và item supply, rồi xếp các bước setup của từng phe vào `pending`. |
| `legalActions(state, faction)` | Mọi `Action` phe đó được làm lúc này. Rỗng nếu không phải lượt quyết định của phe đó. |
| `applyCommand(state, command, rng)` | Kiểm tra rồi áp dụng một `GameCommand` (thứ tự kiểm tra ở dưới). Không bao giờ sửa `state` đầu vào; trả về state mới cùng `CommandResult`. |
| `currentActor(state)` | Phe đang được chờ: người chọn thứ tự khi có ≥ 2 hiệu ứng đồng thời (`order-effects`, §1.1.3), nếu không thì chủ của quyết định trên đỉnh `pending`, nếu không có thì là người tới lượt. |
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

## Luật chung (bước 2)

| Module | Nội dung |
|---|---|
| `rules.ts` | Định nghĩa lá bài, chim là wild (§2.1.1), bỏ bài (lá dominance sang cạnh bản đồ), rule (§2.5, Lords of the Forest), kẻ địch (G.8), ghi điểm, thắng 30 điểm và hòa (§3.1), thắng dominance (§3.3.1) |
| `board.ts` | Kề nhau, góc và góc đối diện, slot, đặt quân tối đa có thể (§1.5.4), rút bài và xáo lại khi deck hết (§2.1) |
| `move.ts` | Điều kiện move (§4.2.1) và liệt kê mọi move hợp lệ |
| `craft.ts` | Ghép chi phí với crafting piece (§4.1.1), item supply, không trùng lá persistent, Favor, Disdain for Trade |
| `removal.ts` | Loại quân và chịu hit (§4.3.6): chiến binh trước, sau đó người chịu chọn building/token, Vagabond hỏng item; điểm §3.2.1, Despot, Field Hospitals |
| `battle.ts` | Battle là một quá trình dừng ở mỗi quyết định: ambush, hủy ambush, Scouting Party, xúc xắc, Guerrilla War, Commander, Brutal Tactics/Sappers/Armorers, defenseless, hai bên chịu hit |
| `common.ts` | Field Hospitals, bỏ bài về giới hạn, kích hoạt và lấy dominance |

Engine tiếp tục battle sau mỗi quyết định trong battle, và chỉ kiểm tra thắng khi battle đã xong, vì hai bên chịu hit cùng lúc (§3.1.1).

## Luồng lượt (bước 3–6)

- `turn.ts` là máy trạng thái của lượt. Mỗi phe khai báo danh sách `TurnStep` trong `factions/<phe>.ts`, và engine tự chèn một bước `<phase>-start` trước mỗi phase cho hiệu ứng "at start of" (§1.4.1).
- Một bước có thể có `enter` (chạy khi vào bước), `options`/`apply` (lựa chọn của người chơi), `optional` (cho phép `end-step`), `window` (hiệu ứng "any time" giữ bước mở), `busy` (đang giữa một hành động, §1.4.2) và `stuck` (Decree không thực hiện được thì Turmoil).
- Sau mỗi command, `advanceTurn` chạy các bước tự động cho tới khi có người phải chọn, có quyết định đang chờ, battle đang dừng, hoặc trận kết thúc. Hết Evening thì sang ghế kế tiếp và đặt lại các bộ đếm theo lượt.
- `hold` là bước dừng dành cho test kịch bản. Ở bước này máy trạng thái không tự chạy, chỉ còn hiệu ứng "any time" của phase.
- Hiệu ứng lá persistent ngoài battle nằm ở `cards.ts`. Bài bị lộ cho một người (Codebreakers, Outrage) nằm trong `GameState.reveals`, và `viewFor` chỉ gửi cho đúng người đó (`PlayerView.revealed`).

## Lựa chọn được rút gọn

Những điểm dưới đây không đổi luật. Chúng chỉ gộp các lựa chọn cho ra cùng kết quả, để danh sách hành động không quá dài:
- Crafting piece được chọn tự động (`payCost`). Hai piece cùng suit cho cùng kết quả. Biểu tượng `any` lấy piece còn lại đầu tiên.
- Khi Alliance trả supporter, người chơi chỉ chọn số lá chim. Engine lấy các lá đầu tiên trong chồng, vì supporter chỉ được dùng theo suit.
- Aid, Day Labor và chế tạo của Vagabond chỉ đưa ra mỗi thiết kế lá một lần. Các bản sao của cùng một lá có hiệu ứng như nhau.

## Chưa có

- Golden scenario từ Walking Through Root.
- Hiệu ứng `order-effects` (§1.1.3) khi nhiều hiệu ứng xảy ra cùng lúc: hiện engine giải quyết theo thứ tự cố định.
