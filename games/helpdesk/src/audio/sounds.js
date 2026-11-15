// The sound table. Every entry is a small recipe of oscillators, filters and
// envelopes; no samples, no files, no downloads. Names are semantic so apps ask
// the OS for "error" and never learn what an error sounds like.
//
// Levels here are deliberately low. The engine owns master volume and a
// compressor after the buses, so a one-shot only has to be audible on its own.

const NOISE_SECONDS = 2;

const noiseBuffers = new WeakMap();

function noiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (buffer) return buffer;
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function envelope(param, when, attack, hold, release, peak) {
  const level = Math.max(0.0001, peak);
  const start = Math.max(0, when);
  param.setValueAtTime(0.0001, start);
  param.linearRampToValueAtTime(level, start + attack);
  param.setValueAtTime(level, start + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
}

/** A single filtered tone. `release` is the tail, not the total duration. */
function tone(ctx, dest, options) {
  const {
    when,
    freq,
    to = 0,
    type = "sine",
    attack = 0.006,
    hold = 0.03,
    release = 0.12,
    gain = 0.06,
    detune = 0,
    filter = null,
  } = options;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(to, when + attack + hold + release * 0.8);
  if (detune) osc.detune.setValueAtTime(detune, when);

  const amp = ctx.createGain();
  envelope(amp.gain, when, attack, hold, release, gain);

  let tail = osc;
  if (filter) {
    const node = ctx.createBiquadFilter();
    node.type = filter.type || "lowpass";
    node.frequency.setValueAtTime(filter.freq || 1200, when);
    if (filter.to) node.frequency.exponentialRampToValueAtTime(filter.to, when + attack + hold + release);
    node.Q.setValueAtTime(filter.q ?? 0.7, when);
    osc.connect(node);
    tail = node;
  }

  tail.connect(amp);
  amp.connect(dest);
  osc.start(when);
  osc.stop(when + attack + hold + release + 0.04);
}

/** A filtered chunk of the shared noise buffer: clicks, swooshes, crinkles. */
function noise(ctx, dest, options) {
  const {
    when,
    dur = 0.08,
    gain = 0.04,
    type = "bandpass",
    freq = 1400,
    to = 0,
    q = 0.9,
    attack = 0.004,
  } = options;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, when);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, when + dur);
  filter.Q.setValueAtTime(q, when);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  source.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  source.start(when);
  source.stop(when + dur + 0.02);
}

/** Soft bell: fundamental plus two quiet partials, the login/notify sound. */
function bell(ctx, dest, when, freq, tail, gain) {
  tone(ctx, dest, { when, freq, type: "sine", attack: 0.005, hold: 0.02, release: tail, gain });
  tone(ctx, dest, {
    when,
    freq: freq * 2.005,
    type: "sine",
    attack: 0.004,
    hold: 0.015,
    release: tail * 0.62,
    gain: gain * 0.2,
  });
  tone(ctx, dest, {
    when,
    freq: freq * 3.01,
    type: "sine",
    attack: 0.004,
    hold: 0.01,
    release: tail * 0.36,
    gain: gain * 0.07,
  });
}

function sound(bus, duration, render) {
  return { bus, duration, render };
}

