// Paths, line endings, zoom and search are pure. They are shared by the app
// and its dialogs so both speak the same vocabulary (and the same Documents
// default).

export const HOME = "C:/Users/m.hayes";
export const DOCUMENTS = `${HOME}/Documents`;
export const NEW_NAME = "Untitled";
export const BASE_FONT_PX = 14.5;
export const ZOOM_STEP = 10;
export const ZOOM_MIN = 50;
export const ZOOM_MAX = 300;
export const DEFAULT_EOL = "CRLF";

export const EOL_LABEL = {
  CRLF: "Doors (CRLF)",
  LF: "Unix (LF)",
  CR: "Macintosh (CR)",
};

const EOL_SEPARATOR = {
  CRLF: "\r\n",
  LF: "\n",
  CR: "\r",
};

export function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/\/+$/, "");
}

export const pathTail = (path) => normalizePath(path).split("/").pop() || "";

export const parentPath = (path) => {
  if (path === HOME) return HOME;
  const cut = path.lastIndexOf("/");
  return cut > 0 ? path.slice(0, cut) : HOME;
};

export const pathLabel = (path) => {
  if (!path || path === HOME) return "This PC";
  const rest = path.startsWith(`${HOME}/`) ? path.slice(HOME.length + 1) : path;
  return `This PC › ${rest.split("/").join(" › ")}`;
};

export function detectEol(raw) {
  const text = String(raw ?? "");
  if (text.includes("\r\n")) return "CRLF";
  if (text.includes("\r")) return "CR";
  if (text.includes("\n")) return "LF";
  return DEFAULT_EOL;
}

export const toEditorText = (raw) => String(raw ?? "").replace(/\r\n?/g, "\n");
export const toFileText = (text, eol) => text.replace(/\n/g, EOL_SEPARATOR[eol] || EOL_SEPARATOR.CRLF);

export const clampZoom = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 100;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(number / ZOOM_STEP) * ZOOM_STEP));
};

export function findAll(text, query, caseSensitive) {
  if (!query) return [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const hits = [];
  let at = 0;
  while (at <= haystack.length) {
    const found = haystack.indexOf(needle, at);
    if (found === -1) break;
    hits.push(found);
    at = found + Math.max(1, needle.length);
  }
  return hits;
}

export function withTxtExtension(name) {
  const value = name.trim();
  if (!value) return value;
  if (value.includes(".")) return value;
  return `${value}.txt`;
}
