# Mắt Việt — Vision Care + Elite Day Kiosk

A vertical 43″ touchscreen kiosk app for the *Vision Care + Elite Day* event
(Mắt Việt × Diamond Plaza × LOTTE Department Store).

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
# open http://localhost:3000 in Chrome DevTools (custom device 1080×1920, portrait, touch)
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

Use Chrome in kiosk mode:

```
chrome --kiosk --disable-pinch --overscroll-history-navigation=0 ^
       --autoplay-policy=no-user-gesture-required ^
       --noerrdialogs --disable-translate --no-first-run ^
       https://your-host.example/
```

In Windows tablet/kiosk settings, set the display orientation to portrait.

If sound doesn't unlock automatically, the user must tap the **BẮT ĐẦU CHƠI**
button once after page load — the touch unlocks the WebAudio context.

---

## Project layout

```
components/
  KioskApp.tsx                State machine: idle → phone → game → win → wheel → reveal.
  screens/
    LandingScreen.tsx         Idle: logo, CTA.
    PhonePad.tsx              Touch numpad.
    MemoryBoard.tsx           4×4 grid, 75s timer.
    WheelOfFortune.tsx        SVG wheel, deterministic land on chosen wedge.
    PrizeReveal.tsx           Prize, code, 15s auto-reset countdown.
    NoPrizesScreen.tsx        Empty-stock fallback.
  overlays/
    WinTransition.tsx         1.4s "Xuất sắc!" flash before wheel.
    LoseModal.tsx             Out-of-time retry / home.
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
  Artboard 1.png              VISION CARE+ lockup → landing hero.
  Artboard 7.png              Model portrait.
  Artboard 9.png              Eye-heart icon → cards, wheel, prize.
```

---

## Test plan

### Backend smoke tests (Apps Script editor → Run `selfTest()` or Postman)

| step | expect |
|---|---|
| `POST {action:'setup'}` | `ok:true`, 3 sheets created, 6 prizes seeded |
| `POST {action:'getPrizes'}` | 6 prizes returned, all `stock>0` |
| `POST {action:'checkPhone', phone:'0777863808'}` | `{allowed:true, isTester:true}` |
| `POST {action:'checkPhone', phone:'0900000001'}` | `{allowed:true, isTester:false}` |
| `POST {action:'spinWheel', phone:'0777863808'}` ×3 | valid `wedgeIndex` each; **stock unchanged** in sheet |
| `POST {action:'spinWheel', phone:'0900000001'}` | stock decrements by 1; Plays row appended |
| Re-`checkPhone` `'0900000001'` | `{allowed:false, reason:'already_won'}` |
| `POST {action:'recordLoss', phone:'0900000002'}` | Plays row `is_win:false`; `checkPhone` still `allowed:true` |
| Zero all stock → `spinWheel` | `{ok:false, error:'no_prizes_available'}` → FE shows fallback screen |

### Frontend in Chrome DevTools (custom device 1080×1920 portrait, touch)

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
