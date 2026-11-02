# Kế hoạch giao diện Root 2

Tài liệu gốc cho mọi việc giao diện, dùng chung cho mọi model (AGENTS.md). Ba file:

- **README.md** (file này): công nghệ, kiến trúc, quy trình, lộ trình.
- [style-guide.md](style-guide.md): hợp đồng phong cách. Mọi màn hình và mọi mô hình 3D phải theo.
- [checklist.md](checklist.md): các phần giao diện cần có để chơi được trọn ván, và trạng thái từng phần.

Ảnh [reference/style-lakeside.jpg](reference/style-lakeside.jpg) do người quản lý gửi ngày 01/11/2026, **chỉ để tham khảo phong cách**, không phải bản đồ chính thức và không dùng trong game. Bản đồ Autumn sẽ làm khi người quản lý gửi tư liệu; topology vẫn lấy từ `packages/game-data`.

## 1. Công nghệ

| Phần | Chọn | Lý do |
|---|---|---|
| Bàn cờ | **three.js** (đang dùng, 0.170) | Đã có bàn 3D chạy được, miễn phí, chạy tốt trên M1. Phong cách tham khảo là tranh minh họa nhìn từ trên xuống: dựng bằng camera nghiêng cao, đổ bóng kiểu hoạt hình (toon) và viền mực, không cần engine khác. |
| Bàn 2D dự phòng | Đã bỏ (G7) | Màn trận chỉ có map 3D; máy không có WebGL thấy thông báo và vẫn chơi được bằng HUD (menu ☰ → Tất cả lựa chọn, nhật ký, bảng phe). |
| Phần HTML (tay bài, bảng phe, hộp quyết định, sảnh) | **Preact + @preact/signals**, viết bằng `htm` | Hiện giao diện dựng lại bằng chuỗi `innerHTML` mỗi lần cập nhật nên mất focus, mất vị trí cuộn, khó làm kéo thả và hộp thoại. Preact chỉ ~4 KB, MIT, viết JSX bằng TypeScript, không đổi cách build (Vite). |
| Màu, cỡ chữ, khoảng cách | **Design token** trong `packages/client/src/ui/tokens.ts` | Một nguồn duy nhất cho CSS (biến `--…`) và vật liệu three.js. |
| Font | Tự đóng gói qua `@fontsource` (OFL, chạy offline): **Pangolin** cho tiêu đề, **Be Vietnam Pro** cho chữ thường | Cả hai có đủ dấu tiếng Việt; Pangolin hợp nét vẽ tay. |
| Icon | SVG tự vẽ, một sprite | Cùng nét mực với bàn cờ; không dùng icon chính thức. |
| Kiểm tra hình | **Playwright** (Apache-2.0) chụp màn hình so sánh | Bắt lỗi lệch phong cách; chạy trên máy, không cần dịch vụ ngoài. |

Không dùng: engine game (Babylon, PlayCanvas), thư viện UI nặng (React + MUI), asset trả phí, art hay icon chính thức của Leder (licensing.md).

## 2. Kiến trúc client

```
packages/client/src/
  ui/tokens.ts           màu, chữ, khoảng cách, bo góc, bóng, thời lượng chuyển động
  ui/components/         nút, thẻ bài, chip phe, track, hộp thoại… (Preact)
  ui/screens/            sảnh, bàn chơi, kết thúc ván
  board/                 three.js: scenery, pieces, materials (toon + viền), camera, picking, motion
  board2d/               SVG dự phòng (board.ts hiện tại)
  interaction/           ánh xạ thao tác trên bàn → phần tử trong legalActions (không tự quyết luật)
  net/                   WebSocket, hàng đợi cập nhật
  ui-kit.html            trang trưng bày mọi component ở mọi trạng thái
```

Nguyên tắc giữ nguyên: client không chứa luật. Mọi thao tác cuối cùng là chọn **đúng một phần tử** của `legal` do server gửi; thao tác trên bàn chỉ là cách lọc danh sách đó (`interaction/`). Logic thuần (`describe.ts`, `motion.ts`, lọc hành động) có test bằng `node --test`.

## 3. Quy trình làm một phần giao diện

