# Setup (Law chương 5, C.1)

Engine có hai cách: Standard Setup (§5.1) và Advanced Setup (mục A) với faction setup card và homeland. Sản phẩm (server, sảnh) dùng **Advanced Setup** (decisions/0006); `createGame` mặc định Standard để giữ test và các trận đã lưu (`options.setup`). Chữ 4 lá setup card: [../03-data-spec/setup-cards.md](../03-data-spec/setup-cards.md).

### ROOT-5.1 Standard Setup
Gồm 7 bước theo thứ tự; engine chạy chúng trong `createGame(options, rng)`.

### ROOT-5.1.1 Step 1: Assign Factions and Starting Player
- Mỗi người một phe, không trùng. Law cho gán tùy ý, nhưng dự án bắt buộc bộ phe đạt tổng Reach (§5.2, decisions/0003).
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
- Law chỉ khuyến nghị. Dự án **bắt buộc** (decisions/0003): lobby và `createGame` từ chối bộ phe dưới mức. Kiểm tra bằng `factionMixAllowed`.
- Bộ phe hợp lệ với bốn phe cơ bản:
  - 2 người: Marquise + Eyrie.
  - 3 người: Marquise với hai trong ba phe còn lại.
  - 4 người: cả bốn phe.
- Test: Eyrie + Alliance + Vagabond (15) bị từ chối; Marquise + Alliance + Vagabond (18) được chấp nhận.

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


## ROOT-A Advanced Setup (mục A, decisions/0006)

Bật bằng `createGame({ ..., setup: 'advanced' })`; lưu ở `state.setupMode`. Chỉ dùng các bước trong phạm vi: A.4, A.7, A.8 (không draft), A.9, A.10.

**Ngoài phạm vi:** ROOT-A.1 (bản đồ biến thể; Autumn giữ chất in sẵn), ROOT-A.2 (bộ bài khác), ROOT-A.3 (Rootbotics), ROOT-A.5 (landmark), ROOT-A.6 (hireling), ROOT-A.8.1 và ROOT-A.8.2 (draft; phe chọn ở sảnh, OQ-19).

### ROOT-A.4 Step 4: Seat Players
- Như §5.1.1: thứ tự ngồi và người đi đầu ngẫu nhiên.

### ROOT-A.7 Step 7: Draw Five Cards
- 2 người thì bỏ 4 lá dominance (như §5.1.3). Xáo deck, mỗi người rút **5** lá.
- Test: 4 người, mỗi tay 5 lá sau khi tạo trận.

### ROOT-A.8 Step 8: Set Up Factions
- Không draft (ROOT-A.8.1, ROOT-A.8.2 bỏ qua, OQ-19): phe chọn ở sảnh, quyết định 0003 (Reach) giữ nguyên. Vagabond chọn nhân vật như hiện nay (OQ-21); nếu sau này có chế độ chia phe ngẫu nhiên thì nhân vật cũng chia ngẫu nhiên.

#### ROOT-A.8.3 Step 3: Choose Factions
- **Thứ tự:** bắt đầu từ người **cuối** trong thứ tự lượt, đi ngược chiều kim đồng hồ: `seats[n-1]`, `seats[n-2]`, …, `seats[0]`. Mỗi phe chuẩn bị xong mới tới phe sau.

#### ROOT-A.8.3.I Homelands
- `state.homelands[f]` ghi homeland của từng phe, công khai. Không chọn ô đã là homeland của phe khác, hoặc ô không đặt đủ quân của bước chuẩn bị (ví dụ thiếu slot trống cho công trình, hoặc ô có keep của Marquise với phe khác, §6.2.2).

#### ROOT-A.8.3.II Enemy Homeland Adjacency
- khoảng cách tới homeland địch tính bằng số path ít nhất. "2+ clearings between" là khoảng cách ≥ 3; "not adjacent" là ≥ 2. Không có ô thoả mức đòi hỏi thì hạ một mức (≥ 3 → ≥ 2 → bất kỳ).
- **Mép bản đồ (G.15):** `MapDef.edge`; Autumn: ô 1, 2, 3, 5, 8, 9, 10, 11, 12 (OQ-20).

#### Marquise (SRC-014)
1. Chọn 3 homeland, mỗi lần một ô (`choose-homeland`). Ô thứ hai và thứ ba phải kề một homeland đã chọn, nên 3 ô nối liền. Mỗi homeland cần ≥ 1 slot trống. Chỉ cho chọn ô mà sau đó vẫn chọn đủ được 3 ô.
2. Tự động: 2 chiến binh ở mỗi homeland, 1 ở mọi clearing khác (kể cả homeland phe khác).
3. Keep ở một homeland (`marquise-place-keep`), ưu tiên ô không kề homeland địch. Rồi sawmill, workshop, recruiter, mỗi cái ở một homeland khác nhau (`marquise-place-building`).
4. Track công trình như §6.3.5.

#### Eyrie (SRC-015)
1. Chọn homeland trên mép bản đồ, khoảng cách ≥ 3 tới mọi homeland địch (hạ mức theo A.8.3.II). Cần slot trống và đặt được quân (`eyrie-place-roost`: 6 chiến binh và 1 roost ở đó).
2. Leader và vizier như §7.3.3–§7.3.4; track roost như §7.3.5.

#### Woodland Alliance (SRC-016)
- Như §8.3 (rút 3 supporter, track sympathy, base). Không có homeland.

#### Vagabond (SRC-017)
- Như §9.3: chọn nhân vật, đặt pawn ở rừng, 3 quest, item "R" dưới ruin, item "S", quan hệ Indifferent với mọi phe khác. Không có homeland.

### ROOT-A.9 Step 9: Place Score Markers
- Điểm mọi phe bằng 0 (như §5.1.2).

### ROOT-A.10 Step 10: Choose Starting Hands
- Sau khi mọi phe chuẩn bị xong, theo thứ tự lượt, mỗi người trả **2** lá về đầu deck, từng lá một (`return-card`), giữ 3 lá. Xong cả bàn thì xáo deck.
- Lá trả về là thông tin ẩn: log chỉ ghi loại hành động (server `PUBLIC_DETAIL` không có `return-card`).
- Test: sau setup mỗi tay 3 lá; deck đủ số lá; trả lá không có trong tay bị từ chối.
