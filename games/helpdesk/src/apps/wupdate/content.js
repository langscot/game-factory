// Authored content for the Windows Update page. The machine and the update
// catalogue come from the store; this file supplies the friendly titles,
// seeded history and the optional driver catalogue the static seed does not
// carry. It also owns the default UI state so the page can be reopened with
// the same selection, pause date and install result.

const navIcon = (body) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const NAV_ITEMS = [
  {
    id: "system",
    label: "System",
    icon: navIcon(`<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>`),
  },
  {
    id: "bluetooth",
    label: "Bluetooth & devices",
    icon: navIcon(`<path d="M12 2.5v19M12 2.5L18 7l-12 8M12 21.5L18 17 6 9"/>`),
  },
  {
    id: "network",
    label: "Network & internet",
    icon: navIcon(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 4 5.8 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.8-4-9s1.4-6.4 4-9z"/>`),
  },
  {
    id: "personalisation",
    label: "Personalisation",
    icon: navIcon(`<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18h1.6a2 2 0 0 0 0-4H13a2 2 0 0 1 0-4h3.5A4.5 4.5 0 0 0 21 8.5C21 5.5 16.9 3 12 3z"/><circle cx="7.5" cy="10" r=".9" fill="currentColor"/><circle cx="10.5" cy="6.8" r=".9" fill="currentColor"/><circle cx="15" cy="7.4" r=".9" fill="currentColor"/>`),
  },
  {
    id: "apps",
    label: "Apps",
    icon: navIcon(`<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>`),
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: navIcon(`<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.6-3.6 3.4-5.4 7.2-5.4s6.6 1.8 7.2 5.4"/>`),
  },
  {
    id: "time",
    label: "Time & language",
    icon: navIcon(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>`),
  },
  {
    id: "gaming",
    label: "Gaming",
    icon: navIcon(`<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.4a2.6 2.6 0 0 1-4.6 1L14 16h-4l-1.5 1.9a2.6 2.6 0 0 1-4.6-1l-.8-3.4A4.5 4.5 0 0 1 7.5 8z"/><path d="M8 11v2.4M6.8 12.2h2.4"/><circle cx="16" cy="11.4" r=".9" fill="currentColor"/><circle cx="17.6" cy="13.4" r=".9" fill="currentColor"/>`),
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: navIcon(`<circle cx="12" cy="4.6" r="1.8"/><path d="M4.5 8.5c2.4 1 5 1.5 7.5 1.5s5.1-.5 7.5-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6"/>`),
  },
  {
    id: "privacy",
    label: "Privacy & security",
    icon: navIcon(`<path d="M12 2.8l7 2.6v5.5c0 4.4-2.9 7.7-7 10.3-4.1-2.6-7-5.9-7-10.3V5.4z"/><path d="M9.4 12l1.8 1.8 3.6-3.6"/>`),
  },
  {
    id: "windowsupdate",
    label: "Windows Update",
    icon: navIcon(`<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/><path d="M9 12.2l2 2 4-4"/>`),
  },
];

export const TODAY = "15/11/2026";

export const DEFAULT_UI = {
  view: "main",
  search: "",
  status: "uptodate",
  progress: 0,
  lastChecked: "Yesterday, 17:41",
  pausedUntil: "",
  pauseWeeks: 0,
  pauseMenu: false,
  installedIds: [],
  pendingRestartIds: [],
  optionalSelected: [],
  optionalStatus: "idle",
  optionalProgress: 0,
  optionalError: "",
  optionalInstalled: [],
  optionalFailed: [],
  history: [],
  advanced: { otherProducts: true, getUpToDate: true },
};

// The static seed carries one available update and one installed update. These
// details make them read like the real Windows Update page without changing
// the world shape.
export const UPDATE_DETAILS = {
  kb_5041580: {
    title: "2026-11 Cumulative Update for Windows 11, version 22H2 for x64-based Systems (KB5041580)",
    size: "612 MB",
    kind: "Quality update",
    description: "Fixes security issues and improves the reliability of Windows.",
  },
  kb_5040443: {
    title: "Servicing Stack Update (KB5040443)",
    date: "14/10/2026",
    kind: "Servicing stack update",
    description: "Keeps the update installer healthy.",
  },
};

export const HISTORY = [
  {
    date: "12/10/2026",
    title: "2026-10 Cumulative Update for Windows 11, version 22H2 for x64-based Systems (KB5039212)",
    kind: "Quality update",
    outcome: "failed",
    code: "0x800F0922",
  },
  {
    date: "28/09/2026",
    title: "Security Intelligence Update for Microsoft Defender Antivirus - KB2267602 (Version 1.417.512.0)",
    kind: "Definition update",
    outcome: "success",
    code: "0x0",
  },
  {
    date: "14/09/2026",
    title: "Intel Corporation - Display - 31.0.101.2125",
    kind: "Driver update",
    outcome: "failed",
    code: "0x80070103",
  },
  {
    date: "02/09/2026",
    title: "2026-09 Cumulative Update for .NET Framework 3.5 and 4.8.1 for Windows 11 (KB5043064)",
    kind: "Quality update",
    outcome: "success",
    code: "0x0",
  },
  {
    date: "05/08/2026",
    title: "Feature update to Windows 11, version 22H2 (KB5036893)",
    kind: "Feature update",
    outcome: "failed",
    code: "0x80070002",
  },
];

// The Intel driver is the seeded bad one. It is older than the driver already
// on the machine and fails the same way real Windows does when it refuses a
// package: 0x80070103.
export const OPTIONAL_UPDATES = [
  {
    id: "opt_intel_display",
    title: "Intel Corporation - Display - 31.0.101.2125",
    kind: "Driver",
    size: "58.6 MB",
    published: "12/11/2026",
    bad: true,
    error: "0x80070103",
    note: "Display driver. Windows recommends installing it only if a device is not working correctly.",
  },
  {
    id: "opt_realtek_audio",
    title: "Realtek Semiconductor Corp. - Audio - 6.0.9360.1",
    kind: "Driver",
    size: "18.2 MB",
    published: "09/11/2026",
    bad: false,
    note: "Audio driver for the onboard Realtek codec.",
  },
  {
    id: "opt_hp_printer",
    title: "HP - Printer - 61.320.1.241",
    kind: "Driver",
    size: "4.8 MB",
    published: "02/11/2026",
    bad: false,
    note: "Driver for the HP LaserJet on the third floor.",
  },
];

export const PAUSE_WEEKS = [1, 2, 4];

export function kbOf(update) {
  return `KB${String(update.id).replace(/^kb_/, "")}`;
}

export function titleOf(update) {
  return UPDATE_DETAILS[update.id]?.title || `${update.title} (${kbOf(update)})`;
}

export function sizeOf(update) {
  return UPDATE_DETAILS[update.id]?.size || `${update.sizeMb} MB`;
}

export function kindOf(update) {
  return UPDATE_DETAILS[update.id]?.kind || "Update";
}

export function addDays(date, days) {
  const [day, month, year] = String(date).split("/").map(Number);
  const next = new Date(year, month - 1, day + days);
  const dd = String(next.getDate()).padStart(2, "0");
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${next.getFullYear()}`;
}

export function dateValue(date) {
  const [day, month, year] = String(date).split("/").map(Number);
  return new Date(year, month - 1, day).getTime() || 0;
}
