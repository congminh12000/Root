# Faction setup card (Advanced Setup)

Dùng khi chuẩn bị trận theo Advanced Setup (Rules Library p16 mục A, [decisions/0006](../00-governance/decisions/0006-advanced-setup-homelands.md)). A.8.3 chỉ nói mỗi phe "sets up the faction immediately as it describes", nên chữ trên lá là nguồn duy nhất cho phần chuẩn bị của phe đó. Lá in chữ tiếng Anh; chép nguyên văn để đối chiếu, kèm cách hiểu.

| Phe | Nguồn | Trạng thái |
|---|---|---|
| Marquise de Cat | SRC-014 | Đã có |
| Eyrie Dynasties | — | Thiếu (OQ-18) |
| Woodland Alliance | — | Thiếu (OQ-18) |
| Vagabond | — | Thiếu (OQ-18) |

## Marquise de Cat

Lá ghi: militant (thanh đỏ, có thanh kiếm), Reach 10 (khớp §5.2).

| Bước | Nguyên văn | Cách hiểu |
|---|---|---|
| 1st | "Choose 3 homeland clearings, each adjacent to one other." | Chọn 3 clearing làm homeland; mỗi ô kề ít nhất một ô homeland khác, tức 3 ô nối liền nhau. Không được chọn ô phe khác đã lấy làm homeland, hoặc ô không đặt đủ quân của bước 2–3 (A.8.3.I). |
| 2nd | "Put 2 **warriors** in each of your homelands. Put 1 **warrior** in each other clearing." | 2 chiến binh ở mỗi homeland (6 quân), 1 chiến binh ở mọi clearing còn lại. |
| 3rd | "Put the **keep token** in one of your homelands, not adjacent to an enemy homeland if able. Put 1 **sawmill**, **workshop**, and **recruiter** on the map, each in a different homeland of yours." | Keep ở một homeland, ưu tiên ô không kề homeland của phe khác; chỉ được kề khi không còn cách nào (A.8.3.II). Ba công trình mỗi cái ở một homeland khác nhau. |
| 4th | "Fill your Buildings track with your **buildings**, except the leftmost spaces." | Như §6.3.5. |

**Khác với chuẩn bị tiêu chuẩn §6.3:**

- Keep không bắt buộc ở góc (§6.3.2).
- Không bỏ trống clearing góc đối diện (§6.3.3); mọi clearing ngoài homeland đều có 1 chiến binh.
- Homeland có 2 chiến binh thay vì 1.
- Ba công trình buộc ở ba ô khác nhau; §6.3.4 cho phép dồn vào ô keep và ô kề.
- Bản đồ Autumn 12 clearing: 6 + 9 = 15 chiến binh trên bàn, còn 10 trong kho.

**Cần duyệt khi viết spec (chưa dùng để code):**

- "Each other clearing" hiểu theo nguyên văn là mọi clearing không phải homeland của Marquise, kể cả homeland mà phe khác đã chọn trước. Không thấy FAQ nói khác.
- Root Digital hỏi "Choose another homeland clearing adjacent to your last one" (video 01:10), tức chọn theo chuỗi. Với 3 ô, mọi bộ 3 ô nối liền đều chọn được theo chuỗi, nên kết quả giống cách hiểu ở bước 1.
