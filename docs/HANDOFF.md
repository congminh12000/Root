# Bàn giao: tiếp tục engine Root

Đọc [AGENTS.md](../AGENTS.md) trước. File này chỉ ghi phần đang dở và cách làm tiếp.

## Bắt đầu

```bash
npm install
npm run fetch:sources     # PDF chính thức (gitignored)
npm run snapshot:rules    # Rules Library p16 + FAQ, nguồn luật chính (decisions/0005)
npm run typecheck && npm test && npm run audit:rules
```

## Đã xong (nhánh `feat/root2-foundation`)

- Nguồn luật, dữ liệu (bản đồ Autumn, 54 lá, quest, faction board, xúc xắc), đặc tả `docs/02-rules-spec/`. Không còn vấn đề mở về luật.
- Bước 1: khung engine. Bước 2: luật chung (rule, move, craft, battle, ghi điểm, thắng, dominance, Field Hospitals).
- Bước 3–6: luồng lượt và lượt đầy đủ của Marquise, Eyrie, Alliance, Vagabond (`turn.ts`, `factions/*.ts`). Outrage, mất base, quan hệ/Hostile/Infamy, chiến binh Allied, coalition.
- Hiệu ứng 7 lá persistent ngoài battle (`cards.ts`).
- Bước 7 (một phần): bot ngẫu nhiên chơi trọn trận trong `npm test`, kiểm tra bảo toàn quân và bài sau mỗi command, và replay. Đã chạy 2.000 trận ngẫu nhiên: 0 lỗi.
- Multiplayer LAN: `packages/server` (HTTP + WebSocket, token ghế, lưu và dựng lại trận), `packages/client` (sảnh, bản đồ SVG, bảng chọn hành động), `packages/bots` (`random`, `simple`). Xem `docs/05-product-spec/multiplayer.md`.

## Đã xong thêm (nhánh `feat/root2-next`)

- Thời hạn 90 giây cho mỗi lựa chọn của người chơi; hết giờ thì bot `search-fast` chọn thay một lần.
- Mật khẩu phòng (`--password`) và giới hạn số trận (`--max-games`).
- Bot `search`: tìm kiếm Monte Carlo trên thông tin ẩn được đoán, chỉ dùng `PlayerView`.
- Bàn chơi 3D bằng Three.js, bấm vào ô để lọc lựa chọn; vẫn giữ bản 2D.
- Review toàn bộ điều khoản với p16: 140 điều `verified`. Sửa 2 lỗi: thời điểm xáo lại deck (§2.1) và Rest lật item ngửa (§9.6.1).
- Golden scenario Walking Through Root (SRC-003): chơi lại ván mẫu 2 vòng, khớp sách từng bước. Xem `docs/06-qa/golden-scenarios/walking-through-root.md`.

## Đã xong thêm (nhánh `feat/root2-polish`)

- §1.1.3 / §4.3.6: Field Hospitals, Outrage và bỏ bớt supporter sinh ra cùng lúc thì người chọn được chọn thứ tự (`order.ts`, hành động `order-effects`). Trong battle, hit của cả hai bên được gỡ xong rồi mới xử lý hiệu ứng.
- Bot chạy trong worker thread (`packages/server/src/bot-pool.ts`).
- Khung xem chi tiết lá bài; hoạt ảnh ô thay đổi và điểm (2D và 3D).
- Quân chạy dọc đường khi di chuyển (2D trượt, 3D nhảy vòng cung); khung xúc xắc hiện mặt tung và số hit mỗi bên.
- Dùng được với model khác: `AGENTS.md` là nguồn hướng dẫn duy nhất; `rules:guard` (chạy trong `ship` và pre-commit) bắt buộc kiểm tra bản chụp luật khi đụng tới luật; `rules:clause` in điều khoản; `pack:context` gói ngữ cảnh cho chat web.

## Trạng thái hiện tại (2/11/2026)

