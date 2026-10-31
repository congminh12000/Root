# Vagabond (Law chương 9, V.1–V.3)

Số liệu board ở `VAGABOND` ([factions.md](../../03-data-spec/factions.md)). Ký hiệu item: giày (M), kiếm (S), nỏ (C), đuốc (F), búa (H), trà (T), tiền (X), túi (B).

### ROOT-9.1 Overview
Không có hành vi engine.

### ROOT-9.2 Faction Rules and Abilities
Nhóm 9.2.1–9.2.10.

### ROOT-9.2.1 Crafting
- Vagabond exhaust búa để dùng pawn làm crafting piece. Không bị giới hạn một lần mỗi lượt (§4.1.1).
- Chế tạo được item thì nhận ngay item đó, mặt ngửa. Chi tiết ở §9.5.8.

### ROOT-9.2.2 Lone Wanderer
- Pawn không phải chiến binh: không tính vào rule, không ngăn người khác rule. Pawn **không bao giờ** bị remove khỏi bản đồ.
- **I. Full Removal:** hiệu ứng của kẻ địch "remove mọi quân địch" ở clearing có Vagabond (Revolt, Favor) thì Vagabond damage 3 item thay vì mất pawn.
- Test: Favor of the Mice ở clearing có Vagabond: pawn ở lại, 3 item chuyển sang Damaged. Còn ít hơn 3 item chưa hỏng thì damage tối đa có thể.

### ROOT-9.2.3 Nimble
- Vagabond di chuyển được bất kể ai rule clearing đi hay clearing đến (bỏ qua §4.2.1).

### ROOT-9.2.4 Defenseless
- Khi là defender, Vagabond defenseless (§4.3.5.II, attacker gây thêm 1 hit) nếu không có kiếm chưa hỏng.

### ROOT-9.2.5 Items
- Item trên board ở mặt ngửa (dùng được) hoặc úp (exhausted). Hầu hết hành động đều phải exhaust một item ngửa chưa hỏng (lật úp).
- **I. Item Tracks:** trà, tiền và túi khi ngửa trong Satchel thì chuyển lên track tương ứng nếu còn chỗ (tối đa 3). Item trên track bị lật úp thì chuyển về Satchel.
- **II. The Satchel:** khi nhận được, giày, kiếm, nỏ, đuốc và búa vào Satchel ở mặt ngửa.
- Engine: track chỉ chứa item ngửa, `tracks.tea/coin/bag` là số đếm. Exhaust item trên track thì giảm đếm và thêm item úp vào Satchel.

### ROOT-9.2.6 Maximum Rolled Hits
- Trong battle, giới hạn rolled hit của Vagabond bằng **số kiếm chưa hỏng trong Satchel**, ngửa hay úp đều tính.

### ROOT-9.2.7 Taking Hits
- Mỗi hit buộc Vagabond damage một item chưa hỏng (chuyển sang Damaged), Vagabond chọn item. Hết item chưa hỏng thì bỏ qua các hit còn lại.
- Item trên track bị damage thì cũng chuyển sang Damaged.

### ROOT-9.2.8 Dominance Cards and Coalitions
- Vagabond không kích hoạt dominance để thắng theo cách thường.
- Trong trận **từ 4 người**, Vagabond có thể kích hoạt dominance để lập coalition với một người chơi đang có **ít điểm hơn mọi người khác** (không tính Vagabond) và chưa ở trong coalition nào. Hòa điểm thấp nhất thì Vagabond chọn một trong số đó.
- Kết quả: `score.vagabond = null`, `coalition = <faction>`. Người đó thắng thì Vagabond cũng thắng.
- Hai bên coalition không còn là kẻ địch của nhau (G.8) và không battle nhau (FAQ §4.3/§9.2.8).
- Không lập coalition với người đã kích hoạt dominance, vì họ không còn score marker. Người đã ở trong coalition vẫn kích hoạt dominance được (FAQ §9.2.8).
- Test: trận 3 người thì không lập được coalition. Chọn người không có điểm thấp nhất là không hợp lệ.

### ROOT-9.2.9 Relationships
- Bảng quan hệ có một marker cho mỗi phe không phải Vagabond, ở một trong các ô: Indifferent (0), 1, 2, Allied (3), hoặc ô Hostile.
- **I. Improving Relationships:** cải thiện quan hệ với phe không Hostile bằng Aid.
  - **a. Cost:** cần Aid phe đó `aidToAdvance[level]` lần **trong cùng một lượt**. Mỗi lần Aid chỉ tính cho một lần lên bậc.
  - **b. Effect:** marker tiến một ô, ghi `advancePoints[level]` điểm.