1. **Chọn mục** trong [checklist.md](checklist.md); ghi rõ trạng thái và dữ liệu cần (từ `PlayerView`, `legal`).
2. **Phác thảo trong ui-kit trước:** dựng component với dữ liệu giả, đủ mọi trạng thái (bình thường, hover, được chọn, không hợp lệ, đang chờ, lỗi, rỗng, nhiều phần tử). Chỉ dùng token, không viết mã màu trực tiếp.
3. **Nối vào trận thật**, dữ liệu từ `PlayerView`/`legal`; logic lọc đặt ở `interaction/` kèm test.
4. **Tự kiểm tra theo cổng chất lượng** (dưới đây), chụp màn hình.
5. **PR** kèm ảnh chụp và checklist đã đánh dấu; người quản lý duyệt hình rồi mới merge.

### Cổng chất lượng (mỗi PR giao diện)

- [ ] Chỉ dùng token; `npm test` có kiểm tra tự động không có mã màu hex ngoài `tokens.ts`.
- [ ] Theo style-guide: viền mực, bảng màu, ánh sáng, font, icon.
- [ ] Đủ trạng thái trong ui-kit; ảnh Playwright khớp (hoặc cập nhật có chủ đích, ghi lý do).
- [ ] Ảnh chụp ở 1440×900 và 1280×800, cả hai map (Autumn diorama, bàn cổ điển); tablet iPad ngang và dọc.
- [ ] Bàn phím dùng được (Tab, Enter, Esc); có `aria-label` cho nút chỉ có icon.
- [ ] Phân biệt phe và chất bằng **cả màu lẫn hình** (không chỉ màu).
- [ ] Tắt hoạt ảnh khi bật "giảm chuyển động".
- [ ] Chữ tiếng Việt, không tràn ở chuỗi dài nhất.
- [ ] Hiệu năng trên M1: bàn 3D ≥ 55 fps ở 1440p khi xoay; không thêm quá 2 MB vào bản build nếu không ghi lý do.
- [ ] Không dùng art, icon hay chữ trên lá bài chính thức ngoài tên và dữ liệu đã có.
- [ ] Typecheck, test, build sạch.

## 4. Lộ trình

Mỗi mốc là một hoặc vài PR nhỏ, theo thứ tự; mốc sau dựa trên mốc trước.

| Mốc | Nội dung | Xong khi |
|---|---|---|
| **UI-1 Nền phong cách** | `tokens.ts`, font, icon sprite đầu tiên, `ui-kit.html`, Playwright + ảnh gốc, kiểm tra cấm mã màu ngoài token | ui-kit hiện bảng màu, chữ, nút, chip phe/chất theo style-guide |
| **UI-2 Khung Preact** | Chuyển sảnh và khung bàn chơi sang Preact, giữ nguyên chức năng; WebSocket vào `net/` | Mọi test cũ qua, trận chơi được như trước, không mất focus khi cập nhật |
| **UI-3 Bàn cờ theo phong cách** | Toon + viền mực, nền cỏ/đất vẽ bằng shader hoặc canvas, cây thông/cây thu instanced, đường đất, quân và công trình mới; camera mặc định nghiêng cao | Ảnh bàn 3D đặt cạnh ảnh tham khảo thấy cùng "chất"; ≥ 55 fps |
| **UI-4 Thao tác trên bàn** | Bấm ô → chỉ các hành động ở ô đó; di chuyển bằng chọn ô đi rồi ô đến + số quân; đánh, xây, recruit trên bàn; thanh hành động theo ngữ cảnh | Chơi trọn một lượt Marquise không cần danh sách thả xuống |
| **UI-5 Tay bài và bảng phe** | Tay bài dạng quạt, bảng phe riêng cho 4 phe (track, decree, supporter, item Vagabond) | Mọi thông tin trên faction board giấy đều thấy được |
| **UI-6 Quyết định xen ngang** | Hộp thoại cho ambush, chia hit, Field Hospitals, Outrage, thứ tự hiệu ứng, bỏ bài; setup (chọn leader, nhân vật, đặt quân ban đầu) | Không còn quyết định nào phải chọn qua danh sách chung |
| **UI-7 Bản đồ Autumn** | Khi người quản lý gửi tư liệu: dựng Autumn theo phong cách đã chốt; nếu là ảnh chính thức thì chỉ nạp từ thư mục gitignored trên máy (licensing.md) | Bản đồ khớp topology trong game-data; ô/đường/rừng đúng chỗ |
| **UI-8 Hoàn thiện** | Màn kết thúc, nhật ký dễ đọc, âm thanh tùy chọn (tự làm hoặc CC0), hướng dẫn nhanh | Một người mới chơi hết ván với bot mà không cần hỏi |

