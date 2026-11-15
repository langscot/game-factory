// Pure registry helpers shared by the Regret Editor window: tree shape,
// value display, .reg serialisation and the import merge. No DOM and no world
// access, so the rules can be read (and exercised) on their own.

import { HIVES } from "../../content/registry.js";

export const ROOT = "Computer";
export const DEFAULT_VALUE = "(Default)";

export const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
export const leafName = (path) => String(path).split("\\").pop();
export const parentPath = (path) => {
  if (path === ROOT) return null;
  const parts = String(path).split("\\");
  return parts.length <= 1 ? ROOT : parts.slice(0, -1).join("\\");
};
export const ancestorsOf = (path) => {
  const parts = String(path).split("\\");
  const list = [];
  for (let index = 1; index <= parts.length; index += 1) list.push(parts.slice(0, index).join("\\"));
  return list;
};

export const isHive = (path) => HIVES.some((hive) => eq(hive, path));
export const keyRecord = (keys, path) => keys.find((key) => eq(key.path, path));

const HIVE_ALIASES = new Map([
  ["HKCR", "HKEY_CLASSES_ROOT"],
  ["HKCU", "HKEY_CURRENT_USER"],
  ["HKLM", "HKEY_LOCAL_MACHINE"],
  ["HKU", "HKEY_USERS"],
  ["HKCC", "HKEY_CURRENT_CONFIG"],
]);

/** Direct child key names, in the order regedit shows them. */
export function childrenOf(keys, path) {
  if (path === ROOT) return [...HIVES];
  const record = keyRecord(keys, path);
  if (!record) return [];
  const prefix = `${record.path}\\`;
  const children = new Map();
  for (const key of keys) {
    if (!key.path.toLowerCase().startsWith(prefix.toLowerCase())) continue;
    const rest = key.path.slice(prefix.length);
    if (!rest || rest.includes("\\")) continue;
    children.set(rest.toLowerCase(), rest);
  }
  return [...children.values()].sort((a, b) => a.localeCompare(b, "en-GB", { sensitivity: "base" }));
}

/** Direct child keys as full paths, which is what the tree navigation needs. */
export function childPaths(keys, path) {
  const record = path === ROOT ? null : keyRecord(keys, path);
  const base = record ? `${record.path}\\` : "";
  return childrenOf(keys, path).map((child) => `${base}${child}`);
}

/** Rows visible in the left pane for the current expansion set. */
export function flattenTree(keys, expandedPaths = []) {
  const expanded = new Set(expandedPaths.map((path) => path.toLowerCase()));
  const rows = [];
  const walk = (path, depth) => {
    const children = childPaths(keys, path);
    const open = path === ROOT || expanded.has(path.toLowerCase());
    rows.push({ path, depth, hasChildren: children.length > 0, expanded: open });
    if (!open) return;
    for (const child of children) walk(child, depth + 1);
  };
  walk(ROOT, 0);
  return rows;
}

/** Every key in tree order, ignoring what is currently expanded. */
export function allKeyPaths(keys) {
  const paths = [];
  const walk = (path) => {
    for (const child of childPaths(keys, path)) {
      paths.push(child);
      walk(child);
    }
  };
  walk(ROOT);
  return paths;
}

/** Values as regedit shows them: default first, then by name. */
export function displayValues(record) {
  const values = (record?.values || []).slice();
  values.sort((a, b) => {
    if (eq(a.name, DEFAULT_VALUE)) return -1;
    if (eq(b.name, DEFAULT_VALUE)) return 1;
    return a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" });
  });
  if (!values.some((value) => eq(value.name, DEFAULT_VALUE))) {
    values.unshift({ name: DEFAULT_VALUE, type: "REG_SZ", data: "", unset: true });
  }
  return values;
}

export const findValue = (record, name) => record?.values.find((value) => eq(value.name, name));

