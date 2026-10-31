# Test matrix và rule coverage

Nguồn dữ liệu là [rule-coverage.yaml](rule-coverage.yaml): mỗi điều khoản trong phạm vi bản 1.0 (chương 1–9, C.1, M.1, V.1–V.3) là một bản ghi. Số điều khoản giống nhau ở Rules Library p16 (nguồn chính) và PDF 13/10/2025; `page` là số trang trong PDF.

## Vòng đời `status`

| Status | Nghĩa | Điều kiện |
|---|---|---|
| `needs_source_verification` | Chưa tìm thấy điều khoản trong nguồn | Không được triển khai |
| `source_located` | Đã có số điều khoản và trang trong PDF | Mặc định hiện tại |
| `specified` | Đã có đặc tả hành vi trong `docs/02-rules-spec/` | Trường `spec` trỏ tới file spec có tiêu đề `### ROOT-<section> …` |
| `implemented` | Code và test đã có | `implementation` và `tests` không rỗng, file tồn tại |
| `verified` | Người duyệt đã đối chiếu luật và code | `review.rules_verified` và `review.implementation_verified` đều true |
| `out_of_scope` | Điều khoản cần expansion, không thuộc bản 1.0 | `spec` ghi lý do; không chặn phát hành |

Bản ghi `group: true` là đề mục có điều khoản con; coverage tính trên điều khoản con.

## Lệnh

```bash
npm run audit:rules
```

`npm run audit:rules -- --release` thất bại khi còn điều khoản chưa `verified`. Đây là gate phát hành.

## Quy tắc

- Không tự điền số điều khoản. Điều khoản mới phải có trong Rules Library p16.
- Mỗi điều khoản `implemented` cần ít nhất một test hợp lệ và một test không hợp lệ (vd. `movement-valid.test.ts`, `movement-invalid.test.ts`).
- Golden scenario (trạng thái đầu, chuỗi command, lựa chọn, kết quả RNG, trạng thái cuối) nằm trong `docs/06-qa/golden-scenarios/`. Kịch bản đầu tiên lấy từ SRC-003 Walking Through Root.
