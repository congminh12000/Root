# 0006. Dùng Advanced Setup có homeland, giống Root Digital

- Ngày: 05/11/2026
- Trạng thái: Đã chấp nhận về hướng (người quản lý dự án chọn); **chưa áp dụng** vì thiếu nguồn, xem OQ-18 và OQ-19
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

## Chưa làm được, vì sao

- **OQ-18:** chữ trên faction setup card của Marquise, Eyrie, Woodland Alliance và Vagabond không có trong Rules Library p16 hay nguồn nào trong `source-manifest.yaml`. A.8.3 chỉ nói "sets up the faction immediately as it describes". Không có nguồn thì không được đoán (AGENTS.md).
- **OQ-19:** chưa rõ có dùng draft (A.8.1, A.8.2: chia setup card ra pool, chọn phe theo thứ tự ngược) hay giữ cách gán phe ở lobby và chỉ dùng phần chuẩn bị trên setup card. Draft có thể xung đột với quyết định 0003 (bắt buộc tổng Reach).

Cho tới khi đóng hai mục này, engine giữ §5.1 và §6.3.

## Hệ quả khi áp dụng

- Engine: bước chuẩn bị mới (rút 5 giữ 3, homeland, ràng buộc khoảng cách), có test hợp lệ và không hợp lệ; cập nhật `rule-coverage.yaml` cho A.7, A.8.3.I–III, A.10.
- Giao diện: băng chữ "Chọn ô homeland…", vòng nét đứt trên ô hợp lệ, bước chọn 3 lá giữ lại.
- Bot: tự chơi lại vì vị trí đầu trận đổi.
