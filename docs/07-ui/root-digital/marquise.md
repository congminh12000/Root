# Root Digital (Steam): phân tích phe Marquise

Ngày 05/11/2026. Mục đích: hiểu cách Root Digital trình bày lượt, HUD và tương tác của Marquise để làm game mình giống về **bố cục, luồng thao tác, cách báo thông tin**. Không chép hình, icon, font hay hiệu ứng; mọi thứ tự vẽ theo [style-guide.md](../style-guide.md). Luật vẫn lấy từ Rules Library p16.

## 0. Nguồn và cách làm

- Video `docs/01-official-sources/root-digital/marquise.mov` (31:28, 3840×2160, 60 fps). Không commit (đã thêm vào `.gitignore`). **Không có `notes.md`**, nên không có mốc do người quản lý ghi.
- Ảnh cắt bằng ffmpeg vào scratchpad, không vào repo:
  - 60 ảnh đổi cảnh (`select='gt(scene,0.3)'` trên khung khoá, khung khoá cách nhau ~1,2 giây);
  - 94 ảnh đều đặn, 1 ảnh mỗi 20 giây (thay cho mốc trong notes.md);
  - 31 ảnh dày hơn quanh hai đoạn Marquise: 09:55–11:04 (3 giây/ảnh) và 28:36–28:50 (2 giây/ảnh);
  - vài ảnh cắt vùng nhỏ từ bản 4K để đọc chữ HUD.
  Tổng khoảng 185 ảnh, hơi vượt mức 150 vì không có notes.md để khoanh vùng. Xem theo lô 2×2, rộng ≤ 1000 px.
- Ván trong video: 4 phe (Marquise do người chơi cầm, Eyrie, Woodland Alliance, Vagabond Harrier), bản đồ Autumn. Ván kết thúc ở 31:14 với màn hình thắng của Woodland Alliance.
- Mốc thời gian ghi `mm:ss` tính từ đầu video. Ảnh đều đặn lệch tối đa ~1 giây vì lấy theo khung khoá.

## 1. Luồng lượt Marquise

### Chuẩn bị (00:10–01:50)

| Mốc | Màn hình | Người chơi làm |
|---|---|---|
| 00:10–00:50 | Băng chữ giữa trên: "Choose a homeland clearing to place a building." Các clearing hợp lệ có vòng nét đứt. Tay bài ở mép dưới. | Bấm một clearing. |
| 01:10 | "Choose another homeland clearing adjacent to your last one to place a building." Chỉ còn 2 vòng nét đứt. | Bấm clearing tiếp theo. |
| 01:30 | "Choose 2 cards to return to the deck." Tay bài nâng lên. | Chọn 2 lá. |

Root Digital chuẩn bị theo Advanced Setup của Rules Library p16: rút 5 lá (A.7), chuẩn bị phe bằng faction setup card có homeland (A.8, A.8.3.I–III), giữ 3 lá và úp 2 lá về bộ bài (A.10). Người quản lý đã chọn làm theo cách này ([decisions/0006](../../00-governance/decisions/0006-advanced-setup-homelands.md)). Đã có chữ cả 4 lá setup card ([setup-cards.md](../../03-data-spec/setup-cards.md)); phe chọn ở sảnh, không draft (OQ-19). Đã làm vào engine (nhánh `feat/advanced-setup`); trận mới trên server dùng cách này. Cách báo nên học: băng chữ ra lệnh và vòng nét đứt trên ô hợp lệ.

### Birdsong (§6.4)

| Mốc | Màn hình | Thao tác |
|---|---|---|
| 04:10, 12:50, 18:50 | Cả map ngả màu cam ấm (ánh bình minh). Mặt trời nhỏ hiện cạnh chân dung phe đang đi. Trên mỗi clearing có sawmill bật lên icon gỗ kèm "+1". | Không bấm gì; gỗ tự đặt. |
| 02:10 | Nhãn "Daylight" trượt vào ở góc dưới phải, cạnh mặt trời, khi chuyển pha. | — |

