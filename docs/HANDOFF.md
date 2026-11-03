# Bàn giao — 03/11/2026

Quy tắc lâu dài nằm trong [AGENTS.md](../AGENTS.md), gồm mục **Tiết kiệm ngữ cảnh và công cụ**. File này chỉ lưu trạng thái để tiếp tục; xác minh git/PR trước khi dùng thông tin có thể đã thay đổi.

## Trạng thái

- `main`: engine bốn phe, bot, multiplayer LAN, map Autumn và giao diện mô hình; chi tiết xem git/PR và tài liệu chuyên đề.
- PR #21 (nhãn bìa, tự hạ chất lượng) và #22 (tay bài không khung, hover nâng từng lá) đã merge.
- [PR #26](https://github.com/congminh12000/Root/pull/26), nhánh `feat/ambush-illustrated-backgrounds`, commit `7c1ea15`: đang chờ duyệt/merge. Gồm bốn tranh Ambush theo suit, bỏ số điều khoản khỏi phần hiển thị bài, chữ nhỏ regular, viền mỏng 50%, giấy vàng có vết rách cho Ambush/immediate/item. Không đổi luật.
- PR #26 đã qua typecheck, npm test, audit luật, build; 9 test UI kit và 2 lần đối chiếu ảnh chuẩn cuối đều qua. Đã xem ảnh render. Chưa thử trên thiết bị cảm ứng thật. Server test tạm đã tắt.

## Việc tiếp theo

- Tiếp tục feedback mặt bài trên PR #26; chỉ merge khi người quản lý đồng ý. File chính: `packages/client/src/ui/card-face.ts`, `card-text.ts`, `card-art.ts`, `style.css`, `ui/tokens.ts`; tranh ở `src/assets/cards/` của client.
- Lake mới là preview, chưa nối game/chưa duyệt hình: [lake-preview.md](07-ui/lake-preview.md).
- UI-7 Autumn còn chờ duyệt hình; UI-8 còn thử với người mới: [autumn-preview.md](07-ui/autumn-preview.md), [new-player-session.md](07-ui/new-player-session.md).
- Bot chưa được đánh giá với người chơi giỏi; chưa đo lại mốc FPS trên GPU M1 thật sau các bổ sung đồ họa.

## Điểm vào theo nhiệm vụ

- Gameplay: nguồn luật và quy trình trong AGENTS; [engine-api.md](04-engine-spec/engine-api.md), [rule-coverage.yaml](06-qa/rule-coverage.yaml) — chỉ đọc điều khoản liên quan.
- UI: [style-guide.md](07-ui/style-guide.md), [tabletop.md](07-ui/tabletop.md). Ngân sách tải trong `packages/client/visual/map.spec.ts`.
- LAN: [multiplayer.md](05-product-spec/multiplayer.md). Không tự mở server dài hạn.

Không mặc định cài lại dependency hoặc tải lại mọi nguồn khi mở phiên. Chỉ thực hiện khi thiếu/cần cập nhật; việc đụng luật vẫn bắt buộc `rules:guard -- --refresh` theo AGENTS.
