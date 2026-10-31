# Golden Rules (Law chương 1)

### ROOT-1.1 Rules Conflicts
Nhóm 1.1.1–1.1.3. Thứ tự ưu tiên giữa các nguồn nằm ở [rule-precedence.md](../00-governance/rule-precedence.md).

### ROOT-1.1.1 Precedence
- Lá bài thắng Law. Law thắng Learning to Play. Luật chung và luật phe cùng áp dụng được thì theo cả hai; nếu mâu thuẫn thì theo luật phe.
- Engine: hiệu ứng lá bài và năng lực phe là các hook chạy **sau** kiểm tra chung, được phép ghi đè đúng chỗ chúng nói (vd. Lords of the Forest đổi cách tính rule, Nimble bỏ yêu cầu rule khi di chuyển).
- Test: Eyrie hòa quân vẫn rule clearing (luật phe thắng §2.5); Vagabond di chuyển giữa hai clearing không ai rule.

### ROOT-1.1.2 Use of Cannot
- Mọi chỗ Law ghi *cannot* là ràng buộc cứng trong `legalActions`. Chỉ bị bỏ qua khi một hiệu ứng ghi rõ điều đó.
- Test: không place được quân vào clearing có keep của người khác (§6.2.2), kể cả qua hiệu ứng lá bài.

### ROOT-1.1.3 Unclear Resolutions and Choices
- Khi nhiều hiệu ứng xảy ra cùng lúc mà thứ tự không rõ, hoặc không rõ ai quyết định, thì **người đang tới lượt** chọn.
- Engine: tạo PendingDecision `order-effects` cho người tới lượt khi có ≥ 2 hiệu ứng đồng thời chưa có quy định thứ tự.
- Test: hai hiệu ứng "at start of Birdsong" (vd. Better Burrow Bank và một hiệu ứng khác) thì người tới lượt chọn thứ tự.

### ROOT-1.2 Public and Private Information
Nhóm 1.2.1–1.2.2. Ánh xạ sang `PlayerView` ở [game-state.md](../04-engine-spec/game-state.md).

### ROOT-1.2.1 Hands
- Bài trên tay là bí mật; **số lá** là công khai. Chỉ được show hay reveal khi luật chỉ định (vd. Outrage §8.2.6, Codebreakers).
- Test: view của người khác chỉ có `handCounts`, không có nội dung.

### ROOT-1.2.2 Piles and the Shared Deck
- Chồng bài bỏ (và mọi chồng ngửa) ai cũng xem được. Deck chung không ai xem được.
- Test: view có toàn bộ `discard`, chỉ có `deckCount`.

### ROOT-1.3 Negotiation, Deals, and Consent
Nhóm 1.3.1–1.3.3.

### ROOT-1.3.1 Agreements
- Người chơi được trao đổi và thỏa thuận, nhưng thỏa thuận không ràng buộc. Không có hành vi engine. Phần chat thuộc lớp multiplayer.

### ROOT-1.3.2 Cards
- Chỉ được đưa bài cho người khác khi luật chỉ định (Aid §9.5.4, Outrage §8.2.6). Không có command "tặng bài" tự do.
- Test: không tồn tại hành động hợp lệ nào chuyển bài giữa hai người ngoài các trường hợp được chỉ định.

### ROOT-1.3.3 Consent
- Hành động không bao giờ cần người khác đồng ý. Engine không hỏi bên bị tác động, trừ các quyết định luật trao cho họ (vd. chọn quân mất khi trúng đòn §4.3.6).

### ROOT-1.4 Game Structure
Nhóm 1.4.1–1.4.3.

### ROOT-1.4.1 Turn Structure
- Mỗi lượt có ba phase theo thứ tự Birdsong → Daylight → Evening.
- Hiệu ứng "at start of <phase>" chạy trước mọi thứ khác trong phase; "at end of <phase>" chạy sau mọi thứ khác và trước phase kế tiếp.
- Hết Evening thì chuyển cho người kế tiếp theo chiều kim đồng hồ (`seats` theo thứ tự). Lặp lại cho tới khi có người thắng (§3.1).
- Chi tiết các bước ở [turn-flow.md](turn-flow.md).
- Test: thứ tự lượt khớp `seats`; hiệu ứng start-of-Daylight chạy trước hành động đầu tiên của Daylight.

### ROOT-1.4.2 Interrupts
- Không được chen hiệu ứng vào giữa một hành động (kể cả hành động gộp như March), một năng lực hay một hiệu ứng persistent, trừ khi hiệu ứng ghi rõ (vd. lá có chữ "In battle…").
- Engine: một command được giải quyết trọn; trong lúc đó chỉ mở các PendingDecision mà luật cho phép. Danh sách ở [timing-interrupts.md](timing-interrupts.md).
- Test: giữa hai lần move của March không được craft hay dùng lá persistent.

### ROOT-1.4.3 End of Turn
- Khi người chơi đã bắt đầu bước cuối của lượt, họ chỉ còn được làm những hành động ghi "end of Evening" hoặc "end of turn". Base game không có hiệu ứng nào như vậy, nên engine chặn mọi hành động sau bước cuối.
- Test: sau khi bắt đầu bước discard cuối Evening, không còn hành động nào ngoài discard.

### ROOT-1.5 Pieces
Nhóm 1.5.1–1.5.5.

### ROOT-1.5.1 Limits
- Số quân giới hạn theo hộp game (`game-data` factions và §C.1). Không có quân thay thế. Hết quân thì không place thêm được.
- Test: Marquise còn 0 chiến binh trong supply thì Recruit không place gì.

### ROOT-1.5.2 Starting Faction
- Mỗi người sở hữu phe đã chọn và các quân in ở mặt sau board của phe đó, trừ item. "Quân của phe X" chỉ đúng các quân này.

### ROOT-1.5.3 Piece Ownership
- Không bao giờ đổi chủ của một quân phe.
- Test: quân Alliance không được tính là quân Marquise cho Field Hospitals.

### ROOT-1.5.4 Piece Manipulation
- Place, remove, take theo Glossary (G.20, G.24). Nếu không làm được đủ số quân được yêu cầu thì **phải** làm số lớn nhất có thể. Không được dùng điều này để né chi phí hay điều kiện tiên quyết.
- Nếu nhiều quân bị remove cùng lúc và việc đó kích hoạt hiệu ứng, thì remove hết quân trước, rồi mới kích hoạt các hiệu ứng.
- Test: Recruit khi supply còn ít hơn số recruiter thì place hết số còn lại. Revolt remove nhiều quân cùng lúc thì ghi điểm và Field Hospital chỉ chạy sau khi đã remove hết.

### ROOT-1.5.5 Use of Force
- Khi một hiệu ứng buộc người khác hành động, engine giải quyết như thể chính người đó tự chọn, trong giới hạn hiệu ứng. Năng lực của họ vẫn áp dụng. Ví dụ: Eyrie bị buộc di chuyển vẫn có Lords of the Forest.
- Bị buộc vào battle thì họ vẫn tự ra mọi quyết định trong battle.
- Base game: Vagabond buộc chiến binh Allied đi cùng (§9.2.9.II.b). Ngoại lệ: việc này không gây Outrage (decisions/0004, OQ-16).
