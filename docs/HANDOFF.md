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

## Còn lại

| Việc | Ghi chú |
|---|---|
| Giao diện theo phong cách mới | UI-1 → UI-6 xong; UI-7: bản dựng Autumn `/autumn-kit.html` chờ duyệt (`docs/07-ui/autumn-preview.md`); UI-8 đã triển khai (kết quả, nhật ký, hướng dẫn nhanh, âm thanh); còn thử với người mới. Lộ trình, quy trình, checklist ở `docs/07-ui/` |
| Gameplay chỉ có map | G0, G1 xong (map full màn hình, camera có giới hạn, apron); tiếp G2. Xem `docs/07-ui/gameplay-map-only.md` |
| Lake 3D — bản duyệt riêng | `/lake-kit.html`: cảnh và slot tương tác; bố cục và slot/Ruin đã được người quản lý duyệt; chưa nối vào game. Xem `docs/07-ui/lake-preview.md` |
| Thử với người chơi thật | Bot chưa được đo với người giỏi |

## Quy ước

- Mọi hành động hợp lệ sinh trong `legalActions`; `applyCommand` chỉ chấp nhận đúng một phần tử của danh sách đó.
- Quyết định xen ngang đi qua stack `pending`; battle tiếp tục bằng `continueBattle` sau mỗi quyết định.
- Mỗi bước: test hợp lệ + không hợp lệ cho từng điều khoản, cập nhật `rule-coverage.yaml`, rồi chạy `npm run ship -- "feat(engine): ..."` (kiểm tra, commit, push; không chạy trên `main`).
- Người quản lý trao đổi bằng tiếng Việt, muốn mỗi bước một commit và báo cáo 6 phần (AGENTS.md).
