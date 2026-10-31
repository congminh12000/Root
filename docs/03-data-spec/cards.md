# Bộ bài và quest

Dữ liệu chuẩn:
- [`base-deck.ts`](../../packages/game-data/src/cards/base-deck.ts): 42 mẫu bài, tổng 54 lá.
- [`quests.ts`](../../packages/game-data/src/cards/quests.ts): 15 quest.

Nguồn là Leder Card Library (SRC-005). Suit, chi phí chế tạo, item, điểm và yêu cầu quest được đọc từ ảnh từng lá. Văn bản hiệu ứng chỉ để tham khảo; hành vi được viết riêng trong engine theo điều khoản luật.

## Phân bố

| Suit | Số lá | Gồm |
|---|---|---|
| Bird | 14 | Ambush ×2, Armorers ×2, Arms Trader, Birdy Bindle, Brutal Tactics ×2, Crossbow, Dominance, Royal Claim, Sappers ×2, Woodland Runners |
| Fox | 14 | Ambush, Anvil, Dominance, Favor of the Foxes, Foxfolk Steel, Gently Used Knapsack, Protection Racket, Root Tea, Stand and Deliver! ×2, Tax Collector ×3, Travel Gear |
| Rabbit | 13 | Ambush, A Visit to Friends, Bake Sale, Better Burrow Bank ×2, Cobbler ×2, Command Warren ×2, Dominance, Favor of the Rabbits, Root Tea, Smuggler's Trail |
| Mouse | 13 | Ambush, Codebreakers ×2, Crossbow, Dominance, Favor of the Mice, Investments, Mouse-in-a-Sack, Root Tea, Scouting Party ×2, Sword, Travel Gear |

**Số bản sao chưa được kiểm chứng đầy đủ (OQ-04).** Chỉ có hai nguồn chính thức:
- Law quy định số lá ambush và dominance.
- Walking Through Root chia hai lá Brutal Tactics.

Các số ×2 và ×3 còn lại cộng đúng 54 lá, nhưng cần đếm lại từ bộ bài thật. Mỗi mẫu có trường `copiesEvidence` ghi nguồn của số bản sao.

## Quy ước

- `cost` có một phần tử cho mỗi biểu tượng chế tạo (§4.1.1); `'any'` là dấu hỏi ba màu (Royal Claim).
- `kind` nhận một trong các giá trị:
  - `ambush`, `dominance`: không chế tạo được.
  - `item`: nhận item và điểm, rồi bỏ lá.
  - `immediate`: các lá Favor.
  - `persistent`: đặt vào play area.
- Mỗi lá vật lý có ID `${id}#${n}` (vd. `tax-collector#2`), tạo lúc setup.
