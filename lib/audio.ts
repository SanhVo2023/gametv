/**
 * Web Audio synthesizer for the kiosk.
 * - Every sound is generated on the fly (no asset files).
 * - Sounds are layered (tone stacks + filtered-noise bursts) for a richer,
 *   more "produced" feel than single-oscillator blips.
 * - Sound-enabled state persists in localStorage("kiosk_sound").
 */

const STORAGE_KEY = "kiosk_sound";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambient: { stop: () => void } | null = null;
let soundEnabled = true;

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function loadSoundPreference(): boolean {
  const w = safeWindow();
  if (!w) return true;
  try {
    const stored = w.localStorage.getItem(STORAGE_KEY);
    soundEnabled = stored === null ? true : stored === "1";
  } catch {
    soundEnabled = true;
  }
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!enabled) stopAmbientPad();
  if (masterGain && ctx) masterGain.gain.value = enabled ? 1 : 0;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const W = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = soundEnabled ? 1 : 0;
  masterGain.connect(ctx.destination);
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Synthesis primitives                                              */
/* ------------------------------------------------------------------ */

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
  attack?: number;
  release?: number;
  delay?: number;
}

/** A single enveloped oscillator voice. */
function tone(freq: number, duration: number, options: ToneOptions = {}): void {
  if (!soundEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;

  const startAt = c.currentTime + (options.delay ?? 0);
  const type: OscillatorType = options.type ?? "sine";
  const peak = options.gain ?? 0.18;
  const attack = options.attack ?? 0.012;
  const release = options.release ?? Math.max(0.05, duration * 0.35);

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (options.glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.glideTo), startAt + duration);
  }
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(peak, startAt + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration + release);

  osc.connect(g);
  g.connect(masterGain);
  osc.start(startAt);
  osc.stop(startAt + duration + release + 0.02);
}

interface NoiseOptions {
  duration: number;
  type?: BiquadFilterType;
  from?: number;
  to?: number;
  q?: number;
  gain?: number;
  delay?: number;
}

/** A filtered white-noise burst — for whooshes, shuffles, airy textures. */
function noiseBurst(opts: NoiseOptions): void {
  if (!soundEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;

  const dur = opts.duration;
  const now = c.currentTime + (opts.delay ?? 0);
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.Q.value = opts.q ?? 1;
  const from = opts.from ?? 800;
  const to = opts.to ?? from;
  filter.frequency.setValueAtTime(from, now);
  if (to !== from) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + dur);
  }

  const g = c.createGain();
  const peak = opts.gain ?? 0.1;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + Math.min(0.05, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  noise.start(now);
  noise.stop(now + dur + 0.02);
}

/* ------------------------------------------------------------------ */
/*  Game sounds                                                       */
/* ------------------------------------------------------------------ */

/** The big one — a grand "let's go!" stinger when the player hits Start. */
export function playStart(): void {
  if (!soundEnabled) return;
  // 1) anticipation whoosh, rising
  noiseBurst({ duration: 0.42, type: "bandpass", from: 280, to: 3200, q: 0.8, gain: 0.13 });
  // 2) bright ascending sparkle run
  const run = [392, 523.25, 659.25, 783.99, 1046.5];
  run.forEach((f, i) => {
    tone(f, 0.16, { type: "triangle", gain: 0.13, attack: 0.004, release: 0.14, delay: 0.07 + i * 0.072 });
  });
  // 3) the resolved chord hit at the peak
  const chordAt = 0.07 + run.length * 0.072; // ≈ 0.43s
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => {
    tone(f, 0.8, { type: "sine", gain: 0.12, attack: 0.008, release: 0.6, delay: chordAt });
  });
  // 4) shimmer on top
  [1568, 2093].forEach((f, i) => {
    tone(f, 0.55, { type: "sine", gain: 0.05, attack: 0.01, release: 0.5, delay: chordAt + 0.04 + i * 0.05 });
  });
  // 5) sub-bass thump for impact
  tone(110, 0.45, { type: "sine", glideTo: 55, gain: 0.18, attack: 0.005, release: 0.34, delay: chordAt });
}

