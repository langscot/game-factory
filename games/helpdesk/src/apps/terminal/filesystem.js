// The terminal's mock C: drive. Folders come from the seeded file rows in the
// world plus the Windows folders a real desk machine would have. Nothing here
// touches the disk: dir, cd, type and tab completion are projections of this
// table, and every file body is the text the Explorer and Notepad already show.

export const HOME = "C:/Users/m.hayes";

// Folders that exist on a working Windows 11 install but have no seeded files.
// Without them `cd C:\Windows` would be a lie.
const EXTRA_FOLDERS = [
  "C:/Users",
  "C:/Users/Public",
  "C:/Users/m.hayes/AppData",
  "C:/Users/m.hayes/AppData/Local",
  "C:/Users/m.hayes/AppData/Local/Temp",
  "C:/Users/m.hayes/AppData/Roaming",
  "C:/Program Files",
  "C:/Program Files/Common Files",
  "C:/Program Files/Windows NT",
  "C:/ProgramData",
  "C:/Windows",
  "C:/Windows/System32",
  "C:/Windows/System32/drivers",
  "C:/Windows/System32/drivers/etc",
  "C:/Windows/System32/WindowsPowerShell",
  "C:/Windows/System32/WindowsPowerShell/v1.0",
  "C:/Windows/Temp",
  "C:/Windows/Web",
];

// Plain `dir` hides these; `dir /a` shows them. Matches Windows' default.
const HIDDEN_FOLDERS = new Set(["C:/Users/m.hayes/AppData", "C:/ProgramData"]);

// A handful of system files so `dir C:\Windows` and `type` have something to
// say. These are app-local props, not world files: Explorer never sees them.
const WIN_INI = `; Windows initialisation settings
[fonts]
[extensions]
[mci extensions]
[files]
`;

const HOSTS_FILE = `# Hosts file for DESKTOP-8H2K9L. Managed by IT.
127.0.0.1       localhost
::1             localhost
10.14.7.16      print01.halcyon.co
`;

const SYSTEM_FILES = [
  ["C:/Windows", "win.ini", "text", "1 KB", "07/11/2026 03:14", WIN_INI],
  ["C:/Windows", "explorer.exe", "exe", "4.8 MB", "07/11/2026 03:14", null],
  ["C:/Windows/System32", "cmd.exe", "exe", "289 KB", "07/11/2026 03:14", null],
  ["C:/Windows/System32", "notepad.exe", "exe", "201 KB", "07/11/2026 03:14", null],
  ["C:/Windows/System32/drivers/etc", "hosts", "text", "1 KB", "07/11/2026 03:14", HOSTS_FILE],
];

const BYTE_UNITS = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };

const parentOf = (path) => (path === "C:" ? null : path.slice(0, path.lastIndexOf("/")));

const hashOf = (text) => {
  let value = 7;
  for (const char of String(text)) value = (value * 31 + char.charCodeAt(0)) % 1000003;
  return value;
};

// Stable fake timestamps, so a folder does not change date between mounts.
const syntheticModified = (path) => {
  const n = hashOf(path);
  const day = String(1 + (n % 14)).padStart(2, "0");
  const hour = String(8 + (n % 10)).padStart(2, "0");
  const minute = String(n % 60).padStart(2, "0");
  return `${day}/11/2026  ${hour}:${minute}`;
};

const dateValue = (text) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(text);
  if (!match) return 0;
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]));
};

const bytesOf = (size) => {
  const match = /^\s*([\d.]+)\s*(B|KB|MB|GB)?\s*$/i.exec(String(size ?? ""));
  if (!match) return 0;
  return Math.round(Number(match[1]) * (BYTE_UNITS[(match[2] || "B").toUpperCase()] || 1));
};

const withTwoSpaces = (text) => String(text ?? "").replace(/\s+/, "  ");

/**
 * Build the fake drive from the seeded file rows. Returns path helpers that
 * commands and tab completion share, so they cannot disagree about a folder.
 */
