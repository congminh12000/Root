# Autumn — bản dựng 3D chờ duyệt (UI-7)

Ngày 02/11/2026. Làm theo quy trình của Lake ([lake-preview.md](lake-preview.md)), theo kế hoạch người quản lý duyệt trong chat: dựng bản xem thử riêng trước, người quản lý duyệt hình, rồi mới thay bàn 3D trong trận.

## Nguồn và phạm vi

- **Dữ liệu chơi lấy từ game-data (`AUTUMN`), không đổi:** 12 clearing (vị trí `at`, chất), số slot và số Ruin mỗi clearing, 18 đường, kho item. Test `test/autumn.test.ts` bắt mọi lệch khỏi game-data.
- **Cảnh trang trí đo theo ảnh tham chiếu người quản lý gửi ngày 02/11/2026:** sông, hồ mép trái, cầu, vách đá, nhà, cây. Ảnh đó là art chính thức của Leder nên chỉ để trên máy ở `docs/01-official-sources/map-art/` (gitignored), không đưa vào repo, không dùng làm nền. Logo không được vẽ lại. Mọi hình đều sinh từ code, token và icon tự vẽ.
- Sông và cầu là trang trí: luật cơ bản không dùng sông. Cầu tự đặt ở chỗ đường cắt sông.
- Slot R: luật chỉ quy định số Ruin (§2.2.4); bản dựng đặt R ở slot cuối của clearing đó.
- Không sửa engine, game-data hay rule coverage.

## Mã

- `packages/client/src/autumn/layout.ts`: bố cục. Clearing từ game-data; slot xếp ở nửa sau clearing để chừa chỗ cho quân; sông và hồ được vẽ vòng tránh mọi clearing; đường nối mép clearing theo `AUTUMN.paths`; cây quanh clearing nhuộm theo chất (cáo đỏ, chuột cam, thỏ vàng) như ảnh tham chiếu.
- `packages/client/src/autumn/scene.ts`: cảnh dùng camera trực giao cùng vật liệu mô hình và ánh sáng `board/look.ts`, `board/light.ts`. Huy hiệu chất luôn hiện vì là thông tin chơi; số clearing/slot bật bằng ô chọn.
- `packages/client/src/autumn/demo.ts`, `autumn-kit.html`: trang duyệt, cùng công cụ với `lake-kit.html`. Code Lake không bị sửa.

## Kiểm chứng

- `test/autumn.test.ts`: khớp game-data; slot nằm trên đất trống (không nước, sông, đá, đường, cây, nhà, không chồng nhau); sông và nhà tránh mọi clearing; đường chỉ chạm hai clearing của nó và không qua nước hoặc đá; có cầu ở chỗ đường cắt sông.
- `visual/autumn.spec.ts`: 1440×900 và 1280×800, raycast chọn slot trên bàn, chọn bằng bàn phím, đặt/gỡ năm mẫu công trình, dọn Ruin, khôi phục, xoay/zoom, đo 30 khung. Ảnh duyệt ở [reference/autumn-review/](reference/autumn-review/).

**Trạng thái cập nhật 02/11/2026:** Autumn diorama đã là bàn mặc định trong trận từ G1–G7 (`map/autumn-theme.ts`, `map/choice.ts`). Bản xem thử `/autumn-kit.html` vẫn để duyệt bố cục và slot. Còn chờ người quản lý duyệt hình UI-7; không đánh dấu hoàn tất chỉ vì đã nối vào game. Ảnh kiểm tra mới được test tạo trong `packages/client/test-results/autumn-review/` (1440×900 và 1280×800); ảnh bàn trong trận và nhãn mới ở `test-results/map-review/`.


Ảnh duyệt lưu cùng thay đổi: [Autumn 1440×900](reference/tabletop/labels-review/autumn-1440.png). Ảnh cận bàn trong trận có nhãn bìa mới: [Autumn](reference/tabletop/labels-review/labels-autumn-close.png). Chờ duyệt hình UI-7, chưa ghi nhận là đã được người quản lý chấp nhận.
