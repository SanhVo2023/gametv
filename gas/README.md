# GAS backend

Single Google Apps Script web app that fronts a single Google Sheet.

## Setup

1. Create a new Google Sheet.
2. **Extensions → Apps Script** → paste `Code.gs` over the default file → save.
3. From the script editor toolbar, run `setup()` once. Authorize when prompted.
   Verify three tabs appear: `Config`, `Prizes`, `Plays`.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone (with the link)**
   - Click Deploy, copy the `/exec` URL.
5. Paste the URL into `.env.local` of the frontend as
   `NEXT_PUBLIC_GAS_URL=...`.

## Editing prizes live

The `Prizes` sheet is read on every spin. To change available prizes, just edit
the sheet — the frontend caches for 30 s so changes propagate within ~1 minute.

Columns:

| column | meaning |
|---|---|
| `id` | unique stable id (used in `Plays` rows) |
| `name` | display label on wheel + reveal screen |
| `stock` | remaining inventory; 0 hides the prize |
| `weight` | random weight (relative) |
| `code_prefix` | prefix for generated voucher code, e.g. `MV100` |
| `image_url` | unused (photos come from the kiosk build, keyed by `id`) |
| `description` | shown under the prize on reveal |
| `color_hex` | (optional) override wheel wedge color |

## Tester phone

Edit row `tester_phone` in `Config`. The default is `0777863808`. Tester wins
never decrement stock and never consume phone uniqueness.

## Re-running setup

`setup()` is idempotent: it does NOT wipe existing data. It only creates missing
sheets and seeds default rows the first time. To start fresh, delete the sheets
manually and re-run.

## Re-seeding the Prize stock

If the seed list inside `Code.gs` (`DEFAULT_PRIZES`) changes after you've
already run `setup()`, run **`resetPrizes()`** from the script editor. It wipes
just the `Prizes` tab and re-seeds it from the latest code — `Plays` history
and `Config` are untouched.

## Configuring gifts from the sheet only (no redeploy)

The `Prizes` tab is read live on every spin, so a new gift list needs **no new
Apps Script deployment**: edit the rows and the kiosk picks them up within
~1 minute (30 s frontend cache). Rules that matter:

1. **`id` must be one the kiosk knows.** The kiosk maps `id` → product photo in
   `lib/prizeImages.ts`. An unknown `id` (or a typo) is drawn as a *voucher*
   card on the wheel and reveal screen, not as a photo. Changing the photo map
   requires rebuilding the kiosk (`npm run build`), the sheet alone cannot add
   a new picture.
2. **One row = one wedge**, in sheet order. `stock = 0` hides the row, so to
   pull a gift set its stock to 0 (or delete the row).
3. `weight` is the relative draw chance; `code_prefix` is the voucher-code
   prefix printed on the reveal screen; `description` shows under the name;
   `color_hex` (optional) overrides the wedge colour. `image_url` is unused.
4. Don't rename the header row and don't rename the tab.
5. Rows whose `id` contains `VOUCHER` (e.g. `VOUCHER100K`) render as vouchers
   by design — add them back the same way if the event has vouchers.

Ids the current kiosk build understands (photo in `public/present/`):

| id (mã hàng) | gift | photo |
|---|---|---|
| `NONMOLSION`  | Nón kết Molsion                                   | NONMOLSION.png  |
| `PENBL00001`  | Bút bi BOLON                                      | BUTBOLON.png    |
| `VICARDBOLON` | Ví đựng card hiệu BOLON                           | VIBOLON.png     |
| `HK-2204-1`   | Hộp đựng kính MẮT VIỆT 2204-1 (loại lông vũ)      | hop-kinh.png    |
| `HK-BD117`    | Hộp đựng kính MẮT VIỆT BD117                      | HK-BD117.png    |
| `BONUOCRUA3C` | Bộ nước rửa kính 3 màu                            | BONUOCRUA3C.png |
| `BUTBOLON`, `VIBOLON`, `HOPKINH`, `BONUOCRUAKINH` | legacy ids from the previous event, still accepted | |

**A kiosk built before this commit only knows the legacy ids.** Until it is
rebuilt, enter the new gifts under the legacy ids and put the real mã hàng in
`description`:

| id to type | use for |
|---|---|
| `NONMOLSION`    | Nón kết Molsion |
| `BUTBOLON`      | Bút bi BOLON (PENBL00001) |
| `VIBOLON`       | Ví đựng card BOLON (VICARDBOLON) |
| `HOPKINH`       | Hộp đựng kính 2204-1 |
| `HK-BD117`      | Hộp đựng kính BD117 |
| `BONUOCRUAKINH` | Bộ nước rửa kính 3 màu (BONUOCRUA3C) — old photo until rebuilt |

## Current event seed

`DEFAULT_PRIZES` in `Code.gs` seeds the six gifts below with placeholder
stock 10 / weight 10 (only applied by `setup()` on a fresh sheet or by
`resetPrizes()`). Set the real counts in the sheet.

| id (mã hàng) | name | stock | weight | code_prefix |
|---|---|---|---|---|
| NONMOLSION  | Nón kết Molsion        | 10 | 10 | NM  |
| PENBL00001  | Bút bi BOLON           | 10 | 10 | PB  |
| VICARDBOLON | Ví đựng card BOLON     | 10 | 10 | VB  |
| HK-2204-1   | Hộp đựng kính 2204-1   | 10 | 10 | HK2 |
| HK-BD117    | Hộp đựng kính BD117    | 10 | 10 | HK1 |
| BONUOCRUA3C | Bộ nước rửa kính 3 màu | 10 | 10 | NRK |

## Endpoints

All POST `text/plain` (no `Content-Type` header — keeps it preflight-free).
Body is `{action: '<name>', ...params}`.

| action | params | returns |
|---|---|---|
| `setup` | — | `{ok, sheetsCreated, prizesSeeded, configSeeded}` |
| `getPrizes` | — | `{ok, prizes:[…]}` (stock > 0 only) |
| `checkPhone` | `phone` | `{ok, allowed, isTester, reason?}` |
| `spinWheel` | `phone` | `{ok, wedgeIndex, totalWedges, isTester, prize}` |
| `recordLoss` | `phone` | `{ok}` |

## Smoke test

From the script editor, run `selfTest()` and inspect the execution log.
