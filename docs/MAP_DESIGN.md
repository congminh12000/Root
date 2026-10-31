# Quy tắc thiết kế bản đồ

Các quy tắc đã thống nhất khi làm bản đồ `lakeside`. Áp dụng cho mọi bản đồ mới hoặc khi sửa bản đồ cũ. Định dạng file và cách chạy công cụ nằm ở [MAPS.md](MAPS.md); file này chỉ nói bản đồ **phải trông và hoạt động thế nào**.

Ảnh tham chiếu: `docs/maps/lakeside-3d-numbered.jpg` (toàn cảnh có số), `lakeside-3d-ruin.jpg` (ô đất và Rune), `lakeside-2d.jpg` (bản 2D).

## 1. Đánh số và gọi tên

- Clearing được gọi bằng **số từ 1**: số = vị trí trong `clearings` của file bản đồ + 1. Trong code và JSON, `paths`, `forests` vẫn dùng chỉ số từ 0.
- Khi trao đổi, dùng số: "clearing 5", "lối 8–12".
- Bản 3D bật số bằng `&labels=1`. Số là nhãn tròn nổi trên mọi vật thể, không bị nhà hay cây che.
- **Không vẽ tên clearing** lên bản đồ. Tên chỉ có trong dữ liệu và giao diện bên cạnh.

## 2. Clearing

- Mỗi clearing có một suit (`fox`, `rabbit`, `mouse`) và từ **1 đến 3 slot** xây dựng.
- Huy hiệu suit đặt cạnh ô đất ngoài cùng bên trái của clearing.
- Nhà vẽ trong ảnh và trong `*.scene.json` chỉ là **trang trí**: chúng cho biết đó là một khu dân cư, không phải công trình của phe nào và không chiếm slot.

Bảng chuẩn của `lakeside`:

| Clearing | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Slot | 1 | 1 | 2 | 1 | 3 | 1 | 3 | 3 | 3 | 1 | 1 | 2 |
| Rune | | | | | ✓ | | ✓ | ✓ | ✓ | | | |
| Nối tới | 2, 5, 6 | 1, 3, 5, 7 | 2, 4, 7 | 3, 8 | 1, 2, 6 | 1, 5, 10 | 2, 3, 8 | 4, 7, 12 | 10, 11 | 6, 9, 11 | 9, 10, 12 | 8, 11 |

## 3. Ô đất xây (slot)

Mỗi slot là **một ô đất trống thật nằm trong bản đồ**, không phải hình vuông vẽ đè lên.

**Vị trí** (`plots` trong file bản đồ):
- Số ô bằng đúng số `slots`.
- Đặt trên khoảng đất trống **bên ngoài** các ngôi nhà. Không được che, cắt hay bóp méo nhà. Nếu clearing chật thì đặt ô ra rìa hoặc khoảng cỏ gần nhất, miễn người xem vẫn thấy ô thuộc clearing đó.
- Không đặt trên mặt nước, bến, lối đi hay sát mép khung. Các ô không chồng lên nhau. `validateLayout` kiểm tra số ô, chồng lấn và ra ngoài khung.
- Cây tự lùi ra khỏi ô.

**Hình thức** (giống nhau ở 2D và 3D):
- Nền sỏi nâng lên, **màu kem sáng**, có vài viên đá cuội.
- **Viền đá vàng hổ phách** quanh mép. Màu này tách ô khỏi lối đi, vì lối đi cũng màu kem.
- **Hàng rào gỗ thưa**, gỗ màu sáng, có cổng mở phía trước.
- Một vệt đất nện sáng, mềm quanh ô để tách ô khỏi cỏ và rừng.
- Ô phải là thứ **sáng và dễ thấy nhất** ở mỗi clearing, kể cả khi nằm trong bóng cây hay bóng nhà. Bản 3D cho mặt sỏi và viền tự phát sáng nhẹ để không bị tối.
- Màu được gom một chỗ, hai bản dùng chung giá trị: `LOT` trong `web/src/map/paint.ts` và `LOOK.lot` trong `web/src/map3d/scene.ts`.

**Công trình của phe** đặt đúng lên ô, lấp từ ô đầu tiên trở đi.

## 4. Rune (tàn tích)

Rune là một công trình cổ có sẵn trên bản đồ từ đầu trận.

**Luật:**
- Rune **chiếm một slot**. Clearing 3 slot có Rune chỉ còn 2 slot xây được.
- Chỉ phe được phép mới phá được Rune. Hiện tại đó là Wayfarer: đứng tại clearing và dùng một cây đuốc chưa dùng. Phá xong, phe đó nhận item giấu bên trong và ô của Rune trở thành ô xây bình thường.
- Mỗi bản đồ có **đúng 4 Rune**, vì có 4 item (giày, búa, kiếm, túi) được xáo ngẫu nhiên vào chúng. Engine dừng lại nếu số Rune khác 4.
- Vị trí Rune khai báo bằng `"ruin": true` trên clearing. Engine đọc từ file, không cố định trong code.

