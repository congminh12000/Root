# Marquise de Cat (Law chương 6)

Số liệu board ở `MARQUISE` ([factions.md](../../03-data-spec/factions.md)).

### ROOT-6.1 Overview
Không có hành vi engine. Marquise ghi điểm khi xây; phải giữ được mạng lưới gỗ liên thông.

### ROOT-6.2 Faction Rules and Abilities
Nhóm 6.2.1–6.2.3.

### ROOT-6.2.1 Crafting
- Crafting piece là workshop. Chế tạo trong Daylight (bước `craft`, trước các hành động).

### ROOT-6.2.2 The Keep
- **Chỉ Marquise được place quân** vào clearing có keep. Người khác không place được, nhưng vẫn **move** quân vào được.
- Keep bị remove thì không bao giờ đặt lại. Keep là token: kẻ địch remove được và được 1 điểm.
- Test:
  - Eyrie không đặt roost được ở clearing có keep.
  - Eyrie vẫn move vào được.
  - Không Revolt được ở clearing có keep: Revolt cần clearing sympathetic, mà Alliance không place được sympathy ở đó (FAQ chính thức §6.2.2/§8.4.1).
  - Spread Sympathy và Organize không chọn được clearing có keep.

### ROOT-6.2.3 Field Hospitals
- **Khi nào:** bất cứ khi nào một số chiến binh Marquise bị remove khỏi một clearing, vì bất kỳ lý do gì và trong lượt của bất kỳ ai.
- **Quyết định:** Marquise có thể spend **một** lá khớp suit clearing đó (bird được tính) để đặt toàn bộ số chiến binh vừa mất vào clearing có keep, thay vì trả về supply. PendingDecision `field-hospital { clearing, warriors }`.
- Không có keep trên bản đồ thì không dùng được.
- Áp dụng cho từng clearing: một lần remove ở một clearing tạo một quyết định.
- Remove do chính Marquise tự làm (Tax Collector) cũng kích hoạt, vì luật ghi "whenever any number of Marquise warriors are removed".
- Test:
  - Mất 3 chiến binh ở clearing fox, spend 1 lá fox: 3 chiến binh xuất hiện ở keep.
  - Không có lá khớp suit thì không được hỏi.
  - Keep đã mất thì không được hỏi.

### ROOT-6.3 Faction Setup
Thứ tự setup A.

### ROOT-6.3.1 Step 1: Gather Warriors and Wood
- Supply: 25 chiến binh, 8 wood.

### ROOT-6.3.2 Step 2: Place Keep
- Marquise chọn một clearing góc và đặt keep ở đó; đây là clearing xuất phát.

### ROOT-6.3.3 Step 3: Garrison
- Đặt 1 chiến binh ở **mọi** clearing, trừ clearing góc đối diện chéo với keep. Autumn: 11 chiến binh.

### ROOT-6.3.4 Step 4: Place Starting Buildings
- Đặt 1 sawmill, 1 workshop và 1 recruiter. Mỗi cái đặt ở clearing có keep hoặc một clearing kề, kết hợp tùy ý, miễn còn slot trống.
- Test: đặt cả ba ở clearing 1 (1 slot) là không hợp lệ.

### ROOT-6.3.5 Step 5: Fill Buildings Tracks
- 5 công trình còn lại mỗi loại nằm trên track, ô 0 để trống. Trạng thái: `buildingsOnTrack = { sawmill: 5, workshop: 5, recruiter: 5 }`.

### ROOT-6.4 Birdsong
- Đặt 1 wood ở mỗi clearing có sawmill, mỗi sawmill một wood. Hết wood trong supply thì đặt tối đa có thể (§1.5.4). Nếu không đủ thì Marquise chọn nơi đặt (Law không quy định thứ tự; theo §1.1.3, người tới lượt là Marquise chọn).

### ROOT-6.5 Daylight
- Trước tiên có thể chế tạo bằng workshop. Sau đó được tối đa **3 hành động**, cộng thêm 1 hành động cho mỗi **lá bird** spend (spend riêng, không phải trong một hành động). Thứ tự và số lần của các hành động tùy ý, trừ Recruit.
- Trạng thái: `actionsRemaining`.

### ROOT-6.5.1 Battle
- Mở một battle (§4.3).

### ROOT-6.5.2 March
- Thực hiện tối đa 2 move (§4.2), tính là một hành động. Không được chen hiệu ứng vào giữa hai move (§1.4.2).

### ROOT-6.5.3 Recruit
- Đặt 1 chiến binh ở mỗi recruiter. **Một lần mỗi lượt** (`recruitedThisTurn`).
- Không đủ chiến binh thì đặt tối đa có thể; Marquise chọn recruiter nào nhận.

### ROOT-6.5.4 Build
- **I.** Chọn một clearing mình rule và loại công trình. Lấy công trình ngoài cùng bên trái của track đó. Phải trả được chi phí **và** place được (còn slot trống).
- **II.** Chi phí là `woodCost[n]`, với n là số công trình loại đó đã có trên bản đồ. Remove số wood đó từ clearing được chọn và từ bất kỳ clearing nào **liên thông với nó qua các clearing Marquise rule** (kể cả kề trực tiếp).
- **III.** Đặt công trình và ghi `points[loại][n]` điểm.
- Engine: tìm wood bằng BFS từ clearing đích qua các clearing Marquise rule. Marquise chọn cụ thể lấy wood ở đâu.
- Test:
  - Chi phí 2 với wood ở clearing kề mình rule: hợp lệ.
  - Wood nằm sau một clearing mình không rule: không dùng được.
  - Track đã hết công trình loại đó: không hợp lệ.

### ROOT-6.5.5 Overwork
- Spend một lá khớp suit clearing của một sawmill để đặt 1 wood ở đó.
- Test: hết wood trong supply thì không Overwork được.

### ROOT-6.6 Evening
- Rút 1 lá, cộng 1 cho mỗi draw bonus đã mở (recruiter ô 2 và ô 4). Sau đó nếu có hơn 5 lá thì bỏ bớt về 5 (người chơi chọn lá).
