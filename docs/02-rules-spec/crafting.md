# Chế tạo (Law 4.1)

### ROOT-4.1 Craft
- Chế tạo một lá trên tay để nhận hiệu ứng immediate hoặc persistent. Lá ambush và dominance không chế tạo được (§2.1.2, §2.1.3).
- Mỗi phe có thời điểm và loại "crafting piece" riêng:

| Phe | Crafting piece | Thời điểm | Điều khoản |
|---|---|---|---|
| Marquise | workshop | Daylight, trước các hành động | §6.2.1, §6.5 |
| Eyrie | roost | Daylight, trước khi giải quyết Decree | §7.2.1, §7.5.1 |
| Alliance | sympathy token | Daylight, xen kẽ tùy ý | §8.2.1, §8.5.1 |
| Vagabond | hammer đã exhaust | Daylight, hành động Craft | §9.2.1, §9.5.8 |

### ROOT-4.1.1 Cost
- Chi phí gồm các biểu tượng suit ở góc dưới trái lá (`cost`). Mỗi biểu tượng cần kích hoạt một crafting piece nằm ở clearing **cùng suit**. Biểu tượng `any` nhận clearing suit nào cũng được.
- Mỗi crafting piece chỉ được kích hoạt **một lần mỗi lượt**. Trạng thái ghi trong `GameState.craftingUsed`; dọn khi hết lượt.
- Engine: tìm phép ghép giữa các biểu tượng và các crafting piece chưa dùng (bài toán matching). Người chơi chọn cụ thể piece nào; nếu không chọn thì engine kiểm tra xem có tồn tại phép ghép không.
- Vagabond không theo luật một-lần-mỗi-lượt (§9.2.1, §9.5.8).
- Test:
  - Hai workshop ở clearing fox chế tạo được lá giá fox+fox.
  - Một workshop không chế tạo được lá giá hai biểu tượng.
  - Workshop đã dùng trong lượt thì không dùng lại được.

### ROOT-4.1.2 Immediate Effects
- Giải quyết hiệu ứng rồi bỏ lá.
- Nếu là item: lấy item từ item supply cho vào Crafted Items của mình, rồi ghi điểm (§3.2.2). Item không còn trong supply thì **không chế tạo được** (kiểm tra trước khi trả chi phí).
- Vagabond: item chế tạo được đặt ngửa vào Satchel hoặc track (§9.2.1).
- Test: chế tạo Anvil khi supply hết hammer là không hợp lệ.

### ROOT-4.1.3 Persistent Effects
- Đặt lá vào play area; hiệu ứng có tác dụng từ lúc đó.

### ROOT-4.1.4 No Duplicates
- Không chế tạo được lá persistent nếu play area đã có một lá **giống hệt** (cùng `CardDef.id`).
- Test: có Cobbler rồi thì không chế tạo Cobbler thứ hai. Có Armorers vẫn chế tạo được Sappers.
