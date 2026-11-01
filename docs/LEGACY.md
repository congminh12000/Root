# Bản thử nghiệm cũ (`backend/` Python, `web/` React/PixiJS)

Chuyển từ `CLAUDE.md` cũ ngày 01/11/2026. Bản này **chỉ còn là mã tham khảo, không phát triển thêm tính năng**; hướng hiện tại ở [AGENTS.md](../AGENTS.md).

## Đọc khi cần tham khảo

1. `README.md`: cài đặt, chạy game, huấn luyện và đánh giá.
2. [docs/RULES.md](RULES.md): luật đã có, khác biệt với Root và những phần chưa hoàn tất.
3. [docs/VALIDATION.md](VALIDATION.md): kết quả kiểm tra đã thực hiện ngày 29/10/2026, không phải kết quả kiểm tra mới sau khi nhận bàn giao.

## Trạng thái thực tế (bản cũ)

**Đây là bản thử nghiệm, chưa hoàn thành toàn bộ kế hoạch Root.** Yêu cầu cũ "chỉ AI chơi, tên và hình làm riêng" đã được thay bằng hướng mới trong AGENTS.md.

- Bốn phe có cơ chế riêng: Guild, Canopy, Union và Wayfarer.
- Có bộ mô phỏng headless, quyết định phản ứng, thông tin ẩn, seed/RNG và replay kiểm chứng được.
- Có bot random, heuristic, tìm kiếm Monte Carlo và mô hình neural GRU nhỏ.
- Có quy trình imitation → PPO, hai worker, checkpoint/resume và pool đối thủ cũ.
- Web React/PixiJS có bàn chơi, live WebSocket, hồ sơ phe, toàn cảnh khán giả, replay và báo cáo.
- Cập nhật 30/10/2026: nền bản đồ là đúng ảnh người dùng cung cấp trong `web/src/assets/woodland-reference.png`, không chỉnh pixel. `web/src/map-layout.ts` ánh xạ ID vùng sang tọa độ minh họa; không thay topology engine. `/map` xem độc lập, không gọi API/training. Điểm/thanh tiến độ trên thẻ phe đã bỏ; tên vùng/quân cờ chỉ hiện khi bật lớp tương ứng.
- API của trình duyệt chỉ đọc. Chủ máy điều khiển trận qua CLI.
- Bản đồ, 54 thẻ và 15 nhiệm vụ hiện là nội dung thử nghiệm tự thiết kế, **không tương đương Autumn/base deck chính thức**.
- Chưa đủ các nhân vật cơ bản của Vagabond, allied-warrior movement/combat và mọi lựa chọn thời điểm/phân bổ. Danh sách cụ thể ở RULES.md.
- AI chưa được chứng minh là cao thủ. Tên bốn player là profile, không phải bốn mô hình chuyên gia.

## Mã nguồn chính

- `maps/<id>.json`: dữ liệu mỗi bản đồ (gameplay + địa hình), dùng chung cho engine và web; xem `docs/MAPS.md`; quy tắc thiết kế ở `docs/MAP_DESIGN.md`.
- `backend/root/content.py`: nạp bản đồ, thẻ, nhiệm vụ và thông số phe.
- `backend/root/engine.py`: luật chung; `observe`, `legal_actions`, `step`, `sample`, export/restore.
- `backend/root/agents.py`: heuristic và tìm kiếm có ngân sách thời gian.
- `backend/root/learning.py`: encoding, GRU policy/value, imitation, PPO, worker và checkpoint.
- `backend/root/runner.py`: chạy trận và giải đánh giá có thể tiếp tục.
- `backend/root/storage.py`: SQLite journal, snapshot public/omniscient, verify replay.
- `backend/root/server.py`, `cli.py`: FastAPI/WebSocket và CLI chủ máy.
- `web/src/map/`: layout, painter 2.5D (Canvas 2D), bảng màu theo mùa và kiểm tra bố cục.
- `web/src/Board.tsx`: nền ảnh `woodland-reference.png` + lớp quân cờ PixiJS (theo `map-layout.ts`); `main.tsx`: giao diện khán giả. Bản đồ lakeside vẽ bằng painter (`web/src/map/`) chỉ còn ở trang preview `map-preview.html` và `map3d.html`.
- `backend/tests`, `web/src/playback.test.ts` và `web/src/map/map.test.ts`: các kiểm tra hiện có.

