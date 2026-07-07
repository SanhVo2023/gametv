---
name: verify
description: How to build, launch, and drive this kiosk app to verify changes end-to-end
---

# Verifying the memory-game kiosk

## Build + launch

```bash
npm run build     # must rebuild after ANY change — npm start serves .next
npm start         # prod server on http://localhost:3000 (run in background)
```

Open with Playwright at viewport **1080×1920** (the kiosk TV). Append
`?perf=high` or `?perf=low` — the value persists to localStorage, so always
pass it explicitly to avoid a stale profile from a previous run.

## Driving the flow

idle → phone → instructions → difficulty → game → win → wheel → reveal → auto-reset (15 s)

- Landing CTA: button "Bắt Đầu Chơi". PhonePad digits are buttons named "0"–"9";
  confirm is the last "BẮT ĐẦU" button.
- **Always use the tester phone `0777863808`** — bypasses uniqueness and never
  decrements live sheet stock. `checkPhone`/`spinWheel` hit the real GAS
  backend (allow ~4 s after confirm).
- Instructions auto-advance after 15 s or click "BẮT ĐẦU CHƠI". Difficulty:
  click the text "DỄ" (easy) or "KHÓ" (hard).
- Cards respond to **pointerdown** (not click). To simulate the TV's rapid
  two-handed taps: `locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 })`
  back-to-back with no wait.
- Read the board solution from the DOM (face-front text = brand wordmark):
  `document.querySelectorAll('.card-container')` → `.face-front` textContent.
  Flipped state: `.card.flipped`; matched-vanished: `.card-container.vanished`;
  HUD pair counter matches `/(\d) \/ 8/` in body text.
- Winning fires `spinWheel` immediately (latency-hiding contract); wheel spins
  ~4 s, reveal auto-resets to idle after 15 s — screenshot promptly.

## Lucky draw (/spin, /spin-admin)

- `/spin` is the end-of-event draw (numbers 1–50, 10 prize slots). Entry from
  the landing: **double-tap** the dim gift button bottom-left within 1.5 s.
- State lives in localStorage `lucky_draw_state_v1` — seed it via
  `page.evaluate` to fast-forward tests; `/spin?reset=1` opens the reset
  confirm panel. A full spin takes ~5.6 s (1.5 s shuffle + ~4 s decelerate).
- Admin force channel: `/spin-admin?key=<Config spin_admin_key>`; requires the
  GAS deployment to have the draw* actions — against an older deployment the
  submit toast shows "unknown_action" and the TV spins pure-random (by design).

## Gotchas

- Playwright MCP screenshots: relative paths land somewhere unfindable on this
  machine — use `browser_run_code_unsafe` with `page.screenshot({ path: '<absolute scratchpad path>' })`.
- The prize marquee/wheel render LIVE Google-Sheet data, not the seed in
  `gas/Code.gs` — mismatches there are sheet state, not app bugs.
- The board samples 8 random brands of 10 per game — don't hardcode pair
  positions across runs.
