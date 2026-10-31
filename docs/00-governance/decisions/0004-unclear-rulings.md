# 0004. Phán quyết cho các trường hợp Law không nói rõ (OQ-10 đến OQ-17)

- Ngày: 31/10/2026
- Trạng thái: Đã chấp nhận (người quản lý dự án quyết định)
- Nguồn: người quản lý cho biết đã đối chiếu với The Law of Root và phần giải thích luật trong thư viện chính thức của Leder Games. Agent **chưa tự kiểm tra lại** các nguồn đó; nếu Leder công bố khác thì phải có quyết định mới.

| ID | Phán quyết | Spec |
|---|---|---|
| OQ-10 | **Scouting Party:** defender vẫn được chơi ambush khi attacker có Scouting Party. Lá vẫn bị bỏ, nhưng attacker không nhận 2 hit. Không cấm chơi. | battle.md §4.3.1, cards.md |
| OQ-11 | **Foil Ambush:** attacker chơi ambush khớp suit để hủy thì **cả hai lá** đều bị bỏ, battle sang bước 2. | battle.md §4.3.1 |
| OQ-13 | **A New Roost:** phải đặt được trọn 1 roost **và 3 chiến binh**. Supply còn 1–2 chiến binh thì bước này không đặt gì. Quy tắc đặt tối đa có thể (§1.5.4) không bỏ qua điều kiện chọn clearing của §7.4.3. | eyrie.md §7.4.3 |
| OQ-14 | **Humiliate:** điểm không xuống dưới 0. Ví dụ đang 2 điểm, phải mất 4, thì còn 0. | eyrie.md §7.7.1 |
| OQ-15 | **Despot** (đã có FAQ chính thức xác nhận, xem 0005): +1 điểm **mỗi battle** có remove ít nhất một building/token của kẻ địch, không tính theo từng quân. Ví dụ phá 3 quân trong một battle thì được 3 + 1 = 4 điểm. | eyrie.md §7.8.4 |
| OQ-16 | **Allied Movement** (đã có FAQ chính thức xác nhận, xem 0005): Vagabond buộc chiến binh Allied đi vào clearing sympathetic thì **không có Outrage**. Người quản lý cho biết đây là cách giải thích hiện hành, thay cho cách xử lý của các bản in cũ. | alliance.md §8.2.6, vagabond.md §9.2.9 |
| OQ-17 | **Refresh:** không lật item trong ô Damaged. Phải Repair trước; Repair giữ nguyên mặt ngửa hoặc úp của item. | vagabond.md §9.4.1 |

## Ghi chú

- OQ-16: FAQ chính thức của §8.2.6 xác nhận không có Outrage, vì Vagabond dùng "Force" để kéo chiến binh. Engine vẫn cần test riêng cho trường hợp này.
- OQ-13 cần test tách biệt A New Roost với Recruit của Decree, vì hai hành động có điều kiện khác nhau.
