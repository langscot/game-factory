// Accent colour + wallpaper, shared by the shell and the Settings app without
// either importing the other.

const KEY = "helpdesk.prefs";

export const ACCENTS = [
  { id: "blue", color: "#4cc2ff", strong: "#0067c0" },
  { id: "teal", color: "#4fe3c1", strong: "#00786b" },
  { id: "violet", color: "#c3a6ff", strong: "#6a4fbf" },
  { id: "rose", color: "#ff9ec4", strong: "#b83b6b" },
  { id: "amber", color: "#ffcb6b", strong: "#a06a00" },
  { id: "slate", color: "#b8c4d4", strong: "#4a5a6e" },
];

export const WALLPAPERS = [
  { id: "w1", name: "Bloom" },
  { id: "w2", name: "Dusk" },
  { id: "w3", name: "Mint" },
];

// audioAmbience is deliberately null until the user makes a choice: the audio
// engine uses that to follow prefers-reduced-motion without pretending the
// player has switched room tone on.
const DEFAULTS = { accent: "blue", wallpaper: "w1", audioMuted: false, audioVolume: 0.6, audioAmbience: null };

export function getPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(next) {
  const prefs = { ...getPrefs(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  applyPrefs(prefs);
  return prefs;
}

export function applyPrefs(prefs = getPrefs()) {
  const accent = ACCENTS.find((a) => a.id === prefs.accent) || ACCENTS[0];
  document.documentElement.style.setProperty("--accent", accent.color);
  document.documentElement.style.setProperty("--accent-strong", accent.strong);

  const wallpaper = document.querySelector("#wallpaper");
  if (wallpaper) wallpaper.className = `wallpaper ${prefs.wallpaper}`;
  const lockWall = document.querySelector("#lockWall");
  if (lockWall) lockWall.className = `lock-wall wallpaper ${prefs.wallpaper}`;
}
