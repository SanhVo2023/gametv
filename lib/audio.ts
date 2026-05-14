/**
 * Web Audio synthesizer for the kiosk.
 * - All sounds are generated on the fly (no asset files).
 * - Sound enable state persists in localStorage("kiosk_sound").
 * - The ambient pad uses two detuned oscillators through a lowpass filter.
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
  const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
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

function tone(
  freq: number,
  duration: number,
  options: {
    type?: OscillatorType;
    gain?: number;
    glideTo?: number;
    attack?: number;
    release?: number;
    delay?: number;
  } = {}
): void {
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

export function playFlipSound(): void {
  tone(520, 0.06, { type: "sine", glideTo: 700, gain: 0.12, attack: 0.005, release: 0.04 });
}

export function playMatchSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, i) => {
    tone(freq, 0.18, { type: "sine", gain: 0.14, attack: 0.01, release: 0.18, delay: i * 0.06 });
  });
}

export function playErrorSound(): void {
  tone(160, 0.2, { type: "sawtooth", glideTo: 90, gain: 0.08, attack: 0.005, release: 0.06 });
}

export function playWheelTick(): void {
  tone(880, 0.032, { type: "triangle", gain: 0.05, attack: 0.002, release: 0.022 });
}

export function playWinSting(): void {
  if (!soundEnabled) return;
  const notes = [
    [392, 0],
    [523.25, 0.1],
    [659.25, 0.2],
    [783.99, 0.32],
    [1046.5, 0.46],
    [1318.51, 0.62],
  ] as const;
  notes.forEach(([freq, t]) => {
    tone(freq, 0.42, { type: "sine", gain: 0.18, attack: 0.008, release: 0.28, delay: t });
  });
  tone(196, 0.9, { type: "triangle", gain: 0.1, attack: 0.02, release: 0.6, delay: 0.02 });
}

export function playKeyTap(): void {
  tone(720, 0.04, { type: "sine", gain: 0.08, attack: 0.003, release: 0.03 });
}

/** Springy "boing" — for a wrong-match shake. */
export function playBoing(): void {
  tone(440, 0.13, { type: "sine", glideTo: 170, gain: 0.13, attack: 0.004, release: 0.05 });
  tone(170, 0.17, { type: "sine", glideTo: 300, gain: 0.08, attack: 0.02, release: 0.09, delay: 0.1 });
}

/** Happy pop — for a matched pair bounce. */
export function playPop(): void {
  tone(640, 0.05, { type: "triangle", glideTo: 1120, gain: 0.13, attack: 0.003, release: 0.05 });
  tone(1280, 0.06, { type: "sine", gain: 0.07, attack: 0.004, release: 0.06, delay: 0.04 });
}

/** Whoosh — filtered noise sweep for the wheel launch. */
export function playWhoosh(): void {
  if (!soundEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const dur = 0.5;
  const now = c.currentTime;

  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(280, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + dur * 0.45);
  filter.frequency.exponentialRampToValueAtTime(420, now + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.16, now + 0.07);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  noise.start(now);
  noise.stop(now + dur + 0.02);
}

export function startAmbientPad(): void {
  if (!soundEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (ambient) return; // already running

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.6;

  const padGain = c.createGain();
  padGain.gain.setValueAtTime(0, c.currentTime);
  padGain.gain.linearRampToValueAtTime(0.018, c.currentTime + 1.4);

  const a = c.createOscillator();
  const b = c.createOscillator();
  const subLfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfoGain.gain.value = 4;
  subLfo.frequency.value = 0.08;
  subLfo.type = "sine";
  subLfo.connect(lfoGain);
  lfoGain.connect(a.detune);
  lfoGain.connect(b.detune);

  a.type = "sine";
  b.type = "sine";
  a.frequency.value = 111;
  b.frequency.value = 167;

  a.connect(filter);
  b.connect(filter);
  filter.connect(padGain);
  padGain.connect(masterGain);

  a.start();
  b.start();
  subLfo.start();

  ambient = {
    stop: () => {
      try {
        padGain.gain.cancelScheduledValues(c.currentTime);
        padGain.gain.setValueAtTime(padGain.gain.value, c.currentTime);
        padGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
        a.stop(c.currentTime + 0.7);
        b.stop(c.currentTime + 0.7);
        subLfo.stop(c.currentTime + 0.7);
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
