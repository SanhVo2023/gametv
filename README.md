# Mắt Việt — Anniversary Event Kiosk

A vertical 43″ touchscreen kiosk app for the *Mắt Việt Anniversary Event*
(DIAmond Palza, 17/07/2026). Originally built for the Vision Care + Elite Day
event and re-themed.

Flow: idle → enter phone → memory game → win → wheel of fortune → prize reveal → auto-reset.

- One device, many players. Phone number is the only uniqueness key.
- Tester phone `0777863808` bypasses uniqueness and stock decrement.
- Backend: a single Google Apps Script web app fronting one Google Sheet.

---

## Local development

```bash
npm install
cp .env.local.example .env.local      # then paste your deployed GAS URL
npm run dev
# open http://localhost:3000 in Chrome DevTools (custom device 2160×3840, portrait, touch)
```

## Production build

```bash
npm run build
npm start
```

---

## Backend setup (Google Apps Script)

1. Create a new empty Google Sheet.
2. **Extensions → Apps Script** — paste the contents of [`gas/Code.gs`](gas/Code.gs).
3. From the script editor toolbar, run `setup()` once. Authorize when prompted.
   Verify three tabs: `Config`, `Prizes`, `Plays`.
4. **Deploy → New deployment → Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone** (with the link).
   - Copy the `/exec` URL.
5. Paste the URL into `.env.local`:
   `NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/.../exec`
6. Edit `Prizes` / `Config` in the sheet to taste. Prize stock/weights are read live (30 s frontend cache).

See [`gas/README.md`](gas/README.md) for the full endpoint reference.

---

## Kiosk deployment (43″ portrait TV)

Use Chrome in kiosk mode. For the **LG One:Flex** (mobile-class GPU/CPU)
launch with `?perf=low` and the low-end flags below — the app stays smooth
and the rich design still reads, just without the GPU-heavy continuous
effects (backdrop blurs, conic-gradient light-rays, breathing icons, etc.).

```
chrome --kiosk --disable-pinch --overscroll-history-navigation=0 ^
       --autoplay-policy=no-user-gesture-required ^
       --noerrdialogs --disable-translate --no-first-run ^
       --enable-low-end-device-mode ^
       --disable-background-timer-throttling ^
       --disable-features=Translate,InterestFeedV2,IsolateOrigins ^
       https://your-host.example/?perf=low
```

The `?perf=low` flag is persisted to localStorage on the first visit, so a
later launch without it still uses low-perf mode. Pass `?perf=high` to
switch back to the full visual profile (recommended for capable desktops /
demo screenshots, not for the TV).

Also: **always run the production build on the kiosk** (`npm run build &&
npm run start` or a deployed prod URL) — `next dev` adds significant
overhead that the TV cannot afford. In Windows tablet/kiosk settings, set
the display orientation to portrait, and confirm the panel/browser are at
60 Hz (some webOS/AndroidTV builds default to 30 Hz output).

If sound doesn't unlock automatically, the user must tap the **BẮT ĐẦU CHƠI**
button once after page load — the touch unlocks the WebAudio context.

---

## Project layout

```
components/
  KioskApp.tsx                State machine: idle → phone → instructions → difficulty → game → win → wheel → reveal.
  screens/
    LandingScreen.tsx         Idle: anniversary poster look, CTA, AI QR.
    PhonePad.tsx              Touch numpad.
    InstructionsScreen.tsx    Looping how-to demos.
    DifficultyScreen.tsx      Easy / hard selection.
    MemoryBoard.tsx           4×4 grid, timed; brand-logo pairs (random 8 of 10).
    WheelOfFortune.tsx        SVG wheel, deterministic land on chosen wedge.
    PrizeReveal.tsx           Prize, code, 15s auto-reset countdown.
  overlays/
    WinTransition.tsx         1.4s "Xuất sắc!" flash before wheel.
    LoseModal.tsx             Out-of-time retry / home.
  icons/
    BrandLogos.tsx            10 brand SVG wordmarks → memory-card faces.
  ui/
    SoundToggle.tsx           Bottom-right speaker on/off.
    button.tsx                Legacy reusable button (kept).
lib/
  gas.ts                      Typed GAS client (post/retry/cache).
  audio.ts                    Web Audio SFX + ambient pad.
  types.ts                    Shared types.
  phone.ts                    Vietnam mobile validation.
gas/
  Code.gs                     The Google Apps Script web app.
  README.md                   Setup + endpoint docs.
public/asset/
  kv-hero.jpg                 Anniversary KV (family + lens arch) → landing photo card.
  kv-poster.jpg               Event poster (reference / crops).
  Artboard 9.png              Eye-heart icon → card backs, wheel hub, watermark.
public/present/               Prize product photos (ids match the GAS Prizes tab).
```

---

## Test plan

### Backend smoke tests (Apps Script editor → Run `selfTest()` or Postman)

| step | expect |
|---|---|
| `POST {action:'setup'}` | `ok:true`, 3 sheets created, 8 prizes seeded |
| `POST {action:'getPrizes'}` | 8 prizes returned, all `stock>0` |
| `POST {action:'checkPhone', phone:'0777863808'}` | `{allowed:true, isTester:true}` |
| `POST {action:'checkPhone', phone:'0900000001'}` | `{allowed:true, isTester:false}` |
| `POST {action:'spinWheel', phone:'0777863808'}` ×3 | valid `wedgeIndex` each; **stock unchanged** in sheet |
| `POST {action:'spinWheel', phone:'0900000001'}` | stock decrements by 1; Plays row appended |
| Re-`checkPhone` `'0900000001'` | `{allowed:false, reason:'already_won'}` |
| `POST {action:'recordLoss', phone:'0900000002'}` | Plays row `is_win:false`; `checkPhone` still `allowed:true` |
| Zero all stock → `spinWheel` | `{ok:false, error:'no_prizes_available'}` → FE shows fallback screen |

### Frontend in Chrome DevTools (custom device 2160×3840 portrait, touch)

- [ ] Idle → tap CTA → phone pad → type `0777863808` → confirm → game starts (board 4×4).
- [ ] Solve all 8 pairs in time → Win Transition (~1.4 s) → Wheel spins ~4 s and lands on a wedge → Prize Reveal → after 15 s → returns to idle.
- [ ] Tester replays 3 wins in a row, stock never depletes.
- [ ] Lose path: let timer hit 0 → Lose Modal → CHƠI LẠI → returns to phone pad → enter same number → can replay.
- [ ] Sound toggle: tap speaker icon → ambient pad stops; SFX silenced; preference persists across reload.

### On-device (43″ TV + Chrome kiosk)

- [ ] Touch targets land first attempt (numpad keys, CTA button).
- [ ] No horizontal scroll, no overscroll bounce, no swipe-to-go-back.
- [ ] Sound levels readable across the booth.
- [ ] Auto-reset fires at 15 s exactly.
- [ ] WiFi drop mid-spin → retry indicator shows.
