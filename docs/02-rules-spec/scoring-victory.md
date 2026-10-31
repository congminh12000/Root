# Điểm và chiến thắng (Law chương 3)

### ROOT-3.1 How to Win
- Người đầu tiên đạt **30 điểm** thắng **ngay lập tức**, kể cả giữa một hành động hay khi không phải lượt mình. Engine kiểm tra sau mỗi lần cộng điểm; có người thắng thì dừng mọi giải quyết còn lại và đặt `winner`.
- Test: được 30 điểm từ việc remove building giữa battle thì trận kết thúc trước bước tiếp theo của battle.

### ROOT-3.1.1 Ties
- Nhiều người cùng đạt 30 điểm một lúc thì người gần nhất theo chiều kim đồng hồ tính từ người đang tới lượt thắng; người đang tới lượt là gần nhất.
- Test: Favor of the Mice cho người tới lượt và một người khác (qua điểm Brutal Tactics hay tương tự) cùng lên 30 thì người tới lượt thắng.

### ROOT-3.2 Scoring Victory Points
- Mỗi phe có cách ghi điểm riêng. Hai cách chung nằm ở 3.2.1 và 3.2.2.
- Người đã kích hoạt dominance hoặc lập coalition (`score === null`) không ghi điểm nữa. Mọi lần cộng điểm cho họ bị bỏ qua.

### ROOT-3.2.1 Removing Buildings and Tokens
- Mỗi lần remove một building hoặc token của **kẻ địch** thì được 1 điểm, bất kể nguyên nhân (battle, Favor, Revolt, Strike…). Remove chiến binh không được điểm.
- Ngoại lệ trong base: Despot (§7.8.4), infamy của Vagabond (§9.2.9.III.a).
- Test: Revolt remove 1 sawmill và 1 wood thì Alliance được 2 điểm. Ruin không phải quân phe nên không có điểm.

### ROOT-3.2.2 Crafting Items
- Chế tạo item thì ghi điểm in trên lá. Ngoại lệ: Eyrie (§7.2.3).

### ROOT-3.3 Dominance Cards
4 lá dominance cho phép thắng mà không cần 30 điểm.

### ROOT-3.3.1 Activating
- **Điều kiện:** đang trong Daylight của mình, có ít nhất **10 điểm**, và có lá dominance trên tay. Vagabond không được (§9.2.8).
- **Kết quả:** đặt lá vào play area. `score` của người đó thành null (bỏ score marker) và họ không ghi điểm nữa.
- **Điều kiện thắng mới**, kiểm tra **ở đầu Birdsong** của người đó:
  - **I.** Dominance suit fox, rabbit hoặc mouse: rule 3 clearing của suit đó.
  - **II.** Dominance bird: rule hai clearing ở hai góc đối diện (Autumn: 1 với 12, hoặc 3 với 9).
- Test: kích hoạt khi có 9 điểm là không hợp lệ. Rule 3 clearing fox vào đầu Birdsong thì thắng. Đạt điều kiện giữa lượt thì chưa thắng.

### ROOT-3.3.2 Activated Cards
- Lá dominance đã kích hoạt không thể bị remove khỏi play area, cũng không thể thay bằng lá khác.

### ROOT-3.3.3 Using Dominance Cards
- Lá dominance trên tay spend được như một lá thường của suit đó.
- Mỗi khi lá dominance lẽ ra vào chồng bài bỏ (spend, discard, Purge, Lost Souls…), nó được đặt cạnh bản đồ (`availableDominance`).

### ROOT-3.3.4 Taking Available Cards
- Trong Daylight của mình, có thể spend một lá **cùng suit** để lấy một lá dominance đang nằm cạnh bản đồ về tay.
- Lá dominance bird có sẵn chỉ lấy được bằng lá bird; lá non-bird không thay cho bird được.
- Test: dùng lá bird lấy dominance fox được. Dùng lá fox lấy dominance bird thì không được.
