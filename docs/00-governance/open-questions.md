# Vấn đề chưa rõ

Mỗi mục chặn phần gameplay liên quan cho tới khi đóng. Đóng một mục nghĩa là ghi nguồn đã đối chiếu, kết quả và (nếu cần) quyết định trong `decisions/`.

## Đang mở

| ID | Vấn đề | Chặn phần nào | Cần nguồn |
|---|---|---|---|
| OQ-02 | Rules Library online ghi "Updated Oct 8, 2025", PDF ghi 13/10/2025. Chưa so hai bản. | Không chặn; baseline là PDF | SRC-004 so với SRC-001 |
| OQ-08 | Tổ hợp phe cho 2–4 người: §5.1.1 cho phép tùy ý, §5.2 Reach chỉ là khuyến nghị. Sản phẩm bắt buộc theo Reach hay chỉ cảnh báo? | Lobby | Quyết định của người quản lý |
| OQ-10 | Scouting Party ("không bị ảnh hưởng bởi ambush"): defender có được chơi ambush (mất lá, không gây hit) không, hay không được chơi? | Battle bước 1 | FAQ Leder / Rules Library |
| OQ-11 | Foil Ambush (§4.3.1.I): Law chỉ nói defender bỏ lá ambush. Lá ambush của attacker có bị bỏ không? | Battle bước 1 | SRC-004, Learning to Play |
| OQ-12 | Các mặt của 2 xúc xắc battle. Law chỉ ghi "custom dice". | Battle bước 3 | Xúc xắc thật |
| OQ-13 | A New Roost (§7.4.3) khi supply còn dưới 3 chiến binh: đặt tối đa có thể (§1.5.4) hay không đặt vì "all those pieces can be placed"? | Eyrie Birdsong | SRC-004 / FAQ |
| OQ-14 | Humiliate (§7.7.1) có làm điểm xuống dưới 0 không? | Eyrie Turmoil | SRC-004 / FAQ |
| OQ-15 | Despot (§7.8.4): +1 mỗi battle có remove building/token, hay +1 cho mỗi quân bị remove? | Eyrie battle | SRC-004 / FAQ |
| OQ-16 | Vagabond buộc chiến binh Allied đi vào clearing sympathetic (§9.2.9.II.b): ai trả Outrage (§8.2.6)? | Outrage | SRC-004 / FAQ |
| OQ-17 | Refresh (§9.4.1) có lật được item úp nằm trong ô Damaged không? | Vagabond Birdsong | SRC-004 / FAQ |

## Đã đóng

| ID | Kết quả | Nguồn |
|---|---|---|
| OQ-01 | Bản đồ Autumn: 12 clearing, 18 path, 7 rừng, 22 slot, 4 ruin, bốn góc. Xem [../03-data-spec/autumn.md](../03-data-spec/autumn.md). | SRC-003 tr. 3, SRC-002 tr. 5 |
| OQ-05 | 15 quest, mỗi suit 5, đủ hai item yêu cầu. | SRC-005 |
| OQ-06 | Ký hiệu item: M giày, S kiếm, C nỏ, F đuốc, H búa, T trà, X tiền, B túi. Hàng item supply in trên bản đồ có 2 túi, 2 giày, 1 nỏ, 1 búa, 2 kiếm, 2 trà, 2 tiền, khớp §5.1.5. | SRC-003 tr. 3 |
| OQ-03 | Dữ liệu faction board: giá gỗ và điểm của Marquise, điểm roost, giá và điểm sympathy, draw bonus. Xem [../03-data-spec/factions.md](../03-data-spec/factions.md). | SRC-006 tr. 1–8 |
| OQ-07 | Relationships chart có Indifferent, 2 bậc giữa và Allied; cần Aid 1/2/3 lần để lên bậc, được +1/+2/+2 điểm. Khớp `Relationship = 0..3` trong state.ts. | SRC-006 tr. 7 |
| OQ-04 | Số bản sao từng lá: đếm tam giác suit trên Root Crafting Chart. 45 lá chế tạo được khớp hoàn toàn với `base-deck.ts`; ambush 5 và dominance 4 theo Law; tổng 54. Danh sách số lượng theo tên do người quản lý cung cấp ngày 31/10/2026 (32 tên, 54 lá) cũng khớp từng dòng. Cả hai là nguồn cộng đồng, nên nếu có bộ bài thật thì vẫn nên đếm lại một lần. | SRC-012, SRC-003, Law §2.1.2–2.1.3 |
| OQ-09 | Đếm lại slot trên ảnh bàn cờ Autumn trống: cả 12 clearing khớp dữ liệu (1, 2, 2, 2, 2, 2, 3, 2, 1, 2, 2, 1; tổng 22). Clearing 1 có 1 slot, 3 có 2, 4 có 2 (1 ruin). | SRC-013 |
