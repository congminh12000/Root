# Eyrie Dynasties (Law chương 7)

Số liệu board ở `EYRIE` ([factions.md](../../03-data-spec/factions.md)).

### ROOT-7.1 Overview
Không có hành vi engine. Eyrie ghi điểm theo số roost trên bản đồ và phải thực hiện trọn Decree mỗi lượt.

### ROOT-7.2 Faction Rules and Abilities
Nhóm 7.2.1–7.2.3.

### ROOT-7.2.1 Crafting
- Crafting piece là roost. Chế tạo trong Daylight, **trước** khi giải quyết Decree.

### ROOT-7.2.2 Lords of the Forest
- Eyrie rule một clearing khi **hòa** quyền tổng chiến binh + building cao nhất ở đó **và** có ít nhất một quân Eyrie ở đó.
- Engine: `ruler()` ưu tiên Eyrie khi tổng của Eyrie bằng tổng cao nhất và lớn hơn 0.
- Test: Eyrie 2 với Marquise 2 thì Eyrie rule. Eyrie 0 với Marquise 0 thì không ai rule.

### ROOT-7.2.3 Disdain for Trade
- Khi chế tạo item, bỏ qua điểm in trên lá; chỉ được **1 điểm**. Điểm thêm từ hiệu ứng khác vẫn được tính, nhưng base game không có hiệu ứng nào như vậy.
- Ngoại lệ: leader Builder (§7.8.1).

### ROOT-7.3 Faction Setup
Thứ tự setup B.

### ROOT-7.3.1 Step 1: Gather Warriors
- Supply: 20 chiến binh.

### ROOT-7.3.2 Step 2: Place Roost and Starting Warriors
- Đặt 1 roost và 6 chiến binh ở một clearing góc **không phải** góc xuất phát của người khác. Nếu được, chọn góc đối diện chéo với một góc xuất phát.
- Engine: tập lựa chọn là các góc chưa ai lấy. Nếu trong đó có góc đối diện chéo với một góc xuất phát thì chỉ được chọn các góc đó.
- Test: Marquise ở góc 1 thì Eyrie phải chọn góc 12.

### ROOT-7.3.3 Step 3: Choose Leader
- Chọn 1 trong 4 leader. Ba leader còn lại để ngửa (`leadersFaceUp`).

### ROOT-7.3.4 Step 4: Tuck Viziers
- Đặt 2 Loyal Vizier vào hai cột Decree ghi trên leader (`EYRIE.leaders`).

### ROOT-7.3.5 Step 5: Fill Roosts Track
- 6 roost còn lại lên track (`roostsOnTrack = 6`).

### ROOT-7.4 Birdsong
Ba bước theo thứ tự 7.4.1–7.4.3.

### ROOT-7.4.1 Emergency Orders
- Tay không có lá nào thì rút 1 lá.

### ROOT-7.4.2 Add to the Decree
- **Bắt buộc** thêm 1 hoặc 2 lá từ tay vào Decree. Mỗi lá đặt vào một cột tùy chọn; cột chứa không giới hạn. Trong các lá thêm, **tối đa một lá bird**.
- Các lá đã thêm là công khai (reveal).
- Test: thêm 2 lá bird là không hợp lệ. Thêm 0 lá khi tay có bài là không hợp lệ.

### ROOT-7.4.3 A New Roost
- Nếu không có roost nào trên bản đồ: đặt 1 roost và 3 chiến binh ở một clearing có **ít chiến binh nhất** (tính mọi phe), trong số các clearing đặt được **cả** các quân này (còn slot, không có keep…). Hòa thì Eyrie chọn.
- Phải đặt được trọn 1 roost và 3 chiến binh. Supply còn dưới 3 chiến binh thì bước này không đặt gì; §1.5.4 không bỏ qua điều kiện này (decisions/0004, OQ-13).
- Test (tách riêng với Recruit của Decree): supply còn 2 chiến binh, không có roost trên bản đồ thì không đặt gì. Supply còn 3 thì đặt đủ.

### ROOT-7.5 Daylight
Hai bước theo thứ tự 7.5.1–7.5.2.

### ROOT-7.5.1 Craft
- Có thể kích hoạt roost để chế tạo.