const TABLE = {
  boot: sound("alerts", 1.05, (ctx, out, when, { gain }) => {
    // A rising G-major line with a quiet low root, the machine clearing its throat.
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, index) => bell(ctx, out, when + index * 0.1, freq, 0.72 - index * 0.05, 0.07 * gain));
    tone(ctx, out, { when, freq: 196, type: "sine", attack: 0.03, hold: 0.2, release: 0.7, gain: 0.035 * gain });
  }),

  logout: sound("alerts", 0.68, (ctx, out, when, { gain }) => {
    const notes = [523.25, 392, 311.13];
    notes.forEach((freq, index) => bell(ctx, out, when + index * 0.11, freq, 0.32, 0.062 * gain));
    tone(ctx, out, { when, freq: 130.81, type: "sine", attack: 0.02, hold: 0.16, release: 0.38, gain: 0.03 * gain });
  }),

  notify: sound("alerts", 0.4, (ctx, out, when, { gain }) => {
    bell(ctx, out, when, 1318.51, 0.2, 0.055 * gain);
    bell(ctx, out, when + 0.1, 1760, 0.2, 0.05 * gain);
  }),

  success: sound("alerts", 0.55, (ctx, out, when, { gain }) => {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, index) => {
      tone(ctx, out, {
        when: when + index * 0.07,
        freq,
        type: "triangle",
        attack: 0.008,
        hold: 0.03,
        release: 0.26,
        gain: 0.055 * gain,
        filter: { type: "lowpass", freq: 3200 },
      });
    });
  }),

  error: sound("alerts", 0.55, (ctx, out, when, { gain }) => {
    // The one sound allowed to be rude: a short descending buzz with a second
    // thump underneath it.
    tone(ctx, out, {
      when,
      freq: 196,
      to: 146.83,
      type: "sawtooth",
      attack: 0.008,
      hold: 0.08,
      release: 0.28,
      gain: 0.07 * gain,
      filter: { type: "lowpass", freq: 1100, q: 0.9 },
    });
    tone(ctx, out, {
      when: when + 0.16,
      freq: 185,
      to: 138.59,
      type: "square",
      attack: 0.006,
      hold: 0.05,
      release: 0.2,
      gain: 0.035 * gain,
      filter: { type: "lowpass", freq: 900 },
    });
    noise(ctx, out, { when, dur: 0.2, gain: 0.012 * gain, freq: 320, type: "lowpass", q: 0.4 });
  }),

  warning: sound("alerts", 0.48, (ctx, out, when, { gain }) => {
    tone(ctx, out, {
      when,
      freq: 880,
      type: "triangle",
      attack: 0.006,
      hold: 0.05,
      release: 0.08,
      gain: 0.065 * gain,
      filter: { type: "lowpass", freq: 2600 },
    });
    tone(ctx, out, {
      when: when + 0.18,
      freq: 880,
      type: "triangle",
      attack: 0.006,
      hold: 0.05,
      release: 0.08,
      gain: 0.065 * gain,
      filter: { type: "lowpass", freq: 2600 },
    });
  }),

  click: sound("ui", 0.06, (ctx, out, when, { gain }) => {
    noise(ctx, out, { when, dur: 0.024, gain: 0.032 * gain, freq: 2100, q: 1.3 });
    tone(ctx, out, { when, freq: 1450, to: 1100, type: "sine", attack: 0.002, hold: 0.004, release: 0.022, gain: 0.022 * gain });
  }),

  "window.open": sound("ui", 0.3, (ctx, out, when, { gain }) => {
    noise(ctx, out, { when, dur: 0.2, gain: 0.03 * gain, freq: 700, to: 2600, q: 0.7 });
    tone(ctx, out, { when: when + 0.04, freq: 880, to: 1320, type: "sine", attack: 0.004, hold: 0.03, release: 0.1, gain: 0.03 * gain });
  }),

  "window.close": sound("ui", 0.26, (ctx, out, when, { gain }) => {
    noise(ctx, out, { when, dur: 0.17, gain: 0.028 * gain, freq: 2400, to: 600, q: 0.7 });
    tone(ctx, out, { when: when + 0.03, freq: 660, to: 440, type: "sine", attack: 0.004, hold: 0.02, release: 0.1, gain: 0.026 * gain });
  }),

  "window.minimise": sound("ui", 0.19, (ctx, out, when, { gain }) => {
    tone(ctx, out, { when, freq: 784, to: 523.25, type: "triangle", attack: 0.004, hold: 0.02, release: 0.11, gain: 0.04 * gain });
    noise(ctx, out, { when, dur: 0.03, gain: 0.018 * gain, freq: 1800, q: 1.2 });
  }),

  "menu.open": sound("ui", 0.075, (ctx, out, when, { gain }) => {
    tone(ctx, out, { when, freq: 1240, type: "sine", attack: 0.002, hold: 0.006, release: 0.03, gain: 0.026 * gain });
    noise(ctx, out, { when, dur: 0.018, gain: 0.012 * gain, freq: 2600, q: 1.4 });
  }),

  "menu.close": sound("ui", 0.065, (ctx, out, when, { gain }) => {
    tone(ctx, out, { when, freq: 720, type: "sine", attack: 0.002, hold: 0.005, release: 0.028, gain: 0.023 * gain });
  }),

  "usb.connect": sound("ui", 0.66, (ctx, out, when, { gain }) => {
    // Two-note confirmation, low then high: the classic "device found" shape.
    bell(ctx, out, when, 659.25, 0.28, 0.075 * gain);
    bell(ctx, out, when + 0.15, 880, 0.4, 0.07 * gain);
  }),

  "usb.disconnect": sound("ui", 0.55, (ctx, out, when, { gain }) => {
    bell(ctx, out, when, 880, 0.22, 0.06 * gain);
    bell(ctx, out, when + 0.13, 587.33, 0.34, 0.06 * gain);
  }),

  "empty.bin": sound("ui", 0.72, (ctx, out, when, { gain }) => {
    // Paper and plastic being crushed, not a single sample.
    for (let i = 0; i < 7; i++) {
      const at = when + Math.random() * 0.44;
      noise(ctx, out, {
        when: at,
        dur: 0.03 + Math.random() * 0.05,
        gain: (0.022 + Math.random() * 0.018) * gain,
        freq: 800 + Math.random() * 2200,
        q: 0.8,
      });
    }
    tone(ctx, out, { when, freq: 110, to: 70, type: "sine", attack: 0.01, hold: 0.1, release: 0.46, gain: 0.028 * gain });
  }),

  lock: sound("ui", 0.36, (ctx, out, when, { gain }) => {
    noise(ctx, out, { when, dur: 0.03, gain: 0.03 * gain, freq: 2400, q: 1.5 });
    tone(ctx, out, { when: when + 0.02, freq: 440, to: 220, type: "triangle", attack: 0.004, hold: 0.03, release: 0.2, gain: 0.04 * gain });
  }),
};

// A couple of names are aliases, because "boot" and "login" are the same event
// from different parts of the OS. Callers get the alias, the table stays small.
export const SOUND_ALIASES = { login: "boot" };

export const SOUND_NAMES = [...Object.keys(TABLE), ...Object.keys(SOUND_ALIASES)];

export function resolveSound(name) {
  if (typeof name !== "string") return null;
  const key = SOUND_ALIASES[name] || name;
  return TABLE[key] || null;
}

export function isSoundName(name) {
  return Boolean(resolveSound(name));
}

export { clamp };