- **II. Allied Status:** marker tới ô cuối thì Vagabond Allied với phe đó.
  - **a. Aiding Ally:** mỗi lần Aid phe Allied được 2 điểm.
  - **b. Moving with Ally:** khi move, Vagabond có thể buộc chiến binh của **một** phe Allied đi cùng tới clearing đích. Không áp dụng khi Vagabond move một mình theo hiệu ứng đặc biệt. Đi vào clearing sympathetic theo cách này không gây Outrage (decisions/0004, OQ-16).
  - **c. Attacking with Ally:** khi bắt đầu battle với tư cách attacker, có thể coi chiến binh của một phe Allied trong clearing là của mình. Giới hạn rolled hit = số chiến binh của họ + số kiếm chưa hỏng. Không dùng được khi đánh chính phe Allied đó.
  - **d. Taking Hits with Ally:** trong battle có dùng chiến binh Allied, Vagabond có thể chịu hit bằng cách remove chiến binh đó. Nếu số hit chịu bằng chiến binh Allied **nhiều hơn** số hit chịu bằng item thì phe đó thành Hostile khi battle kết thúc. Luật này thay cho điều kiện ở mục III.
- **III. Hostile Status:** Vagabond remove một chiến binh của phe không Hostile thì marker phe đó vào ô Hostile. Nếu chuyện này xảy ra trong battle ở lượt Vagabond thì kiểm tra Infamy.
  - **a. Infamy:** mỗi quân của phe Hostile bị Vagabond remove trong battle ở lượt mình được thêm 1 điểm, trừ chiến binh vừa làm phe đó thành Hostile. Cộng dồn với điểm building và token.
  - **b. Moving into Hostile Clearings:** move vào clearing có chiến binh của bất kỳ phe Hostile nào phải exhaust thêm 1 giày, kể cả khi bị buộc di chuyển.
  - **c. Aiding Hostile Factions:** Aid không đưa marker ra khỏi ô Hostile, nhưng vẫn Aid được để lấy item.
  - **d. Coalition with Hostile Faction:** lập coalition với phe Hostile thì đưa marker của họ về Indifferent.
- Test:
  - Aid Marquise 1 lần: Indifferent → 1, +1 điểm.
  - Cùng lượt Aid thêm 2 lần: lên 2, +2 điểm.
  - Strike chiến binh Eyrie: Eyrie Hostile. Battle với Eyrie Hostile remove 2 chiến binh: +2 điểm infamy.

### ROOT-9.2.10 Forest Movement
- Chỉ Slip (§9.4.2) cho phép đi vào hoặc ra khỏi rừng tùy ý. Move thường chỉ cho đi từ rừng ra một clearing kề, không vào rừng.

### ROOT-9.3 Faction Setup
Thứ tự setup D.

### ROOT-9.3.1 Step 1: Choose Character
- Chọn Thief, Tinker hoặc Ranger.

### ROOT-9.3.2 Step 2: Place Pawn
- Đặt pawn ở một khu rừng bất kỳ (`pawn = { kind: 'forest', id }`).

### ROOT-9.3.3 Step 3: Get Quests
- Xáo deck quest, rút 3 quest đặt ngửa.

### ROOT-9.3.4 Step 4: Populate Ruins
- Lấy 4 ruin khỏi bản đồ cùng các item "R" (túi, giày, búa, kiếm). Đặt mỗi item dưới một ruin, xáo các ruin, rồi đặt lại vào các slot ruin. Engine: hoán vị ngẫu nhiên bằng RNG server; item dưới ruin là ẩn.

### ROOT-9.3.5 Step 5: Take Starting Items
- Lấy item "S" ghi trên nhân vật (`VAGABOND.characters`). Trà, tiền, túi lên track, mặt ngửa; còn lại vào Satchel, mặt ngửa.

### ROOT-9.3.6 Step 6: Set Relationships
- Mọi phe không phải Vagabond bắt đầu ở Indifferent (0).

### ROOT-9.4 Birdsong
Hai bước theo thứ tự.

### ROOT-9.4.1 Refresh
- Lật ngửa 2 item exhausted cho mỗi trà ngửa trên track. Trà được lật ngửa trong bước này không tính. Sau đó lật thêm 3 item. Vagabond chọn item.
- Item trong ô Damaged **không** được Refresh; phải Repair trước (decisions/0004, OQ-17).

### ROOT-9.4.2 Slip
- Có thể đi sang một clearing hoặc rừng kề mà **không** exhaust giày, kể cả vào clearing Hostile. Bỏ qua mọi hiệu ứng ngăn rời clearing.

### ROOT-9.5 Daylight
- Exhaust item để làm các hành động dưới đây, thứ tự và số lần tùy ý. Exhaust trà, tiền hay túi trên track thì chuyển item đó về Satchel.

### ROOT-9.5.1 Move
- Exhaust 1 giày để move; thêm 1 giày nếu clearing đích có chiến binh Hostile. Không đi vào rừng được; nếu đang ở rừng thì chỉ đi ra một clearing kề.

### ROOT-9.5.2 Battle
- Exhaust 1 kiếm để mở battle. Remove chiến binh có thể làm phe đó Hostile (§9.2.9.III).