**Vị trí:** Rune luôn nằm trên **ô cuối cùng** của clearing. Công trình lấp từ ô đầu, nên không bao giờ đè lên Rune. Khi Rune bị phá, các công trình đã xây không phải dịch chỗ.

**Hình thức:**
- 3D: tàn tích đá trên nền đá lát tối, **không có rào**. Có tường đổ có rêu dọc mép sau và mép trái, cột gãy, một khúc cột lăn ra, và ở giữa là phiến đá khắc ký hiệu **phát sáng xanh ngọc**.
- 2D (trong trận): ô đá xám có góc tường sáng và ký hiệu xanh ngọc, vẽ đè lên ô cuối. Ô này biến mất khi Rune bị phá.
- Rune phải khác hẳn ô trống chỉ qua một cái nhìn: không rào, màu đá xám, có điểm sáng xanh.

## 5. Lối đi (path)

- `paths` luôn hai chiều. Chỉ những lối khai báo trong `paths` mới đi được.
- Mỗi lối được vẽ thành **dải đất sáng, viền mực đậm hai bên, có hàng đá lát ở giữa**. Đứng xa vẫn thấy cả mạng lưới; đến gần thì đá lát cho thấy đây là chỗ bước đi.
- Lối đi bám theo đường đất có sẵn trong ảnh. Bản 3D tự dò đường bằng cách tìm lối rẻ nhất trên lưới màu của ảnh (`routes.ts`): đường đất rẻ nhất, cỏ đắt hơn, rừng rất đắt, nước gần như cấm. Sau đó đường được làm mượt.
- Không có cây mọc trên hoặc sát lối đi.
- Các đường đất khác trong ảnh chỉ là trang trí và giữ màu đất gốc, để người xem phân biệt lối hợp lệ với cảnh vật.
- Lối đi nên tránh nước. Chỗ bắt buộc qua nước nông phải trông như đường đắp hoặc cầu. Ví dụ duy nhất hiện có là đoạn ven bãi lầy của lối 8–12.

## 6. Phong cách chung

- Góc nhìn từ phía nam, nghiêng nhẹ. Ánh sáng đến từ góc trên bên trái.
- Vật thể có viền mực. Bản 3D dùng cel-shading 4 bậc; bản 2D dùng nét mực vẽ tay.
- Vật ở thấp hơn trên màn hình che vật ở cao hơn, tạo chiều sâu.
- Thông tin gameplay luôn nằm trên cảnh vật: số clearing, huy hiệu suit, ô đất, Rune, lối đi. Cảnh vật không được che chúng.
- Không dùng asset trả phí. Mọi texture được vẽ bằng code (canvas) hoặc lấy từ ảnh bản đồ của dự án.

## 7. Ràng buộc với luật chơi

- **Thiết lập đầu trận** phải còn chỗ:
  - Clearing có keep cùng các clearing kề phải đủ slot trống cho mill, workshop và recruiter của Guild. Lakeside đặt mill ở 1, workshop ở 2, recruiter ở 5.
  - Clearing khởi đầu của Canopy phải có slot cho roost. Lakeside dùng clearing 12.
  - Khi đổi slot hay Rune, kiểm tra lại các vị trí này trong `_setup` của `backend/root/engine.py`.
- Đổi `slots`, `ruin`, `paths` hay `forests` là **đổi luật**. Khi đó phải:
  - Nâng `RULESET` trong `backend/root/content.py`. Lần đổi slot và Rune đã nâng lên `grove-experimental-0.2`.
  - Ghi nhận rằng checkpoint, giải đánh giá và replay của phiên bản cũ không so sánh được với bản mới. Loader sẽ từ chối checkpoint khác `RULESET`.
- Chỉ dời toạ độ (`x`, `y`, `plots`) thì không đổi luật, nhưng các trận đã lưu sẽ không `verify` lại được vì toạ độ nằm trong trạng thái được băm.

## 8. Checklist khi làm hoặc sửa bản đồ

1. Điền suit, slot (1–3), `paths` hai chiều, `forests` và đúng 4 `ruin` cho các clearing.
2. Đặt `plots` lên đất trống bên ngoài nhà; Rune nằm ở ô cuối.
3. Kiểm tra chỗ cho thiết lập đầu trận (mục 7).
4. Chạy `cd web && npm test` (có `validateLayout`) và `cd backend && pytest`. Chạy thử vài chục trận để chắc không lỗi.
5. Mở bản 3D với `&labels=1` và bản 2D `map-preview.html`. Xác nhận ô đất, Rune và lối đi đều dễ thấy, không bị nhà hay cây che.
6. Nếu đổi luật thì nâng `RULESET`.
7. Cập nhật bảng ở mục 2 và ảnh trong `docs/maps/`.