/** Numpad key — crisp, short tick with a bright transient. */
export function playKeyTap(): void {
  tone(860, 0.035, { type: "sine", gain: 0.08, attack: 0.002, release: 0.03 });
  tone(1720, 0.018, { type: "sine", gain: 0.03, attack: 0.001, release: 0.016 });
}

/** Card flip — quick airy whip. */
export function playFlipSound(): void {
  tone(440, 0.07, { type: "triangle", glideTo: 880, gain: 0.1, attack: 0.003, release: 0.05 });
  noiseBurst({ duration: 0.06, type: "highpass", from: 2200, q: 0.7, gain: 0.025 });
}

/** Pair matched — rewarding bell arpeggio with an octave shimmer + sparkle tail. */
export function playMatchSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(f, 0.28, { type: "sine", gain: 0.13, attack: 0.006, release: 0.26, delay: i * 0.068 });
    tone(f * 2, 0.16, { type: "sine", gain: 0.028, attack: 0.004, release: 0.15, delay: i * 0.068 });
  });
  tone(1567.98, 0.42, { type: "sine", gain: 0.05, attack: 0.01, release: 0.38, delay: 0.27 });
}

/** Happy pop — for a matched pair bounce. */
export function playPop(): void {
  tone(520, 0.06, { type: "triangle", glideTo: 1200, gain: 0.13, attack: 0.002, release: 0.05 });
  tone(1400, 0.05, { type: "sine", gain: 0.06, attack: 0.003, release: 0.05, delay: 0.03 });
}

/** Wrong match — a playful, comedic spring wobble (not punishing). */
export function playBoing(): void {
  tone(430, 0.1, { type: "sine", glideTo: 175, gain: 0.12, attack: 0.004, release: 0.04 });
  tone(175, 0.12, { type: "sine", glideTo: 340, gain: 0.09, attack: 0.015, release: 0.06, delay: 0.08 });
  tone(340, 0.14, { type: "sine", glideTo: 210, gain: 0.055, attack: 0.02, release: 0.09, delay: 0.17 });
}

/** Soft "aww" — phone error / time's up. Gentle, not harsh. */
export function playErrorSound(): void {
  tone(330, 0.18, { type: "sine", glideTo: 247, gain: 0.1, attack: 0.01, release: 0.14 });
  tone(247, 0.32, { type: "triangle", glideTo: 196, gain: 0.08, attack: 0.02, release: 0.22, delay: 0.14 });
}

/** Wheel tick — crisp mechanical click as the pointer passes a wedge. */
export function playWheelTick(): void {
  tone(1120, 0.028, { type: "triangle", gain: 0.05, attack: 0.001, release: 0.022 });
}

/** Shuffle swoosh — for the hard-mode card swap. */
export function playShuffle(): void {
  noiseBurst({ duration: 0.28, type: "bandpass", from: 600, to: 1900, q: 1.2, gain: 0.09 });
  noiseBurst({ duration: 0.24, type: "bandpass", from: 1700, to: 480, q: 1.2, gain: 0.07, delay: 0.12 });
  tone(440, 0.12, { type: "triangle", glideTo: 620, gain: 0.06, attack: 0.01, release: 0.07, delay: 0.05 });
}

/** Wheel launch — a big dramatic whoosh. */
export function playWhoosh(): void {
  noiseBurst({ duration: 0.55, type: "bandpass", from: 240, to: 2900, q: 0.9, gain: 0.16 });
  noiseBurst({ duration: 0.5, type: "bandpass", from: 2900, to: 380, q: 0.9, gain: 0.1, delay: 0.18 });
  tone(155, 0.36, { type: "sine", glideTo: 380, gain: 0.09, attack: 0.01, release: 0.26 });
}

/** Countdown beep — escalating pitch + a click transient in the final seconds. */
export function playCountdownTick(secondsLeft: number): void {
  const clamped = Math.max(1, Math.min(10, secondsLeft));
  const freq = 1240 - clamped * 60;
  const urgent = clamped <= 3;
  tone(freq * 2.2, 0.012, { type: "square", gain: 0.04, attack: 0.001, release: 0.01 });
  tone(freq, urgent ? 0.13 : 0.085, {
    type: "square",
    gain: urgent ? 0.13 : 0.09,
    attack: 0.003,
    release: urgent ? 0.1 : 0.055,
  });
}