### ROOT-9.5.3 Explore
- Exhaust 1 đuốc để lấy 1 item dưới ruin ở clearing mình đang đứng. Reveal item, đặt ngửa vào Satchel hoặc track, được 1 điểm.
- Lấy item cuối cùng của ruin thì remove ruin; slot đó trở thành slot trống (§2.2.4).

### ROOT-9.5.4 Aid
- Exhaust 1 item bất kỳ và đưa một lá khớp suit clearing cho một người chơi có quân phe ở đó (kể cả Hostile). Sau đó có thể lấy 1 item trong Crafted Items của họ, đặt ngửa vào Satchel hoặc track. Rồi cập nhật quan hệ (§9.2.9).
- Test: Aid Marquise có hammer trong Crafted Items thì lấy được hammer. Đang ở rừng thì không Aid được.

### ROOT-9.5.5 Quest
- Chọn một quest đang ngửa khớp suit clearing. Exhaust hai item ghi trên quest, đặt quest vào play area làm quest đã hoàn thành.
- Chọn **một** phần thưởng: được 1 điểm cho mỗi quest đã hoàn thành cùng suit (tính cả quest này), **hoặc** rút 2 lá.
- Rút một quest mới đặt ngửa.

### ROOT-9.5.6 Strike
- Exhaust 1 nỏ để remove 1 chiến binh địch ở clearing mình. Nếu phe đó không có chiến binh ở đây thì được remove 1 quân phe khác của họ ở đây. Cập nhật quan hệ.
- Strike không phải battle, nên không có Infamy và các hiệu ứng "in battle" không áp dụng. Phe bị remove chiến binh vẫn thành Hostile (§9.2.9.III).

### ROOT-9.5.7 Repair
- Exhaust 1 búa để chuyển 1 item bị damage về Satchel, giữ nguyên mặt hiện tại. Trà, tiền, túi ngửa thì lên track ngay.

### ROOT-9.5.8 Craft
- Chế tạo một lá bằng cách exhaust 1 búa cho mỗi biểu tượng chi phí. Clearing của Vagabond phải khớp **mọi** biểu tượng (biểu tượng `any` luôn khớp). Item chế tạo được đặt vào Satchel hoặc track.
- Test: lá giá fox+fox ở clearing fox với 2 búa: hợp lệ. Lá giá rabbit+fox: không bao giờ hợp lệ.

### ROOT-9.5.9 Special Action
- Exhaust các item ghi trên thẻ nhân vật để làm hành động đặc biệt (§V.x.2).

### ROOT-9.6 Evening
Bốn bước theo thứ tự.

### ROOT-9.6.1 Rest
- Nếu đang ở trong rừng: mọi item bị damage về Satchel và lật ngửa. Trà, tiền, túi lên track ngay.

### ROOT-9.6.2 Draw Cards
- Rút 1 lá, cộng 1 cho mỗi tiền ngửa trên track.

### ROOT-9.6.3 Discard Cards
- Có hơn 5 lá thì bỏ bớt về 5.

### ROOT-9.6.4 Check Item Capacity
- Giới hạn item = 6 + 2 × số túi ngửa trên track. Nếu tổng item trong Satchel và Damaged vượt giới hạn thì loại vĩnh viễn item trong Satchel và Damaged (Vagabond chọn) cho tới khi bằng giới hạn. Item trên track không tính.

### ROOT-9.7 Playing with Two Vagabonds
Cần Riverfolk Expansion, **ngoài phạm vi** base. 9.7.1–9.7.3 không triển khai ở bản 1.0.

### ROOT-9.7.1 Setup
- Ngoài phạm vi (cần item "R" của Riverfolk).

### ROOT-9.7.2 Share Quests
- Ngoài phạm vi.

### ROOT-9.7.3 Taking Items from Ruins
- Ngoài phạm vi. Base game mỗi ruin chỉ có một item.

## Nhân vật (App. V)

### ROOT-V.1 Thief
### ROOT-V.1.1 Starting Items
- Giày, đuốc, trà, kiếm.
### ROOT-V.1.2 Special Action
- **Steal:** exhaust 1 đuốc để lấy ngẫu nhiên 1 lá từ một người chơi có quân phe ở clearing mình.

### ROOT-V.2 Tinker
### ROOT-V.2.1 Starting Items
- Giày, đuốc, túi, búa.
### ROOT-V.2.2 Special Action
- **Day Labor:** exhaust 1 đuốc để lấy một lá trong chồng bài bỏ khớp suit clearing mình. Luôn lấy được lá bird.

### ROOT-V.3 Ranger
### ROOT-V.3.1 Starting Items
- Giày, đuốc, nỏ, kiếm.
### ROOT-V.3.2 Special Action
- **Hideout:** exhaust 1 đuốc để repair 3 item. Sau đó kết thúc Daylight ngay và sang Evening.