Không lặp lại bộ luật trong frontend. Không cho agent đọc authoritative state, bài đối thủ, thứ tự bộ bài hoặc seed xào bài. Spectator omniscient là luồng riêng. Search chỉ được lấy mẫu thế giới từ observation.

## Cài đặt và kiểm tra sau khi giải nén

```bash
./scripts/setup.sh
./scripts/check.sh
```

Cần Python 3.11–3.13 (khuyến nghị 3.12), Node 22.12+. Nếu terminal không giữ executable bit khi giải nén, dùng `bash scripts/setup.sh` và `bash scripts/check.sh`. Python và npm lockfiles đi kèm. Lần cài đầu cần Internet; runtime không cần API key hoặc CDN.

Chỉ khi người dùng yêu cầu chạy lại:

```bash
./scripts/run.sh serve --host 0.0.0.0
```

Mặc định dùng search nếu không có champion đã đăng ký. Không tự nâng neural model thành mặc định.

## Dữ liệu có trong gói

- `data/candidate-final.pt`: checkpoint kiểm thử iteration 5, tổng lịch sử 20 trận. Đây không phải mô hình đã chứng minh chất lượng.
- `data/evaluation.jsonl`, `.config.json`, `.summary.json`: giải heuristic 1.000 trận trên ruleset thử nghiệm, seed bắt đầu 320000; 1.000 finished, 0 error.
- `web/dist`: bản frontend đã build, có thể build lại từ nguồn.

Gói ZIP không chứa `.venv`, `node_modules`, SQLite/lịch sử trận trên máy cũ hoặc các nguồn tham khảo thô. Repository Git cũng không lưu `web/dist`; script setup sẽ build lại từ source. Thư viện được cài lại từ lockfiles. SQLite mới được tạo khi chạy.

Chỉ tải checkpoint PyTorch từ nguồn tin tưởng: loader hiện dùng `weights_only=False` vì checkpoint chứa optimizer và trạng thái RNG.

## Kết quả lịch sử và việc tiếp theo

Ngày 29/10/2026: 36 test Python và 2 test frontend pass; lint/typecheck/build pass. Giải release 1.000 trận không lỗi. Stress test 200 random: 126 finished, 74 turn_limit, 0 error. Chi tiết và giới hạn kiểm chứng trong VALIDATION.md.

Một mẫu 20 cặp của checkpoint iteration 3 thua baseline; lệnh promote đã từ chối. Mẫu đó không phải benchmark cho checkpoint iteration 5 đi kèm. Chưa có champion neural đủ điều kiện.

Ưu tiên kỹ thuật nếu người dùng muốn phát triển tiếp: xác minh topology/suit/slot/forest của Autumn, cơ chế và số lượng thẻ/quest chuẩn, rồi hoàn tất các tương tác còn thiếu và mở rộng kiểm thử. Chưa nên đầu tư huấn luyện dài trên bộ luật đang khác mục tiêu. Đọc tài liệu chính thức Leder và kiểm chứng từng mục; không xem bản thử nghiệm là nguồn luật chính thức.

Nếu thay luật hoặc encoding, quản lý phiên bản và khả năng tương thích của checkpoint/replay/báo cáo; tránh trộn dữ liệu từ nhiều phiên bản thành cùng một giải. Giữ thay đổi nhỏ, không refactor ngoài phạm vi và kiểm tra trước khi bàn giao.