export const dwordHex = (data) => {
  const number = Number(data);
  return `0x${(Number.isFinite(number) ? number : 0).toString(16).padStart(8, "0")}`;
};

export function formatValueData(value) {
  if (value.unset) return "(value not set)";
  if (value.type === "REG_DWORD") return dwordHex(value.data);
  return String(value.data ?? "").replace(/\r?\n/g, " ");
}

// ---------------------------------------------------------------------------
// .reg serialisation
// ---------------------------------------------------------------------------

const escapeRegText = (text) =>
  String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

const unescapeRegText = (text) =>
  String(text ?? "").replace(/\\(.)/g, (match, char) => {
    if (char === "n") return "\n";
    if (char === "r") return "\r";
    return char;
  });

const utf16Bytes = (text, extraNulls = 0) => {
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  for (let index = 0; index < extraNulls; index += 1) bytes.push(0, 0);
  return bytes;
};

const hexList = (bytes) => bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(",");

function encodeValue(value) {
  const right =
    value.type === "REG_DWORD"
      ? `dword:${Number(value.data).toString(16).padStart(8, "0")}`
      : value.type === "REG_EXPAND_SZ"
        ? `hex(2):${hexList(utf16Bytes(String(value.data ?? ""), 1))}`
        : value.type === "REG_MULTI_SZ"
          ? `hex(7):${hexList([
              ...utf16Bytes(String(value.data ?? "").split(/\r?\n/).join("\0")),
              0,
              0,
              0,
            ])}`
          : value.type === "REG_BINARY"
            ? `hex:${hexList(
                String(value.data ?? "")
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((byte) => Number.parseInt(byte, 16) || 0),
              )}`
            : `"${escapeRegText(value.data)}"`;
  return `${eq(value.name, DEFAULT_VALUE) ? "@" : `"${escapeRegText(value.name)}"`}=${right}`;
}

/** The selected branch as a real .reg file body. */
export function exportReg(keys, path) {
  const target = keyRecord(keys, path);
  if (!target) return "";
  const prefix = `${target.path.toLowerCase()}\\`;
  const branch = keys
    .filter((key) => eq(key.path, target.path) || key.path.toLowerCase().startsWith(prefix))
    .sort((a, b) => a.path.localeCompare(b.path, "en-GB", { sensitivity: "base" }));

  const lines = ["Doors Registry Editor Version 5.00", ""];
  for (const record of branch) {
    lines.push(`[${record.path}]`);
    const values = displayValues(record).filter((value) => !value.unset);
    for (const value of values) lines.push(encodeValue(value));
    lines.push("");
  }
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// .reg parsing and merge
// ---------------------------------------------------------------------------

const parseHexBytes = (text) =>
  String(text || "")
    .replace(/\s+/g, "")
    .split(",")
    .filter(Boolean)
    .map((byte) => Number.parseInt(byte, 16))
    .filter((byte) => Number.isFinite(byte));

const decodeUtf16 = (bytes) => {
  let text = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    text += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8));
  }
  return text;
};

function parseRegValue(raw) {
  const text = String(raw).trim();
  if (/^dword:/i.test(text)) {
    const number = Number.parseInt(text.slice(6), 16);
    return Number.isFinite(number) ? { type: "REG_DWORD", data: String(number) } : null;
  }
  if (/^hex\(2\):/i.test(text)) {
    return { type: "REG_EXPAND_SZ", data: decodeUtf16(parseHexBytes(text.slice(7))).replace(/\0+$/, "") };
  }
  if (/^hex\(7\):/i.test(text)) {
    const items = decodeUtf16(parseHexBytes(text.slice(7))).split("\0");
    while (items.length && items[items.length - 1] === "") items.pop();
    return { type: "REG_MULTI_SZ", data: items.join("\n") };
  }
  if (/^hex:/i.test(text)) {
    return { type: "REG_BINARY", data: hexList(parseHexBytes(text.slice(4))) };
  }
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    return { type: "REG_SZ", data: unescapeRegText(text.slice(1, -1)) };
  }
  return null;
}