Khớp §6.4 (một gỗ mỗi sawmill). Không thấy trường hợp hết gỗ trong kho: **chưa rõ** cách Root Digital báo.

### Daylight: chế tạo (§6.5, §6.2.1, §4.1)

| Mốc | Màn hình | Thao tác |
|---|---|---|
| 02:10, 07:02, 19:12, 24:01, 28:30 | Băng chữ "No cards to craft. Press continue button". Nút lớn góc dưới phải đổi thành ▶. | Bấm ▶ (1 bước). Game luôn dừng ở bước chế tạo, kể cả khi không có gì để chế tạo. |
| 13:10, 16:10, 23:30 | "Choose a card to craft." Lá chế tạo được nổi lên trong tay. | Bấm lá → lá bay lên giữa màn hình rồi vào vùng đã chế tạo. |
| 14:50, 30:06 | Lá item đã chế tạo hiện to ở giữa map với dấu "Sold Out" khi item supply đã hết loại đó. | — |
| 13:10 trở đi | Lá persistent đã chế tạo thành một icon nhỏ dính ở mép phải màn hình. | Bấm icon để dùng (xem Codebreakers bên dưới). |

### Daylight: hành động (§6.5.1–§6.5.5)

**Bảng hành động luôn hiện ở góc dưới phải** (ảnh cắt 09:10): 6 nút icon cố định theo thứ tự March (ủng), Build (búa), Recruit (mặt mèo), Battle (kiếm), dùng lá chim lấy thêm hành động (lá + dấu cộng), Overwork (cưa). Bên phải là **một nút lớn đổi theo ngữ cảnh**: ▶ (tiếp tục), mặt trăng + mũi tên (kết thúc Daylight sang Evening), ✕ (huỷ hành động đang làm). Trên bảng là nút Undo (mũi tên vòng). Trên góc bảng là mặt trời có **huy hiệu số hành động còn lại** (3 → 2 → 1 ở 28:36–28:50; "1" ở 02:50).

| Hành động | Mốc | Băng chữ và các bước | Phản hồi |
|---|---|---|---|
| Battle §6.5.1, §4.3 | 28:36–28:50 | "Choose an action." → bấm Kiếm → bấm clearing. Không thấy bước chọn phe bị đánh vì chỉ có một kẻ địch: **chưa rõ** khi có nhiều phe. 2–3 bước. | Các ô khác tối đi, ô đánh sáng lên. Bảng "VS" nổi ngay tại clearing: chân dung hai phe, xúc xắc mỗi bên, số hit lớn, mũi tên xanh/đỏ cho hit thêm hoặc bị giảm, số quân mỗi bên (ảnh cắt 15:38). Số hành động giảm 1. |
| March §6.5.2, §4.2 | 09:30, 19:30, 20:10, 29:50 | "Choose warriors to move." (ô nguồn có vòng tròn) → bấm ô nguồn → "Choose the number of warriors to move." với chip `− [mèo] 5/5 +` và nút "March" ngay tại ô → bấm ô đích. Nước đi thứ hai tiếp luôn, hành động chỉ trừ một lần. 3–4 bước mỗi nước. | Quân đi theo đường. Nút lớn thành ✕ để huỷ trong lúc chọn. |
| Recruit §6.5.3 | — | **Chưa thấy** trong các ảnh đã cắt (chưa rõ). | — |
| Build §6.5.4 | 02:50 | "Choose a building." Hộp nổi gần clearing đã chọn: 3 cột Workshop, Sawmill, Recruiter; mỗi cột có điểm (vòng nguyệt quế) và số gỗ cần; dưới cùng ô tích "Choose wood to spend" để tự chọn gỗ lấy từ đâu; nút xác nhận (mũi tên) ở góc hộp. Thứ tự: Build → clearing → công trình → (tuỳ chọn) gỗ → xác nhận. | Công trình đặt xuống, điểm cộng ở huy hiệu điểm. |
| Overwork §6.5.5 | — | **Chưa thấy** (chưa rõ). | — |
| Lá chim thêm hành động §6.5 | 09:55, 10:01, 25:50 | "Choose a bird card to spend." (nút lớn thành ✕) → bấm lá chim trong tay. | Băng lớn "Hawks For Hire!" với lá vừa dùng ở giữa (10:01). Huy hiệu số hành động tăng. |
| Hết lượt Daylight | 05:10 | Bấm nút mặt trăng. | — |

