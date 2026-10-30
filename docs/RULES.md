# Phạm vi luật và khoảng cách với Root

**Ruleset: `grove-experimental-0.2`. Bản dựng này chưa đáp ứng yêu cầu tương đương toàn bộ luật Root.** Bộ kiểm tra chứng minh tính ổn định của phần đã lập trình, không chứng minh tính tương đương với một bộ luật chưa đối chiếu hết.

Nguồn khóa: *Law of Root*, 13 October 2025, trang 1–10, các mục 1–9, từ trang tài nguyên chính thức Leder Games. URL PDF và trang nguồn được ghi trong README. Không dùng luật Clockwork cho các player; chúng chơi theo observation và hành động của bộ mô phỏng.

| Nhóm tham chiếu | Đã có | Khác biệt / việc còn lại |
|---|---|---|
| 1–2: trạng thái, bài, rule | Thông tin ẩn, quân/công trình quyết định rule, ưu tiên Canopy khi hòa, bird wildcard, bài hết được xào lại | Lịch sử observation chưa biểu diễn đầy đủ thông tin từng thẻ đã được tiết lộ |
| 3: chiến thắng | 30 điểm thắng ngay, dominance theo địa hình/góc, coalition của Wayfarer | Phân xử nhiều hiệu ứng đồng thời chưa đối chiếu toàn bộ tổ hợp |
| 4.1: craft | Theo suit và số crafting pieces, giới hạn kích hoạt, vật phẩm hữu hạn, không trùng persistent effect | Bộ bài tự thiết kế; chưa có đầy đủ hiệu ứng bộ bài cơ bản chính thức |
| 4.2: move | Đường nối, số quân tùy chọn, rule ở ít nhất một đầu, ngoại lệ pawn | Bản đồ đường đi/suit/slot dựng theo ảnh bản đồ người dùng cung cấp (`web/src/assets/lowlands.webp`): 12 làng = 12 vùng, đường mòn = đường nối, màu lá = suit (đỏ fox, vàng rabbit, cam mouse), 8 khu rừng = các mặt bị đường mòn bao quanh. Không phải Autumn đã xác minh |
| 4.3: battle | D12 có kết quả 0–3, attacker cao/defender thấp, giới hạn theo quân/sword, defenseless, guerrilla | Ward/Brutal/Sappers của deck thử nghiệm dùng tự động; chưa có toàn bộ lựa chọn trước/sau roll của base deck |
| 4.3: phản ứng | Ambush/foil do player chọn, chủ quân chọn công trình/token bị loại, lựa chọn damage item | Wipe nhiều vùng được giải tuần tự; chưa mô hình hóa mọi lựa chọn thứ tự hiệu ứng đồng thời |
| 5: setup | Một phe mỗi ghế, ba bài ban đầu, garrison/roost/ủng hộ/items, bốn ruins, seed và seating | Vị trí khởi đầu và leader được cố định theo test map; CLI xoay ghế. Chưa có lựa chọn setup/nhân vật đầy đủ |
| 6: Guild | Ba hành động, March hai move, recruit mỗi turn một lần, mạng wood, build track, overwork, bird thêm hành động, draw track, keep, field hospital | Thứ tự phân bổ wood/recruit tự động theo clearing ID khi thiếu supply; chưa cho AI chọn mọi phân bổ |
| 7: Canopy | Thêm một/hai decree tối đa một bird, bốn cột, lựa chọn suit theo cột, turmoil, điểm roost, bốn leader và vizier | New-roost khi không có ô hợp lệ bỏ qua thay vì giải mọi tình huống xung đột |
| 8: Union | Revolt, spread, martial law, mobilize, train, officers, operations, organize, outrage, supporter cap, base loss | Khi mất base, phần bỏ xuống năm supporters chọn tự động thay vì quyết định riêng |
| 9: Wayfarer | Items ready/exhausted/damaged, refresh, slip/forest, repair/rest, explore, aid/quan hệ/hostile, quest, strike, battle, coalition, capacity | Một nhân vật có steal; chưa có ba nhân vật cơ bản để chọn; chưa có allied-warrior move/battle và chia damage với đồng minh |
| Quest/item content | 15 nhiệm vụ gốc, 54 thẻ gốc, finite item supply | Suit/cost/effect/multiplicity không tương đương bộ bài và quest chính thức |

## Quy ước riêng của deck thử nghiệm

Tên thẻ và recipe được tạo trong `content.py`, không dùng thẻ chính thức dưới tên khác rồi tuyên bố đã tương đương. Có 5 ambush, 4 dominance, 21 item recipes và 24 effect recipes.

- `ward`: một lần tự động ngăn toàn bộ hits trong một battle, sau đó bỏ thẻ.
- `brutal`: tự động thêm một hit khi tấn công, defender nhận một điểm.
- `sappers`: tự động thêm một hit khi phòng thủ, sau đó bỏ thẻ.
- `extra_draw`: thêm một bài ở Evening, không bắt AI bỏ một bài.
- `cobbler`: một lựa chọn move miễn phí trước khi kết thúc lượt.
- `tax`: mỗi turn một lần, bỏ một warrior để rút bài.
- `favor`: loại các enemy pieces tại suit tương ứng, pawn nhận ba damage.
- `engraver`: thêm một điểm khi craft item.

Đây là định nghĩa **luật Grove thử nghiệm**, không phải lời diễn giải tương đương chính xác các thẻ Root tương ứng.

## Giới hạn AI

- Search lấy mẫu các thẻ còn có thể nằm trong vùng ẩn từ pool chưa biết và loại các item ruins đã được khám phá công khai. Chưa suy luận posterior đầy đủ từ toàn bộ lịch sử. Không cho AI truy cập trạng thái thật hoặc seed xào bài để bù thiếu sót này.
- Search chỉ mở rộng tối đa 12 ứng viên được heuristic xếp đầu, horizon mặc định 16 quyết định, tối đa 256 rollout. Không bảo đảm xem hết mọi nước đi hoặc tìm được tối ưu.
- Bốn profile hiện chưa có negotiation protocol. Hành vi ngoại giao chỉ xuất hiện gián tiếp qua đánh giá aid, threat và can thiệp.
- Mô hình nhỏ dùng GRU với recurrent state được tách gradient giữa quyết định. PPO cập nhật từ reward kết quả; huấn luyện dài và benchmark riêng vẫn cần thiết để chứng minh tiến bộ.
- Turn/step limit là cắt phiên mô phỏng, không phải điều kiện thắng mới. Dữ liệu bị cắt được bootstrap khi học và ghi riêng khi đánh giá.

## Các hạng mục chặn tuyên bố “đúng luật Root”

1. Đối chiếu và thay test map bằng topology, suit, slot, forests của Autumn đã xác minh, giữ hình vẽ riêng.
2. Đối chiếu đầy đủ 54 thẻ và quest theo cơ chế, có provenance từng recipe và các quyết định optional timing.
3. Hoàn tất setup, ba nhân vật cơ bản, allied movement/combat và những quyết định phân bổ tự động.
4. Thêm bộ kịch bản tương tác từ luật cho mọi hạng mục, kiểm tra độc lập bởi người nắm luật trước khi dùng chữ “tương đương”.

Không gắn nhãn các hạng mục trên là hoàn thành trong bản thử nghiệm này.
