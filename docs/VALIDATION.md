# Kết quả kiểm tra — 29/10/2026

Máy: MacBook Pro M1 Pro, 10 CPU cores, 16 GB unified memory. Python 3.12.14, PyTorch 2.7.0, Node 24.13.0. Tất cả phép huấn luyện dưới đây dùng **CPU**; chưa xác nhận hiệu năng Apple GPU.

## Kiểm tra tự động

`./scripts/check.sh` vượt qua:

- Ruff: không lỗi.
- Pytest: **36 passed**. Có một cảnh báo deprecation từ tương tác Starlette/AnyIO, không phải lỗi kiểm thử.
- ESLint: không lỗi.
- Vitest: **2 passed**.
- TypeScript kiểm tra kiểu và Vite production build: thành công.
- `npm audit`: **0 vulnerabilities** tại thời điểm kiểm tra.

Kiểm tra Python bao gồm bảo toàn quân/bài, rule/tie, keep, March, outrage, ambush/foil, lựa chọn casualty, dominance/coalition, thông tin ẩn (bao gồm không lộ shuffle seed), lấy mẫu trạng thái, replay/RNG, stop/giới hạn lượt, search không sửa trạng thái thật, observation/policy encoding, gradient cập nhật trọng số, replay nối lại, hai WebSocket đồng thời và từ chối lệnh chơi từ trình duyệt. Có kiểm tra tiếp tục giải không ghi trùng trận và từ chối cấu hình giải khác.

## Trận tự động

Giải release, `data/release-evaluation.jsonl`:

```bash
./scripts/run.sh evaluate --games 1000 --agent heuristic --check --seed 320000 --output data/release-evaluation.jsonl
```

**1.000 finished, 0 error, 0 turn_limit.** Kiểm tra invariant sau mỗi hành động, xoay ghế và đội hình. Khoảng Wilson 95%:

| Phe | Thắng | Tỷ lệ | Khoảng 95% |
|---|---:|---:|---:|
| Guild | 555 | 55,5% | 52,4–58,6% |
| Canopy | 49 | 4,9% | 3,7–6,4% |
| Union | 354 | 35,4% | 32,5–38,4% |
| Wayfarer | 42 | 4,2% | 3,1–5,6% |

Khoảng 0,249 ms/decision là phép đo của **heuristic**, không phải search một giây. Tỷ lệ lệch cho thấy baseline/pool chưa mạnh và cân bằng giữa các phe, không cho phép kết luận game đã cân bằng hoặc AI là cao thủ. Báo cáo này được sao chép sang `data/evaluation.*` cho giao diện “Phòng nghiên cứu”.

Stress test thêm 200 trận random, seed 600000, giới hạn 80 lượt: **126 finished, 74 turn_limit, 0 error**. Các trận chạm giới hạn không được gán người thắng. Có thêm các lần chạy 200/1.000 trận trong quá trình phát triển; báo cáo release ở trên là kết quả dùng khi bàn giao.

Trận search seed 81, budget 0,01 giây, bật kiểm tra luật/invariant: kết thúc sau **343 quyết định / 35 lượt**; Union thắng. Lưu được vào SQLite và kiểm tra replay khớp digest từng frame bằng CLI `verify`.

## Huấn luyện

- Đã chạy 3 iteration đầu: 1 imitation + 2 PPO, 4 trận/iteration, 2 worker, tối đa 100 lượt/trận, CPU.
- Đã resume sang iteration 4 rồi resume lần nữa sang iteration 5; có checkpoint chứa optimizer, RNG và pool mô hình cũ.
- Tổng lịch sử checkpoint `data/candidate-final.pt`: **20 trận, 19 kết thúc, 1 chạm giới hạn lượt**; 1.855 quyết định của learner. Trận bị cắt được bootstrap, không gán thua.
- Unit test xác nhận trọng số thực sự thay đổi sau gradient update và recurrent memory được truyền giữa các quyết định.
- Mẫu đánh giá **20 cặp** của checkpoint iteration 3: ứng viên thắng **3/20**, baseline trong ghế tương ứng thắng **8/20**; cải thiện -25 điểm phần trăm, bootstrap 95% khoảng -45 đến -10 điểm phần trăm.
- `promote` đã từ chối mẫu này. **Không có mô hình neural nào được nâng làm champion.** Trận demo sử dụng search.

20 cặp chỉ kiểm tra pipeline đánh giá; chưa đạt yêu cầu 1.000 cặp để xét nâng champion, cũng không đại diện cho chất lượng checkpoint iteration 5. Mô hình đi kèm là hiện vật kiểm thử, không phải một bot đã đạt trình độ chuyên gia.

## Kiểm tra trên trình duyệt

- Đã mở ứng dụng thực ở `http://127.0.0.1:8787` với PixiJS WebGL.
- Thử desktop 1440×1000 và mobile 390×844; không phát hiện tràn ngang.
- Hai tab cùng kết nối xem trận; các kiểm tra WebSocket tự động xác nhận nhận cùng snapshot và reconnect nhận lại snapshot hiện tại.
- Đã thao tác thực: bật Toàn cảnh, xem bài trong hồ sơ phe, đóng bằng Escape và khôi phục focus, mở replay, pause, đổi tốc độ 4×, chuyển trực tiếp, xem báo cáo 1.000 trận.
- Phát hiện và sửa lỗi cleanup PixiJS khi đổi luồng dữ liệu làm canvas unmount; thử lại toggle/replay thành công.
- Ảnh toàn trang lưu tại `../grove-arena-preview.jpg` (ở thư mục outputs bên ngoài project).

Đã kiểm tra không có CDN/font/asset bên ngoài trong bản build và tất cả request ứng dụng đều dùng đường dẫn máy chủ cục bộ. Chưa thử bằng cách ngắt kết nối mạng vật lý. Chưa thử bằng một thiết bị LAN thứ hai; máy chủ đã bind `0.0.0.0` và hỗ trợ kết nối LAN, việc truy cập còn tùy firewall/mạng của máy chủ.

## Khoảng cách với kế hoạch ban đầu

| Mốc | Trạng thái |
|---|---|
| Bộ mô phỏng chạy trọn trận | Có, nhưng luật/content còn khoảng cách với Root; xem RULES.md |
| Bot chiến thuật + search | Có; chưa chứng minh trình độ cao thủ |
| Web spectator + replay + LAN | Có; chưa thử từ thiết bị vật lý thứ hai |
| Huấn luyện PyTorch/PPO + resume | Có, kiểm tra trên CPU; chưa có mô hình đủ mạnh |
| Kiểm tra ổn định + giải 1.000 trận + đóng gói | Có cho ruleset thử nghiệm |
| Autumn / base deck / mọi tương tác chính thức | **Chưa hoàn tất** |

Không xem tài liệu này là xác nhận đã hoàn thành toàn bộ yêu cầu tương đương Root Digital.