### ROOT-7.5.2 Resolve the Decree
- **Bắt buộc** giải quyết Decree từ cột trái sang phải: Recruit → Move → Battle → Build. Trong một cột, mọi lá phải được giải quyết, theo thứ tự tùy ý. Mỗi lá là một hành động của cột đó, ở clearing **khớp suit lá** (lá bird khớp mọi suit):
  - **I. Recruit:** đặt 1 chiến binh ở một clearing khớp suit có roost.
  - **II. Move:** move (ít nhất 1 chiến binh) **từ** một clearing khớp suit.
  - **III. Battle:** mở battle ở một clearing khớp suit.
  - **IV. Build:** đặt roost ở một clearing khớp suit mà mình rule và chưa có roost.
- Không thực hiện trọn được một hành động thì rơi ngay vào **Turmoil** (§7.7).
- Engine: mỗi lần chọn một lá trong cột hiện tại và tham số hành động. Nếu không còn cách hợp lệ nào cho bất kỳ lá nào còn lại trong cột, engine tự kích hoạt Turmoil. Người chơi không được cố ý bỏ qua một lá còn làm được.
- Test:
  - Lá Recruit fox khi không có roost ở clearing fox: Turmoil.
  - Lá Build khi không rule clearing khớp suit nào chưa có roost: Turmoil.
  - Recruit còn làm được thì không được tự chọn Turmoil.

### ROOT-7.6 Evening
Hai bước 7.6.1–7.6.2.

### ROOT-7.6.1 Score Points
- Được điểm ghi ở ô trống ngoài cùng bên phải của track: `roostPoints[n − 1]` với n là số roost trên bản đồ. n = 0 thì 0 điểm.

### ROOT-7.6.2 Draw and Discard
- Rút 1 lá, cộng 1 cho mỗi draw bonus đã lộ (ô roost 2 và 5 trống). Sau đó bỏ bớt về 5 lá.

### ROOT-7.7 Turmoil
Bốn bước theo thứ tự.

### ROOT-7.7.1 Step 1: Humiliate
- Mất 1 điểm cho mỗi lá bird trên Decree, tính cả 2 vizier. Điểm không xuống dưới 0 (decisions/0004, OQ-14).
- Test: đang 2 điểm, Decree có 4 lá bird thì còn 0.

### ROOT-7.7.2 Step 2: Purge
- Bỏ mọi lá trên Decree, trừ hai vizier. Lá dominance trên Decree được đặt cạnh bản đồ (§3.3.3).

### ROOT-7.7.3 Step 3: Depose
- Lật úp leader hiện tại và để riêng. Chọn leader mới trong các leader đang ngửa, đặt vizier theo leader mới.
- **I. A New Clutch:** không còn leader ngửa thì lật ngửa tất cả rồi chọn.
- Engine: theo dõi `leadersFaceUp`. Leader bị phế không được chọn lại cho tới khi hết vòng.

### ROOT-7.7.4 Step 4: Rest
- Kết thúc Daylight, sang Evening.

### ROOT-7.8 Leaders Reference
Nhóm 7.8.1–7.8.4. Vizier bắt đầu theo `EYRIE.leaders`.

### ROOT-7.8.1 Builder
- Vizier ở Recruit và Move. Khi chế tạo thì bỏ qua Disdain for Trade, nên item ghi đủ điểm in trên lá.

### ROOT-7.8.2 Charismatic
- Vizier ở Recruit và Battle. Mỗi hành động Recruit đặt **2** chiến binh thay vì 1 (§1.5.4 nếu supply thiếu).

### ROOT-7.8.3 Commander
- Vizier ở Move và Battle. Khi là attacker trong battle thì gây thêm 1 hit (extra hit §4.3.5.I).

### ROOT-7.8.4 Despot
- Vizier ở Move và Build. Mỗi khi remove ít nhất một building hoặc token của kẻ địch **trong battle**, được thêm 1 điểm, tức 2 điểm tính cả §3.2.1. Điểm thêm tính **một lần mỗi battle**, không theo từng quân (decisions/0004, OQ-15).
- Test: phá 3 building/token trong một battle thì được 3 + 1 = 4 điểm. FAQ chính thức xác nhận.
