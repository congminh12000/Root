# Root

Một phòng thí nghiệm web **AI đấu AI, chỉ dành cho khán giả**, chạy hoàn toàn trên máy của bạn. Python/FastAPI giữ luật và điều phối; React/TypeScript/PixiJS hiển thị bàn chơi; PyTorch huấn luyện mô hình nhỏ bằng CPU hoặc Apple GPU sau khi kiểm tra.

**Trạng thái: bản thử nghiệm chạy được, chưa tương đương 100% Root.** Có bốn cơ chế phe bất đối xứng, tìm kiếm Monte Carlo, lưu/replay trận, web LAN và quy trình học thực sự. Bản đồ, bộ bài và nhiệm vụ hiện là bộ nội dung tự thiết kế. Các ngoại lệ về luật nằm trong [docs/RULES.md](docs/RULES.md). Không dùng kết quả ở đây để tuyên bố AI chơi Root ở trình độ cao thủ.

## Chạy ngay trên máy đã được thiết lập

Từ thư mục chứa README này:

```bash
./scripts/run.sh serve --host 0.0.0.0
```

Mở **http://localhost:8787**. Máy khác cùng mạng LAN mở `http://<IP-LAN-của-Mac>:8787`. Máy Mac phải bật và cho phép kết nối LAN nếu macOS hỏi. Máy chủ chỉ mở API đọc và WebSocket đọc; không có API điều khiển quân. Dùng `--host 127.0.0.1` nếu chỉ xem tại máy này.

Mặc định: bốn bot tìm kiếm, tối đa 1 giây mỗi quyết định, một trận. Muốn nhiều trận liên tiếp:

```bash
./scripts/run.sh serve --host 0.0.0.0 --loop
```

Bản demo nhẹ dùng bot chiến thuật, không phải bot đã huấn luyện:

```bash
./scripts/run.sh serve --agent heuristic --pace 0.5 --loop
```

`--pace` là thời gian chờ trình chiếu sau mỗi quyết định, không phải thời gian AI suy nghĩ. Khi hết trận, giao diện trực tiếp tự theo trận tiếp theo; replay vẫn ở trận đã chọn. Khán giả có thể mở chi tiết phe, bật Toàn cảnh, xem kho trận và điều chỉnh replay riêng trên trình duyệt. Việc này không đổi trận thật.

Dừng trận bằng `./scripts/run.sh stop` trong terminal khác. `Ctrl+C` tại terminal máy chủ dừng cả máy chủ.

## Cài mới

Cần Python **3.11–3.13** (khuyến nghị 3.12) và Node **22.12+**; đã kiểm tra trên Python 3.12 và Node 24, Mac M1 Pro 16 GB.

```bash
./scripts/setup.sh
```

Nếu Python mặc định quá mới, chỉ định Python phù hợp:

```bash
ROOT_PYTHON=/opt/homebrew/bin/python3.12 ./scripts/setup.sh
```

Lần đầu cần Internet để tải thư viện miễn phí. Sau khi cài và build, mọi asset, mô hình, cơ sở dữ liệu và quá trình chạy đều ở máy. Không cần tài khoản, API key, CDN, thuê máy chủ hay GPU đám mây. Tiền điện và phần cứng hiện có không nằm trong nghĩa “miễn phí phần mềm”.

`requirements.lock.txt` ghim thư viện Python; `web/package-lock.json` khóa frontend. `.venv`, `web/node_modules`, `web/dist` là các tệp sinh lại được. Mã nguồn không phụ thuộc đường dẫn runtime của Codex.

## Các player và khả năng hiện tại

| Loại | Cách hoạt động |
|---|---|
| `random` | Chọn ngẫu nhiên trong hành động hợp lệ; kiểm thử độ ổn định |
| `heuristic` | Đánh giá chiến thuật riêng cho cả bốn phe |
| `search` | Lấy mẫu thông tin ẩn, mô phỏng nhiều phương án trong ngân sách thời gian |
| `neural` | Mô hình GRU nhỏ chấm điểm danh sách hành động hợp lệ |

Architect / Tactician / Diplomat / Challenger là các cấu hình đánh giá khác nhau; không phải bốn mô hình chuyên gia. “Diplomat” hiện chỉ là cấu hình ưu tiên tương tác, **chưa có hệ thống thương lượng bằng ngôn ngữ**. Các bot có thể chơi mọi phe nhưng trình độ chưa được chứng minh ngang nhau.

```bash
./scripts/run.sh play --agent heuristic --seed 42 --check
./scripts/run.sh play --agent search --budget 0.05 --seed 42 --save
./scripts/run.sh verify <match-id>
```

Tất cả AI chỉ được gọi bằng observation của ghế mình. Chúng không đọc được bài đối thủ, thứ tự bài, trạng thái RNG hay nội dung phế tích chưa khám phá. Chế độ Toàn cảnh của khán giả là luồng riêng.

## Huấn luyện thật trên máy

```bash
./scripts/run.sh train --iterations 5 --games 4 --workers 2
```

Mỗi iteration tạo dữ liệu mới. Iteration đầu học bắt chước bot chiến thuật; các iteration sau dùng PPO với phần thưởng thắng/thua và giá trị bootstrap khi trận bị cắt. Mô hình dùng GRU làm bộ nhớ giữa các quyết định của cùng player, chấm trực tiếp các ứng viên hợp lệ. Cập nhật recurrent được cắt theo từng quyết định; đây chưa phải huấn luyện hồi quy xuyên toàn bộ ván.

