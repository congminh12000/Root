# 0003. Bắt buộc tổng Reach khi chọn phe

- Ngày: 31/10/2026
- Trạng thái: Đã chấp nhận (người quản lý dự án chọn, đóng OQ-08)

## Bối cảnh

Law §5.1.1 cho phép gán phe tùy ý. §5.2 chỉ khuyến nghị tổng Reach tối thiểu để trận cân bằng: 2 người 17+, 3 người 18+, 4 người 21+. Reach của bốn phe cơ bản là Marquise 10, Eyrie 7, Vagabond 5 và Alliance 3.

## Quyết định

Lobby và `createGame` **từ chối** mọi bộ phe có tổng Reach dưới mức của số người chơi. Áp dụng như nhau cho người chơi thật và bot. Đây là luật sản phẩm chặt hơn Law, không phải luật Law.

Với bốn phe cơ bản, các bộ được phép là:

| Số người | Bộ phe hợp lệ |
|---|---|
| 2 | Marquise + Eyrie (17) |
| 3 | Marquise + Eyrie + Vagabond (22), Marquise + Eyrie + Alliance (20), Marquise + Vagabond + Alliance (18) |
| 4 | Cả bốn phe (25) |

## Hệ quả

- Mọi trận đều có Marquise. Alliance và Vagabond chỉ xuất hiện trong trận 3 hoặc 4 người.
- Dữ liệu bot tự chơi chỉ gồm các bộ trên, nên bot không học được bộ thiếu Marquise. Nếu sau này muốn mở rộng thì cần quyết định mới.
- Khi thêm phe mở rộng, bảng Reach lấy theo §5.2 và tập bộ hợp lệ tự mở rộng theo.
- Số liệu nằm ở `REACH` và `MIN_REACH` trong `@root/game-data`. Hàm kiểm tra là `factionMixAllowed` trong `@root/game-engine`.
