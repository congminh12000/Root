# 0001. Viết lại thành TypeScript monorepo, có người chơi thật, dùng tên chính thức

- Ngày: 31/10/2026
- Trạng thái: Đã chấp nhận (người quản lý dự án chọn trong phiên làm việc)
- Căn cứ: tài liệu "Root 1" và "Root 2" (Notion của người quản lý), phần 4 và 9 của Root 2

## Bối cảnh

Bản thử nghiệm trước đó gồm engine Python (`backend/`), web xem trận React/PixiJS (`web/`), luật và nội dung tự thiết kế, chỉ có AI chơi với nhau. Root 2 đề xuất xây lại theo trình tự Official Rules → Game Data → Deterministic Engine → Tests → Multiplayer/Bot → UI → Expansions.

## Quyết định

1. **Ngôn ngữ:** TypeScript monorepo. Engine là TypeScript thuần, không phụ thuộc UI, chạy được headless hàng nghìn trận bot-vs-bot.
2. **Chế độ chơi:** người chơi thật qua mạng (lobby, đăng nhập, reconnect) cùng với bot. Chế độ chỉ xem AI vẫn giữ như một trường hợp: mọi ghế đều là bot.
3. **Tên và dữ liệu:** dùng tên phe, bản đồ và bộ bài chính thức. Ràng buộc kèm theo nằm ở [../licensing.md](../licensing.md).
4. **Ràng buộc chi phí vẫn giữ:** không dùng API trả phí, GPU thuê, hosting trả phí hay asset trả tiền. PostgreSQL, Redis và Docker chạy trên máy hoặc mạng LAN.

## Hệ quả

- `backend/` (Python) và `web/` (React/PixiJS) trở thành **mã tham khảo**: không phát triển tính năng mới ở đó và không xóa cho tới khi package TypeScript tương ứng thay thế được. Ý tưởng tái dùng được gồm replay kiểm chứng, tách thông tin ẩn, Monte Carlo search và painter bản đồ.
- Checkpoint neural và dữ liệu đánh giá cũ thuộc ruleset `grove-experimental-*`, không dùng được cho engine mới.
- Bản đồ `lakeside` và luật slot/Rune tự thiết kế không phải bản đồ Autumn; giữ lại làm tham khảo hình ảnh.
- Thứ tự gói: `packages/game-engine` (đã có schema) → `game-data` → `bot` → `server` → `web`.
