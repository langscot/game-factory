// Monochrome ribbon glyphs. Drawn here with a 24x24 viewBox so the app ships
// no image files; colour comes from currentColor so the ribbon and the reading
// pane can theme the same mark differently.

const svg = (body) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const GLYPH = {
  newMail: svg(`
    <rect x="2.4" y="6.2" width="14.4" height="10.4" rx="1.6"/>
    <path d="M3.2 7.4 9.6 12l6.4-4.6"/>
    <path d="M19.4 3.6v5.2M16.8 6.2h5.2"/>`),

  delete: svg(`
    <path d="M4.6 6.4h14.8l-1 12.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/>
    <path d="M3.2 5.2h17.6M9.6 4.2h4.8l.5 1H9.1z"/>
    <path d="M9.6 10.2v6M12 10.2v6M14.4 10.2v6"/>`),

  junk: svg(`
    <path d="M12 2.8 20 6v7.1c0 4.4-3.4 7.4-8 8.1-4.6-.7-8-3.7-8-8.1V6z"/>
    <path d="M12 8.2v4.7M12 16.1h.01"/>`),

  archive: svg(`
    <rect x="2.8" y="4.8" width="18.4" height="4.4" rx="1.2"/>
    <path d="M4.4 9.2v9.2A1.6 1.6 0 0 0 6 20h12a1.6 1.6 0 0 0 1.6-1.6V9.2"/>
    <path d="M9.4 13h5.2"/>`),

  reply: svg(`
    <path d="M9.4 5.4 4 10.8l5.4 5.4"/>
    <path d="M4 10.8h9.2c4.2 0 6.8 2.4 6.8 6.4"/>`),

  replyAll: svg(`
    <path d="M8.2 5.4 2.8 10.8l5.4 5.4"/>
    <path d="M13.4 5.4 8 10.8l5.4 5.4"/>
    <path d="M8 10.8h5.4c4.2 0 6.8 2.4 6.8 6.4"/>`),

  forward: svg(`
    <path d="M14.6 5.4 20 10.8l-5.4 5.4"/>
    <path d="M20 10.8h-9.2C6.6 10.8 4 13.2 4 17.2"/>`),

  unread: svg(`
    <rect x="2.4" y="5.6" width="15.2" height="11.2" rx="1.6"/>
    <path d="M3.2 6.8 10 11.4l6.8-4.6"/>
    <circle cx="19.4" cy="6.4" r="2.4" fill="currentColor" stroke="none"/>`),

  read: svg(`
    <path d="M3 10.2 11 5.2l8 5v8.2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18.4z"/>
    <path d="M3 10.2l8 5 8-5"/>`),

  search: svg(`
    <circle cx="10.4" cy="10.4" r="6.2"/>
    <path d="M15 15 20.4 20.4"/>`),

  sync: svg(`
    <path d="M19.2 8.4A8 8 0 0 0 5.2 6.6L3.2 8.8"/>
    <path d="M3.2 4.4v4.4h4.4"/>
    <path d="M4.8 15.6a8 8 0 0 0 14 1.8l2-2.2"/>
    <path d="M20.8 19.6v-4.4h-4.4"/>`),

  folder: svg(`
    <path d="M2.8 7.2A1.8 1.8 0 0 1 4.6 5.4h4.2l1.8 2h8.8a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8z"/>`),

  moveTo: svg(`
    <path d="M2.8 7.2A1.8 1.8 0 0 1 4.6 5.4h4.2l1.8 2h8.8a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8z"/>
    <path d="M9.2 13.4h6M12.8 11l2.4 2.4-2.4 2.4"/>`),

  panes: svg(`
    <rect x="2.8" y="4.6" width="18.4" height="14.8" rx="1.6"/>
    <path d="M8.6 4.6v14.8M15.4 4.6v14.8"/>`),

  sort: svg(`
    <path d="M4.4 6.4h12M4.4 11.4h9M4.4 16.4h6"/>
    <path d="M18.6 5.4v13M16 15.8l2.6 2.6 2.6-2.6"/>`),

  attach: svg(`
    <path d="M20 11.4 11.7 19.7a4.2 4.2 0 0 1-6-6l8.6-8.6a2.8 2.8 0 0 1 4 4l-8.4 8.4a1.4 1.4 0 0 1-2-2l7.6-7.6"/>`),

  send: svg(`
    <path d="M21 3.4 10.6 13.8"/>
    <path d="M21 3.4 14.4 21l-3.8-7.2L3.4 10z"/>`),

  save: svg(`
    <path d="M4.4 3.8h11.2L20.2 8.4v11.8H4.4z"/>
    <path d="M7.8 3.8v5.4h7.6V3.8M7.8 14.6h8.4v5.6"/>`),

  inbox: svg(`
    <path d="M3 4.8h18v13.8a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 18.6z"/>
    <path d="M3 13.4h4.4l1.6 2.4h6l1.6-2.4H21"/>`),

  draft: svg(`
    <path d="M4.2 19.8v-3.6L15.4 5a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L7.8 19.8z"/>
    <path d="M13.8 6.6 17.4 10.2M4.2 19.8h3.6"/>`),

  sent: svg(`
    <path d="M21 3.4 10.6 13.8"/>
    <path d="M21 3.4 14.4 21l-3.8-7.2L3.4 10z"/>`),

  support: svg(`
    <path d="M3 8.4A2 2 0 0 1 5 6.4h14a2 2 0 0 1 2 2v1.2a2.4 2.4 0 0 0 0 4.8v1.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.2a2.4 2.4 0 0 0 0-4.8z"/>
    <path d="M9.2 8.4v1.4M9.2 11.3v1.4M9.2 14.2v1.4"/>`),

  chevron: svg(`<path d="M8.6 5.4 15.2 12l-6.6 6.6"/>`),

  close: svg(`<path d="M5.4 5.4l13.2 13.2M18.6 5.4 5.4 18.6"/>`),
};

/** Reuse an icon mark at a given size in HTML strings. */
export const glyph = (name, cls = "ico") => `<span class="${cls}">${GLYPH[name] || GLYPH.newMail}</span>`;