/**
 * Read the subset of the .reg format regedit exports. Deletion sections and
 * value-delete lines are understood so importing a hand-edited file behaves.
 */
export function parseReg(text) {
  const sectionPaths = [];
  const entries = [];
  const deletions = [];
  const valueDeletions = [];
  let section = null;

  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      const inner = line.slice(1, -1);
      if (inner.startsWith("-")) {
        deletions.push(inner.slice(1));
        section = null;
      } else {
        section = inner;
        sectionPaths.push(inner);
      }
      continue;
    }
    if (!section) continue;

    let name = null;
    let right = null;
    if (line.startsWith("@=")) {
      name = DEFAULT_VALUE;
      right = line.slice(2);
    } else {
      const match = line.match(/^"((?:[^"\\]|\\.)*)"=(.*)$/);
      if (!match) continue;
      name = unescapeRegText(match[1]);
      right = match[2];
    }
    if (right === "-") {
      valueDeletions.push({ path: section, name });
      continue;
    }
    const parsed = parseRegValue(right);
    if (parsed) entries.push({ path: section, name, type: parsed.type, data: parsed.data });
  }

  return { sectionPaths, entries, deletions, valueDeletions };
}

/**
 * Merge parsed .reg data into a key list. Existing keys and values win only in
 * the sense that they are updated in place; nothing is duplicated.
 */
export function applyImport(keys, parsed) {
  const next = keys.map((key) => ({ path: key.path, values: key.values.map((value) => ({ ...value })) }));
  const byPath = new Map(next.map((key) => [key.path.toLowerCase(), key]));

  const canonical = (rawPath) => {
    const parts = String(rawPath).split("\\");
    const alias = HIVE_ALIASES.get(parts[0].toUpperCase());
    const hive = HIVES.find((candidate) => eq(candidate, alias || parts[0]));
    if (!hive) return null;
    parts[0] = hive;
    return parts.join("\\");
  };

  const removeBranch = (path) => {
    const canonicalPath = canonical(path);
    if (!canonicalPath) return;
    const lower = canonicalPath.toLowerCase();
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const key = next[index];
      const keyLower = key.path.toLowerCase();
      if (keyLower === lower || keyLower.startsWith(`${lower}\\`)) {
        byPath.delete(keyLower);
        next.splice(index, 1);
      }
    }
  };

  const ensure = (rawPath) => {
    const canonicalPath = canonical(rawPath);
    if (!canonicalPath) return null;
    const parts = canonicalPath.split("\\");

    let current = "";
    for (const part of parts) {
      current = current ? `${current}\\${part}` : part;
      const lower = current.toLowerCase();
      if (!byPath.has(lower)) {
        const record = { path: current, values: [] };
        byPath.set(lower, record);
        next.push(record);
      }
    }
    return byPath.get(current.toLowerCase());
  };

  for (const path of parsed.deletions || []) removeBranch(path);
  for (const path of parsed.sectionPaths || []) ensure(path);

  let imported = 0;
  for (const entry of parsed.entries || []) {
    const record = ensure(entry.path);
    if (!record) continue;
    const existing = record.values.find((value) => eq(value.name, entry.name));
    if (existing) {
      existing.type = entry.type;
      existing.data = entry.data;
    } else {
      record.values.push({ name: entry.name, type: entry.type, data: entry.data });
    }
    imported += 1;
  }

  for (const deletion of parsed.valueDeletions || []) {
    const record = byPath.get(String(deletion.path).toLowerCase());
    if (!record) continue;
    record.values = record.values.filter((value) => !eq(value.name, deletion.name));
  }

  const firstPath = parsed.sectionPaths?.[0] ? ensure(parsed.sectionPaths[0])?.path || null : null;
  return { keys: next, imported, firstPath };
}
