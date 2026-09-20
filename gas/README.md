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
| `image_url` | (optional) future use |
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

## Current gift list

The seed below is what `setup()` / `resetPrizes()` write. Stock and weight are
placeholders (10 / 10 = equal odds): set the real quantities in the sheet
before each event. Each row is one wedge on the wheel, in sheet order.

| id (mã hàng) | name | stock | weight | code_prefix |
|---|---|---|---|---|
| NONMOLSION  | Nón kết Molsion    | 10 | 10 | NM  |
| PENBL00001  | Bút bi Bolon       | 10 | 10 | PB  |
| VICARDBOLON | Ví đựng card Bolon | 10 | 10 | VC  |
| HK-2204-1   | Hộp kính lông vũ   | 10 | 10 | HK1 |
| HK-BD117    | Hộp kính Mắt Việt  | 10 | 10 | HK2 |
| BONUOCRUA3C | Bộ nước rửa kính   | 10 | 10 | NRK |

Photos live in the frontend under `public/present/<id>.png` (see
`lib/prizeImages.ts`). Any id with no photo renders as a voucher card.

## Changing gifts WITHOUT touching the script

The script never needs to change when the gifts change — it reads the
`Prizes` tab on every spin. Everything below works from the Google Sheets
mobile app too.

1. Open the Google Sheet the script is bound to and switch to the `Prizes`
   tab (tabs are at the bottom of the screen in the mobile app).
2. Leave row 1 (the header) exactly as it is:
   `id | name | stock | weight | code_prefix | image_url | description | color_hex`.
3. Make the rows below match the gift list above — one row per gift, in the
   order you want them around the wheel. Edit cells in place, delete rows for
   gifts you no longer have, and add rows for new ones. Typing the `id` is the
   important part: it must match the frontend's photo keys **exactly** (same
   letters, case and dashes) or the wedge will show a voucher card.
4. Set `stock` to the number of units you physically have and `weight` to the
   relative odds (equal numbers = equal odds). `stock` reaching 0 hides the
   gift automatically.
5. Optional: `description` is the line shown under the gift on the win screen;
   `color_hex` overrides the wedge colour; leave `image_url` blank.
6. Don't rename, reorder or delete the header columns, and don't touch the
   `Config` or `Plays` tabs. The kiosk picks the changes up within ~1 minute
   (30 s cache) — no redeploy.

Old ids (`BUTBOLON`, `VIBOLON`, `HOPKINH`, `BONUOCRUAKINH`) still map to the
same photos in the frontend, so re-keying rows can be done at any time.

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