export function createFileSystem(items = []) {
  const rows = [
    ...items,
    ...SYSTEM_FILES.map(([path, name, kind, size, modified, contents], index) => ({
      id: `sys_${index + 1}`,
      path,
      name,
      kind,
      size,
      modified,
      contents,
      ownerId: null,
      version: 1,
    })),
  ];

  const files = rows.map((item) => ({
    ...item,
    fullPath: `${item.path}/${item.name}`,
    kind: "file",
    fileKind: item.kind,
    bytes: bytesOf(item.size),
    modified: withTwoSpaces(item.modified),
  }));

  const folderPaths = new Set(["C:"]);
  const addFolder = (path) => {
    let current = path;
    while (current && current !== "C:") {
      folderPaths.add(current);
      current = parentOf(current);
    }
    folderPaths.add("C:");
  };
  for (const folder of EXTRA_FOLDERS) addFolder(folder);
  addFolder(HOME);
  for (const file of files) addFolder(file.path);

  const folders = [...folderPaths].map((path) => {
    const children = files
      .filter((file) => file.path === path)
      .sort((a, b) => dateValue(b.modified) - dateValue(a.modified));
    return {
      fullPath: path,
      path,
      name: path === "C:" ? "C:" : path.split("/").pop(),
      kind: "folder",
      hidden: HIDDEN_FOLDERS.has(path),
      modified: children[0]?.modified || syntheticModified(path),
      bytes: 0,
    };
  });

  const canonical = new Map();
  for (const folder of folders) canonical.set(folder.fullPath.toLowerCase(), folder);
  for (const file of files) canonical.set(file.fullPath.toLowerCase(), file);

  const childrenOf = (path, { hidden = false } = {}) => {
    const childFolders = folders
      .filter((folder) => parentOf(folder.fullPath) === path && (hidden || !folder.hidden))
      .map((folder) => ({ ...folder }));
    const childFiles = files
      .filter((file) => file.path === path)
      .map((file) => ({ ...file }));
    return {
      folders: childFolders.sort((a, b) => a.name.localeCompare(b.name)),
      files: childFiles.sort((a, b) => a.name.localeCompare(b.name)),
    };
  };

  /**
   * Resolve a typed path against the current directory. Windows paths are
   * case-insensitive, accept both slashes, and understand . and ..
   */
  function resolve(cwd, raw) {
    let text = String(raw ?? "").trim();
    if (!text) return { ok: true, path: cwd, kind: "folder" };
    text = text.replace(/\//g, "\\");

    if (text.startsWith("\\\\")) return { ok: false, reason: "unc", path: text };

    let base = cwd;
    const drive = /^([A-Za-z]):/.exec(text);
    if (drive) {
      if (drive[1].toUpperCase() !== "C") return { ok: false, reason: "drive", path: text };
      base = "C:";
      text = text.slice(2).replace(/^\\+/, "");
    }

    let current = base;
    const parts = text.split("\\").filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === ".") continue;
      if (part === "..") {
        current = parentOf(current) ?? current;
        continue;
      }
      const candidate = current === "C:" ? `C:/${part}` : `${current}/${part}`;
      const entry = canonical.get(candidate.toLowerCase());
      if (!entry) return { ok: false, reason: "not-found", path: candidate };
      if (entry.kind === "file" && index < parts.length - 1) {
        return { ok: false, reason: "not-directory", path: candidate };
      }
      current = entry.fullPath;
    }

    const entry = canonical.get(current.toLowerCase());
    if (!entry) return { ok: false, reason: "not-found", path: current };
    return { ok: true, path: entry.fullPath, kind: entry.kind, entry };
  }

  /** Candidate replacements for the token under the caret, Windows-style. */
  function complete(cwd, token) {
    const quoted = token.startsWith('"');
    const text = quoted ? token.slice(1).replace(/"$/, "") : token;
    if (/^[A-Za-z]:$/.test(text)) return [`${text}\\`];

    const slash = Math.max(text.lastIndexOf("\\"), text.lastIndexOf("/"));
    const dirPart = slash >= 0 ? text.slice(0, slash + 1) : "";
    const base = slash >= 0 ? text.slice(slash + 1) : text;

    const resolved = dirPart ? resolve(cwd, dirPart) : { ok: true, path: cwd, kind: "folder" };
    if (!resolved.ok || resolved.kind !== "folder") return [];
    const listing = childrenOf(resolved.path);

    return [...listing.folders, ...listing.files]
      .filter((entry) => entry.name.toLowerCase().startsWith(base.toLowerCase()))
      .map((entry) => {
        const suffix = entry.kind === "folder" ? "\\" : "";
        const needsQuote = quoted || entry.name.includes(" ");
        return needsQuote
          ? `"${dirPart}${entry.name}${suffix}"`
          : `${dirPart}${entry.name}${suffix}`;
      });
  }

  return {
    home: HOME,
    items: files,
    folder: (path) => canonical.get(String(path).toLowerCase()),
    file: (fullPath) => files.find((file) => file.fullPath === fullPath),
    list: childrenOf,
    resolve,
    complete,
    allFolders: () => folders,
  };
}