### Evening (§6.6)

| Mốc | Màn hình | Thao tác |
|---|---|---|
| 10:43–10:46 | Map ngả xanh đêm. Lá rút bay từ bộ bài ra, phóng to ở giữa rồi vào tay. | — |
| 10:49 | "Discard 2 cards." Tay bài nâng lên. | Bấm lá muốn bỏ; lá bay vào giữa rồi biến mất. |
| 10:52 | Băng đổi thành "Discard 1 cards." Toast "Dominance Card Available!" ở góc trên phải (lá dominance vừa vào chồng bỏ thành "available", §3.3.3). | Bấm thêm 1 lá. |
| 10:55 | "No more cards to discard. Press continue button." Undo vẫn bấm được. | Bấm ▶. |
| 05:10 | "Press continue button to complete turn." | Bấm ▶. |

Khớp §6.6 (rút 1 + thưởng rút, bỏ còn 5).

### Ngoài lượt mình: quyết định xen ngang

| Mốc | Tình huống | Cách hiện |
|---|---|---|
| 01:51, 03:47, 15:21 | Ambush (§4.3.1) | Hộp lớn giữa màn: "Choose ambush cards.", hàng trên ghi số quân hai bên "VS", lá ambush dùng được ở giữa, nút Decline và Confirm, nút nhỏ góc hộp để thu hộp lại xem map. |
| 15:32 | Lá battle đã chế tạo (Sappers) | "Use crafted cards?", hàng trên ghi xúc xắc 2 VS 0, lá ở giữa, Decline/Confirm. |
| 13:50, 15:50, 22:10, 30:30 | Field Hospitals (§6.2.3) | Băng chữ "Discard a matching card for Field Hospital to return (1) warriors to your Keep." Lá cùng chất nổi lên; nút ▶ để bỏ qua. |
| 15:41, 19:00 | Thu hộp lại | Hộp mờ đi, icon vàng ở góc trên phải để mở lại. |

### Dùng lá persistent: Codebreakers (16:28–16:39, 18:54–19:05, 23:53–23:57)

Bấm icon ở mép phải → hộp "Select A Player!" với 3 chân dung, nút Cancel → hộp "<Phe>'s Hand" màu của phe đó, các lá xếp ngang, mũi tên lật trang, nút Close. 3 bước.

## 2. Thông tin luôn hiển thị

```
┌─────────────────────────────────────────────────────────────────────┐
│[Vagabond: chân dung, điểm, tim quan hệ]   [Băng chữ ra lệnh]  [☰][♛][⚙]│
│[Alliance: chân dung, điểm]                                    (💾)    │
│[Eyrie: chân dung, điểm, decree thu nhỏ]                               │
│ ☀ cạnh phe đang đi                                                    │
│                                                                [lá đã │
│                     MAP (phủ gần kín màn hình,                  chế   │
│                     tối/sáng theo pha)                          tạo]  │
│                                                                       │
│                                                         [↶ Undo]  ☀③ │
│[Marquise: chân dung,        [ tay bài xếp quạt, ló nửa ]  [6 nút hành │
│ điểm, quân trong kho,                                      động][nút │
│ gỗ trong kho, số lá]                                             lớn]│
└─────────────────────────────────────────────────────────────────────┘
```

