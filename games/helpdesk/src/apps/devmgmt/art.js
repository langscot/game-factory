// Every icon in Device Manager is drawn here: flat line glyphs for the tree and
// result pane, plus the warning/down-arrow overlays Windows puts on a device.

const svg = (body) =>
  `<svg class="dev-glyph" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const GLYPHS = {
  console: svg(`
    <rect x="2.5" y="4" width="19" height="12.6" rx="1.8"/>
    <path d="M9 20h6M12 16.6V20"/>
    <path d="M5.5 7h5M5.5 9.8h3"/>`),

  machine: svg(`
    <rect x="5" y="2.5" width="14" height="19" rx="2"/>
    <path d="M8.4 6h7.2M8.4 9h7.2"/>
    <circle cx="9" cy="16.6" r="1"/>
    <path d="M12.6 16.6h3"/>`),

  audio: svg(`
    <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z"/>
    <path d="M15.2 8.8a4.6 4.6 0 0 1 0 6.4M17.8 6.6a7.8 7.8 0 0 1 0 10.8"/>`),

  batteries: svg(`
    <rect x="2.5" y="7.5" width="17.5" height="9" rx="2"/>
    <path d="M20 10.2v3.6"/>
    <path d="M5.6 10.4h2.2v3.2H5.6zM9.2 10.4h2.2v3.2H9.2z"/>`),

  display: svg(`
    <rect x="2" y="3.6" width="20" height="13.6" rx="2"/>
    <path d="M8.6 20.4h6.8l-.8-2.4H9.4z"/>`),

  firmware: svg(`
    <rect x="6" y="6" width="12" height="12" rx="1.6"/>
    <rect x="9.2" y="9.2" width="5.6" height="5.6" rx=".8"/>
    <path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>`),

  hid: svg(`
    <rect x="2.5" y="7" width="19" height="10" rx="5"/>
    <circle cx="7.4" cy="12" r=".9" fill="currentColor"/>
    <circle cx="11" cy="12" r=".9" fill="currentColor"/>
    <circle cx="14.6" cy="12" r=".9" fill="currentColor"/>
    <path d="M17.4 11.2h1.8v1.6h-1.8z"/>`),

  keyboards: svg(`
    <rect x="2.5" y="5.5" width="19" height="13" rx="2"/>
    <path d="M6 9h1M9.5 9h1M13 9h1M16.5 9h1M6 12h1M9.5 12h1M13 12h1M16.5 12h1M8 15.4h8"/>`),

  mice: svg(`
    <rect x="7" y="2.5" width="10" height="19" rx="5"/>
    <path d="M12 2.5v7M7 9.5h10"/>`),

  monitors: svg(`
    <rect x="2" y="3.6" width="20" height="13.6" rx="2"/>
    <path d="M8.6 20.4h6.8l-.8-2.4H9.4z"/>
    <path d="M5 7.2h6M5 10h4"/>`),

  network: svg(`
    <rect x="2.5" y="7" width="19" height="10" rx="2"/>
    <path d="M6 11h4M6 14h7"/>
    <circle cx="17" cy="12.5" r="1.5"/>
    <path d="M8 3.2v3.8M16 3.2v3.8"/>`),

  print: svg(`
    <path d="M6.5 8V3.2h11V8"/>
    <rect x="3" y="8" width="18" height="8" rx="2"/>
    <path d="M6.5 14h11v6.8h-11z"/>
    <path d="M7.4 11h2"/>`),

  processors: svg(`
    <rect x="5" y="5" width="14" height="14" rx="1.8"/>
    <rect x="9" y="9" width="6" height="6" rx=".8"/>
    <path d="M9 2.4v2.6M12 2.4v2.6M15 2.4v2.6M9 19v2.6M12 19v2.6M15 19v2.6M2.4 9h2.6M2.4 12h2.6M2.4 15h2.6M19 9h2.6M19 12h2.6M19 15h2.6"/>`),

  system: svg(`
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <rect x="7" y="7" width="10" height="10" rx="1"/>
    <path d="M7 12h-4M17 12h4M12 7v-4M12 17v4"/>`),

  usb: svg(`
    <path d="M12 21V3.6"/>
    <path d="M9.2 8.6 12 5.8l2.8 2.8"/>
    <path d="M12 12.4 8.4 15v2.2M12 15.4l3.6 1.8v2.2"/>
    <circle cx="8.4" cy="18.6" r="1.2" fill="currentColor"/>
    <circle cx="15.6" cy="20.6" r="1.2" fill="currentColor"/>
    <circle cx="12" cy="3.2" r="1.2" fill="currentColor"/>`),

  scan: svg(`
    <rect x="2.5" y="4" width="14.5" height="10.5" rx="1.6"/>
    <path d="M6 18.6h5.4M8.7 14.5v4.1"/>
    <circle cx="17.6" cy="16.2" r="3.2"/>
    <path d="M19.9 18.5 22 20.6"/>`),
};

export const glyph = (kind) => GLYPHS[kind] || GLYPHS.system;

const warningBadge = `
  <svg class="badge warn" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5 15 14H1z" fill="#f2c94c" stroke="#8a6500" stroke-width=".7"/>
    <path d="M8 5.2v4.3" stroke="#3a2a00" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="8" cy="12" r=".85" fill="#3a2a00"/>
  </svg>`;

const disabledBadge = `
  <svg class="badge off" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="7" fill="#ececec" stroke="#666" stroke-width=".8"/>
    <path d="M8 4.2v6.2M5.4 8.4 8 11l2.6-2.6" fill="none" stroke="#333" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

export function deviceIcon(deviceRecord, extraClass = "") {
  const state = deviceRecord.status === "problem" ? "problem" : deviceRecord.status === "disabled" ? "disabled" : "ok";
  const badge = state === "problem" ? warningBadge : state === "disabled" ? disabledBadge : "";
  return `<span class="dev-ico ${state}${extraClass ? ` ${extraClass}` : ""}">${glyph(deviceRecord.classId)}${badge}</span>`;
}

export function statusGlyph(state) {
  if (state === "problem") {
    return `<svg class="status-svg" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 15 14H1z" fill="#f2c94c" stroke="#8a6500" stroke-width=".7"/>
      <path d="M8 5.2v4.3" stroke="#3a2a00" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="8" cy="12" r=".85" fill="#3a2a00"/>
    </svg>`;
  }
  if (state === "disabled") {
    return `<svg class="status-svg" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#ececec" stroke="#666" stroke-width=".8"/>
      <path d="M8 4.2v6.2M5.4 8.4 8 11l2.6-2.6" fill="none" stroke="#333" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg class="status-svg" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="7" fill="#4ade80" stroke="#1f7a45" stroke-width=".8"/>
    <path d="M4.7 8.2 6.9 10.4 11.4 5.9" fill="none" stroke="#0f3d22" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
