# 0006. Dùng Advanced Setup có homeland, giống Root Digital

- Ngày: 05/11/2026
- Trạng thái: Đã chấp nhận (người quản lý dự án chọn); đủ nguồn 4 lá setup card (SRC-014 đến SRC-017). **Chưa áp dụng vào engine**; chờ OQ-20, OQ-21 và một task riêng
- Căn cứ: Rules Library p16 mục A (Advanced Setup), phân tích video Root Digital [../../07-ui/root-digital/marquise.md](../../07-ui/root-digital/marquise.md)

## Bối cảnh

Engine hiện chuẩn bị trận theo Standard Setup §5.1 và phần chuẩn bị riêng của từng phe (Marquise §6.3). Root Digital chuẩn bị theo Advanced Setup:

- A.7: mỗi người rút 5 lá (không phải 3).
- A.8: chuẩn bị phe bằng **faction setup card** (lá có trong bản mở rộng Marauder và Homeland); A.8.3.I Homelands, A.8.3.II và A.8.3.III về khoảng cách giữa các homeland.
- A.10: mỗi người giữ 3 lá, úp 2 lá lên bộ bài rồi xáo.

Video 00:10–01:30 khớp các bước này: "Choose a homeland clearing to place a building", "Choose another homeland clearing adjacent to your last one…", "Choose 2 cards to return to the deck".

Cả §5.1 và mục A đều là luật chính thức; A.8 nói nhóm chơi **có thể** chọn một trong hai cách.

## Quyết định

Sản phẩm chuẩn bị trận theo **Advanced Setup** (mục A) với faction setup card và homeland, như Root Digital. Các phần của mục A ngoài phạm vi hiện tại vẫn không dùng: bản đồ biến thể (A.1), bộ bài khác (A.2), Rootbotics (A.3), landmark (A.5), hireling (A.6).

**Chọn phe (OQ-19, đóng 05/11/2026):** không dùng draft A.8.1–A.8.2. Người chơi chọn phe ở sảnh như hiện nay; quyết định 0003 (Reach) giữ nguyên. Sau đó mỗi phe chuẩn bị theo setup card của mình. Thứ tự chuẩn bị theo A.8.3: bắt đầu từ người cuối trong thứ tự lượt, đi ngược chiều kim đồng hồ, chỉ bỏ phần chọn lá (người quản lý duyệt 05/11/2026).

## Nguồn và việc còn lại

- **OQ-18 (đóng):** chữ 4 lá chép ở [../../03-data-spec/setup-cards.md](../../03-data-spec/setup-cards.md), kèm cách hiểu. Hai cách hiểu của lá Marquise đã được duyệt.
- **OQ-20:** danh sách ô mép bản đồ Autumn (G.15) cho homeland của Eyrie, chờ xác nhận.
- **OQ-21:** nhân vật Vagabond do người chơi chọn hay chia ngẫu nhiên, chờ quyết định.
- A.8 dùng §5.1 hoặc setup card "as a group", tức cả bàn cùng một cách; engine đổi một lần cho cả 4 phe. Cho tới khi task đó xong, engine giữ §5.1 và phần chuẩn bị riêng của từng phe.

## Hệ quả khi áp dụng

- Engine: bước chuẩn bị mới (rút 5 giữ 3, homeland, ràng buộc khoảng cách), có test hợp lệ và không hợp lệ; cập nhật `rule-coverage.yaml` cho A.7, A.8.3.I–III, A.10.
- Giao diện: băng chữ "Chọn ô homeland…", vòng nét đứt trên ô hợp lệ, bước chọn 3 lá giữ lại.
- Bot: tự chơi lại vì vị trí đầu trận đổi.