### Trạng thái

- **UI-1 xong (01/11/2026):** `ui/tokens.ts` (mọi màu, chữ, khoảng cách, chuyển động; bàn 3D/2D giữ màu cũ trong nhóm `scene` tới UI-3), `ui/setup.ts` (font Latin + tiếng Việt, token, icon), `ui/icons.ts` (13 icon tự vẽ), `ui/parts.ts` (chip phe, pip chất, khung xúc xắc), `ui-kit.html`, `test/tokens.test.ts` (cấm mã màu ngoài token), Playwright `visual/` (ảnh gốc 1440 và 1280).
- **UI-2 xong (01/11/2026):** sảnh và màn trận viết lại bằng Preact + `htm` (template trong file `.ts`, không cần bước JSX, test Node chạy thẳng) và `@preact/signals`. `net/` giữ WebSocket (`connection.ts`), API (`api.ts`) và phần tính thay đổi giữa hai cập nhật (`changes.ts`, có test). Component chung ở `ui/components.ts`; màn hình ở `ui/screens/`; bàn three.js/SVG vẫn vẽ bằng code cũ trong `BoardView`, hoạt ảnh chỉ chạy một lần mỗi cập nhật (`changes.seq`). Khung lá bài, vị trí cuộn và lựa chọn đang xem giữ nguyên qua các lần cập nhật.
- **UI-3 xong (01/11/2026):** bàn 3D tách thành `board/geo.ts` (vị trí từ game-data), `board/toon.ts` (toon 3 nấc, viền mực inverted hull, cache geometry/vật liệu, nhãn có icon và font Pangolin), `board/scenery.ts` (nền vẽ tay trên canvas, thông 4 tầng và cây tròn instanced, đá, ô có viền mực và vòng màu chất), `board/pieces.ts` (quân phân biệt bằng hình). Camera mặc định nhìn cao như ảnh tham khảo, nút "Về góc mặc định". Bàn 2D cùng bảng màu, rừng thông nét mực, quân là icon phe. Nhóm màu tạm `scene` trong token đã bỏ. Trang `board-kit.html` dựng một vị trí cố định từ seed để so phong cách, đo hiệu năng (`board.measure(n)`) và chụp ảnh. Đo trên M1 Pro: khoảng 1 ms mỗi khung ở canvas 1912×1376.
- **UI-4 xong (01/11/2026):** `interaction/select.ts` gắn mỗi hành động hợp lệ với một điểm neo (đường đi, một ô, hoặc không ô) và một máy trạng thái chọn trên bàn; test chứng minh mọi hành động hợp lệ tới được đúng một lần trên hàng nghìn thế cờ ngẫu nhiên. Bàn 2D/3D có vòng mảnh cho ô bấm được và vòng đậm cho ô đang chọn. `ui/screens/action-bar.ts`: thanh hành động theo ngữ cảnh (hành động tại ô, chọn ô đến và số chiến binh, hành động chung dạng nút), danh sách đầy đủ gập lại; phím Esc, số, Enter. Đã chơi Marquise từ setup tới lượt 21 chỉ bằng bàn và nút. Ô hiện phe cai quản (`PlayerView.rulers` do engine tính, §2.5) và bấm ô mở thẻ "Thông tin ô" dưới bàn.
- **UI-5 xong (01/11/2026):** tay bài dạng quạt (`ui/screens/hand.ts`, lá bài nhỏ có dải chất, chi phí, item; lá dùng được viền vàng), bấm lá mở chi tiết kèm nút các hành động dùng lá đó (`interaction/cards.ts`, có test). Bảng điểm 0–30 có điểm đánh dấu phe. Bảng phe dạng tab cho 4 phe và tab Chung (`ui/screens/boards.ts`): track công trình, roost, sympathy, trà/tiền/túi với chi phí, điểm và ô thưởng rút bài lấy từ game-data; Decree, base, supporter, túi item, quan hệ, quest; kho item, quest đang mở, deck, chồng bỏ. 8 icon item tự vẽ. Ván mẫu cố định `dev/sample.ts` dùng cho ui-kit và board-kit.
- **UI-6 xong (01/11/2026):** `interaction/decisions.ts` diễn đạt quyết định đang chờ (ai, việc gì, điều khoản) từ `PlayerView.pending`; bước setup lấy tên theo số điều khoản. `ui/screens/decision.ts`: hộp quyết định khi mọi lựa chọn đều là nút (Ambush, chia hit, Field Hospitals, Outrage, thứ tự hiệu ứng, bỏ bài, chọn leader/nhân vật/rừng), có dòng battle, lá bài nhỏ cho lựa chọn bằng lá; Esc thu lại thành dải "Bạn cần quyết định". Người khác thấy dải "Đang chờ". Setup đặt quân trên bàn vẫn bấm ô. Sửa lỗi bảng phe khi phe chưa tới lượt setup; test render mọi tab ở mọi bước.

