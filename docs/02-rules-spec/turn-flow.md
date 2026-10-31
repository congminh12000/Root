# Luồng lượt

Máy trạng thái cho `GameState.turn = { seat, phase, step }`. Mỗi phase có các khúc `start` và `end` ([timing-interrupts.md](timing-interrupts.md)). Ở đầu Birdsong, engine kiểm tra điều kiện thắng dominance (§3.3.1) trước mọi bước khác.

| Phe | Birdsong | Daylight | Evening |
|---|---|---|---|
| Marquise (§6.4–6.6) | Đặt wood ở mỗi sawmill | `craft` (workshop) → `actions` (3 + 1 mỗi lá bird spend: Battle, March, Recruit, Build, Overwork) | `draw` (1 + bonus) → `discard` (về 5) |
| Eyrie (§7.4–7.6) | `emergency-orders` → `add-to-decree` → `new-roost` | `craft` (roost) → `resolve-decree` | `score` → `draw` → `discard` |
| Alliance (§8.4–8.6) | `revolt` (lặp) → `spread-sympathy` (lặp) | `actions`: Craft, Mobilize, Train, tùy thứ tự và số lần | `military-operations` → `draw` → `discard` |
| Vagabond (§9.4–9.6) | `refresh` → `slip` | `actions`: exhaust item để Move, Battle, Explore, Aid, Quest, Strike, Repair, Craft, Special | `rest` → `draw` → `discard` → `item-capacity` |

Hành động chung ngoài bảng:
- **Kích hoạt dominance** (§3.3.1) và **lấy dominance có sẵn** (§3.3.4): bất kỳ lúc nào trong Daylight của mình, giữa các hành động.
- **Hiệu ứng lá persistent:** theo cửa sổ thời gian ghi trên lá ([cards.md](cards.md)).

## Chuyển bước

- Bước bắt buộc mà không làm được gì: tự chuyển sang bước sau. Ví dụ Birdsong của Marquise khi không có sawmill.
- Bước tùy chọn: người chơi gửi `end-step` để sang bước sau.
- Bước có giới hạn số lần (Marquise 3 hành động, Alliance officers): engine đếm trong trạng thái phe và tự chuyển bước khi hết lượt.
- Eyrie rơi vào Turmoil: kết thúc Daylight ngay và vào Evening (§7.7.4).
- Hideout của Ranger: kết thúc Daylight ngay (§V.3.2).
- Hết Evening: `turn.seat` chuyển sang người kế tiếp và `turn.number` tăng; đặt lại các bộ đếm theo lượt (`craftingUsed`, `recruitedThisTurn`, `aidThisTurn`, giới hạn "once" của lá).