- `main` đã gồm mọi việc trên, cộng PR #17 (gameplay chỉ có map, G0–G7), #18 (mặt lá bài) và #19 (đồ hoạ bàn cờ mô hình thật, R0–R7).
- PR #21 (nhãn bìa và tự hạ chất lượng theo FPS) đã merge theo yêu cầu người quản lý.
- Nhánh `feat/visible-hand-cards`: tay bài luôn hiện ở mép dưới, cuộn ngang khi dài; hover/focus nâng mặt lá trong 240 ms, vùng bấm cố định và hỗ trợ giảm chuyển động. Đã qua typecheck, test, audit luật, build và kiểm tra trình duyệt 1440/834/390 px. Hai ảnh UI kit cập nhật do thay bố cục tay bài và hướng dẫn. Chưa merge.
- Mặt lá bài: 54 lá và 15 quest vẽ bằng code (`packages/client/src/ui/card-face.ts`, `card-art.ts`, `card-text.ts`). Tên lá giữ tiếng Anh, chữ hiệu ứng tiếng Việt kèm số điều khoản.
- Đồ hoạ: vật liệu theo vai trò ở `board/look.ts`, kết cấu sinh trong worker (`board/texture-gen.ts`), ánh sáng `board/light.ts`, hậu kỳ `map/post.ts`, mức chất lượng `map/quality.ts` (`full`/`tablet`/`low`, ép bằng `?quality=`).

## Còn lại

| Việc | Ghi chú |
|---|---|
| Duyệt nhãn bìa | Đã dựng thẻ bìa cho số quân/cai quản (cả di chuyển); chờ duyệt ảnh trong PR |
| Duyệt cơ chế tự hạ chất lượng | Đã đo lúc bàn hoạt động, hạ `full` → `tablet` → `low`; có cửa sổ đo và thời gian chờ, giữ mức khi ép `?quality=` |
| Duyệt lại Lake | `/lake-kit.html` đã dùng vật liệu và ánh sáng mới nhưng chưa chụp ảnh cho người quản lý duyệt; chưa nối vào game (`docs/07-ui/lake-preview.md`) |
| Giao diện | UI-7: bản dựng Autumn `/autumn-kit.html` chờ duyệt (`docs/07-ui/autumn-preview.md`); UI-8 đã bổ sung hướng dẫn ván đầu; còn thử với người mới theo `docs/07-ui/new-player-session.md`. Lộ trình, checklist ở `docs/07-ui/` |
| Thử với người chơi thật | Bot chưa được đo với người giỏi |

## Ghi chú khi chuyển sang agent khác (Codex Local…)

- Codex tự đọc `AGENTS.md`; đọc tiếp file này. Không cần `pack:context` vì agent đọc được repo.
- Việc giao diện: đọc `docs/07-ui/style-guide.md` (bản v2, hướng mô hình thật) và `docs/07-ui/tabletop.md` trước khi sửa. Mọi màu nằm trong `packages/client/src/ui/tokens.ts`; test token báo lỗi nếu có màu literal ở chỗ khác.
- Tốc độ tải là ưu tiên số một. Ngân sách đo trong `packages/client/visual/map.spec.ts`; khung hình đầu không được chậm hơn trước. Mọi thứ nặng (kết cấu, environment, hậu kỳ, apron, cảnh động) nạp sau khung hình đầu.
- `npm run test:visual -w @root/client`: test đo GPU chạy `--workers=1`. Ảnh gốc chỉ chụp lại trên máy phát triển (MacBook M1 Pro), khi cố ý đổi hình, và ghi lý do trong PR.
- Không bỏ qua hook bằng `--no-verify`. Không tự merge; chờ người quản lý đồng ý.
- Dòng ký tên trong commit và PR theo công cụ đang dùng; đừng chép dòng `Co-Authored-By: Claude` của commit cũ.

## Quy ước

- Mọi hành động hợp lệ sinh trong `legalActions`; `applyCommand` chỉ chấp nhận đúng một phần tử của danh sách đó.
- Quyết định xen ngang đi qua stack `pending`; battle tiếp tục bằng `continueBattle` sau mỗi quyết định.
- Mỗi bước: test hợp lệ + không hợp lệ cho từng điều khoản, cập nhật `rule-coverage.yaml`, rồi chạy `npm run ship -- "feat(engine): ..."` (kiểm tra, commit, push; không chạy trên `main`).
- Người quản lý trao đổi bằng tiếng Việt, muốn mỗi bước một commit và báo cáo 6 phần (AGENTS.md).
