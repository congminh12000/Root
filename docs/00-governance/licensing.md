# Quyền sử dụng

Root, tên phe, hình ảnh, văn bản luật và lá bài thuộc **Leder Games**. Dự án chưa có giấy phép từ Leder Games.

## Quyết định hiện tại (31/10/2026)

- Dự án dùng **tên và dữ liệu chính thức** (Marquise de Cat, Eyrie Dynasties, Woodland Alliance, Vagabond, bản đồ Autumn, bộ bài chuẩn) để đối chiếu luật chính xác. Xem [decisions/0001-rewrite-scope.md](decisions/0001-rewrite-scope.md).
- **Chỉ dùng cá nhân / mạng LAN.** Không phát hành công khai, không đưa lên hosting công cộng, không thương mại hóa cho tới khi quyền sử dụng được làm rõ. Đây là tiêu chí bắt buộc của bản 1.0.
- **Không commit file PDF chính thức.** `.gitignore` chặn `docs/01-official-sources/**/*.pdf`; mỗi máy tự tải bằng `npm run fetch:sources`, và checksum trong manifest đảm bảo mọi người dùng cùng một bản.
- **Không sao chép hình ảnh chính thức** (art bàn cờ, minh họa phe, art lá bài) vào repo. Giao diện dùng hình tự vẽ hoặc tự sinh bằng code.
- **Ngoại lệ chỉ trên máy (04/11/2026, người quản lý yêu cầu):** mặt bài in (42 mẫu bài, 15 quest, 4 leader Eyrie, 3 nhân vật Vagabond) cắt từ ảnh chụp của người quản lý để dùng cá nhân / LAN. Ảnh gốc ở `docs/01-official-sources/card-art/`, ảnh cắt ở `packages/client/src/assets/official-cards/`, cả hai bị `.gitignore` chặn; tạo lại bằng `npm run cards:crop`. Máy không có ảnh thì client dùng mặt bài tự vẽ; ảnh mốc Playwright tắt mặt bài in (`VITE_OFFICIAL_CARDS=off`) nên không chứa art chính thức.
- **Ảnh phe từ Root Database (04/11/2026, người quản lý yêu cầu):** thông tin và hình phe (bảng phe hai mặt, quân, icon) lưu ở `docs/01-official-sources/rootdb/<phe>/`, bị `.gitignore` chặn. Client hiện chúng trong tab Bảng phe và UI kit khi có trên máy (`ui/official-factions.ts`), cùng công tắc `VITE_OFFICIAL_CARDS=off`.
- Văn bản lá bài và luật chỉ được trích ngắn khi cần dẫn chứng trong đặc tả và test. Dữ liệu cấu trúc (suit, chi phí, số lượng) được ghi lại cùng nguồn.

## Việc còn mở

- Hỏi Leder Games về chính sách fan project / digital adaptation trước khi công khai bất kỳ bản build nào.
- Media Kit trên Google Drive (SRC-007) chưa được mở. Chưa rõ asset trong đó được phép dùng ở đâu.
- Root Digital (Direwolf) chỉ dùng để tham khảo UX, không sao chép giao diện.
