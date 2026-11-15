// Flat SVG app icons. Drawn here, not lifted from anywhere: 24x24, Windows-ish
// colours, no external files so the whole thing stays one folder.

const svg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;

export const ICONS = {
  folder: svg(`
    <path d="M2 7.2A2.2 2.2 0 0 1 4.2 5h4.3l1.8 2h9.5A2.2 2.2 0 0 1 22 9.2v8.6A2.2 2.2 0 0 1 19.8 20H4.2A2.2 2.2 0 0 1 2 17.8z" fill="#d9a441"/>
    <path d="M2 10.5h20v7.3A2.2 2.2 0 0 1 19.8 20H4.2A2.2 2.2 0 0 1 2 17.8z" fill="#f6c86a"/>
    <path d="M2 10.5h20v1.6H2z" fill="#ffe1a3" opacity=".7"/>`),

  notepad: svg(`
    <rect x="4" y="2.5" width="16" height="19" rx="2.2" fill="#f7f9fc"/>
    <rect x="4" y="2.5" width="16" height="4.4" rx="2.2" fill="#2f7ad6"/>
    <rect x="4" y="5" width="16" height="1.9" fill="#2f7ad6"/>
    <g stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round">
      <path d="M7.2 10.4h9.6M7.2 13.4h9.6M7.2 16.4h6.4"/>
    </g>`),

  calculator: svg(`
    <rect x="3" y="2.5" width="18" height="19" rx="3" fill="#1b5fa8"/>
    <rect x="5.4" y="5" width="13.2" height="4" rx="1.2" fill="#d5e8ff"/>
    <g fill="#8fc7ff">
      <rect x="5.4" y="10.8" width="3.4" height="3.1" rx="1"/>
      <rect x="10.3" y="10.8" width="3.4" height="3.1" rx="1"/>
      <rect x="15.2" y="10.8" width="3.4" height="3.1" rx="1"/>
      <rect x="5.4" y="15.1" width="3.4" height="3.1" rx="1"/>
      <rect x="10.3" y="15.1" width="3.4" height="3.1" rx="1"/>
    </g>
    <rect x="15.2" y="15.1" width="3.4" height="3.1" rx="1" fill="#ffb64d"/>`),

  terminal: svg(`
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="#20242b"/>
    <path d="M6 9.5l3 2.5-3 2.5" stroke="#7ee787" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.5 15h6" stroke="#7ee787" stroke-width="1.6" stroke-linecap="round"/>`),

  mail: svg(`
    <rect x="2" y="4.8" width="20" height="14.4" rx="2.4" fill="#2f7ad6"/>
    <path d="M2.6 6.6 12 13l9.4-6.4" stroke="#dcebff" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`),

  ticket: svg(`
    <path d="M3 8.2A2.2 2.2 0 0 1 5.2 6h13.6A2.2 2.2 0 0 1 21 8.2v1.4a2.4 2.4 0 0 0 0 4.8v1.4A2.2 2.2 0 0 1 18.8 18H5.2A2.2 2.2 0 0 1 3 15.8v-1.4a2.4 2.4 0 0 0 0-4.8z" fill="#17a673"/>
    <path d="M9.2 8v1.6M9.2 11.2v1.6M9.2 14.4V16" stroke="#c9f7e4" stroke-width="1.3" stroke-linecap="round"/>`),

  book: svg(`
    <path d="M4 4.4A1.9 1.9 0 0 1 5.9 2.5H20v16.8H5.9A1.9 1.9 0 0 0 4 21.2z" fill="#7c5cff"/>
    <path d="M4 19.3V4.4A1.9 1.9 0 0 1 5.9 2.5H7v16.8H5.9A1.9 1.9 0 0 0 4 21.2z" fill="#5b3fd6"/>
    <g stroke="#e4dcff" stroke-width="1.2" stroke-linecap="round"><path d="M10 7h6.5M10 10h6.5"/></g>`),

  people: svg(`
    <circle cx="9" cy="9.2" r="3.2" fill="#3f8ae0"/>
    <path d="M3.2 19.2c0-3.1 2.6-5 5.8-5s5.8 1.9 5.8 5z" fill="#3f8ae0"/>
    <circle cx="16.6" cy="10.2" r="2.5" fill="#6fb2ff"/>
    <path d="M13 19.2c0-2.6 1.9-4.2 4.3-4.2 2.2 0 4 1.2 4.2 4.2z" fill="#6fb2ff"/>`),

  taskmgr: svg(`
    <rect x="2.5" y="3.5" width="19" height="17" rx="2.6" fill="#23272f"/>
    <g fill="#4cc2ff">
      <rect x="5.6" y="12" width="2.9" height="5.6" rx="1"/>
      <rect x="10.2" y="8.4" width="2.9" height="9.2" rx="1"/>
      <rect x="14.8" y="10.6" width="2.9" height="7" rx="1"/>
    </g>
    <path d="M5.6 7.2h12.8" stroke="#59606b" stroke-width="1.3" stroke-linecap="round"/>`),

  settings: svg(`
    <path d="M12 2.6l1.5 2.2 2.5-.8.3 2.6 2.6.3-.8 2.5 2.2 1.5-2.2 1.5.8 2.5-2.6.3-.3 2.6-2.5-.8L12 21.4l-1.5-2.2-2.5.8-.3-2.6-2.6-.3.8-2.5L3.7 12l2.2-1.5-.8-2.5 2.6-.3.3-2.6 2.5.8z" fill="#8a8f98"/>
    <circle cx="12" cy="12" r="3.1" fill="#23272f"/>`),

  wupdate: svg(`
    <circle cx="12" cy="12" r="9" fill="#1b5fa8"/>
    <path d="M18.2 12a6.2 6.2 0 1 1-2-4.6M18.2 4.4v4.7h-4.7" stroke="#d5e8ff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.4 11.9l2.2 2.2 4.1-4.1" stroke="#7ee787" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),

  bin: svg(`
    <path d="M5.5 6.5h13l-1 12.2a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8z" fill="#7b8794"/>
    <path d="M4.2 5.2h15.6l-.7 2.2H4.9z" fill="#a7b2bf"/>
    <path d="M9.6 4.2h4.8l.6 1h-6z" fill="#5f6b77"/>
    <g stroke="#cfd8e3" stroke-width="1.2" stroke-linecap="round"><path d="M9.6 10.4v6M12 10.4v6M14.4 10.4v6"/></g>`),

  image: svg(`
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.4" fill="#2f7ad6"/>
    <circle cx="8.4" cy="9.6" r="1.6" fill="#d5e8ff"/>
    <path d="M4 17.2l4.6-4.3 3.4 3 3-2.6 5 4.2z" fill="#9cc8f7"/>`),

  monitor: svg(`
    <rect x="2" y="3.6" width="20" height="13.6" rx="2.2" fill="#2b6cb0"/>
    <rect x="4.2" y="5.9" width="15.6" height="9" rx="1" fill="#bfe0ff"/>
    <path d="M8.6 20.4h6.8l-.8-2.2H9.4z" fill="#7ba7d6"/>`),

  doc: svg(`
    <path d="M5 3h9.2L19 7.8V21H5z" fill="#e8eef7"/>
    <path d="M14.2 3L19 7.8h-4.8z" fill="#b9cbe2"/>
    <g stroke="#8fa6c4" stroke-width="1.2" stroke-linecap="round"><path d="M7.6 11h8.4M7.6 14h8.4M7.6 17h5.6"/></g>`),

  $chevron: svg(`<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  $check: svg(`<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`),
  $wifi: svg(`
    <path d="M3.6 8.6a12.4 12.4 0 0 1 16.8 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M6.6 11.9a8 8 0 0 1 10.8 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M9.5 15.2a3.7 3.7 0 0 1 5 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="18.4" r="1.2" fill="currentColor"/>`),
  $volume: svg(`
    <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" fill="currentColor"/>
    <path d="M15.2 8.8a4.6 4.6 0 0 1 0 6.4M17.8 6.6a7.8 7.8 0 0 1 0 10.8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
  $battery: svg(`
    <rect x="2" y="8" width="17" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="3.6" y="9.6" width="11" height="4.8" rx="1" fill="currentColor"/>
    <path d="M20.4 10.6v2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`),
  $shield: svg(`
    <path d="M12 2.8l7 2.6v5.4c0 4.4-2.9 7.7-7 10.4-4.1-2.7-7-6-7-10.4V5.4z" fill="currentColor"/>`),
  $bell: svg(`
    <path d="M12 3a5.6 5.6 0 0 1 5.6 5.6v3.9l1.5 2.9H4.9l1.5-2.9V8.6A5.6 5.6 0 0 1 12 3z" fill="currentColor"/>
    <path d="M9.7 17.4a2.4 2.4 0 0 0 4.6 0z" fill="currentColor"/>`),
  $start: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="2.5" width="8.6" height="8.6" rx="1.1" fill="#4cc2ff"/>
      <rect x="12.9" y="2.5" width="8.6" height="8.6" rx="1.1" fill="#4cc2ff"/>
      <rect x="2.5" y="12.9" width="8.6" height="8.6" rx="1.1" fill="#4cc2ff"/>
      <rect x="12.9" y="12.9" width="8.6" height="8.6" rx="1.1" fill="#4cc2ff"/>
    </svg>`,
  $search: svg(`
    <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M15.6 15.6L21 21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`),
  $taskview: svg(`
    <rect x="2.5" y="6" width="11" height="12" rx="1.6" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M16.2 8.2h5v10.6h-5z" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".75"/>`),
  $power: svg(`
    <path d="M12 3.4v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M7.4 6.6a7 7 0 1 0 9.2 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
  $user: svg(`
    <circle cx="12" cy="8.4" r="3.6" fill="currentColor"/>
    <path d="M4.6 20.2c0-3.9 3.3-6.2 7.4-6.2s7.4 2.3 7.4 6.2z" fill="currentColor"/>`),
  $chevronDown: svg(`<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  $arrowLeft: svg(`<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`),
  $arrowRight: svg(`<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`),
  $up: svg(`<path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`),
  $refresh: svg(`<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.4h-4.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`),
  $monitor: svg(`
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M9 20h6M12 16.5V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  $brush: svg(`<path d="M4 20c2.4.4 3.6-1 4.2-2.4l8.6-8.6-2-2L6.2 15.6C4.8 16.2 3.4 17.4 4 20z" fill="currentColor"/><path d="M15.4 6.4l2.6-2.6 2.2 2.2-2.6 2.6z" fill="currentColor"/>`),
  $info: svg(`
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M12 10.6v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="7.6" r="1.2" fill="currentColor"/>`),
  $lock: svg(`
    <rect x="4.8" y="10.4" width="14.4" height="10" rx="2.2" fill="currentColor"/>
    <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" stroke="currentColor" stroke-width="1.8" fill="none"/>`),
  $trash: svg(`
    <path d="M5 7h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M4 5.4h16M9.5 3.6h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`),
  $copy: svg(`
    <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.5" fill="none"/>`),
  $cut: svg(`
    <circle cx="6.5" cy="17.5" r="2.6" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="17.5" cy="17.5" r="2.6" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M8.4 15.6L18 4M15.6 15.6L6 4" stroke="currentColor" stroke-width="1.5"/>`),
  $paste: svg(`
    <rect x="5" y="5" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="9" y="3" width="6" height="4" rx="1.4" fill="currentColor"/>
    <path d="M8.5 11h7M8.5 14.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`),
  $save: svg(`
    <path d="M4.5 4.5h12L20 8v11.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="8" y="4.5" width="8" height="5" fill="currentColor"/>
    <rect x="8" y="13" width="8" height="6.5" stroke="currentColor" stroke-width="1.4" fill="none"/>`),
};

/** Inline icon markup. Name may be an ICONS key or a raw svg string. */
export function icon(name, cls = "") {
  const markup = ICONS[name] || ICONS.$info;
  return cls ? markup.replace("<svg ", `<svg class="${cls}" `) : markup;
}