| Vùng | Nội dung | Bằng chứng |
|---|---|---|
| Trên trái | Đối thủ dạng chân dung dọc: điểm ở huy hiệu nguyệt quế; Vagabond có tim quan hệ với mình; Eyrie có decree 4 cột thu nhỏ. Phe đang đi to hơn, có mặt trời (Birdsong/Daylight) hoặc mặt trăng (Evening) bên cạnh. | ảnh cắt 04:50; 03:10, 05:50 |
| Trên giữa | Băng chữ mệnh lệnh cho bước hiện tại (chỉ khi mình cần làm gì). | khắp video |
| Trên phải | Ba nút: cuộn giấy, vương miện + vàng, bánh răng (cài đặt). Icon đĩa mềm khi tự lưu. Cuộn giấy và vương miện **không được mở trong video: chưa rõ** là nhật ký, luật hay bảng điểm. | ảnh cắt 10:52 |
| Mép phải | Icon lá persistent đã chế tạo. | 13:10 trở đi |
| Dưới trái | Bảng mình: chân dung, điểm, **chiến binh trong kho, gỗ trong kho, số lá trên tay**. | ảnh cắt 09:10 (9 / 0 / 2, điểm 8) |
| Dưới giữa | Tay bài xếp quạt, chỉ ló phần trên; di chuột thì lá phóng to giữa màn. | 07:30, 11:01 |
| Dưới phải | Undo, mặt trời + số hành động còn lại, 6 nút hành động, nút lớn đổi theo ngữ cảnh. Ngoài lượt mình vẫn hiện nhưng mờ. | ảnh cắt 09:10 |

**Không thấy trong video:** đồng hồ đếm giờ, nhật ký mở sẵn, số lượt, tên pha bằng chữ cố định (pha chỉ báo bằng màu map, icon mặt trời/mặt trăng và nhãn trượt lúc chuyển pha).

### Bảng phe (06:25–07:02, 28:13, 29:19)

Bấm chân dung → bảng phe phủ gần kín màn hình, nền màu phe. Có: tên phe, khả năng đặc biệt (Field Hospital, The Keep) kèm một dòng giải thích, ba track công trình với chi phí gỗ ở hàng trên và điểm trên từng ô (ô đã trống có viền trắng), icon rút thêm lá trên track recruiter, "Crafted Items", "Crafted Cards", số quân trong kho và số lá trên tay. Mũi tên trái/phải để lật sang bảng phe khác, nút Close ở dưới, hai tab nhỏ ở trên (i và mặt trời/mặt trăng; tab thứ hai **chưa rõ**).

## 3. Cách báo kết quả và sự kiện

| Loại | Cách báo | Mốc |
|---|---|---|
| Đổi lượt | Băng giữa màn "Woodland Alliance's Turn", "Vagabond's Turn", "Your Turn"; map chuyển màu theo pha. | 03:23, 06:10, 17:27, 26:55 |
| Đổi pha | Màu toàn map: cam (Birdsong), bình thường (Daylight), xanh đêm (Evening); mặt trời/mặt trăng cạnh chân dung; nhãn pha trượt vào. | 02:10, 04:10, 10:43 |
| Battle | Bảng VS tại clearing, phần còn lại tối đi. | 01:55, 15:38, 28:50 |
| Sự kiện phe khác | Băng lớn có hình: "Revolt", "Outrage!", "Coalition", "3 Roosts", "The Eyrie have entered Turmoil" kèm **lý do** ("Could not battle in a … clearing"), "Aid!" thành bong bóng thoại ở clearing. | 11:48, 15:10, 14:30, 04:06, 18:35, 27:55, 26:50 |
| Thêm gỗ, điểm | Icon nhỏ "+1" bật lên ngay tại clearing; điểm đổi ở huy hiệu. | 04:10, 12:50 |
| Lá chơi/chế tạo của người khác | Lá hiện to giữa map vài giây. | 14:50, 30:50 |
| Lá available | Toast nhỏ góc trên phải. | 10:52 |
| Kết thúc ván | Màn hình phủ hoạ tiết phe thắng rồi chuyển cảnh nhân vật. Không thấy bảng điểm cuối: **chưa rõ** thắng bằng điểm hay dominance. | 31:14–31:16 |

