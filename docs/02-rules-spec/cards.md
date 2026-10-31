# Bài (Law 2.1 và hiệu ứng từng lá)

Dữ liệu từng lá ở [03-data-spec/cards.md](../03-data-spec/cards.md).

### ROOT-2.1 Cards
- Rút từ trên cùng deck chung, bỏ vào chồng bài bỏ chung.
- Khi deck hết, xáo chồng bài bỏ **ngay lập tức** thành deck mới. Xáo bằng RNG của server, kết quả ghi vào event log.
- Mỗi lá có một suit: bird, fox, rabbit hoặc mouse. Phần lớn chế tạo được (§4.1).
- Test: rút khi deck rỗng và discard có 5 lá thì xáo rồi rút. Deck và discard đều rỗng thì rút 0 lá (§1.5.4: làm tối đa có thể).

### ROOT-2.1.1 Birds Are Wild
- Lá bird được coi như lá của suit khác, kể cả khi phải spend, take hay give nhiều lá cùng suit.
- **I. Forced Effects:** khi bị buộc discard hoặc give lá non-bird của một suit, lá bird trên tay phải được tính là lá của suit đó. Ví dụ Outrage: có lá bird thì phải đưa (§8.2.6).
- **II. Reverse Substitution:** khi luật đòi đúng lá bird (spend, discard, take hay give), không được dùng lá suit khác thay.
- Engine: `matches(card, suit) = card.suit === suit || card.suit === 'bird'`. Yêu cầu "bird" thì chỉ chấp nhận lá bird.
- Test: dùng lá bird trả chi phí fox được. Eyrie thêm hai lá vào Decree thì không được cả hai là bird (§7.4.2), vì bird không tính là suit khác ở đây.

### ROOT-2.1.2 Ambush Cards
- Có 5 lá: mỗi suit một lá, cộng 2 lá bird. Không chế tạo được. Chỉ dùng trong battle (§4.3.1).
- Ambush bird dùng được ở clearing suit nào cũng được (birds are wild).

### ROOT-2.1.3 Dominance Cards
- Có 4 lá, mỗi suit một lá. Không chế tạo được. Dùng để đổi điều kiện thắng (§3.3).

### ROOT-2.1.4 Your Play Area
- Dominance đã kích hoạt, lá persistent đã chế tạo và lá đã reveal nằm trong play area.
- Các lá này không thuộc tay, nên không tính vào giới hạn 5 lá. Chúng chỉ được spend hay discard khi luật chỉ định.

## Hiệu ứng lá trong bộ bài cơ bản

Lá item: chế tạo xong thì lấy item từ item supply cho vào Crafted Items, ghi điểm in trên lá (Eyrie chỉ 1 điểm, §7.2.3), rồi bỏ lá (§4.1.2). Không còn item đó trong supply thì không chế tạo được.

Lá không phải item: hành vi lấy từ văn bản in trên lá (Card Library). Thời điểm và cách dùng như dưới đây.

| Lá | Loại | Thời điểm | Hành vi |
|---|---|---|---|
| Ambush! | ambush | Battle bước 1 | §4.3.1 |
| Dominance | dominance | Daylight của mình | §3.3 |
| Armorers | persistent | Trong battle, khi bị trúng đòn | Bỏ lá này để bỏ qua toàn bộ rolled hits mình phải nhận; extra hit vẫn tính |
| Brutal Tactics | persistent | Battle khi là attacker, sau khi roll (§4.3.4) | Có thể gây thêm 1 hit; khi đó defender được 1 điểm |
| Sappers | persistent | Battle khi là defender, sau khi roll | Bỏ lá này để gây thêm 1 hit |
| Scouting Party | persistent | Battle khi là attacker | Ambush của defender không gây hit cho mình. Defender vẫn được chơi lá và lá vẫn bị bỏ (decisions/0004) |
| Better Burrow Bank | persistent | Đầu Birdsong | Có thể rút 1 lá; nếu rút thì chọn một kẻ địch cũng rút 1 lá |
| Command Warren | persistent | Đầu Daylight | Có thể mở một battle |
| Cobbler | persistent | Đầu Evening | Có thể move một lần |
| Codebreakers | persistent | Một lần trong Daylight | Xem bài trên tay một người chơi khác |
| Royal Claim | persistent | Trong Birdsong | Bỏ lá này để được 1 điểm cho mỗi clearing mình rule |
| Stand and Deliver! | persistent | Một lần trong Birdsong | Có thể lấy ngẫu nhiên 1 lá từ một kẻ địch; người đó được 1 điểm |
| Tax Collector | persistent | Một lần trong Daylight | Remove 1 chiến binh của mình khỏi một clearing trên bản đồ để rút 1 lá |
| Favor of the Foxes / Mice / Rabbits | immediate | Khi chế tạo | Remove mọi quân địch ở mọi clearing suit đó, rồi bỏ lá. Mỗi building hoặc token bị remove được 1 điểm (§3.2.1) |

- Mỗi lá persistent có giới hạn sử dụng riêng ("once in …"). Engine theo dõi theo instance lá trong play area, đặt lại khi qua phase hoặc lượt.
- Hiệu ứng "at start of …" của lá chạy ở đầu phase tương ứng (§1.4.1). Nếu có nhiều thì người tới lượt chọn thứ tự (§1.1.3).
- Favor gặp pawn Vagabond: pawn không bị remove, thay vào đó Vagabond damage 3 item (§9.2.2.I).
