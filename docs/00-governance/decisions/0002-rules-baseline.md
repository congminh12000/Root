# 0002. Khóa baseline luật: The Law of Root, 13/10/2025

- Ngày: 31/10/2026
- Trạng thái: Đã chấp nhận. Phần baseline được thay bằng [0005](0005-rules-library-primary.md): nguồn chính giờ là Rules Library p16; phạm vi và cách đặt ID vẫn giữ.

## Quyết định

- Baseline là **SRC-001**, `Root_Base_Law_Oct_2025.pdf`, sha256 `d32c8c06…c045`. Trong code, `rulesVersion = "law-2025-10-13"`.
- Phạm vi bản 1.0: chương 1–9, Standard Setup (§5.1), bản đồ Autumn (§M.1), nhân vật Vagabond Thief/Tinker/Ranger (§V.1–V.3) và thành phần bộ cơ bản (§C.1). Advanced Setup (App. A), expansion, hireling và landmark nằm ngoài phạm vi.
- ID luật là `ROOT-<số điều khoản>` (vd. `ROOT-4.2.1`). Số điều khoản lấy trực tiếp từ PDF nên truy ngược được ngay, không cần bảng tra riêng.
- Không trộn luật từ bản in khác. Bản Law 2024-09-05 và 2022-06-10 vẫn có trên trang Resources nhưng không dùng.

## Khi đổi baseline

Phải có quyết định mới, changelog các điều khoản thay đổi, cập nhật `rule-coverage.yaml` và chạy lại regression. Trận đã lưu giữ `rulesVersion` cũ và replay bằng đúng phiên bản đó.