### Lệnh

```bash
npm run dev -w @root/client            # rồi mở /ui-kit.html
npm run test:visual -w @root/client    # build, chạy trên 127.0.0.1:4317, so ảnh ui-kit; map-kit kiểm tra giới hạn camera, không lộ nền, cảm ứng và ngân sách tải cho cả hai map (WebGL phần mềm không cho hai khung giống hệt nên không so từng điểm ảnh). Test đo GPU chạy `--workers=1`
npm run test:visual:update -w @root/client   # chỉ khi cố ý đổi hình; ghi lý do trong PR
```

Lần đầu trên máy mới: `npx playwright install chromium` (tải một lần, miễn phí). Ảnh gốc phải chụp trên máy phát triển của dự án (macOS, Chromium của Playwright đã cài ở đó). Agent chạy trong môi trường khác (sandbox, CI) đừng ghi đè ảnh gốc: các ô nhập gốc của trình duyệt vẽ lệch vài điểm ảnh, như lần ảnh ui-kit 01/11 phải chụp lại. Không nới ngưỡng.

Mốc UI-1 và UI-2 nên làm trước mọi thứ: nếu chưa có token và component chung, các phần sau sẽ lệch phong cách.

- **UI-8 (01/11/2026):** `finish.ts`: kết quả từ `PlayerView.winner`, lý do tiếng Việt, điểm cuối cho mọi ghế và liên kết về sảnh; nhật ký công khai đầy đủ trong cửa sổ server gửi (tối đa 80 dòng), bấm để đánh dấu ô; hướng dẫn nhanh và chú giải gập được. `sound.ts`: tiếng gõ tự tổng hợp bằng Web Audio, mặc định tắt và chỉ bật sau thao tác người dùng; không dùng asset bên ngoài. Có test vị trí nhật ký, kết quả ba loại thắng, trạng thái rỗng và test bàn phím hướng dẫn. Chưa xác nhận tiêu chí người mới tự chơi hết ván bằng thử nghiệm người dùng.

## Gameplay "chỉ có map" (G0–G7)

Màn trận chỉ còn map full màn hình, mọi thao tác trên map. Kế hoạch, lộ trình và trạng thái: [gameplay-map-only.md](gameplay-map-only.md).

## Autumn — bản dựng chờ duyệt (UI-7)

`/autumn-kit.html` dựng Autumn theo quy trình Lake: dữ liệu chơi từ game-data, cảnh trang trí đo theo ảnh tham chiếu giữ ngoài repo. Xem [autumn-preview.md](autumn-preview.md).

## Lake — bản duyệt riêng

Theo kế hoạch người quản lý duyệt, `/lake-kit.html` là bản dựng hình Lake riêng, có 22 nền xây và 4 Ruin; bố cục và slot/Ruin đã được người quản lý duyệt. Lake chưa nối vào game hoặc thay thế UI-7 Autumn. Xem [thiết kế và trạng thái duyệt](lake-preview.md).