/** Win — a grand triumphant fanfare: ascending run → resolved chord → shimmer + sub-bass. */
export function playWinSting(): void {
  if (!soundEnabled) return;
  const run: [number, number][] = [
    [392, 0],
    [523.25, 0.09],
    [659.25, 0.18],
    [783.99, 0.27],
  ];
  run.forEach(([f, t]) => {
    tone(f, 0.3, { type: "triangle", gain: 0.13, attack: 0.006, release: 0.22, delay: t });
  });

  const chordAt = 0.4;
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f) => {
    tone(f, 1.1, { type: "sine", gain: 0.11, attack: 0.01, release: 0.85, delay: chordAt });
  });
  [1568, 2093, 2637].forEach((f, i) => {
    tone(f, 0.6, { type: "sine", gain: 0.042, attack: 0.008, release: 0.5, delay: chordAt + 0.06 + i * 0.05 });
  });
  tone(98, 0.6, { type: "sine", glideTo: 49, gain: 0.17, attack: 0.005, release: 0.45, delay: chordAt });
  tone(1046.5, 0.4, { type: "triangle", gain: 0.07, attack: 0.006, release: 0.34, delay: chordAt + 0.52 });
}

/* ------------------------------------------------------------------ */
/*  Ambient pad                                                       */
/* ------------------------------------------------------------------ */

/** Lush, very quiet ambient bed for the idle screen — three detuned voices
 *  with a slow detune drift and a slow filter sweep for gentle movement. */
export function startAmbientPad(): void {
  if (!soundEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (ambient) return;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.7;

  const padGain = c.createGain();
  padGain.gain.setValueAtTime(0, c.currentTime);
  padGain.gain.linearRampToValueAtTime(0.02, c.currentTime + 1.6);

  // three detuned voices
  const a = c.createOscillator();
  const b = c.createOscillator();
  const d = c.createOscillator();
  a.type = "sine";
  b.type = "sine";
  d.type = "triangle";
  a.frequency.value = 110; // root
  b.frequency.value = 165; // fifth
  d.frequency.value = 220; // octave colour

  // gentle detune drift across all voices
  const detuneLfo = c.createOscillator();
  const detuneAmt = c.createGain();
  detuneLfo.type = "sine";
  detuneLfo.frequency.value = 0.07;
  detuneAmt.gain.value = 5;
  detuneLfo.connect(detuneAmt);
  detuneAmt.connect(a.detune);
  detuneAmt.connect(b.detune);
  detuneAmt.connect(d.detune);

  // slow filter sweep for movement
  const filterLfo = c.createOscillator();
  const filterAmt = c.createGain();
  filterLfo.type = "sine";
  filterLfo.frequency.value = 0.05;
  filterAmt.gain.value = 110;
  filterLfo.connect(filterAmt);
  filterAmt.connect(filter.frequency);

  const dGain = c.createGain();
  dGain.gain.value = 0.4;

  a.connect(filter);
  b.connect(filter);
  d.connect(dGain);
  dGain.connect(filter);
  filter.connect(padGain);
  padGain.connect(masterGain);

  a.start();
  b.start();
  d.start();
  detuneLfo.start();
  filterLfo.start();

  ambient = {
    stop: () => {
      try {
        padGain.gain.cancelScheduledValues(c.currentTime);
        padGain.gain.setValueAtTime(padGain.gain.value, c.currentTime);
        padGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.7);
        const stopAt = c.currentTime + 0.8;
        a.stop(stopAt);
        b.stop(stopAt);
        d.stop(stopAt);
        detuneLfo.stop(stopAt);
        filterLfo.stop(stopAt);
      } catch {
        /* ignore */
      }
      ambient = null;
    },
  };
}

export function stopAmbientPad(): void {
  if (ambient) ambient.stop();
}

export function isAmbientPadRunning(): boolean {
  return ambient !== null;
}
