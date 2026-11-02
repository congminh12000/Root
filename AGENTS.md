# Hướng dẫn cho AI coding agent

> Đang tiếp tục dở dang? Đọc [docs/HANDOFF.md](docs/HANDOFF.md) để biết đã xong gì và làm tiếp từ đâu.

Áp dụng cho mọi agent và mọi model (Claude, ChatGPT/Codex, Grok, Gemini…) làm việc trong repo này. Đây là nguồn hướng dẫn duy nhất; `CLAUDE.md` chỉ trỏ về đây. Đọc hết trước khi sửa code gameplay.

## Mục tiêu

Web game Root (Leder Games) chơi được trọn vẹn, đúng luật chính thức, có người chơi thật qua mạng và bot. Giai đoạn đầu: bốn phe cơ bản (Marquise de Cat, Eyrie Dynasties, Woodland Alliance, Vagabond), bản đồ Autumn, bộ bài chuẩn. Phạm vi và lý do ở [docs/00-governance/decisions/](docs/00-governance/decisions/).

## Source of Truth: đọc theo thứ tự

1. [docs/00-governance/source-manifest.yaml](docs/00-governance/source-manifest.yaml): nguồn chính thức. Tải PDF bằng `npm run fetch:sources`, tạo bản chụp Rules Library bằng `npm run snapshot:rules`.
2. [docs/00-governance/rule-precedence.md](docs/00-governance/rule-precedence.md): xử lý khi luật xung đột.
3. [docs/00-governance/open-questions.md](docs/00-governance/open-questions.md): những gì chưa được phép đoán.
4. [docs/06-qa/rule-coverage.yaml](docs/06-qa/rule-coverage.yaml): mọi điều khoản trong phạm vi và trạng thái của chúng. File dài (khoảng 160 mục); đừng đọc cả file, chỉ tra mục cần sửa, ví dụ `grep -n -A10 'rule_id: ROOT-4.3.3$' docs/06-qa/rule-coverage.yaml`. Kiểm tra toàn bộ đã có `npm run audit:rules`.
5. [docs/04-engine-spec/game-state.md](docs/04-engine-spec/game-state.md): trạng thái trận, thông tin ẩn, bất biến.
6. [docs/02-rules-spec/](docs/02-rules-spec/README.md): đặc tả từng điều khoản. Code gameplay phải khớp mục `ROOT-<section>` tương ứng.

## Luật bắt buộc

- **Không tự bịa luật.** Mọi logic gameplay phải dẫn về một điều khoản (`ROOT-<section>`), một dữ liệu thành phần có nguồn, hoặc một quyết định đã duyệt trong `decisions/`. Thiếu nguồn thì thêm vào open-questions và dừng phần đó.
- **Nguồn luật chính là Leder Rules Library p16** (bản chụp `rules-library-root-p16.json`, cả FAQ chính thức). PDF 13/10/2025 chỉ để đối chiếu (decisions/0005). FAQ chính thức thắng ruling của dự án (decisions/0004); ví dụ FAQ đã xác nhận không được Revolt ở ô có Keep.
- **Đụng tới luật thì chạy `npm run rules:guard -- --refresh` trước tiên**, rồi đọc đúng điều khoản sắp sửa bằng `npm run rules:clause -- <số điều khoản>` (in kèm FAQ). "Đụng tới luật" là sửa `packages/game-engine/src`, `packages/game-data/src`, `docs/02-rules-spec`, `docs/03-data-spec`, `rule-coverage.yaml`, `rule-precedence.md` hoặc `decisions/`. Lệnh tải lại bản chụp (tối đa 12 giờ một lần nếu không có `--refresh`) và dừng nếu khác sha256 trong `source-manifest.yaml`, tức Leder đã đổi luật: so với `rules-library-root-p16.prev.json`, cập nhật spec, engine, test, coverage, rồi manifest, và hỏi người quản lý trước khi đổi ruling. `npm run ship` và hook pre-commit (`.githooks/`, bật bởi `npm install`) tự chạy lệnh này khi thay đổi đụng các đường dẫn trên; không bỏ qua bằng `--no-verify`.
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

## Quy ước làm việc với người quản lý

