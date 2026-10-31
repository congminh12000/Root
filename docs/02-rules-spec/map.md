# Bản đồ và quyền kiểm soát (Law 2.2–2.5, M.1)

Dữ liệu bản đồ Autumn ở [03-data-spec/autumn.md](../03-data-spec/autumn.md).

### ROOT-2.2 Clearings and Paths
Bản đồ gồm các clearing nối với nhau bằng path. Nhóm 2.2.1–2.2.4.

### ROOT-2.2.1 Adjacency
- Hai clearing kề nhau khi và chỉ khi có một path trong `MapDef.paths` nối chúng. Sông không tính (§2.3).
- Test: clearing 1 kề 2, 4, 5 và không kề 6.

### ROOT-2.2.2 Suit
- Mỗi clearing có đúng một suit (fox, rabbit hoặc mouse). Suit dùng cho matching card, crafting và dominance.

### ROOT-2.2.3 Slots
- Mỗi clearing có `slots` ô xây. Mỗi building place lên bản đồ chiếm một ô trống. Clearing hết ô trống thì **không place được building** (rule cannot).
- Token không chiếm slot (Learning to Play tr. 5).
- Test: không Build được ở clearing 1 (1 slot) khi đã có sawmill; place keep token vẫn được dù hết slot.

### ROOT-2.2.4 Ruins
- Các slot có chữ "R" bắt đầu trận với ruin nằm trên đó. Ruin chiếm slot và không thể bị remove, trừ khi luật chỉ định: Vagabond Explore lấy item cuối cùng (§9.5.3).
- Test: Favor of the Foxes không remove ruin; slot ruin trở thành slot trống khi item cuối cùng bị lấy.

### ROOT-2.3 Rivers
- Sông không phải path. Chỉ được coi là path khi hiệu ứng ghi rõ (Riverfolk, nằm ngoài phạm vi). Sông không chia clearing hay khu rừng.
- Engine base: không có dữ liệu sông, không có hành vi.

### ROOT-2.4 Forests
- Khu rừng là vùng được bao bởi path và clearing; trong dữ liệu là `MapDef.forests`.

### ROOT-2.4.1 Adjacency
- Khu rừng kề mọi clearing nằm trên viền của nó (đi tới được mà không băng qua path).
- Hai khu rừng kề nhau khi chỉ cách nhau đúng một path, tức là có chung một cạnh path.
- Test: trên Autumn, rừng R4 (5, 6, 9) kề rừng R2 qua path 5–6 và kề rừng R7 qua path 6–9.

### ROOT-2.5 Rule
- Một người chơi rule một clearing nếu tổng **chiến binh + building** của họ ở đó lớn hơn tổng của từng người khác. Token và pawn không tính. Hòa thì không ai rule.
- Ngoại lệ: Lords of the Forest (§7.2.2). Pawn Vagabond không phải chiến binh (§9.2.2).
- Engine: `ruler(clearing)` trả về một faction hoặc null. Mọi kiểm tra "you rule" đều gọi hàm này.
- Test:
  - Marquise 2 chiến binh; Eyrie 2 chiến binh và 1 roost (3 > 2): Eyrie rule.
  - Marquise 2, Alliance 2, không có Eyrie: không ai rule.
  - Sympathy token không làm tăng tổng.

### ROOT-M.1 Autumn Map
- Bản đồ Autumn không có luật riêng. Engine nạp `AUTUMN` từ `@root/game-data`.
