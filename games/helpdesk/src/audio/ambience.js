// Office room tone. A seamless filtered-noise bed, a low HVAC hum and a fan
// whose pitch follows setLoad(). Distant printer/phone/keyboard events are
// scheduled separately so the loop itself can stay tiny and gapless.

import { clamp } from "./sounds.js";

const LOOP_SECONDS = 6;
const LOOP_FADE = 0.6;
const FADE_IN = 2.4;
const FADE_OUT = 0.7;

const loopBuffers = new WeakMap();

function loopBuffer(ctx) {
  let buffer = loopBuffers.get(ctx);
  if (buffer) return buffer;

  const length = Math.floor(ctx.sampleRate * LOOP_SECONDS);
  const fade = Math.floor(ctx.sampleRate * LOOP_FADE);
  const source = new Float32Array(length + fade);
  for (let i = 0; i < source.length; i++) source[i] = Math.random() * 2 - 1;

  buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Crossfade the head with a tail from later in the source: at the loop
    // point the last sample flows into the first with no click.
    if (i < fade) {
      const t = i / fade;
      data[i] = source[i] * t + source[length + i] * (1 - t);
    } else {
      data[i] = source[i];
    }
  }

  loopBuffers.set(ctx, buffer);
  return buffer;
}

function distantNoise(ctx, out, when, dur, gain, freq) {
  const src = ctx.createBufferSource();
  src.buffer = loopBuffer(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.7;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  src.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  src.start(when);
  src.stop(when + dur + 0.02);
}

function distantBell(ctx, out, when, freq, gain) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
  osc.connect(amp);
  amp.connect(out);
  osc.start(when);
  osc.stop(when + 0.35);
}

function playDistant(ctx, out) {
  const when = ctx.currentTime + 0.02;
  const kind = Math.floor(Math.random() * 3);

  if (kind === 0) {
    // A printer two rows over waking up and giving up.
    for (let i = 0; i < 3; i++) distantNoise(ctx, out, when + i * 0.09, 0.07, 0.012, 1700);
    distantBell(ctx, out, when, 180, 0.006);
    return;
  }
  if (kind === 1) {
    // A desk phone nobody is going to answer.
    distantBell(ctx, out, when, 880, 0.009);
    distantBell(ctx, out, when + 0.24, 1046.5, 0.008);
    return;
  }
  // Someone across the floor is typing, or pretending to.
  for (let i = 0; i < 5; i++) distantNoise(ctx, out, when + i * (0.06 + Math.random() * 0.05), 0.02, 0.005, 1900);
}

/**
 * Build one bed. The live ambience wraps this in a fade group; the offline
 * check calls it directly with a finite stop time.
 */
export function buildBed(ctx, out, { load = 0, when = ctx.currentTime + 0.01 } = {}) {
  const level = clamp(load, 0, 1);

  const bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, when);
  bedGain.gain.linearRampToValueAtTime(0.13 + level * 0.05, when + 0.5);

  const source = ctx.createBufferSource();
  source.buffer = loopBuffer(ctx);
  source.loop = true;

  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 620;
  low.Q.value = 0.4;

  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 90;

  source.connect(low);
  low.connect(high);
  high.connect(bedGain);
  bedGain.connect(out);

  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 60;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.012;
  hum.connect(humGain);
  humGain.connect(out);

  const harmonic = ctx.createOscillator();
  harmonic.type = "sine";
  harmonic.frequency.value = 120;
  const harmonicGain = ctx.createGain();
  harmonicGain.gain.value = 0.005;
  harmonic.connect(harmonicGain);
  harmonicGain.connect(out);

  const fan = ctx.createOscillator();
  fan.type = "sawtooth";
  fan.frequency.setValueAtTime(150 + level * 50, when);
  const fanFilter = ctx.createBiquadFilter();
  fanFilter.type = "lowpass";
  fanFilter.frequency.value = 330;
  const fanGain = ctx.createGain();
  fanGain.gain.setValueAtTime(0.006 + level * 0.02, when);
  fan.connect(fanFilter);
  fanFilter.connect(fanGain);
  fanGain.connect(out);

  const sources = [source, hum, harmonic, fan];
  for (const node of sources) node.start(when);

  let stopped = false;
  return {
    setLoad(next) {
      const value = clamp(Number(next) || 0, 0, 1);
      const now = ctx.currentTime;
      bedGain.gain.setTargetAtTime(0.13 + value * 0.05, now, 0.8);
      fanGain.gain.setTargetAtTime(0.006 + value * 0.02, now, 0.8);
      fan.frequency.setTargetAtTime(150 + value * 50, now, 0.9);
    },
    stop(at = ctx.currentTime) {
      if (stopped) return;
      stopped = true;
      for (const node of sources) {
        try {
          node.stop(at);
        } catch {
          // Already stopped; nothing to do.
        }
      }
    },
  };
}

export function createAmbience(engine) {
  let wanted = false;
  let group = null;
  let bed = null;
  let distantTimer = 0;
  let load = 0;

  function clearDistant() {
    if (distantTimer) clearTimeout(distantTimer);
    distantTimer = 0;
  }

  function scheduleDistant() {
    if (!group || document.hidden) return;
    clearDistant();
    const delay = 7000 + Math.random() * 11000;
    distantTimer = setTimeout(() => {
      if (!group) return;
      const ctx = engine.context();
      if (ctx && !document.hidden) playDistant(ctx, group);
      scheduleDistant();
    }, delay);
  }

  function teardown(fadeSeconds) {
    if (!group) return;
    const ctx = engine.context();
    const dying = group;
    group = null;
    clearDistant();

    if (ctx && fadeSeconds > 0) {
      const now = ctx.currentTime;
      dying.gain.cancelScheduledValues(now);
      dying.gain.setValueAtTime(dying.gain.value, now);
      dying.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    } else {
      dying.gain.value = 0;
    }

    const closing = bed;
    bed = null;
    setTimeout(
      () => {
        try {
          closing?.stop();
          dying.disconnect();
        } catch {
          // The context may already be gone; that is a clean outcome.
        }
      },
      Math.max(50, fadeSeconds * 1000 + 80),
    );
  }

  function start() {
    wanted = true;
    if (group) return true;
    const ctx = engine.context();
    const bus = engine.busFor("ambience");
    if (!ctx || !bus) return false;

    const now = ctx.currentTime;
    group = ctx.createGain();
    group.gain.setValueAtTime(0.0001, now);
    group.gain.linearRampToValueAtTime(1, now + FADE_IN);
    group.connect(bus);

    bed = buildBed(ctx, group, { load, when: now + 0.01 });
    scheduleDistant();
    return true;
  }

  function stop() {
    wanted = false;
    teardown(FADE_OUT);
  }

  function suspend() {
    // Keep `wanted` so a hidden tab can come back without asking again.
    teardown(0.22);
  }

  function resume() {
    if (wanted && !group) start();
  }

  function setLoad(next) {
    load = clamp(Number(next) || 0, 0, 1);
    bed?.setLoad(load);
  }

  return {
    start,
    stop,
    suspend,
    resume,
    setLoad,
    isPlaying: () => Boolean(group),
    isWanted: () => wanted,
    getLoad: () => load,
  };
}