- **Trao đổi bằng tiếng Việt**, câu ngắn, giải thích thuật ngữ khi cần. Không đổ lỗi cho người dùng khi họ chưa hiểu; giải thích lại.
- **Mỗi bước một commit** trên nhánh riêng (`feat/...`, `fix/...`, `chore/...`), không làm trên `main`. Mở PR khi xong việc; **chỉ merge khi người quản lý đồng ý**. Không commit `.claude/settings.local.json`, PDF hay bản chụp luật.
- **Không tự mở server, huấn luyện hay việc chạy lâu** trừ khi được yêu cầu. Được phép kiểm tra ngắn trên `127.0.0.1` với thư mục dữ liệu thử, rồi tắt server và xoá dữ liệu thử, và báo lại.
- **Kiểm tra trước khi báo xong:** `npm run typecheck`, `npm test`, `npm run audit:rules`; thay đổi giao diện thì xem thật trên trình duyệt. Báo trung thực phần chưa kiểm chứng được.
- **Bot và AI không có quyền đặc biệt:** chỉ `PlayerView` + hành động hợp lệ; không đọc state gốc, bài đối thủ, thứ tự bộ bài hay seed.
- **Bản cũ** (`backend/`, `web/`, `data/`) chỉ để tham khảo; mô tả ở [docs/LEGACY.md](docs/LEGACY.md). File `.ignore` loại chúng khỏi kết quả tìm kiếm của agent; chỉ mở khi cần đối chiếu. Không tự nâng model neural cũ thành mặc định; chỉ nạp checkpoint PyTorch từ nguồn tin cậy.
- **Không hardcode đường dẫn máy.** Máy phát triển: MacBook Pro M1 Pro 16 GB; mọi thứ chạy offline trên máy hoặc LAN.

## Dùng với model khác (ChatGPT, Grok…)

- Công cụ đọc được repo (Codex, Cursor, Claude Code, Grok CLI…): chỉ cần trỏ vào file này; nhiều công cụ tự đọc `AGENTS.md`.
- Chat trên web không đọc được repo: chạy `npm run pack:context` rồi đưa file `context-pack/root-context.md` (gitignored) cho model. Thêm `--full-specs` để kèm mọi spec luật, `--with <file>` để kèm file code cần sửa. Gói không chứa tài liệu chính thức của Leder; dán điều khoản cần thiết bằng `npm run rules:clause -- <số>`.
- Model nào cũng phải qua cùng hàng rào: test, `audit:rules`, `rules:guard`. Code từ chat web phải được chạy kiểm tra trên máy trước khi commit.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `docs/00-governance/` | Manifest, thứ tự ưu tiên, quyết định, quyền sử dụng, vấn đề mở |
| `docs/01-official-sources/` | PDF chính thức (không commit) |
| `docs/02-rules-spec/` | Đặc tả hành vi theo từng điều khoản `ROOT-<section>`; viết trước khi code |
| `docs/03-data-spec/` | Bản đồ Autumn (đánh số 1–12), bộ bài, quest và faction board |
| `docs/04-engine-spec/` | Đặc tả engine |
| `docs/07-ui/` | Kế hoạch giao diện, style guide (bắt buộc cho mọi việc giao diện), checklist để chơi được |
| `docs/06-qa/` | Coverage matrix, test matrix, golden scenario |
| `packages/game-data/` | Dữ liệu nội dung có nguồn (bản đồ, bài, quest) và kiểu dữ liệu; không phụ thuộc package nào |
| `packages/game-engine/` | Engine TypeScript thuần, không phụ thuộc UI hay Node; dùng kiểu từ `game-data`. API ở `docs/04-engine-spec/engine-api.md` |
| `packages/bots/` | Bot chỉ nhận `PlayerView` + danh sách hợp lệ (`random`, `simple`) |
| `packages/server/` | Server LAN: HTTP + WebSocket, giữ trạng thái gốc, token ghế, lưu trận (`docs/05-product-spec/multiplayer.md`) |
| `packages/client/` | Giao diện web (Vite, Preact + htm, three.js, SVG tự vẽ); không chứa luật. Kế hoạch và style guide ở `docs/07-ui/` |
| `scripts/` | `fetch-sources`, `audit-rule-coverage`, `snapshot-rules`, `rules-guard`, `rules-clause`, `pack-context`, `ship.sh` |
| `.githooks/` | Hook pre-commit chạy `rules-guard` |
| `backend/`, `web/` | Bản thử nghiệm cũ (Python, React/PixiJS). Chỉ để tham khảo; không thêm tính năng |

## Lệnh

```bash
npm install
npm run fetch:sources
npm run snapshot:rules
npm run rules:guard -- --refresh     # trước mọi việc đụng tới luật
npm run rules:clause -- 4.3.3        # in điều khoản + FAQ chính thức
npm run audit:rules
npm run typecheck
npm test
npm run build                        # dựng giao diện
npm run test:visual -w @root/client  # so ảnh ui-kit (docs/07-ui)
npm run serve -- --host 0.0.0.0      # chỉ khi người dùng yêu cầu chạy server
npm run ship -- "feat(engine): ..."   # rules:guard, kiểm tra, commit, push
npm run pack:context                 # gói ngữ cảnh cho AI không đọc được repo
```

Cần Node 22.18+ (chạy script `.ts` trực tiếp).
