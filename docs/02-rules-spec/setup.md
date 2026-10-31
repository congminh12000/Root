# Setup (Law chương 5, C.1)

Bản 1.0 chỉ dùng Standard Setup. Advanced Setup (App. A) nằm ngoài phạm vi (decisions/0002).

### ROOT-5.1 Standard Setup
Gồm 7 bước theo thứ tự; engine chạy chúng trong `createGame(options, rng)`.

### ROOT-5.1.1 Step 1: Assign Factions and Starting Player
- Mỗi người một phe, gán tùy ý (lobby quyết định; ràng buộc Reach là OQ-08).
- Người đi đầu và thứ tự ngồi chọn **ngẫu nhiên** bằng RNG server. Kết quả là `seats`.
- Mỗi người nhận board và quân của phe mình (game-data `MARQUISE`, `EYRIE`, `ALLIANCE`, `VAGABOND`).

### ROOT-5.1.2 Step 2: Place Score Markers
- Điểm mọi phe bằng 0.

### ROOT-5.1.3 Step 3: Draw Starting Hands
- Chơi **2 người** thì loại cả 4 lá dominance khỏi deck trước khi xáo.
- Xáo deck, mỗi người rút 3 lá.
- Test: 2 người thì deck có 50 lá trước khi chia; 4 người thì 54.

### ROOT-5.1.4 Step 4: Place Ruins
- Đặt ruin lên mỗi slot "R" (Autumn: clearing 4, 6, 7, 8). Item dưới ruin được thêm ở bước setup của Vagabond (§9.3.4). Không có Vagabond thì ruin không có item.

### ROOT-5.1.5 Step 5: Form Item Supply
- Item supply: 2 giày, 2 túi, 1 nỏ, 1 búa, 2 kiếm, 2 trà, 2 tiền (`AUTUMN.itemSupply`).

### ROOT-5.1.6 Step 6: Gather Other Pieces
- Thẻ tổng quan phe và hai xúc xắc. Không có trạng thái engine.

### ROOT-5.1.7 Step 7: Set Up Factions
- Setup từng phe theo **thứ tự setup** in trên board: A Marquise, B Eyrie, C Alliance, D Vagabond. Đây là thứ tự setup, không phải thứ tự lượt.
- Mỗi lựa chọn trong setup (góc của keep, vị trí building, leader, nhân vật, vị trí pawn…) là một PendingDecision của phe đó.
- Chi tiết: §6.3, §7.3, §8.3, §9.3.

### ROOT-5.2 Reach
- Tổng Reach của các phe nên đạt mức tối thiểu theo số người: 2 người 17+, 3 người 18+, 4 người 21+.
- Reach của bốn phe cơ bản: Marquise 10, Eyrie 7, Alliance 3, Vagabond 5.
- Law chỉ khuyến nghị, không bắt buộc. Lobby cấm hay chỉ cảnh báo là OQ-08.

## Thành phần (App. C.1)

### ROOT-C.1 Root
Nhóm C.1.1–C.1.5. Không có hành vi riêng; dùng để kiểm tra dữ liệu.

### ROOT-C.1.1 Booklets
- Walkthrough, Learning to Play và Law. Không có hành vi engine.

### ROOT-C.1.2 Cardboard Pieces
- 7 roost, 6 sawmill, 6 recruiter, 6 workshop, 3 base, 10 sympathy, 8 wood, 1 keep, 12 clearing marker, 4 ruin, 3 relationship marker và 23 item.
- Kiểm tra bằng `packages/game-data/test/factions.test.ts`.

### ROOT-C.1.3 Wooden Pieces
- 55 chiến binh (Marquise 25, Eyrie 20, Alliance 10) và 1 pawn Vagabond.

### ROOT-C.1.4 Cards
- 54 lá chung, 4 leader, 2 vizier, 3 nhân vật và 15 quest. Thẻ tổng quan và walkthrough không có hành vi.

### ROOT-C.1.5 Other
- Bàn cờ (bản đồ Autumn), 2 xúc xắc và 4 faction board.
