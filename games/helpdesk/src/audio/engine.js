// One engine owns the only AudioContext. It knows about buses, volume, mute,
// the voice cap and the lifecycle; sounds.js knows what each name should sound
// like. Nothing else in the desktop may create an AudioContext.

import { getPrefs, savePrefs } from "../prefs.js";
import { resolveSound, clamp } from "./sounds.js";
import { renderKey } from "./typing.js";

export const MASTER_LEVEL = 0.8;

export const BUS_LEVELS = {
  ui: 0.9,
  alerts: 1,
  ambience: 0.9,
  keyboard: 0.75,
};

const DEFAULT_VOLUME = 0.6;
const MAX_VOICES = 24;
const PENDING_LIMIT = 6;
const START_DELAY = 0.008;

// Only sounds that are part of a moment are worth replaying after the first
// gesture. Clicks and window chrome are dropped instead of arriving in a burst.
const QUEUEABLE = new Set(["boot", "login", "notify", "success", "error", "warning"]);

function readVolume(value) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, 0, 1) : DEFAULT_VOLUME;
}

/**
 * Build the exact output chain the live engine uses: buses -> master -> a soft
 * limiter -> destination. The offline check imports this so it measures the
 * same graph rather than an approximation.
 */
export function connectOutput(ctx, { volume = 1 } = {}) {
  const master = ctx.createGain();
  master.gain.value = clamp(volume, 0, 1) * MASTER_LEVEL;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 18;
  limiter.ratio.value = 3;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.24;

  master.connect(limiter);
  limiter.connect(ctx.destination);

  const buses = {};
  for (const [name, level] of Object.entries(BUS_LEVELS)) {
    const gain = ctx.createGain();
    gain.gain.value = level;
    gain.connect(master);
    buses[name] = gain;
  }

  return { master, limiter, buses };
}

export function createAudioEngine() {
  const prefs = getPrefs();
  let muted = Boolean(prefs.audioMuted);
  let volume = readVolume(prefs.audioVolume);
  let load = 0;
  let unlocked = false;

  let ctx = null;
  let master = null;
  let buses = null;

  const pending = [];
  const voices = new Set();
  const listeners = new Set();
  let voiceSeq = 0;

  function snapshot() {
    return {
      muted,
      volume,
      load,
      unlocked,
      contextState: ctx ? ctx.state : "closed",
      voices: voices.size,
      pending: pending.length,
    };
  }

  function announce() {
    for (const listener of listeners) {
      try {
        listener(snapshot());
      } catch {
        // A bad listener must never take the audio down.
      }
    }
  }

  function targetGain() {
    return muted ? 0 : volume * MASTER_LEVEL;
  }

  function applyMaster({ immediate = false } = {}) {
    if (!ctx || !master) return;
    const target = targetGain();
    if (immediate) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(target, ctx.currentTime);
    } else {
      master.gain.setTargetAtTime(target, ctx.currentTime, 0.02);
    }
  }

  function createContext() {
    if (ctx) return true;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor({ latencyHint: "interactive" });
    const graph = connectOutput(ctx, { volume });
    master = graph.master;
    buses = graph.buses;
    applyMaster({ immediate: true });
    return true;
  }

  function playNow(spec, options = {}) {
    if (!ctx || !buses) return false;
    if (voices.size >= MAX_VOICES) return false;
    const bus = buses[spec.bus] || buses.ui;
    const id = ++voiceSeq;
    voices.add(id);

    const when = ctx.currentTime + START_DELAY;
    const gain = clamp(Number(options.gain ?? 1), 0.05, 2);
    try {
      spec.render(ctx, bus, when, { ...options, gain });
    } catch {
      voices.delete(id);
      return false;
    }

    const lifetime = Math.max(80, spec.duration * 1000 + 100);
    setTimeout(() => voices.delete(id), lifetime);
    return true;
  }

  function play(name, options = {}) {
    try {
      if (muted) return false;
      const spec = resolveSound(name);
      if (!spec) return false;

      if (!ctx) {
        if (QUEUEABLE.has(name) && pending.length < PENDING_LIMIT) pending.push({ name, options: { ...options } });
        return false;
      }
      if (document.hidden) return false;
      return playNow(spec, options);
    } catch {
      return false;
    }
  }

  function playKey(variant) {
    try {
      if (muted || !ctx || !buses || document.hidden) return false;
      if (voices.size >= MAX_VOICES) return false;

      const id = ++voiceSeq;
      voices.add(id);
      const when = ctx.currentTime + 0.004 + Math.random() * 0.008;
      try {
        renderKey(ctx, buses.keyboard, when, {
          variant,
          gain: 0.72 + Math.random() * 0.33,
          pitch: 0.93 + Math.random() * 0.16,
        });
      } catch {
        voices.delete(id);
        return false;
      }
      setTimeout(() => voices.delete(id), 180);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === "suspended" && !document.hidden) {
        ctx.resume?.().catch(() => {});
      }
      return true;
    }

    try {
      if (!createContext()) return false;
      unlocked = true;

      const flush = () => {
        if (ctx.state !== "running" || document.hidden) return;
        for (const item of pending.splice(0)) {
          const spec = resolveSound(item.name);
          if (spec) playNow(spec, item.options);
        }
      };

      const resumed = ctx.resume?.();
      if (resumed?.then) resumed.then(flush).catch(() => {});
      else flush();

      announce();
      return true;
    } catch {
      return false;
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    savePrefs({ audioMuted: muted });
    applyMaster();
    announce();
    return muted;
  }

  function setVolume(next) {
    volume = readVolume(next);
    savePrefs({ audioVolume: volume });
    applyMaster();
    announce();
    return volume;
  }

  function setLoad(next) {
    const value = clamp(Number(next) || 0, 0, 1);
    if (value === load) return load;
    load = value;
    announce();
    return load;
  }

  function status() {
    return snapshot();
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function busFor(name) {
    return buses?.[name] || null;
  }

  function context() {
    return ctx;
  }

  // Hidden tabs are silent and cheap. Ambience has its own faster fade, but the
  // context must not keep running either.
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === "running") ctx.suspend?.().catch(() => {});
    } else if (unlocked && ctx.state === "suspended") {
      ctx.resume?.().catch(() => {});
    }
  });

  return {
    play,
    playKey,
    unlock,
    setMuted,
    setVolume,
    setLoad,
    isMuted: () => muted,
    getVolume: () => volume,
    getLoad: () => load,
    isUnlocked: () => unlocked,
    status,
    onChange,
    context,
    busFor,
  };
}
