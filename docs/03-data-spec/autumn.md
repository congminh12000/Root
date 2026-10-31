# Bản đồ Autumn

Dữ liệu chuẩn ở [`packages/game-data/src/maps/autumn.ts`](../../packages/game-data/src/maps/autumn.ts), kiểu dữ liệu ở `types.ts` cùng package. Bản đồ in không có số clearing (priority marker chỉ có trong Clockwork, Law §C.6.2), nên dự án tự đánh số 1–12, theo hàng từ trên xuống. Trong code, ID bắt đầu từ 0, tức là số trong bảng trừ 1.

Nguồn: hình bản đồ ở Walking Through Root tr. 3 (SRC-003) và Learning to Play tr. 5 (SRC-002). Vấn đề còn mở: OQ-09.

| # | Vị trí | Suit | Slot | Ruin | Nối tới |
|---|---|---|---|---|---|
| 1 | Góc trên trái | fox | 1 | | 2, 4, 5 |
| 2 | Trên, giữa | rabbit | 2 | | 1, 3 |
| 3 | Góc trên phải | mouse | 2 | | 2, 4, 8 |
| 4 | Giữa trên, khúc sông | rabbit | 2 | ✓ | 1, 3, 6 |
| 5 | Mép trái | mouse | 2 | | 1, 6, 9 |
| 6 | Giữa trái | fox | 2 | ✓ | 4, 5, 7, 9, 11 |
| 7 | Giữa, cạnh cối xay nước | mouse | 3 | ✓ | 6, 8, 12 |
| 8 | Mép phải | fox | 2 | ✓ | 3, 7, 12 |
| 9 | Góc dưới trái | rabbit | 1 | | 5, 6, 10 |
| 10 | Dưới, lệch trái | fox | 2 | | 9, 11 |
| 11 | Dưới giữa, cạnh sông | mouse | 2 | | 6, 10, 12 |
| 12 | Góc dưới phải | rabbit | 1 | | 7, 8, 11 |

- **Tổng:** 18 path, 22 slot, 4 ruin (§5.1.4), mỗi suit 4 clearing.
- **Góc:** 1, 3, 9, 12. Hai cặp góc đối diện dùng cho dominance chim (§3.3.1.II) là 1–12 và 3–9.
- **Sông** chỉ có tác dụng khi có Riverfolk (§2.3), nên dữ liệu chưa ghi sông.
- **7 khu rừng** (§2.4), ghi theo các clearing bao quanh:

| Rừng | Clearing bao quanh |
|---|---|
| R1 | 1, 2, 3, 4 |
| R2 | 1, 4, 6, 5 |
| R3 | 4, 3, 8, 7, 6 |
| R4 | 5, 6, 9 |
| R5 | 6, 7, 12, 11 |
| R6 | 7, 8, 12 |
| R7 | 9, 6, 11, 10 |

Hai khu rừng kề nhau (§2.4.1) khi có chung một path. Test `packages/game-data/test/data.test.ts` kiểm tra:
- mỗi path nằm giữa đúng 1 hoặc 2 khu rừng;
- số rừng bằng số path − số clearing + 1;
- đồ thị path liên thông;
- hai cặp góc đối diện không kề nhau.