## 4. So với game hiện tại

Xem thật trên trình duyệt ngày 05/11/2026: server `127.0.0.1:8091` với thư mục dữ liệu thử, Marquise là người, 3 bot `search-fast`, Autumn diorama, 1440×900. Chơi qua chuẩn bị và vào Daylight lượt đầu (đặt keep, ba công trình, bỏ qua chế tạo, mở nhóm Xây, menu ô 5, bảng phe). Đã tắt server, xoá dữ liệu thử. Chưa chơi hết một lượt Marquise, nên Evening, March và Battle của mình đối chiếu theo code và [checklist.md](../checklist.md), chưa xem tận mắt.

```
Game mình (1440×900)
┌─────────────────────────────────────────────────────────────────────┐
│[Eyrie: điểm, số lá]   [Lượt 4 · Daylight · Hành động · 0:51]  [Nhật ký][Chat][⚙]│
│[Alliance]             [Đến lượt bạn]                               │
│[Vagabond]                                                          │
│                          MAP 3D Autumn                             │
│                                         [Hành động · 63          ] │
│                                         [Dùng lá chim | Đánh | …] │
│[marquise: điểm, số lá]  [tay bài quạt]  [↶ Undo] [Continue ▷]      │
└─────────────────────────────────────────────────────────────────────┘
```

| Mục | Root Digital | Game mình | Đánh giá |
|---|---|---|---|
| Bố cục bốn góc | Đối thủ trên trái, mình dưới trái, tay bài dưới giữa, hành động dưới phải, menu trên phải | Giống hệt | Giống |
| Hiện bước cần làm | Băng chữ mệnh lệnh ("Choose a building.") | Tên pha và bước ("Daylight · Hành động"); câu hỏi chỉ có trong callout quyết định | Thiếu một phần |
| Số hành động còn lại | Mặt trời + số | Không hiện. "Hành động · 63" là **số lựa chọn hợp lệ**, dễ nhầm là số hành động. Engine đã có `actionsRemaining` trong `PlayerView` (bảng Marquise công khai) | Thiếu |
| Nút hành động phe | 6 nút icon cố định, cùng chỗ mọi lượt | Danh sách nút chữ trong khung cuộn (Dùng lá chim, Đánh, Di chuyển, Recruit, Xây, Overwork, Lấy dominance) | Khác |
| Build | Hộp 3 công trình với điểm, giá gỗ, tuỳ chọn chọn gỗ | Bấm "Xây" mở hộp có một danh sách thả xuống 21 dòng ghép sẵn "sawmill ở ô 2, gỗ từ ô 1"; menu tại ô không có mục xây | Khác, khó dùng |
| March | Ô nguồn → chip số quân −/+ → ô đích | Kéo quân, hoặc chạm ô đi → ô đến → chip số quân (G2) | Giống (chưa thử tận tay) |
| Nút lớn theo ngữ cảnh | ▶ / sang Evening / ✕ huỷ | "Continue ▷" cố định; huỷ bằng Esc hoặc "Bỏ chọn" | Khác một phần |
| Báo pha | Màu map, mặt trời/mặt trăng cạnh phe | Chữ trong góc trạng thái | Thiếu |
| Báo đổi lượt | Băng "X's Turn" / "Your Turn" | Dòng "Đến lượt bạn" / "Đang chờ X" | Thiếu một phần |
| Tài nguyên của mình | Quân trong kho, gỗ trong kho, số lá luôn hiện | Chỉ điểm và số lá; gỗ, quân trong ngăn bảng phe | Thiếu |
| Đối thủ | Chân dung, điểm, decree thu nhỏ, tim quan hệ | Huy hiệu, điểm, số lá | Thiếu một phần |
| Bảng phe | Phủ màn, lật giữa các phe | Ngăn kéo có tab mỗi phe, track có giá gỗ, điểm, thưởng rút lá, gỗ và quân trong kho | Giống |
| Battle | Bảng VS tại ô, chân dung, xúc xắc, hit, phần còn lại tối | Xúc xắc tại ô (G3) | Thiếu một phần (không làm tối, không chân dung) |
| Ambush, lá battle, Field Hospitals | Hộp quyết định, thu hộp để xem map | Có đủ (UI-6), "Mở lại quyết định" | Giống |
| Sự kiện phe khác | Băng lớn Revolt, Outrage, Turmoil kèm lý do, Coalition | Nhật ký; không thấy băng trong lần thử | Thiếu (cần kiểm tra lại khi có sự kiện) |
| Rút/bỏ bài | Lá bay, "Discard N cards" đếm ngược | Có quyết định bỏ bài; chưa thấy hoạt ảnh rút | Chưa rõ |
| Lá dominance available | Toast | Nút "Lấy dominance" trong hành động | Thiếu báo |
| Lá persistent | Icon mép phải, chọn người, xem tay | Play area trong bảng phe | Chưa rõ cách dùng Codebreakers ở game mình |
| Lá vừa chơi | Lá to giữa map | "Bài vừa đánh ra" nổi trên map | Giống |
| Chế tạo khi không có gì | Dừng, bắt bấm tiếp tục | Dừng ở bước "Chế tạo", bấm Continue | Giống |
| Đồng hồ, nhật ký | Không thấy | Có | Mình có thêm (giữ) |
| Chuẩn bị | Advanced Setup: rút 5 giữ 3, homeland (A.7, A.8, A.10) | Chuẩn §5.1, §6.3; bấm ô → menu "Đặt keep: ô 1" (2 bước) | Khác; sẽ đổi theo decisions/0006 khi có nguồn |

