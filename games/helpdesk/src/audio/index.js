// The OS audio service. It composes the engine, the ambience bed, the global
// typing listener, the tray control and the generic OS sounds into the one
// object the shell exposes as ctx.audio.
//
// Apps can call play() for their own cues. Nothing here is gameplay state.

import { getPrefs, savePrefs } from "../prefs.js";
import { menuOpen } from "../menu.js";
import { createAudioEngine } from "./engine.js";
import { createAmbience } from "./ambience.js";
import { installTyping } from "./typing.js";
import { createAudioTray } from "./tray.js";

const TOAST_GAP = 150;
const ALERT_GAP = 220;
const ERROR_WORDS = /\b(error|failed|failure|denied|cannot|can't|invalid|blocked)\b/i;

function reducedMotion() {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ambienceEnabled() {
  const pref = getPrefs().audioAmbience;
  if (typeof pref === "boolean") return pref;
  // The closest thing this machine has to "reduce motion" is a quiet room.
  return !reducedMotion();
}

export function initAudio() {
  const engine = createAudioEngine();
  const ambience = createAmbience(engine);

  const service = {
    play: (name, options) => engine.play(name, options),
    startAmbience: (preset = "office") => {
      if (!ambienceEnabled()) return false;
      return ambience.start(preset);
    },
    stopAmbience: () => ambience.stop(),
    setLoad: (value) => {
      engine.setLoad(value);
      ambience.setLoad(engine.getLoad());
    },
    setMuted: (value) => engine.setMuted(value),
    setVolume: (value) => engine.setVolume(value),
    isMuted: () => engine.isMuted(),
    getVolume: () => engine.getVolume(),
    isAmbienceEnabled: () => ambienceEnabled(),
    setAmbienceEnabled: (on) => {
      savePrefs({ audioAmbience: Boolean(on) });
      if (on) ambience.start("office");
      else ambience.stop();
      return Boolean(on);
    },
    unlock: () => {
      const ok = engine.unlock();
      if (ok) ambience.resume();
      return ok;
    },
    status: () => ({
      ...engine.status(),
      ambiencePlaying: ambience.isPlaying(),
      ambienceWanted: ambience.isWanted(),
      ambienceEnabled: ambienceEnabled(),
    }),
    onChange: (listener) => engine.onChange(listener),
  };

  // First gesture anywhere in the machine opens the context. This is exactly
  // the sign-in click in normal play, so boot lands as the desktop appears.
  const unlock = () => service.unlock();
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(type, unlock, { capture: true, once: true, passive: type !== "keydown" });
  }

  installTyping(engine.playKey);

  // ---- menus -------------------------------------------------------------
  // menu.js is deliberately unaware of audio. Watch the public state the menu
  // layer already exposes instead of coupling the two modules.
  let menuWasOpen = false;
  const checkMenu = () => {
    const open = menuOpen();
    if (open === menuWasOpen) return;
    menuWasOpen = open;
    service.play(open ? "menu.open" : "menu.close", { gain: 0.8 });
  };
  for (const type of ["pointerdown", "pointerup", "click", "contextmenu", "keydown", "blur"]) {
    // setTimeout, not queueMicrotask: menu.js closes on the bubble phase and a
    // microtask checkpoint can run before that handler has seen the event.
    window.addEventListener(type, () => setTimeout(checkMenu, 0), true);
  }

  // ---- generic UI clicks -------------------------------------------------
  const CLICKABLE = "button, [role='button'], .ctx-item, .start-app, .tb-app, .icon, .recent-item, .qs-tile";
  const playClick = (event) => {
    const target = event.target?.closest?.(CLICKABLE);
    if (!target) return;
    if (target.closest(".audio-panel, .audio-tray")) return;
    if (target.matches("input, select, textarea")) return;
    service.play("click", { gain: 0.62 });
  };
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      playClick(event);
    },
    true,
  );
  // Keyboard activation (Enter/Space on a focused control) has detail 0.
  document.addEventListener(
    "click",
    (event) => {
      if (event.detail !== 0) return;
      playClick(event);
    },
    true,
  );

  // ---- dialogs and notifications ----------------------------------------
  const modal = document.getElementById("modal");
  let modalWasOpen = false;
  let lastAlert = 0;
  const checkModal = () => {
    if (!modal) return;
    const open = !modal.hidden;
    if (open === modalWasOpen) return;
    modalWasOpen = open;
    if (!open) return;

    const now = performance.now();
    if (now - lastAlert < ALERT_GAP) return;
    lastAlert = now;
    const text = modal.querySelector("#modalCard")?.textContent || "";
    service.play(ERROR_WORDS.test(text) ? "error" : "warning");
  };
  if (modal) {
    new MutationObserver(checkModal).observe(modal, {
      attributes: true,
      attributeFilter: ["hidden"],
      childList: true,
      subtree: true,
    });
  }

  const toasts = document.getElementById("toasts");
  let lastToast = 0;
  if (toasts) {
    new MutationObserver((records) => {
      if (!records.some((record) => record.addedNodes.length)) return;
      const now = performance.now();
      if (now - lastToast < TOAST_GAP) return;
      lastToast = now;
      service.play("notify");
    }).observe(toasts, { childList: true });
  }

  // ---- visibility and load ----------------------------------------------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) ambience.suspend();
    else if (ambience.isWanted()) ambience.resume();
  });

  createAudioTray(service);

  // Exposed for the dev harness and for a curious console; not app API.
  service.engine = engine;

  return service;
}

export { createAudioEngine } from "./engine.js";
export { SOUND_NAMES, isSoundName } from "./sounds.js";
