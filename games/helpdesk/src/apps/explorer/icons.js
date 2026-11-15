// Small inline SVGs used only by File Exploder. The shared icons.js set
// carries the app chrome; these are the file-manager glyphs.

const iconSvg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;

// Icons Explorer needs that the shell's shared set does not carry. They stay
// local because only this app uses them.
export const LOCAL_ICONS = {
  home: iconSvg(
    `<path d="M3.6 10.6 12 3.4l8.4 7.2v9a1.4 1.4 0 0 1-1.4 1.4h-4.4v-6h-5.2v6H5a1.4 1.4 0 0 1-1.4-1.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  ),
  gallery: iconSvg(
    `<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8.6" cy="9.2" r="1.5" fill="currentColor"/><path d="m4.6 17 4.8-4.6 3.3 3 2.8-2.4 3.9 4z" fill="currentColor"/>`,
  ),
  cloud: iconSvg(
    `<path d="M7.2 18.2h10a3.4 3.4 0 0 0 .5-6.8 5.4 5.4 0 0 0-10.4-1.6 4.2 4.2 0 0 0-.1 8.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
  ),
  thispc: iconSvg(
    `<rect x="3" y="4.6" width="18" height="12.2" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 19.8h6M12 16.8v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  network: iconSvg(
    `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.8 12h16.4M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
  ),
  drive: iconSvg(
    `<rect x="3" y="5" width="18" height="10.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="12.8" width="18" height="4.4" rx="1.4" fill="currentColor" opacity=".22"/><circle cx="7" cy="14.9" r="1" fill="currentColor"/><path d="M8.2 18.8h7.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  ),
  share: iconSvg(
    `<circle cx="6.2" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6.4" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="17.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m8.4 10.9 7.2-3.4M8.4 13.1l7.2 3.4" stroke="currentColor" stroke-width="1.5"/>`,
  ),
  rename: iconSvg(
    `<path d="m4 16.8-.8 4 4-.8L18.9 8.3a1.8 1.8 0 0 0 0-2.5l-.7-.7a1.8 1.8 0 0 0-2.5 0z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m14.4 6.6 3 3" stroke="currentColor" stroke-width="1.4"/>`,
  ),
  sort: iconSvg(
    `<path d="M4 7h9M4 12h6M4 17h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17 5v14M13.6 15.6 17 19l3.4-3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  view: iconSvg(
    `<rect x="3.2" y="4" width="7" height="7" rx="1.2" fill="currentColor"/><rect x="13.8" y="4" width="7" height="7" rx="1.2" fill="currentColor"/><rect x="3.2" y="13" width="7" height="7" rx="1.2" fill="currentColor"/><rect x="13.8" y="13" width="7" height="7" rx="1.2" fill="currentColor" opacity=".5"/>`,
  ),
  details: iconSvg(
    `<path d="M4 6h16M4 11h16M4 16h16M4 21h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4 6h4M4 11h7M4 16h3M4 21h5" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
  ),
  list: iconSvg(
    `<path d="M4 6h16M4 11h16M4 16h16M4 21h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  grid: iconSvg(
    `<rect x="3.2" y="3.2" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="13.8" y="3.2" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3.2" y="13.8" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="13.8" y="13.8" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  ),
  plus: iconSvg(`<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`),
  close: iconSvg(`<path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`),
  openTab: iconSvg(
    `<rect x="3" y="5" width="13" height="14" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 9h11v10H9z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 12h5M12 15h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  ),
  properties: iconSvg(
    `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 10.6v5.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/>`,
  ),
  shield: iconSvg(
    `<path d="M12 2.8 19 5.4v5.4c0 4.4-2.9 7.7-7 10.4-4.1-2.7-7-6-7-10.4V5.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m8.6 11.8 2.3 2.3 4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
};

export const local = (name, cls = "") => {
  const markup = LOCAL_ICONS[name] || LOCAL_ICONS.properties;
  return cls ? markup.replace("<svg ", `<svg class="${cls}" `) : markup;
};

export const FILE_ICON = {
  folder: "folder",
  drive: null,
  share: null,
  text: "notepad",
  registry: "settings",
  exe: "terminal",
  pdf: "book",
  image: "image",
  office: "doc",
};