Đối thủ luân phiên gồm bot chiến thuật, bot tìm kiếm và snapshot mô hình cũ. Worker chạy headless, truyền byte thay vì phụ thuộc Torch shared-memory daemon trên macOS. Mặc định CPU và hai worker; giới hạn số luồng Torch để tránh làm quá tải M1.

```bash
./scripts/run.sh train --resume data/candidate.pt --iterations 5 --games 4 --workers 2
./scripts/run.sh train --device auto --iterations 5
./scripts/run.sh serve --agent neural --checkpoint data/candidate.pt
```

`--iterations` khi resume là số iteration **bổ sung**. Giữ nguyên `--games`, `--max-turns`, `--warmup` như lúc bắt đầu để giữ điều kiện thí nghiệm. Checkpoint gồm trọng số, optimizer, số iteration, pool đối thủ và trạng thái RNG. Chỉ tải checkpoint do chính bạn tạo hoặc nguồn bạn tin tưởng.

Huấn luyện kiểm tra lease khán giả ở đầu mỗi iteration và chờ khi có người xem; công việc đã chạy trong một iteration được hoàn tất trước khi chờ. `--ignore-viewers` dành cho phép thử chủ động. Muốn việc tạm ngưng hoạt động, giữ checkpoint trong thư mục `--data` của máy chủ. Nhấn `Ctrl+C` để lưu tiến độ; khi đang thu thập dữ liệu, worker có thể cần hoàn tất lượt công việc trước khi thoát.

Checkpoint đi kèm nếu có chỉ chứng minh pipeline chạy; **không phải mô hình cao thủ**. Đọc thống kê thắng, thua và lượt bị cắt trước khi đánh giá chất lượng. Không có số trận huấn luyện cố định bảo đảm thành cao thủ.

## Đánh giá, tiếp tục giải và chọn mô hình

```bash
./scripts/run.sh evaluate --games 1000 --seed 300000 --check
```

Lưu từng trận vào `data/evaluation.jsonl`, báo cáo vào `data/evaluation.summary.json`; mở “Phòng nghiên cứu” để xem. Chạy lại cùng cấu hình tiếp tục giải đã lưu; đổi cấu hình phải dùng `--output` mới. Trận chạm giới hạn lượt/hành động được ghi riêng và không được gán người thắng.

So sánh mô hình ứng viên với bot tìm kiếm đang dùng:

```bash
./scripts/run.sh evaluate --agent search --budget 0.05 --candidate data/candidate.pt --games 1000 --seed 500000 --output data/candidate-eval.jsonl
./scripts/run.sh promote data/candidate.pt data/candidate-eval.summary.json
```

Mỗi mẫu so sánh gồm hai trận cùng seed, đội hình và ghế được thay: một trận ứng viên, một trận incumbent. Nếu incumbent hiện là mô hình neural, thêm `--agent neural --checkpoint <incumbent.pt>`. So sánh dùng tỷ lệ thắng và khoảng bootstrap 95% của chênh lệch; không giả định 25% là chuẩn cho mọi phe.

Chỉ đăng ký champion khi ít nhất 1.000 mẫu ghép cặp, không lỗi, đúng checksum ứng viên và cận dưới cải thiện lớn hơn 0. Lệnh `serve` không chỉ định `--agent` dùng champion đã đăng ký; nếu chưa có thì dùng search. Đây là cổng kiểm chứng trong pool đã đo, không phải chứng nhận tối ưu toàn cục. Giữ seed đánh giá tách khỏi seed huấn luyện.

## Kiểm tra và cấu trúc

```bash
./scripts/check.sh
```

- `backend/root/engine.py`: luật, quyết định, observation, tái hiện RNG.
- `backend/root/agents.py`, `learning.py`: bot chiến thuật, tìm kiếm, PyTorch/PPO.
- `backend/root/server.py`, `storage.py`, `runner.py`, `cli.py`: LAN, replay, giải đấu và CLI.
- `web/src`: giao diện và bản đồ PixiJS; không lặp lại logic luật.
- `docs/RULES.md`: đối chiếu luật, khác biệt và phần chưa triển khai.
- `docs/VALIDATION.md`: kết quả kiểm tra tại thời điểm bàn giao.
- `data/`: SQLite, replay, checkpoint và báo cáo; không cần đưa vào Git.

Frontend phát triển riêng: `cd web && npm run dev`; máy chủ game phải đang chạy ở cổng 8787. Khi phát qua LAN, dùng bản build với FastAPI, không dùng Vite dev server.

Đóng gói mã nguồn, bản web đã build, checkpoint kiểm thử iteration 5 và báo cáo: `python3 scripts/package_source.py`. Gói ZIP không chứa môi trường Python, node_modules hoặc cơ sở dữ liệu trận đang chạy; chạy setup một lần sau khi giải nén. Checkpoint iteration 5 có tên `data/candidate-final.pt`; dùng đường dẫn đó khi muốn chạy lại mô hình kiểm thử đi kèm.

## Nguồn và nội dung

Tham chiếu [Leder Games Resources](https://ledergames.com/pages/resources) và [Law of Root, 13/10/2025](https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Root_Base_Law_Oct_2025.pdf?v=1774903756). Không đóng gói hình, âm thanh, câu văn luật hay tài nguyên trích xuất của Root Digital/Root Database. Các thư viện giữ giấy phép riêng; xem [THIRD_PARTY.md](THIRD_PARTY.md).
