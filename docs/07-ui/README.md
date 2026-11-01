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
| Bàn 2D dự phòng | SVG (đang có) | Cho máy không có WebGL và để test; cùng token màu. |
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
- [ ] Ảnh chụp ở 1440×900 và 1280×800; bàn 3D và 2D.
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

### Lệnh

```bash
npm run dev -w @root/client            # rồi mở /ui-kit.html
npm run test:visual -w @root/client    # build, chạy trên 127.0.0.1:4317, so ảnh với visual/__screenshots__
npm run test:visual:update -w @root/client   # chỉ khi cố ý đổi hình; ghi lý do trong PR
```

Lần đầu trên máy mới: `npx playwright install chromium` (tải một lần, miễn phí). Ảnh gốc chụp trên macOS; máy khác có thể lệch font, khi đó tạo ảnh gốc riêng chứ không nới ngưỡng.

Mốc UI-1 và UI-2 nên làm trước mọi thứ: nếu chưa có token và component chung, các phần sau sẽ lệch phong cách.
