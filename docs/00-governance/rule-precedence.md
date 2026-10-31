# Thứ tự ưu tiên luật

Engine phải giải quyết xung đột theo đúng thứ tự dưới đây. Mọi trường hợp chưa rõ được ghi vào [open-questions.md](open-questions.md) và không được tự đoán.

## 1. Thứ tự do Law quy định (SRC-001)

| Tình huống | Áp dụng | Điều khoản |
|---|---|---|
| Lá bài xung đột với Law | Theo lá bài | §1.1.1 |
| Learning to Play xung đột với Law | Theo Law | §1.1.1 |
| Có thể theo cả luật chung lẫn luật phe | Theo cả hai | §1.1.1 |
| Không thể theo cả hai | Theo luật phe | §1.1.1 |
| Gặp chữ *cannot* | Tuyệt đối; chỉ bị ghi đè khi có chỉ dẫn rõ | §1.1.2 |
| Không rõ thứ tự hiệu ứng đồng thời, hoặc ai quyết định | Người chơi đang đến lượt chọn | §1.1.3 |
| Hiệu ứng muốn chen vào giữa một hành động | Không được, trừ khi hiệu ứng ghi rõ | §1.4.2 |
| Luật không cấm | Được làm, trong phạm vi hành động | Law tr. 2, Q1 |
| Luật không bảo làm | Không làm, kể cả khi có luật tương tự | Law tr. 2, Q2 |
| Thuật ngữ gần nghĩa (vd. *move* và *place*) | Không đồng nhất; theo Glossary | Law tr. 2, Q3; App. G |

## 2. Thứ tự giữa các nguồn của dự án

1. **SRC-001 Law PDF 13/10/2025** là baseline đã khóa ([decisions/0002-rules-baseline.md](decisions/0002-rules-baseline.md)).
2. **SRC-005 Card Library** cho văn bản lá bài; văn bản lá bài thắng Law (§1.1.1).
3. **SRC-004 Rules Library online** dùng để đối chiếu. Nếu khác PDF thì ghi vào open-questions, chưa đổi baseline.
4. **SRC-002 Learning to Play, SRC-003 Walking Through Root** dùng cho setup minh họa và kịch bản test, không dùng để quyết định luật.
5. **Đặc tả trong `docs/02-rules-spec/`** do dự án viết. Mỗi mục phải dẫn về điều khoản; không được thêm luật mới.
6. **Code** luôn đứng sau đặc tả. Code khác đặc tả là lỗi, không phải nguồn luật.

## 3. Khi phát hiện xung đột

Tạo một mục trong `decisions/` gồm: hai trích dẫn mâu thuẫn (nguồn, điều khoản, trang), cách hiểu được chọn, lý do và test khóa hành vi đó. Chỉ người quản lý dự án mới được phê duyệt.
