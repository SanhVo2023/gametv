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

## Initial event stock (Anniversary Event — every gift unlimited)

All gifts are effectively unlimited for this event, so every row is seeded with
a big stock (500). Weight = stock → uniform initial distribution; edit weights
live in the sheet to bias the wheel.

| id (mã hàng) | name | stock | weight |
|---|---|---|---|
| HK-BD117    | Hộp kính thời trang    | 500 | 500 |
| VIBOLON     | Ví Bolon               | 500 | 500 |
| BUTBOLON    | Bút Bolon              | 500 | 500 |
| NONMOLSION  | Nón thời trang Molsion | 500 | 500 |
| TUIBLING    | Túi Bling Molsion      | 500 | 500 |
| VONGDEO     | Vòng đeo kính          | 500 | 500 |
| VOUCHER200K | Voucher 200.000đ       | 500 | 500 |
| VOUCHER100K | Voucher 100.000đ       | 500 | 500 |

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
