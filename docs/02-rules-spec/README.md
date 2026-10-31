# Đặc tả luật

Đặc tả hành vi cho engine, viết theo Leder Rules Library p16 (SRC-004, nguồn chính, gồm cả FAQ chính thức) và đối chiếu với PDF 13/10/2025 (SRC-001). Mỗi mục bắt đầu bằng ID điều khoản `ROOT-<section>`, cùng ID trong [rule-coverage.yaml](../06-qa/rule-coverage.yaml). `npm run audit:rules` kiểm tra mỗi điều khoản `specified` trở lên có ID xuất hiện trong file spec được trỏ tới.

Đặc tả **không thêm luật**. Điều gì Law không nói thì ghi "Law không quy định" và đưa vào [open-questions](../00-governance/open-questions.md). Văn bản Law chỉ được tóm tắt, không chép nguyên văn; khi cần chữ chính xác, đọc PDF ở trang ghi trong coverage.

## Cấu trúc một mục

```
### ROOT-x.y.z Tên điều khoản
- Khi nào / điều kiện: …
- Kết quả: thay đổi trạng thái theo thứ tự.
- Quyết định: ai chọn gì (thành PendingDecision hoặc tham số command).
- Test: ít nhất một ca hợp lệ và một ca không hợp lệ.
```

Mục không có hành vi (tổng quan, danh sách sách hướng dẫn) ghi "Không có hành vi engine".

## File

| File | Chương Law |
|---|---|
| [golden-rules.md](golden-rules.md) | 1: ưu tiên, thông tin ẩn, thỏa thuận, cấu trúc lượt, quân cờ |
| [map.md](map.md) | 2.2–2.5: clearing, path, slot, ruin, sông, rừng, rule; M.1 |
| [cards.md](cards.md) | 2.1: bài, chim, ambush, dominance, play area; hiệu ứng từng lá |
| [scoring-victory.md](scoring-victory.md) | 3: thắng, ghi điểm, dominance |
| [crafting.md](crafting.md) | 4.1 |
| [movement.md](movement.md) | 4.2 |
| [battle.md](battle.md) | 4.3 |
| [setup.md](setup.md) | 5; C.1 |
| [turn-flow.md](turn-flow.md) | Máy trạng thái phase/bước của bốn phe |
| [timing-interrupts.md](timing-interrupts.md) | 1.4.2–1.4.3 và mọi quyết định xen ngang |
| [factions/marquise.md](factions/marquise.md) | 6 |
| [factions/eyrie.md](factions/eyrie.md) | 7 |
| [factions/alliance.md](factions/alliance.md) | 8 |
| [factions/vagabond.md](factions/vagabond.md) | 9; V.1–V.3 |

## Thuật ngữ (Law App. G)

Engine dùng đúng nghĩa trong Glossary, không suy rộng (Law tr. 2, Q3):

- **Place (G.20):** lấy quân từ nguồn được chỉ định. Không ghi nguồn thì lấy từ supply; nếu quân nằm trên track thì lấy quân ngoài cùng bên trái.
- **Remove (G.24):** trả quân về nơi được chỉ định. Không ghi thì trả về supply của chủ quân, hoặc về ô trống ngoài cùng bên phải của track nếu loại quân đó có track. Item bị loại vĩnh viễn.
- **Replace (G.23):** remove rồi place vào đúng chỗ đó. Phải làm được cả hai bước, không thì không làm.
- **Discard / Spend (G.5, G.31):** bỏ vào chồng bài bỏ. Lá dominance thì đặt cạnh bản đồ thay vì bỏ (§3.3.3).
- **Draw (G.6):** lấy lá trên cùng; không ghi nguồn thì rút từ deck chung.
- **Reveal (G.25):** đặt lá ngửa vào play area, mặc định lấy từ tay.
- **Random (G.22):** chọn ngẫu nhiên mà không xem bài, nên engine dùng RNG của server.
- **Matching (G.16):** cùng suit.
- **Enemy (G.8, G.9):** mọi người chơi khác, trừ người đang cùng coalition với mình. Item không bao giờ là quân địch.
- **Swap (G.33):** đổi chỗ hai quân, bỏ qua mọi hạn chế move/place. Base game không dùng.
