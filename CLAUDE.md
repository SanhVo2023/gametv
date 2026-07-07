# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-device touchscreen **kiosk** app (Next.js Pages Router) for the *Mắt Việt Anniversary Event*. One vertical 43″ portrait TV (1080×1920), many players, identified only by phone number. Player flow: idle → phone → instructions → difficulty → memory game → win → wheel of fortune → prize reveal → auto-reset (15 s). All Vietnamese UI copy.

`README.md` has the full setup, kiosk-launch, and manual test plan; `gas/README.md` documents the backend sheet schema and endpoints. Read those before changing setup/deploy steps or the sheet contract. This file covers the architecture those docs don't.

## Commands

```bash
npm run dev      # next dev — local only; too heavy for the kiosk TV
npm run build    # next build
npm start        # next start — ALWAYS use the prod build on the kiosk
npm run lint     # next lint
```

There is no test runner — verification is the manual checklist in `README.md` (run in Chrome DevTools as a custom 1080×1920 portrait touch device). The "backend smoke test" is `selfTest()` run from the Apps Script editor, not an npm script.

Requires `.env.local` with `NEXT_PUBLIC_GAS_URL=<deployed GAS /exec URL>` (copy from `.env.local.example`). Without it, all backend calls return `{ok:false, error:"GAS_URL_NOT_CONFIGURED"}`.

## Architecture

**Frontend is a pure state machine; the Google Apps Script is the only backend and the only source of truth.** There is no database, API route, or server code in this repo other than `gas/Code.gs` (which runs in Google's environment, not Next.js).

- `pages/index.tsx` renders `components/KioskApp.tsx` with `dynamic(..., { ssr: false })` — the whole app is client-only. Don't reach for SSR/getServerSideProps; nothing here is server-rendered.
- **`components/KioskApp.tsx` is the single state machine.** It owns the `AppState` union (`lib/types.ts`) and all cross-screen state (phone, difficulty, prizes, spin result, sound). Every screen/overlay under `components/screens` and `components/overlays` is a leaf that receives callbacks (`onWin`, `onCancel`, …) and calls back up to drive transitions. To add or reorder a step, edit the `AppState` type and the transition handlers + render switch in `KioskApp.tsx` together.
- **`lib/gas.ts` is the typed client for the backend.** All network access funnels through `post()`: POST with **no `Content-Type` header** (sends `text/plain`, deliberately avoiding the CORS preflight that Apps Script Web Apps can't answer), per-attempt 10 s abort timeout, retry on network errors only (app-level `{ok:false}` is surfaced immediately, never retried), and a 30 s in-memory `getPrizes` cache. Keep new backend calls inside this module and preserve the no-preflight POST shape.
- **`gas/Code.gs`** fronts one Google Sheet with three tabs (`Config`, `Prizes`, `Plays`). Dispatch is `doPost` → `do<Action>`. Phone uniqueness, stock decrement, prize weighting, and voucher-code generation are all enforced here — the frontend cannot be trusted for any of it.

### Latency-hiding contract (don't break this)

When the game is won, `KioskApp.handleGameWin` fires `spinWheel(phone)` **immediately** and stashes the unresolved promise in `spinPromiseRef`, then shows `WinTransition` (~1.4 s). `WheelOfFortune` later awaits that same promise so the network round-trip is hidden behind the transition + pre-spin animation. The backend decides the outcome (`wedgeIndex`); the wheel animation is just deterministically driven to land on it. Don't move the spin request into the wheel component or compute the prize on the client.

Related: `SpinResult.prizes` is the **authoritative ordered wedge list** — once the spin resolves, `WheelOfFortune` rebuilds its wedges from `result.prizes` (not the cached `getPrizes` list) and computes the landing angle from `wedgeIndex / prizes.length`. If you render the wheel from any other prize list, the pointer can land on the wrong prize.

### Tester phone

`0777863808` (configurable in the sheet's `Config` tab) bypasses phone-uniqueness and never decrements stock — it can win repeatedly. This is enforced in `gas/Code.gs`; `isTester` flows back through `SpinResult` to the reveal screen. Preserve this behavior in any backend change.

### Performance mode (`lib/perf.ts`)

The kiosk runs on a weak GPU (LG One:Flex), so there are two visual profiles. `?perf=low` (or `?perf=high`) is read **at module load, before first render**, persisted to localStorage, and written to `<html data-perf="low">`. CSS in `styles/globals.css` short-circuits expensive effects via `html[data-perf="low"] …` selectors; components also call `isLowPerf()` to skip particles/preloads at the source (e.g. KioskApp skips `preloadPrizeImages()`). When adding any continuous/GPU-heavy effect (backdrop-filter, conic-gradient animation, looping transforms), gate it behind both a `data-perf` CSS rule and/or `isLowPerf()`.

### Audio (`lib/audio.ts`)

All SFX/ambient pad are synthesized via WebAudio — no audio files. The context is locked by browsers until a user gesture: `unlockAudio()` runs on the first **BẮT ĐẦU CHƠI** tap (`handleStart`), gated by `audioUnlockedRef`. The ambient pad plays only on `idle` while sound is on and audio is unlocked. Sound preference persists to localStorage.

## Conventions

- TypeScript strict, path-relative imports (`../lib/...`), no path aliases.
- Styling is Tailwind (`tailwind.config.cjs`) plus a large hand-written `styles/globals.css` holding the custom effect classes the perf selectors target.
- Kiosk hardening lives in `KioskApp` effects: portrait orientation lock, multi-touch `touchmove` prevention (anti pull-to-refresh). Keep these intact.
- All user-facing strings are Vietnamese; playful copy variants live in `lib/playfulCopy.ts`.
