// Global typing clatter. One keydown listener at the OS level means every text
// field in every app inherits it, including fields that land next year.
//
// The sound is a wood-plastic click: a short filtered noise tick plus a tiny
// pitched body. Each keystroke gets its own gain and pitch so a sentence does
// not sound like a machine gun.

export const KEY_VARIANTS = ["key", "enter", "space", "backspace"];

const clickBuffers = new WeakMap();

function clickBuffer(ctx) {
  let buffer = clickBuffers.get(ctx);
  if (buffer) return buffer;
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.08));
  buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  clickBuffers.set(ctx, buffer);
  return buffer;
}

const MODIFIERS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "AltGraph",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "Symbol",
  "SymbolLock",
  "OS",
]);

function tone(ctx, dest, when, freq, gain, release) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, when);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + release);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, when);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  osc.start(when);
  osc.stop(when + release + 0.02);
}

function tick(ctx, dest, when, freq, gain, dur) {
  const source = ctx.createBufferSource();
  source.buffer = clickBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, when);
  filter.Q.setValueAtTime(1.1, when);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + 0.0015);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  source.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  source.start(when);
  source.stop(when + dur + 0.01);
}

/** Render one keystroke into `dest`. Used live and by the offline check. */
export function renderKey(ctx, dest, when, { variant = "key", gain = 1, pitch = 1 } = {}) {
  const level = Math.max(0, gain);

  if (variant === "enter") {
    tick(ctx, dest, when, 620 * pitch, 0.04 * level, 0.026);
    tone(ctx, dest, when, 170 * pitch, 0.032 * level, 0.07);
    return;
  }

  if (variant === "space") {
    tick(ctx, dest, when, 900 * pitch, 0.035 * level, 0.03);
    tone(ctx, dest, when, 210 * pitch, 0.026 * level, 0.06);
    return;
  }

  if (variant === "backspace") {
    tick(ctx, dest, when, 520 * pitch, 0.042 * level, 0.022);
    tone(ctx, dest, when, 300 * pitch, 0.03 * level, 0.035);
    return;
  }

  tick(ctx, dest, when, (1500 + Math.random() * 500) * pitch, 0.055 * level, 0.016);
  tone(ctx, dest, when, (900 + Math.random() * 260) * pitch, 0.04 * level, 0.028);
}

function isTextEntry(target) {
  if (!target || typeof target.closest !== "function") return false;
  if (target.closest("[data-audio-typing='off']")) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA") return true;
  if (target.tagName !== "INPUT") return false;
  const type = (target.getAttribute("type") || "text").toLowerCase();
  return ["text", "search", "email", "password", "url", "tel", "number"].includes(type);
}

function variantFor(event) {
  if (event.key === "Backspace") return "backspace";
  if (event.key === "Enter" || event.key === "NumpadEnter") return "enter";
  if (event.key === " " || event.code === "Space") return "space";
  // Named keys (Tab, arrows, F-keys, Escape) are navigation, not typing.
  return event.key.length === 1 ? "key" : null;
}

/** Attach the one global keydown listener. Returns a disposer. */
export function installTyping(playKey) {
  const onKeyDown = (event) => {
    if (event.repeat) return;
    if (event.isComposing) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (MODIFIERS.has(event.key)) return;
    if (!isTextEntry(event.target)) return;

    const variant = variantFor(event);
    if (!variant) return;
    playKey(variant);
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
}
