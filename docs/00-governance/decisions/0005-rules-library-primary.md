# 0005. Nguồn luật chính là Leder Rules Library, printing p16

- Ngày: 31/10/2026
- Trạng thái: Đã chấp nhận (người quản lý dự án yêu cầu). Thay phần "baseline" của [0002](0002-rules-baseline.md).
- Nguồn: SRC-004, https://rules.ledergames.com/?product=root&locale=en-US&printing=p16

## Quyết định

1. **Rules Library p16 là nguồn luật chính** cho mọi điều khoản và cho FAQ chính thức. Khi viết hoặc sửa spec, đọc bản chụp `docs/01-official-sources/base/rules-library-root-p16.json` trước. PDF 13/10/2025 (SRC-001) chỉ còn để đối chiếu và tra số trang.
2. **FAQ trong Rules Library là phán quyết chính thức.** Khi FAQ trả lời một câu hỏi thì dùng FAQ, và FAQ thắng các phán quyết dự án tự ghi (vd. decisions/0004).
3. Số điều khoản giữ nguyên, vì p16 đánh số giống PDF. ID `ROOT-<section>` không đổi. Trong code, `rulesVersion = "rules-library-p16"`.
4. **Theo dõi cập nhật:** Leder sửa bản online mà không đổi link. Trước mỗi mốc phát hành, chạy `npm run snapshot:rules`. Nếu checksum khác manifest:
   - so các điều khoản đã đổi;
   - cập nhật spec và test;
   - ghi changelog vào quyết định mới;
   - cập nhật checksum trong manifest.

## Đối chiếu ngày 31/10/2026 (đóng OQ-02)

Trong phạm vi base có 283 điều khoản, nội dung luật của p16 và PDF trùng nhau. Chỉ khác câu chữ, không đổi nghĩa:
- §4.2: "choose any number" thay cho "take any number".
- G.4: thêm câu "The term cannot is absolute…", giống §1.1.2.

## FAQ chính thức ảnh hưởng tới spec

| FAQ | Nội dung | Ảnh hưởng |
|---|---|---|
| §6.2.2, §8.4.1 | Không Revolt được ở clearing có keep: cần sympathy trước, mà người khác không được place quân ở đó | **Sửa** spec Marquise (trước đây ghi là hợp lệ) |
| §4.3.1, §6.2.3 | Bị ambush ở clearing có keep: Field Hospitals đặt quân lại **ngay** nếu spend lá, nên có thể tránh kiểm tra "không còn quân attacker" | Thêm vào spec battle |
| §7.8.4 | Despot: chỉ thêm 1 điểm dù remove nhiều quân cùng lúc | Xác nhận OQ-15 |
| §8.2.6, §9.2.9 | Kéo chiến binh Allied vào clearing sympathetic không gây Outrage (đổi từ bản in thứ 8, do dùng "Force") | Xác nhận OQ-16 |
| §9.2.8 | Không lập coalition với người đã kích hoạt dominance; người trong coalition vẫn kích hoạt dominance được | Thêm vào spec Vagabond |
| §4.3, §9.2.8 | Hai bên coalition không battle nhau | Đã có trong spec |
| §7.7, §7.8.3 | Charismatic còn 1 chiến binh: đặt 1 (tối đa có thể) rồi mới xét Turmoil | Đã có (§1.5.4) |
| §7.7 | Cột Decree trống không gây Turmoil; không làm trọn một lá thì Turmoil ngay | Đã có |
| §9.2.9.III | Vagabond chỉ remove building/token (không có chiến binh) thì không thành Hostile | Đã có |
| §9.2.9.III.a | Strike không được Infamy | Đã có |
| §8.2.6 | Place quân vào clearing sympathetic không gây Outrage; pawn Vagabond đi vào cũng không | Đã có |

Các phán quyết OQ-10, 11, 13, 14, 17 trong 0004 chưa có FAQ tương ứng nên giữ nguyên.
