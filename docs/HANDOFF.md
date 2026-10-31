# Bàn giao: tiếp tục engine Root

Đọc [AGENTS.md](../AGENTS.md) trước. File này chỉ ghi phần đang dở và cách làm tiếp.

## Bắt đầu

```bash
npm install
npm run fetch:sources     # PDF chính thức (gitignored)
npm run snapshot:rules    # Rules Library p16 + FAQ, nguồn luật chính (decisions/0005)
npm run typecheck && npm test && npm run audit:rules
```

## Đã xong (nhánh `feat/root2-foundation`)

- Nguồn luật, dữ liệu (bản đồ Autumn, 54 lá, quest, faction board, xúc xắc), đặc tả `docs/02-rules-spec/`. Không còn vấn đề mở.
- Bước 1: khung engine (`packages/game-engine`): RNG ghi/phát lại, `createGame` + setup bốn phe, `applyCommand`, `viewFor`, `replay`.
- Bước 2: luật chung: rule, move, craft, battle 6 bước, ghi điểm, thắng, dominance, Field Hospitals.
- Coverage: 74/159 implemented. API ở `docs/04-engine-spec/engine-api.md`.

## Còn lại

| Bước | Việc |
|---|---|
| 3 | Luồng lượt chung (start/end phase, kiểm dominance đầu Birdsong, reset bộ đếm, chuyển ghế) + Marquise §6.4–6.6: gỗ, Battle/March/Recruit/Build/Overwork, thêm hành động bằng lá bird, Evening |
| 4 | Eyrie §7.4–7.7: Decree, Turmoil, A New Roost |
| 5 | Alliance §8.2–8.6: Outrage (hook vào move/removal), mất base §8.2.4, Revolt, Spread Sympathy, Mobilize, Train, Military Operations |
| 6 | Vagabond §9.2–9.6: quan hệ, Hostile, Infamy, chiến binh Allied, coalition, các hành động exhaust item, Refresh, Slip, Rest, giới hạn item |
| 7 | Bot ngẫu nhiên đánh hàng nghìn trận + kiểm bất biến; golden scenario từ Walking Through Root |

Chỗ đã chừa sẵn (xem comment trong code): `returnBuilding` cho base Alliance, `returnToken` sympathy (Outrage), hiệu ứng lá persistent ngoài battle (Better Burrow Bank, Command Warren, Cobbler, Codebreakers, Royal Claim, Stand and Deliver!, Tax Collector).

## Quy ước

- Mọi hành động hợp lệ sinh trong `legalActions`; `applyCommand` chỉ chấp nhận đúng một phần tử của danh sách đó.
- Quyết định xen ngang đi qua stack `pending`; battle tiếp tục bằng `continueBattle` sau mỗi quyết định.
- Mỗi bước: test hợp lệ + không hợp lệ cho từng điều khoản, cập nhật `rule-coverage.yaml`, rồi chạy `npm run ship -- "feat(engine): ..."` (kiểm tra, commit, push; không chạy trên `main`).
- Người quản lý trao đổi bằng tiếng Việt, muốn mỗi bước một commit và báo cáo 6 phần (AGENTS.md).
