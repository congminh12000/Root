# Di chuyển (Law 4.2)

### ROOT-4.2 Move
- Một move: lấy **ít nhất 1** chiến binh và/hoặc pawn của mình từ **một** clearing, đi theo path sang **một** clearing kề.
- Command `move { from, to, warriors, withPawn? }`.
- Ngoại lệ:
  - Vagabond đi vào và ra khỏi rừng (§9.2.10).
  - Bước vào clearing sympathy kích hoạt Outrage (§8.2.6).
  - Vagabond có thể kéo theo chiến binh Allied (§9.2.9.II.b).
- Test: move 0 chiến binh là không hợp lệ. Move sang clearing không kề là không hợp lệ.

### ROOT-4.2.1 You Must Rule
- Phải rule clearing đi, clearing đến, hoặc cả hai, tính **trước** khi di chuyển.
- Ngoại lệ: Vagabond (Nimble §9.2.3); Eyrie tính rule theo Lords of the Forest (§7.2.2).
- Test: Marquise ở clearing hòa, đi sang clearing không ai rule là không hợp lệ. Đi sang clearing mình rule thì hợp lệ.

### ROOT-4.2.2 No Movement Limits
- Một quân có thể di chuyển nhiều lần trong một lượt. Khi được nhiều move (March), các move có thể dùng cùng một nhóm hoặc nhóm khác nhau.
- Test: March đưa cùng một chiến binh đi hai bước liên tiếp.
