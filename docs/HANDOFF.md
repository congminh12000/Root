# Bàn giao: tiếp tục engine Root

Đọc [AGENTS.md](../AGENTS.md) trước. File này chỉ ghi phần đang dở và cách làm tiếp.

## Bắt đầu

```bash
npm install
npm run fetch:sources     # PDF chính thức (gitignored)
npm run snapshot:rules    # Rules Library p16 + FAQ, nguồn luật chính (decisions/0005)
npm run typecheck && npm test && npm run audit:rules
```

## Đã có

- Nguồn luật, dữ liệu (bản đồ Autumn, 54 lá, quest, faction board, xúc xắc), đặc tả `docs/02-rules-spec/`. Không còn vấn đề mở về luật; 140 điều đã `verified` với p16.
- Engine đủ luật chung và lượt đầy đủ của bốn phe; thứ tự hiệu ứng đồng thời (`order.ts`); golden scenario Walking Through Root khớp sách.
- Bot `random`, `simple`, `search` (Monte Carlo chỉ trên `PlayerView`), chạy trong worker thread; 2.000 trận ngẫu nhiên không lỗi.
- Multiplayer LAN (`packages/server`): token ghế, lưu trận, mật khẩu phòng, hạn 90 giây mỗi lựa chọn. Xem `docs/05-product-spec/multiplayer.md`.
- Hàng rào cho mọi model: `rules:guard`, `rules:clause`, `audit:rules`, `pack:context`.
- Chi tiết từng bước nằm trong git log và các PR đã merge.

## Trạng thái hiện tại (2/11/2026)

- `main` đã gồm mọi việc trên, cộng PR #17 (gameplay chỉ có map, G0–G7), #18 (mặt lá bài) và #19 (đồ hoạ bàn cờ mô hình thật, R0–R7).
- PR #21 (nhãn bìa và tự hạ chất lượng theo FPS) đã merge theo yêu cầu người quản lý.
- Nhánh `feat/visible-hand-cards`: tay bài không khung/tiêu đề, 1/3 lá nằm dưới mép màn hình; cuộn ngang khi dài, hover/focus nâng riêng lá đó trong 240 ms. Vùng bấm cố định; giảm chuyển động chuyển vị trí tức thì. Đã qua typecheck, test, audit luật, build và kiểm tra trình duyệt 1440/834/390 px. Hai ảnh UI kit cập nhật do thay bố cục tay bài và hướng dẫn. Chưa merge.
- Mặt lá bài: 54 lá và 15 quest vẽ bằng code (`packages/client/src/ui/card-face.ts`, `card-art.ts`, `card-text.ts`). Tên lá giữ tiếng Anh, chữ hiệu ứng tiếng Việt kèm số điều khoản.
- Đồ hoạ: vật liệu theo vai trò ở `board/look.ts`, kết cấu sinh trong worker (`board/texture-gen.ts`), ánh sáng `board/light.ts`, hậu kỳ `map/post.ts`, mức chất lượng `map/quality.ts` (`full`/`tablet`/`low`, ép bằng `?quality=`).

## Bổ sung 03/11/2026

- Nhánh `feat/ambush-illustrated-backgrounds`: dùng bốn tranh Ambush đã tạo trong chat theo suit, thêm hàng xem đủ bốn lá ở UI kit. Ảnh lưu trong `packages/client/src/assets/cards/`; chưa merge.
- Chỉnh card theo feedback: ẩn số điều khoản ở lớp hiển thị, giảm tiêu đề/chữ nội dung, viền mỏng 50%; giấy vàng có vết rách cho Ambush, dùng ngay và item. Nguồn luật và nội dung hiệu ứng giữ nguyên.

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
