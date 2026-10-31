# Vấn đề chưa rõ

Mỗi mục chặn phần gameplay liên quan cho tới khi đóng. Đóng một mục nghĩa là ghi nguồn đã đối chiếu, kết quả và (nếu cần) quyết định trong `decisions/`.

## Đang mở

| ID | Vấn đề | Chặn phần nào | Cần nguồn |
|---|---|---|---|
| — | Không còn vấn đề mở. | | |

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
| OQ-12 | Xúc xắc battle: 12 mặt, giá trị 0–3, mỗi giá trị 3 mặt (`BATTLE_DIE`). Law không ghi; người quản lý cung cấp ngày 31/10/2026. | Người quản lý dự án |
| OQ-08 | Bắt buộc tổng Reach (§5.2) cho mọi trận, người chơi thật lẫn bot. Xem [decisions/0003-enforce-reach.md](decisions/0003-enforce-reach.md). | Người quản lý dự án |
| OQ-10, 11, 13–17 | Phán quyết cho 7 trường hợp Law không nói rõ (Scouting Party, Foil Ambush, A New Roost, Humiliate, Despot, Outrage khi Vagabond kéo quân Allied, Refresh item hỏng). Xem [decisions/0004-unclear-rulings.md](decisions/0004-unclear-rulings.md). | Người quản lý dự án |
| OQ-02 | So Rules Library p16 với PDF 13/10/2025: nội dung trùng; chỉ khác chữ ở §4.2 và G.4. p16 thành nguồn chính. Xem [decisions/0005-rules-library-primary.md](decisions/0005-rules-library-primary.md). | SRC-004, SRC-001 |
