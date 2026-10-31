# Quyền sử dụng

Root, tên phe, hình ảnh, văn bản luật và lá bài thuộc **Leder Games**. Dự án chưa có giấy phép từ Leder Games.

## Quyết định hiện tại (31/10/2026)

- Dự án dùng **tên và dữ liệu chính thức** (Marquise de Cat, Eyrie Dynasties, Woodland Alliance, Vagabond, bản đồ Autumn, bộ bài chuẩn) để đối chiếu luật chính xác. Xem [decisions/0001-rewrite-scope.md](decisions/0001-rewrite-scope.md).
- **Chỉ dùng cá nhân / mạng LAN.** Không phát hành công khai, không đưa lên hosting công cộng, không thương mại hóa cho tới khi quyền sử dụng được làm rõ. Đây là tiêu chí bắt buộc của bản 1.0.
- **Không commit file PDF chính thức.** `.gitignore` chặn `docs/01-official-sources/**/*.pdf`; mỗi máy tự tải bằng `npm run fetch:sources`, và checksum trong manifest đảm bảo mọi người dùng cùng một bản.
- **Không sao chép hình ảnh chính thức** (art bàn cờ, minh họa phe, art lá bài) vào repo. Giao diện dùng hình tự vẽ hoặc tự sinh bằng code.
- Văn bản lá bài và luật chỉ được trích ngắn khi cần dẫn chứng trong đặc tả và test. Dữ liệu cấu trúc (suit, chi phí, số lượng) được ghi lại cùng nguồn.

## Việc còn mở

- Hỏi Leder Games về chính sách fan project / digital adaptation trước khi công khai bất kỳ bản build nào.
- Media Kit trên Google Drive (SRC-007) chưa được mở. Chưa rõ asset trong đó được phép dùng ở đâu.
- Root Digital (Direwolf) chỉ dùng để tham khảo UX, không sao chép giao diện.
