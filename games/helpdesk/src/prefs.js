// Accent colour + wallpaper + the signed-in account, shared by the shell and
// the Settings app without either importing the other.
//
// The account is deliberately small: this is a fictional workstation, not an
// identity provider. The password is stored as a salted fingerprint so the
// plain text is not sitting in localStorage, but nobody should mistake it for
// security.

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

// The OOBE and the lock screen have to agree on what counts as a password.
// Four characters is exactly as much security as this laptop deserves.
export const MIN_PASSWORD_LENGTH = 4;

// Questions a real helpdesk would be embarrassed by. One is picked at setup.
export const RECOVERY_QUESTIONS = [
  "What was the name of your first pet's manager?",
  "What street was the office on before the office moved?",
  "What was the model of your first company laptop?",
  "What is the name of the person who approved your last holiday?",
  "What is the name of your favourite printer?",
];

// audioAmbience is deliberately null until the user makes a choice: the audio
// engine uses that to follow prefers-reduced-motion without pretending the
// player has switched room tone on.
const DEFAULTS = {
  accent: "blue",
  wallpaper: "w1",
  audioMuted: false,
  audioVolume: 0.6,
  audioAmbience: null,
  account: null,
};

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

// ---------------------------------------------------------------------------
// account
// ---------------------------------------------------------------------------

export function getAccount() {
  const account = getPrefs().account;
  if (!account || typeof account !== "object") return null;
  if (typeof account.username !== "string" || !account.username) return null;
  if (typeof account.password !== "string" || !account.password) return null;
  return account;
}

function fingerprint(secret, salt = "") {
  // FNV-1a, twice, because one round looked lonely. This keeps a casual glance
  // at localStorage from reading the password; it is not a security boundary.
  const text = `${salt}\u0000${secret}`;
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

export function hashSecret(secret, username = "") {
  return fingerprint(String(secret), String(username).toLowerCase());
}

export function verifyPassword(password, account = getAccount()) {
  if (!account) return false;
  return account.password === hashSecret(password, account.username);
}

export function verifyRecovery(answer, account = getAccount()) {
  if (!account?.recovery) return false;
  return account.recovery.answer === hashSecret(normaliseAnswer(answer), account.username);
}

export function normaliseAnswer(answer) {
  return String(answer).trim().toLowerCase().replace(/\s+/g, " ");
}

export function createAccount({
  displayName,
  username,
  password,
  recoveryQuestion,
  recoveryAnswer,
  region = "United Kingdom",
  language = "English (United Kingdom)",
  keyboard = "United Kingdom",
  privacy = {},
}) {
  const logon = String(username).trim().toLowerCase();
  const account = {
    displayName: String(displayName).trim(),
    username: logon,
    password: hashSecret(password, logon),
    recovery: {
      question: recoveryQuestion,
      answer: hashSecret(normaliseAnswer(recoveryAnswer), logon),
    },
    region,
    language,
    keyboard,
    privacy: { ...privacy },
    createdAt: Date.now(),
    passwordChangedAt: Date.now(),
  };
  savePrefs({ account });
  return account;
}

export function setAccountPassword(password) {
  const account = getAccount();
  if (!account) return null;
  const next = {
    ...account,
    password: hashSecret(password, account.username),
    passwordChangedAt: Date.now(),
  };
  savePrefs({ account: next });
  return next;
}

/**
 * `?fresh` wipes the saved profile (account included) and then removes itself
 * from the URL, so the OOBE is shown exactly once and a reload behaves like a
 * normal first boot. Documented in the PR rather than hidden in a folder of
 * test keys.
 */
export function freshStart() {
  let params;
  try {
    params = new URLSearchParams(location.search);
  } catch {
    return false;
  }
  if (!params.has("fresh")) return false;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  params.delete("fresh");
  const query = params.toString();
  try {
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  } catch {}
  return true;
}