## 5. Checklist thiếu sót giao diện

Mỗi mục một nhánh, một PR, theo quy trình [README.md §3](../README.md): ui-kit trước, rồi nối vào trận, Playwright, ảnh chụp. Đánh dấu `[x]` khi PR đã merge.

**Người quản lý duyệt ngày 05/11/2026:** làm toàn bộ RD-M01 đến M16, theo số mục; RD-M02 (hộp Xây) và RD-M05 (tài nguyên) làm giống Root Digital. RD-M01–M04 đã merge (PR #46–#49); trạng thái tiếp nối ở mục phân công bên dưới.

### Mức cao: ảnh hưởng tới việc chơi được

- [x] **RD-M01. Số hành động Daylight còn lại.** Hiện cạnh bảng hành động (§6.5: 3 + một mỗi lá chim). Đổi nhãn "Hành động · 63" để không trông như số hành động. Dữ liệu đã có: `actionsRemaining` trong `PlayerView`. Video: 02:50, 28:36–28:50.
- [x] **RD-M02. Hộp Build, giống Root Digital.** Hiện giờ bấm "Xây" thì hiện một ô chọn dài 21 dòng, mỗi dòng ghép sẵn ô, loại công trình và chỗ lấy gỗ, ví dụ "sawmill ở ô 2, gỗ từ ô 1"; người chơi phải đọc từng dòng. Root Digital làm 3 bước: bấm ô trên map → hộp nhỏ hiện 3 hình công trình, dưới mỗi hình ghi điểm được và số gỗ tốn → bấm một hình là xây; gỗ tự lấy, ai muốn chọn gỗ từ ô nào thì tích thêm ô "chọn gỗ" (§6.5.4). Lọc trên `legal`. Video: 02:50.
- [x] **RD-M03. Băng chữ mệnh lệnh** ở giữa trên cho mọi bước của mình ("Chọn ô để xây", "Chọn số quân", "Bỏ 2 lá"). Video: khắp video.
- [x] **RD-M04. Bảng hành động cố định của Marquise.** 6 nút icon tự vẽ: March, Build, Recruit, Battle, lá chim, Overwork; mờ khi không dùng được; cùng chỗ mọi lượt. Giữ menu ☰ → Tất cả lựa chọn làm lối dự phòng. Video: ảnh cắt 09:10.
- [x] **RD-M05. Tài nguyên của mình luôn hiện, giống Root Digital,** trong huy hiệu phe mình ở góc dưới trái (chỗ đang ghi "0 · marquise · 4 lá"): thêm cột bên phải điểm, 3 dòng icon + số: chiến binh trong kho, gỗ trong kho, số lá trên tay. Không cần mở bảng phe mới thấy. Video: ảnh cắt 09:10.

### Phân công tiếp nối (Codex, 05/11/2026)

- **RD-M05: dành cho Claude**, Codex không sửa tài nguyên trong huy hiệu.
- **RD-M06: Codex đã triển khai, PR [#50](https://github.com/congminh12000/Root/pull/50), chờ duyệt hình**, nhánh `feat/rd-m06-turn-phase`; Claude tránh làm trùng. Băng lượt tự ẩn sau 2,4 giây, dấu pha theo chủ lượt (không theo người trả lời interrupt); giữ ánh sáng map đã duyệt.
- **RD-M07: Codex đã triển khai, chờ PR/duyệt hình**, nhánh `feat/rd-m07-context-button`, PR nối tiếp M06. Nút Tiếp tục / Sang Evening / Huỷ; Dừng March giữ riêng. Huỷ và Esc chỉ bỏ lựa chọn cục bộ; nút chuyển bước chỉ gửi phần tử `legal` do server cấp. Tablet dọc: dải bài nằm giữa huy hiệu mình và bảng hành động, không che nút.
- **RD-M08–M16: chưa nhận**. Claude có thể tiếp tục từ M08; đọc hai PR của Codex trước khi sửa HUD để giữ phần M06/M07.
- Cả M06/M07 vẫn để `[ ]` tới khi PR đã merge, đúng quy trình; không làm lại vì thấy checkbox chưa đánh dấu.

### Mức trung bình

- [x] **RD-M06. Báo pha và lượt.** Băng "Lượt của …" khi đổi lượt; dấu pha cạnh huy hiệu phe đang đi; cân nhắc đổi ánh sáng map theo pha nếu giữ được ≥ 55 fps và đúng style-guide. Video: 02:10, 03:23, 04:10, 10:43.
- [x] **RD-M07. Nút lớn đổi theo ngữ cảnh:** Tiếp tục / Sang Evening / Huỷ. Video: 05:10, 09:30, 10:55.
- [x] **RD-M08. Battle:** làm tối phần map còn lại, hiện hai phe đối đầu, hit và hit thêm. Video: 15:38, 28:50.
- [x] **RD-M09. Băng sự kiện** cho Revolt, Outrage, Coalition, Turmoil (kèm lý do decree hỏng), điểm roost. Video: 04:06, 11:48, 14:30, 15:10, 18:35.
- [x] **RD-M10. Evening:** hoạt ảnh lá rút vào tay; "Bỏ N lá" đếm giảm. Video: 10:43–10:55.
- [x] **RD-M11. Báo lá dominance available** (§3.3.3) bằng thông báo nhỏ. Video: 10:52.
- [x] **RD-M12. Đối thủ:** decree thu nhỏ của Eyrie, quan hệ Vagabond với mình ngay trên huy hiệu. Video: ảnh cắt 04:50.
- [x] **RD-M13. Lá persistent dùng được** (Codebreakers…) có lối bấm riêng, không chỉ nằm trong bảng phe. Video: 16:28–16:39.

### Mức thấp

- [ ] **RD-M14.** Icon "+1 gỗ" bật lên tại ô ở Birdsong. Video: 04:10, 12:50.
- [ ] **RD-M15.** Bảng phe phủ màn, có mũi tên lật sang phe khác (ngăn kéo hiện tại đã đủ dùng). Video: 06:25–07:02.
- [ ] **RD-M16.** Icon báo đang tự lưu. Video: 10:52.

## 6. Checklist khác luật và điểm chưa rõ

Mỗi mục cần được xử lý (làm, quyết định, hoặc tìm nguồn) trước khi đánh dấu xong.

### Khác luật

- [x] **RD-L01. Chuẩn bị trận theo Advanced Setup có homeland.** Root Digital: homeland, "adjacent to your last one", rút 5 giữ 3 (00:10–01:30). Rules Library p16: A.7, A.8, A.8.3.I–III, A.10. Người quản lý đã chọn làm theo ([decisions/0006](../../00-governance/decisions/0006-advanced-setup-homelands.md)).
  - [x] Lá setup card Marquise (SRC-014, [setup-cards.md](../../03-data-spec/setup-cards.md)).
  - [x] Lá setup card Eyrie, Woodland Alliance, Vagabond (SRC-015 đến SRC-017; OQ-18 đã đóng).
  - [x] Không dùng draft; chọn phe ở sảnh (OQ-19 đã đóng).
  - [x] Thứ tự chuẩn bị theo A.8.3 (người cuối trong thứ tự lượt chuẩn bị trước) và hai cách hiểu của lá Marquise đã duyệt.
  - [x] Ô mép bản đồ Autumn cho homeland Eyrie: 1, 2, 3, 5, 8, 9, 10, 11, 12 (OQ-20).
  - [x] Nhân vật Vagabond: chọn khi sảnh cho chọn phe, ngẫu nhiên khi chia phe ngẫu nhiên (OQ-21).
  - [x] Engine, test, `rule-coverage.yaml`, giao diện chọn homeland và chọn 3 lá giữ lại (nhánh `feat/advanced-setup`).
- [x] **RD-L02. Field Hospitals.** Chữ Root Digital "When a warrior dies…" (06:25) chỉ là tóm tắt. Theo §6.2.3: chiến binh Marquise bị loại khỏi một ô thì trả một lá cùng chất ô đó để đưa chúng về ô keep. Engine đã đúng; không cần làm gì.

### Chưa rõ (cần thêm mốc video hoặc nguồn)

- [ ] **RD-Q01.** Root Digital trình bày Recruit (§6.5.3) thế nào. Chưa thấy trong ảnh đã cắt.
- [ ] **RD-Q02.** Root Digital trình bày Overwork (§6.5.5) thế nào. Chưa thấy.
- [ ] **RD-Q03.** Chọn phe bị đánh (§4.3) khi ô có nhiều kẻ địch. Chưa thấy.
- [ ] **RD-Q04.** Hai nút cuộn giấy và vương miện ở góc trên phải làm gì. Không được mở (ảnh cắt 10:52).
- [ ] **RD-Q05.** Tab thứ hai (mặt trời/mặt trăng) trên bảng phe. Không được mở (06:25).
- [ ] **RD-Q06.** Màn kết thúc: Alliance thắng bằng điểm hay dominance, có bảng điểm không. Video dừng ở 31:16.
- [ ] **RD-Q07.** Dải màu dưới hình thoi chất có phải báo phe cai quản không (ảnh cắt 15:38).
- [ ] **RD-Q08.** Cách báo khi hết gỗ trong kho ở Birdsong (§6.4). Chưa thấy.

Cách đóng RD-Q01–Q08: người quản lý ghi mốc vào `docs/01-official-sources/root-digital/notes.md` (không commit), hoặc quay thêm đoạn có các tình huống đó.

## 7. Việc tiếp theo

1. Người quản lý duyệt PR Advanced Setup.
2. Làm từng mục theo số thứ tự, mỗi mục một chat, một nhánh, một PR. Chưa sửa code ở bước phân tích này.
3. PR này (#44) chỉ merge khi người quản lý duyệt hết.
