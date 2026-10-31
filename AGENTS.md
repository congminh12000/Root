# Hướng dẫn cho AI coding agent

Áp dụng cho mọi agent (Claude, Codex…) làm việc trong repo này. Đọc hết trước khi sửa code gameplay.

## Mục tiêu

Web game Root (Leder Games) chơi được trọn vẹn, đúng luật chính thức, có người chơi thật qua mạng và bot. Giai đoạn đầu: bốn phe cơ bản (Marquise de Cat, Eyrie Dynasties, Woodland Alliance, Vagabond), bản đồ Autumn, bộ bài chuẩn. Phạm vi và lý do ở [docs/00-governance/decisions/](docs/00-governance/decisions/).

## Source of Truth: đọc theo thứ tự

1. [docs/00-governance/source-manifest.yaml](docs/00-governance/source-manifest.yaml): nguồn chính thức. Tải PDF bằng `npm run fetch:sources`, tạo bản chụp Rules Library bằng `npm run snapshot:rules`.
2. [docs/00-governance/rule-precedence.md](docs/00-governance/rule-precedence.md): xử lý khi luật xung đột.
3. [docs/00-governance/open-questions.md](docs/00-governance/open-questions.md): những gì chưa được phép đoán.
4. [docs/06-qa/rule-coverage.yaml](docs/06-qa/rule-coverage.yaml): mọi điều khoản trong phạm vi và trạng thái của chúng.
5. [docs/04-engine-spec/game-state.md](docs/04-engine-spec/game-state.md): trạng thái trận, thông tin ẩn, bất biến.
6. [docs/02-rules-spec/](docs/02-rules-spec/README.md): đặc tả từng điều khoản. Code gameplay phải khớp mục `ROOT-<section>` tương ứng.

## Luật bắt buộc

- **Không tự bịa luật.** Mọi logic gameplay phải dẫn về một điều khoản (`ROOT-<section>`), một dữ liệu thành phần có nguồn, hoặc một quyết định đã duyệt trong `decisions/`. Thiếu nguồn thì thêm vào open-questions và dừng phần đó.
- **Nguồn luật chính là Leder Rules Library p16** (bản chụp `rules-library-root-p16.json`, cả FAQ chính thức). Luôn đọc nó trước khi viết hoặc sửa luật; PDF 13/10/2025 chỉ để đối chiếu (decisions/0005). Trước mốc phát hành, chạy `npm run snapshot:rules` để bắt cập nhật của Leder.
- **Không tự điền số điều khoản.** Số điều khoản phải có trong Rules Library p16.
- **Chỉ engine được đổi game state.** UI, server và bot gửi `GameCommand`; bot chỉ chọn trong danh sách hành động hợp lệ.
- **Bot không có quyền đặc biệt.** Bot nhận `PlayerView` giống người chơi, không đọc deck, bài người khác, item dưới ruin hay seed.
- **Luôn kèm test.** Mỗi hành vi mới cần test hợp lệ và không hợp lệ. Cập nhật `rule-coverage.yaml` (status, implementation, tests) trong cùng thay đổi.
- **Không đánh dấu hoàn thành chỉ vì code chạy.** Phải qua kiểm tra luật, dữ liệu, trạng thái và tương tác.
- **Quyền sử dụng:** không commit PDF hay art chính thức; chỉ dùng cá nhân / LAN ([licensing.md](docs/00-governance/licensing.md)).
- **Chi phí:** không dùng API trả phí, GPU thuê, hosting hay asset trả tiền.

## Báo cáo sau mỗi nhiệm vụ (6 phần)

1. Điều khoản luật và nguồn tham chiếu.
2. Đặc tả hành vi và điều kiện hợp lệ.
3. File code được tạo hoặc sửa.
4. Bộ test cho hành vi mới.
5. Kết quả chạy test và lỗi còn tồn tại.
6. Điểm chưa rõ cần người quản lý duyệt.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `docs/00-governance/` | Manifest, thứ tự ưu tiên, quyết định, quyền sử dụng, vấn đề mở |
| `docs/01-official-sources/` | PDF chính thức (không commit) |
| `docs/02-rules-spec/` | Đặc tả hành vi theo từng điều khoản `ROOT-<section>`; viết trước khi code |
| `docs/03-data-spec/` | Bản đồ Autumn (đánh số 1–12), bộ bài, quest và faction board |
| `docs/04-engine-spec/` | Đặc tả engine |
| `docs/06-qa/` | Coverage matrix, test matrix, golden scenario |
| `packages/game-data/` | Dữ liệu nội dung có nguồn (bản đồ, bài, quest) và kiểu dữ liệu; không phụ thuộc package nào |
| `packages/game-engine/` | Engine TypeScript thuần, không phụ thuộc UI hay Node; dùng kiểu từ `game-data`. API ở `docs/04-engine-spec/engine-api.md` |
| `scripts/` | `fetch-sources`, `audit-rule-coverage` |
| `backend/`, `web/` | Bản thử nghiệm cũ (Python, React/PixiJS). Chỉ để tham khảo; không thêm tính năng |

## Lệnh

```bash
npm install
npm run fetch:sources
npm run snapshot:rules
npm run audit:rules
npm run typecheck
npm test
```

Cần Node 22.18+ (chạy script `.ts` trực tiếp).
