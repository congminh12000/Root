# Faction board

Dữ liệu chuẩn nằm ở [`packages/game-data/src/factions.ts`](../../packages/game-data/src/factions.ts). Các track được đọc từ hình faction board bản in thứ 3 trong Root Update Kit (SRC-006, tr. 1–8). Số quân, leader và nhân vật lấy từ Law; mặt sau các board in lại đúng các số này.

**Quy ước track:** ô 0 là ô ngoài cùng bên trái. Khi trên bản đồ có n quân một loại, các ô 0 đến n−1 đã được mở.

## Marquise de Cat

| Cột | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Giá gỗ | 0 | 1 | 2 | 3 | 3 | 4 |
| Sawmill | – | +1 | +2 | +3 | +4 | +5 |
| Workshop | – | +2 | +2 | +3 | +4 | +5 |
| Recruiter | – | +1 | +2 🂠 | +3 | +3 🂠 | +4 |

- Ô 0 để trống từ lúc setup (§6.3.5).
- Xây công trình thứ n+1 của một loại tốn `woodCost[n]` gỗ và được `points[loại][n]` điểm (§6.5.4).
- 🂠 là draw bonus: mỗi ô có ký hiệu này đã mở cho rút thêm 1 lá vào Evening (§6.6).
- Quân: 25 chiến binh, 8 gỗ, 1 keep, mỗi loại công trình 6 cái.

## Eyrie Dynasties

| Ô roost | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Điểm | 0 | +1 | +2 🂠 | +3 | +4 | +4 🂠 | +5 |

- Evening ghi điểm của ô trống ngoài cùng bên phải. Nghĩa là có n roost trên bản đồ thì được `roostPoints[n−1]` điểm (§7.6.1).
- Hai vizier bắt đầu ở các cột (§7.8):
  - Builder: Recruit và Move.
  - Charismatic: Recruit và Battle.
  - Commander: Move và Battle.
  - Despot: Move và Build.
- Quân: 20 chiến binh, 7 roost.

## Woodland Alliance

| Ô sympathy | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Supporter phải trả | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 3 |
| Điểm | 0 | +1 | +1 | +1 | +2 | +2 | +3 | +4 | +4 | +4 |

- Martial Law bắt trả thêm 1 supporter (§8.4.2.II.a).
- Ba base (fox, rabbit, mouse), mỗi base trên bản đồ mở 1 draw bonus.
- Khi không có base trên bản đồ, supporter tối đa 5 lá (§8.2.3.I).
- Quân: 10 chiến binh, 10 sympathy.

## Vagabond

| Bậc quan hệ | Indifferent → 1 | 1 → 2 | 2 → Allied |
|---|---|---|---|
| Số lần Aid trong một lượt | 1 | 2 | 3 |
| Điểm khi lên bậc | +1 | +2 | +2 |

- **Allied:** mỗi lần Aid được +2. **Hostile:** mỗi quân Hostile bị loại trong battle ở lượt mình được +1 (infamy).
- Track trà, tiền và túi mỗi loại chứa tối đa 3 item.
- **Refresh** 3 item, cộng 2 cho mỗi trà.
- **Rút** 1 lá, cộng 1 cho mỗi tiền.
- **Giới hạn item** 6, cộng 2 cho mỗi túi.
- **Item dưới ruin:** túi, giày, búa, kiếm.
- **Nhân vật:**

| Nhân vật | Item khởi đầu | Hành động đặc biệt |
|---|---|---|
| Thief | giày, đuốc, trà, kiếm | Steal |
| Tinker | giày, đuốc, túi, búa | Day Labor |
| Ranger | giày, đuốc, nỏ, kiếm | Hideout |
