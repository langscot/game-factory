// The tray control. One speaker button, one small panel with mute, volume and
// room tone. The stylesheet is injected from here, not added to shell.css, so
// the audio module stays easy to remove and cannot fight the shell over names.

const STYLE_ID = "audio-os-styles";

export const AUDIO_CSS = `
.audio-tray { position: relative; }
.audio-tray.is-muted { color: #ff9a9a; }
.audio-panel {
  position: fixed; right: 12px; bottom: 54px; z-index: 760;
  width: 268px; padding: 14px 16px 12px;
  background: var(--flyout);
  -webkit-backdrop-filter: blur(48px) saturate(150%);
  backdrop-filter: blur(48px) saturate(150%);
  border: 1px solid var(--stroke); border-radius: 8px;
  box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.8);
  animation: audio-panel-in 0.14s ease-out;
}
@keyframes audio-panel-in { from { opacity: 0; transform: translateY(8px); } }
.audio-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; font-size: 12.5px; color: var(--text-2);
}
.audio-mute-btn {
  display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px;
  color: var(--text-2); font-size: 12px;
}
.audio-mute-btn:hover { background: var(--hover); }
.audio-mute-btn[aria-pressed="true"] { color: #ff9a9a; background: var(--active); }
.audio-mute-btn svg { width: 16px; height: 16px; }
.audio-slider-row { display: flex; align-items: center; gap: 10px; }
.audio-slider-row input { flex: 1; accent-color: var(--accent); }
.audio-slider-row span {
  width: 32px; text-align: right; font-size: 11.5px; color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.audio-ambience {
  width: 100%; margin-top: 12px; padding: 8px 10px; border-radius: 5px;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--hover); color: var(--text-2); font-size: 12px;
}
.audio-ambience:hover { background: var(--active); }
.audio-ambience[aria-pressed="true"] { color: var(--text); }
.audio-ambience[aria-pressed="true"] .audio-ambience-state::before {
  content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 6px;
  border-radius: 50%; background: var(--accent); vertical-align: 1px;
}
.audio-ambience-state { color: var(--text-3); font-size: 11.5px; }
.audio-foot {
  margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--stroke);
  font-size: 10.5px; letter-spacing: 0.02em; color: var(--text-3);
}
`;

const SPEAKER = `
  <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor"/>
  <path d="M15.2 8.8a4.6 4.6 0 0 1 0 6.4M17.8 6.6a7.8 7.8 0 0 1 0 10.8"
    stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

const MUTED = `
  <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor"/>
  <path d="M15.4 9.4l4.4 5.2M19.8 9.4l-4.4 5.2"
    stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;

const icon = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.dataset.audioStyle = "true";
  style.textContent = AUDIO_CSS;
  document.head.append(style);
}

export function createAudioTray(audio) {
  injectStyles();

  const host = document.querySelector(".tb-tray");
  if (!host || document.getElementById("audioTrayBtn")) return null;

  const button = document.createElement("button");
  button.className = "tray-btn audio-tray";
  button.id = "audioTrayBtn";
  button.type = "button";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `<span class="tray-ico" data-audio-tray-icon></span>`;

  const quick = document.getElementById("quickBtn");
  host.insertBefore(button, quick || host.firstChild);

  const panel = document.createElement("div");
  panel.className = "audio-panel";
  panel.id = "audioPanel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Sound");
  panel.innerHTML = `
    <div class="audio-panel-head">
      <span>Sound</span>
      <button class="audio-mute-btn" id="audioMuteBtn" type="button" aria-pressed="false">
        <span data-audio-mute-icon></span><span data-audio-mute-label>Mute</span>
      </button>
    </div>
    <div class="audio-slider-row">
      <input id="audioVolume" type="range" min="0" max="100" step="1" aria-label="Volume">
      <span id="audioVolumeValue" aria-live="polite">60%</span>
    </div>
    <button class="audio-ambience" id="audioAmbienceBtn" type="button" aria-pressed="true">
      <span>Room tone</span><span class="audio-ambience-state">On</span>
    </button>
    <div class="audio-foot">System sounds · this PC</div>`;
  document.body.append(panel);

  const trayIcon = button.querySelector("[data-audio-tray-icon]");
  const muteButton = panel.querySelector("#audioMuteBtn");
  const muteIcon = panel.querySelector("[data-audio-mute-icon]");
  const muteLabel = panel.querySelector("[data-audio-mute-label]");
  const volume = panel.querySelector("#audioVolume");
  const volumeValue = panel.querySelector("#audioVolumeValue");
  const ambienceButton = panel.querySelector("#audioAmbienceBtn");
  const ambienceState = panel.querySelector(".audio-ambience-state");
  const quickVolume = document.getElementById("volumeRange");

  function paint() {
    const muted = audio.isMuted();
    const percent = Math.round(audio.getVolume() * 100);

    button.classList.toggle("is-muted", muted);
    button.title = muted ? "Sound: muted" : `Sound: ${percent}%`;
    button.setAttribute("aria-label", muted ? "Sound, muted" : `Sound, ${percent} percent`);
    trayIcon.innerHTML = icon(muted ? MUTED : SPEAKER);

    muteButton.setAttribute("aria-pressed", String(muted));
    muteButton.title = muted ? "Unmute" : "Mute";
    muteIcon.innerHTML = icon(muted ? MUTED : SPEAKER);
    muteLabel.textContent = muted ? "Unmute" : "Mute";

    volume.value = String(percent);
    volumeValue.textContent = `${percent}%`;

    if (quickVolume && document.activeElement !== quickVolume) {
      quickVolume.value = String(percent);
      quickVolume.style.setProperty("--fill", `${percent}%`);
    }
    for (const id of ["volIcon", "qsVol"]) {
      const node = document.getElementById(id);
      if (node) node.innerHTML = icon(muted ? MUTED : SPEAKER);
    }

    const ambience = audio.isAmbienceEnabled();
    ambienceButton.setAttribute("aria-pressed", String(ambience));
    ambienceState.textContent = ambience ? "On" : "Off";
  }

  function openPanel() {
    panel.hidden = false;
    button.classList.add("is-active");
    button.setAttribute("aria-expanded", "true");
    muteButton.focus();
  }

  function closePanel({ restoreFocus = false } = {}) {
    panel.hidden = true;
    button.classList.remove("is-active");
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) button.focus();
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.hidden) openPanel();
    else closePanel({ restoreFocus: true });
  });

  muteButton.addEventListener("click", () => {
    audio.setMuted(!audio.isMuted());
  });

  volume.addEventListener("input", () => {
    const next = Number(volume.value) / 100;
    if (audio.isMuted() && next > 0) audio.setMuted(false);
    audio.setVolume(next);
  });

  ambienceButton.addEventListener("click", () => {
    audio.setAmbienceEnabled(!audio.isAmbienceEnabled());
  });

  if (quickVolume) {
    quickVolume.addEventListener("input", () => {
      const next = Number(quickVolume.value) / 100;
      if (audio.isMuted() && next > 0) audio.setMuted(false);
      audio.setVolume(next);
    });
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (panel.hidden) return;
      if (panel.contains(event.target) || button.contains(event.target)) return;
      closePanel();
    },
    true,
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || panel.hidden) return;
      event.stopPropagation();
      closePanel({ restoreFocus: true });
    },
    true,
  );

  const off = audio.onChange(paint);
  paint();
  // shell.js paints the quick-settings icons after initAudio() returns; repaint
  // once more at the end of the turn so the mute icon wins.
  queueMicrotask(paint);

  return {
    refresh: paint,
    dispose() {
      off();
      panel.remove();
      button.remove();
    },
  };
}
