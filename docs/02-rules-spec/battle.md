# Battle (Law 4.3)

### ROOT-4.3 Battle
- **Bắt đầu:** chọn một clearing có chiến binh hoặc pawn của mình làm clearing battle; mình là attacker. Chọn một **kẻ địch có quân ở đó** làm defender.
- Battle giải quyết theo các bước 1–6 bên dưới. Trong battle chỉ mở các PendingDecision liệt kê ở đây.
- Coalition: không được battle người đang cùng coalition, vì họ không phải kẻ địch (G.8).
- Test: không battle được ở clearing không có quân mình. Không chọn được defender không có quân ở clearing đó.

### ROOT-4.3.1 Step 1: Defender May Ambush
- Defender **có thể** chơi một lá ambush khớp suit clearing (lá bird luôn khớp). PendingDecision `ambush` cho defender.
- **I. Foil Ambush:** nếu defender chơi ambush, attacker có thể chơi một lá ambush khớp suit để hủy. Khi đó lá của defender bị bỏ và bỏ qua bước II. PendingDecision `ambush` cho attacker.
- **II. Resolve Ambush:** defender gây ngay **2 hit** lên attacker, áp dụng theo §4.3.6 (attacker chọn quân mất). Sau đó defender bỏ lá ambush. Nếu attacker không còn chiến binh hay pawn nào ở đó thì battle kết thúc ngay.
- Lá ambush của attacker dùng để hủy cũng bị bỏ (Law không nói rõ; vì lá đã được chơi ra, xem OQ-11).
- Hit từ ambush không bị giới hạn bởi số chiến binh của defender.
- Test:
  - Defender chơi ambush, attacker còn 1 chiến binh: battle kết thúc, attacker mất quân.
  - Attacker hủy được thì không có hit nào.
  - Ambush fox không chơi được ở clearing mouse.

### ROOT-4.3.2 Step 2: Use Before-Roll Effects
- Hai bên dùng các hiệu ứng ghi "before rolling". Base game không có lá nào như vậy; hook để dành cho sau. Cả hai cùng có thì attacker chọn thứ tự.

### ROOT-4.3.3 Step 3: Roll Dice
- Tung hai xúc xắc battle bằng RNG server, ghi kết quả vào log. Attacker sẽ gây số hit bằng **giá trị cao**, defender bằng **giá trị thấp**. Bằng nhau thì hai bên như nhau.
- Ngoại lệ: Guerrilla War (§8.2.2) đảo lại khi Alliance là defender.
- Law và Learning to Play chỉ ghi "2 custom dice", không ghi các mặt. Phân bố mặt phải lấy từ xúc xắc thật (OQ-12). Trước khi có số liệu, engine không được giả định.
- **I. Maximum Rolled Hits:** số hit từ xúc xắc không vượt số **chiến binh của mình** trong clearing battle, dù là attacker hay defender. Vagabond dùng số kiếm chưa hỏng (§9.2.6).
- Test: roll 3–1, attacker có 2 chiến binh thì attacker gây 2 hit, defender gây 1. Defender không có chiến binh thì gây 0 rolled hit.

### ROOT-4.3.4 Step 4: Use After-Roll Battle Effects
- Hai bên dùng các hiệu ứng battle không ghi "before rolling": Brutal Tactics, Sappers, Armorers, Commander (§7.8.3). Cả hai cùng có thì attacker chọn thứ tự. PendingDecision `battle-effects` cho attacker, sau đó cho defender.

### ROOT-4.3.5 Step 5: Count Hits
- Mỗi bên cộng rolled hit (đã giới hạn) với hit từ hiệu ứng.
- **I. Extra Hits:** hit thêm từ hiệu ứng không bị giới hạn bởi số chiến binh.
- **II. Defenseless:** nếu defender không có chiến binh nào ở clearing battle thì attacker gây thêm 1 hit. Vagabond: defenseless khi không có kiếm chưa hỏng (§9.2.4).
- **III. Ignored Hits:** hiệu ứng bỏ qua hit thì trừ khỏi tổng (Armorers bỏ qua toàn bộ rolled hit).
- Test: defender chỉ có 1 sawmill, attacker roll 2 với 3 chiến binh thì gây 2 + 1 = 3 hit (sawmill chỉ mất 1, phần thừa bỏ phí).

### ROOT-4.3.6 Step 6: Deal Hits
- Mỗi hit remove một quân của phía bên kia ở clearing battle.
- Bên chịu hit tự chọn thứ tự quân bị remove, nhưng **phải remove hết chiến binh** trước khi được remove building hay token. Họ cũng chọn thứ tự các hiệu ứng do việc mất quân kích hoạt (Field Hospitals…). PendingDecision `take-hits`.
- Mỗi building hoặc token của kẻ địch bị remove thì người gây hit được 1 điểm (§3.2.1).
- Hai bên chịu hit đồng thời: Law không quy định ai remove trước. Theo §1.1.3, người tới lượt (attacker) chọn thứ tự. Điểm cộng từ hai bên được kiểm tra thắng theo §3.1.1.
- Vagabond chịu hit thì damage item thay vì mất quân (§9.2.7).
- Test:
  - Defender có 1 chiến binh và 1 roost, chịu 1 hit thì phải mất chiến binh.
  - Chịu 2 hit thì mất cả hai, attacker được 1 điểm.
  - Hit vượt quá số quân thì bỏ phí.
