# Woodland Alliance (Law chương 8)

Số liệu board ở `ALLIANCE` ([factions.md](../../03-data-spec/factions.md)).

### ROOT-8.1 Overview
Không có hành vi engine. Alliance ghi điểm khi đặt sympathy; dùng supporter để Revolt và lập base.

### ROOT-8.2 Faction Rules and Abilities
Nhóm 8.2.1–8.2.6.

### ROOT-8.2.1 Crafting
- Crafting piece là sympathy token. Chế tạo trong Daylight.

### ROOT-8.2.2 Guerrilla War
- Khi Alliance là **defender**, Alliance gây hit theo giá trị **cao** và attacker theo giá trị **thấp**. Giới hạn số chiến binh (§4.3.3.I) vẫn áp dụng.
- Test: roll 3–0, Alliance phòng thủ với 3 chiến binh: Alliance gây 3, attacker gây 0.

### ROOT-8.2.3 The Supporters Stack
- Supporter là các lá úp trong chồng Supporters. Chỉ spend được theo **suit** của lá. Không tính vào giới hạn bài trên tay. Chỉ Alliance xem được.
- **I. Capacity:** khi không có base trên bản đồ, chồng tối đa 5 lá; lá được thêm vượt giới hạn bị bỏ. Có base thì không giới hạn.
- Test: không có base, đang có 5 supporter mà Mobilize thì lá bị bỏ. Có base thì giữ được lá thứ 6.

### ROOT-8.2.4 Removing Bases
- Khi một base bị remove:
  1. Alliance bỏ mọi supporter khớp suit của base, **kể cả lá bird**.
  2. Remove một nửa số officer, làm tròn lên.
  3. Nếu không còn base nào trên bản đồ và có hơn 5 supporter thì bỏ bớt về 5 (Alliance chọn lá).
- Test: base fox bị remove, có 4 officer và supporter gồm fox, bird, mouse: bỏ lá fox và lá bird, còn 2 officer.

### ROOT-8.2.5 Sympathy Tokens
- Có 10 sympathy token.
- **I. Placement Limits:** mỗi clearing tối đa 1 sympathy.
- **II. Terms:** clearing sympathetic là clearing có sympathy, unsympathetic là clearing không có.

### ROOT-8.2.6 Outrage
- **Khi nào:** một người chơi **khác** remove một sympathy token, hoặc move chiến binh vào một clearing sympathetic.
- **Kết quả:** người đó phải chuyển một lá **khớp suit clearing đó** từ tay sang chồng Supporters. Nếu không có lá khớp (kể cả không có lá bird), họ phải cho Alliance xem bài trên tay, rồi Alliance rút một lá từ deck cho vào Supporters.
- Bird được tính theo §2.1.1.I: có lá bird thì phải đưa khi không có lá suit đó. Người trả chọn lá nào.
- Pawn Vagabond không phải chiến binh, nên move pawn một mình không gây Outrage. Khi Vagabond buộc chiến binh Allied đi cùng vào clearing sympathetic (§9.2.9.II.b), **không có Outrage** (decisions/0004, OQ-16).
- Mỗi lần remove sympathy và mỗi lần move vào gây một lần Outrage riêng. **Place** quân vào clearing sympathetic không gây Outrage (FAQ §8.2.6).
- Test:
  - Marquise March vào clearing sympathetic fox, tay có lá fox: lá đó vào Supporters.
  - Tay không có fox hay bird: show hand, Alliance rút một lá.
  - Alliance tự move vào thì không có Outrage.

### ROOT-8.3 Faction Setup
Thứ tự setup C.

### ROOT-8.3.1 Step 1: Gather Warriors
- Supply: 10 chiến binh.

### ROOT-8.3.2 Step 2: Place Bases
- 3 base (fox, rabbit, mouse) đặt ở ô Bases trên board.

### ROOT-8.3.3 Step 3: Fill Sympathy Track
- 10 sympathy lên track.

### ROOT-8.3.4 Step 4: Gain Supporters
- Rút 3 lá, đặt úp vào Supporters.

### ROOT-8.4 Birdsong
Hai bước theo thứ tự: tất cả Revolt, rồi tất cả Spread Sympathy.

### ROOT-8.4.1 Revolt
- Làm bao nhiêu lần cũng được.
- **I.** Chọn một clearing sympathetic chưa có base, mà suit của nó khớp một base còn trên board. Base đã đặt lên bản đồ thì không Revolt cho suit đó nữa (FAQ §8.4.1).
- **II.** Spend 2 supporter khớp suit clearing (bird được tính).
- **III.**
  1. Remove mọi quân địch ở clearing đó.
  2. Đặt base tương ứng, rồi đặt số chiến binh bằng số clearing sympathetic khớp **suit in trên base**.
  3. Đặt 1 chiến binh vào ô Officers.
  4. Ghi 1 điểm cho mỗi building hoặc token bị remove.
- Pawn Vagabond không bị remove; Vagabond damage 3 item (§9.2.2.I).
- Test: clearing fox có 2 chiến binh Marquise và 1 sawmill, có 3 clearing fox sympathetic:
  - Remove 3 quân, Alliance được 1 điểm.
  - Đặt base fox và 3 chiến binh, thêm 1 officer.

### ROOT-8.4.2 Spread Sympathy
- Làm bao nhiêu lần cũng được.
- **I.** Chọn một clearing unsympathetic **kề** một clearing sympathetic. Chưa có clearing sympathetic nào thì chọn clearing bất kỳ. Không chọn được clearing có keep của Marquise (§6.2.2).
- **II.** Spend số supporter khớp suit clearing bằng `sympathyCost[n]`, với n là số sympathy đã có trên bản đồ.
  - **a. Martial Law:** spend thêm 1 nếu clearing có **ít nhất 3 chiến binh của một người chơi khác**.
- **III.** Đặt sympathy và ghi `sympathyPoints[n]` điểm.
- Test:
  - Sympathy thứ 4 tốn 2 supporter và được 1 điểm.
  - Clearing có 3 chiến binh Marquise: tốn thêm 1.
  - Clearing không kề clearing sympathetic nào: không hợp lệ.

### ROOT-8.5 Daylight
- Các hành động dưới đây làm theo thứ tự tùy ý và bao nhiêu lần cũng được.

### ROOT-8.5.1 Craft
- Kích hoạt sympathy để chế tạo.

### ROOT-8.5.2 Mobilize
- Chuyển một lá từ tay vào Supporters, theo giới hạn §8.2.3.I.

### ROOT-8.5.3 Train
- Spend một lá khớp suit của **một base đang có trên bản đồ** để đặt 1 chiến binh từ supply vào ô Officers.
- Test: không có base trên bản đồ thì không Train được.

### ROOT-8.6 Evening
Hai bước 8.6.1–8.6.2.

### ROOT-8.6.1 Military Operations
- Thực hiện tối đa **số officer** hành động, thứ tự tùy ý:
  - **I. Move:** một move.
  - **II. Battle:** mở một battle.
  - **III. Recruit:** đặt 1 chiến binh ở một clearing có base.
  - **IV. Organize:** remove 1 chiến binh Alliance khỏi một clearing unsympathetic để đặt sympathy ở đó (không tốn supporter), rồi ghi điểm của ô vừa mở trên track.

### ROOT-8.6.2 Draw and Discard
- Rút 1 lá, cộng 1 cho mỗi base trên bản đồ (draw bonus). Sau đó bỏ bớt về 5 lá. Supporters không tính vào giới hạn này.
