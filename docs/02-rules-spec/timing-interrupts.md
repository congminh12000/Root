# Thời điểm và quyết định xen ngang

Áp dụng §1.1.3, §1.4.1–1.4.3. Command của người tới lượt được giải quyết trọn vẹn. Trong lúc giải quyết, engine chỉ dừng ở các điểm dưới đây để hỏi người khác; đó là `GameState.pending`. Mọi điểm dừng khác là lỗi.

| PendingDecision | Ai trả lời | Khi nào | Điều khoản |
|---|---|---|---|
| `ambush` | defender, rồi attacker | Battle bước 1 | §4.3.1 |
| `battle-effects` | attacker, rồi defender | Battle bước 2 và 4 | §4.3.2, §4.3.4 |
| `take-hits` | bên chịu hit | Battle bước 6, ambush | §4.3.6 |
| `field-hospital` | Marquise | Khi chiến binh Marquise bị remove khỏi một clearing (cả ngoài lượt Marquise) | §6.2.3 |
| `outrage` | người gây Outrage | Remove sympathy hoặc đi vào clearing sympathy | §8.2.6 |
| `discard-down` | người đang tới lượt | Cuối Evening | §6.6, §7.6.2, §8.6.2, §9.6.3 |
| `order-effects` | người đang tới lượt | Nhiều hiệu ứng đồng thời | §1.1.3 |

## Thứ tự trong một lần remove nhiều quân

Theo §1.5.4, khi nhiều quân bị remove cùng lúc:
1. Remove hết quân.
2. Cộng điểm §3.2.1 và kiểm tra thắng §3.1.
3. Kích hoạt các hiệu ứng do việc remove (Field Hospitals; khi base bị remove thì Alliance bỏ supporter và officer §8.2.4). Bên mất quân chọn thứ tự (§4.3.6).

## Cửa sổ hiệu ứng trong lượt

Theo §1.4.1, mỗi phase có ba khúc: `start`, thân phase, `end`.
- **start:** các hiệu ứng "At start of <phase>": Better Burrow Bank, Command Warren, Cobbler, và kiểm tra dominance ở đầu Birdsong. Có nhiều thì người tới lượt chọn thứ tự.
- **Thân phase:** các bước của phe ([turn-flow.md](turn-flow.md)). Hiệu ứng "once in Daylight" và "in Birdsong" dùng được giữa các hành động, không dùng giữa một hành động (§1.4.2).
- **end:** base game không có hiệu ứng nào.

Bước cuối của lượt (discard cuối Evening) khóa mọi hành động khác (§1.4.3).

## Timeout cho người chơi thật

Đây là quyết định sản phẩm, không phải luật. Lớp multiplayer có thể đặt thời hạn trả lời cho mỗi PendingDecision. Hết hạn thì chọn phương án "không dùng" (không ambush, không field hospital) hoặc phương án bắt buộc nhỏ nhất. Ghi lại trong `docs/05-product-spec/multiplayer.md` khi viết.
