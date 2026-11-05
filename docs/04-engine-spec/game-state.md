# Game State Schema

Định nghĩa chuẩn nằm trong code, để trình biên dịch kiểm tra:

- [`packages/game-engine/src/state.ts`](../../packages/game-engine/src/state.ts): `GameState`, trạng thái từng phe, quyết định đang chờ.
- [`packages/game-engine/src/view.ts`](../../packages/game-engine/src/view.ts): `PlayerView`, phần mỗi người được thấy.
- [`packages/game-engine/src/command.ts`](../../packages/game-engine/src/command.ts): `GameCommand` và kết quả.

Mỗi trường có comment dẫn điều khoản Law. Trường dựa trên suy luận được đánh dấu `VERIFY` và liệt kê ở [open-questions.md](../00-governance/open-questions.md).

## Nguyên tắc

- **Server authoritative.** Chỉ engine sửa `GameState`. Client gửi `GameCommand`; `playerId` lấy từ phiên đăng nhập.
- **Toàn vẹn.** Command được áp dụng trọn vẹn hoặc bị từ chối; `meta.revision` tăng một mỗi lần áp dụng. Command có `expectedRevision` khác bị trả `stale-revision`. `actionId` trùng lặp chỉ áp dụng một lần.
- **Tất định.** Engine là hàm thuần `(state, command, rng) → state`. Kết quả ngẫu nhiên (xúc xắc, xáo bài, rút ngẫu nhiên của Thief) được ghi vào event log, nên replay không cần seed. Seed chỉ nằm trên server.
- **Quyết định xen ngang.** `pending` là một stack. Người đang được hỏi có thể khác người đang tới lượt (ambush §4.3.1, field hospital §6.2.3, outrage §8.2.6, chọn thứ tự mất quân §4.3.6). Khi stack còn phần tử, chỉ người ở đỉnh stack được gửi command.
- **Cách chuẩn bị.** `setupMode` là `'advanced'` khi trận dùng Advanced Setup (mục A, decisions/0006); không có thì là Standard Setup (§5.1), nên trận cũ vẫn replay đúng. `homelands` ghi homeland của từng phe (A.8.3.I), công khai trong `PlayerView`.
- **Định danh bài.** Mỗi lá vật lý có `CardId` riêng; văn bản và suit lấy từ `game-data` theo định nghĩa. Bài trùng tên vẫn là các lá khác nhau.
- **Gắn phiên bản.** `meta.rulesVersion` và `meta.dataVersion` đi theo trận từ đầu tới cuối.

## Thông tin ẩn (§1.2)

| Dữ liệu | Ai thấy |
|---|---|
| `deck` (thứ tự và nội dung) | Không ai; view chỉ có `deckCount` |
| `hands[f]` | Chủ bài; người khác thấy số lá |
| `factions.alliance.supporters` | Alliance; người khác thấy số lá |
| Item dưới ruin | Không ai, cho tới khi Explore; view chỉ có số item |
| `questDeck` | Không ai |
| Discard, play area, item supply, faction board, Vagabond item | Mọi người |

Bot nhận đúng `PlayerView` như người chơi, không bao giờ nhận `GameState`.

## Bất biến (kiểm bằng property test)

1. Mỗi phe có tổng chiến binh (trên bản đồ + supply + officer) bằng số trong hộp: Marquise 25, Eyrie 20, Alliance 10 (§6.3.1, §7.3.1, §8.3.1, §C.1.3).
2. Mỗi clearing có số slot đã lấp không vượt số slot in trên bản đồ (§2.2.3).
3. Mỗi clearing có tối đa một sympathy token (§8.2.5.I). Alliance có tối đa 10 sympathy (trên bản đồ + track).
4. Tổng số lá ở deck, discard, hand, play area, supporters, Decree và dominance available luôn bằng 54, hoặc 50 khi chơi hai người vì bốn lá dominance bị loại (§5.1.3).
5. Supporters không vượt 5 khi Alliance không có base trên bản đồ (§8.2.3.I).
6. Mỗi track item của Vagabond chứa tối đa 3 (§9.2.5.I).
7. Một phe có `score === null` khi và chỉ khi đã kích hoạt dominance hoặc lập coalition.
8. `winner` khác null thì không còn command nào được chấp nhận.
