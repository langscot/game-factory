// The ribbon, as data. Tabs and groups follow classic Lookout; the app wires
// every `cmd` in one click handler, so rebuilding the ribbon never loses an
// event listener.

export const TABS = [
  {
    id: "home",
    label: "Home",
    groups: [
      { label: "New", items: [{ cmd: "new", label: "New Email", glyph: "newMail", big: true }] },
      {
        label: "Delete",
        items: [
          { cmd: "delete", label: "Delete", glyph: "delete", big: true },
          { cmd: "junk", label: "Junk", glyph: "junk" },
          { cmd: "archive", label: "Archive", glyph: "archive" },
        ],
      },
      {
        label: "Respond",
        items: [
          { cmd: "reply", label: "Reply", glyph: "reply", big: true },
          { cmd: "replyAll", label: "Reply All", glyph: "replyAll", big: true },
          { cmd: "forward", label: "Forward", glyph: "forward", big: true },
        ],
      },
      {
        label: "Tags",
        items: [
          { cmd: "unread", label: "Mark Unread", glyph: "unread" },
          { cmd: "read", label: "Mark Read", glyph: "read" },
        ],
      },
      { label: "Move", items: [{ cmd: "inbox", label: "Move to Inbox", glyph: "moveTo" }] },
      { label: "Find", items: [{ cmd: "search", label: "Search", glyph: "search", big: true }] },
    ],
  },
  {
    id: "sendreceive",
    label: "Send / Receive",
    groups: [
      {
        label: "Send & Receive",
        items: [
          { cmd: "sendAll", label: "Send All", glyph: "send", big: true },
          { cmd: "update", label: "Update Folder", glyph: "sync", big: true },
          { cmd: "offline", label: "Work Offline", glyph: "junk" },
        ],
      },
      {
        label: "Download",
        items: [
          { cmd: "update", label: "Download All", glyph: "inbox" },
          { cmd: "update", label: "Send/Receive All Folders", glyph: "sync" },
        ],
      },
    ],
  },
  {
    id: "folder",
    label: "Folder",
    groups: [
      {
        label: "New",
        items: [
          { cmd: "new", label: "New Email", glyph: "newMail", big: true },
          { cmd: "newFolder", label: "New Folder", glyph: "folder" },
          { cmd: "newSearch", label: "New Search Folder", glyph: "search" },
        ],
      },
      {
        label: "Actions",
        items: [
          { cmd: "inbox", label: "Move to Inbox", glyph: "moveTo", big: true },
          { cmd: "junk", label: "Junk", glyph: "junk" },
          { cmd: "delete", label: "Delete", glyph: "delete" },
          { cmd: "archive", label: "Archive", glyph: "archive" },
        ],
      },
      {
        label: "Clean Up",
        items: [
          { cmd: "emptyFolder", label: "Empty Folder", glyph: "delete" },
          { cmd: "cleanUp", label: "Clean Up Folder", glyph: "sync" },
        ],
      },
    ],
  },
  {
    id: "view",
    label: "View",
    groups: [
      {
        label: "Current View",
        items: [
          { cmd: "preview", label: "Message Preview", glyph: "panes" },
          { cmd: "sort", label: "Sort By", glyph: "sort" },
          { cmd: "readingPane", label: "Reading Pane", glyph: "panes" },
        ],
      },
      {
        label: "Layout",
        items: [
          { cmd: "folderPane", label: "Folder Pane", glyph: "folder" },
          { cmd: "resetView", label: "Reset View", glyph: "sync" },
        ],
      },
    ],
  },
];

const bigHtml = (item) =>
  `<button class="rb big" data-cmd="${item.cmd}" title="${item.label}" aria-label="${item.label}">
    <span class="ico">${item.glyphHtml || ""}</span>
    <span class="rb-text">${item.label}</span>
  </button>`;

const smallHtml = (item) =>
  `<button class="rb small" data-cmd="${item.cmd}" title="${item.label}">
    <span class="ico">${item.glyphHtml || ""}</span>
    <span class="rb-text">${item.label}</span>
  </button>`;

/** Ribbon body for one tab. `glyphs` maps names to SVG strings. */
export function ribbonHtml(tabId, glyphs) {
  const tab = TABS.find((entry) => entry.id === tabId) || TABS[0];
  const decorate = (item) => ({ ...item, glyphHtml: glyphs[item.glyph] || "" });

  return tab.groups
    .map((group) => {
      const items = group.items.map(decorate);
      const bigs = items.filter((item) => item.big);
      const smalls = items.filter((item) => !item.big);
      return `<div class="rb-group">
        <div class="rb-items">
          ${bigs.map((item) => bigHtml(item)).join("")}
          ${smalls.length ? `<div class="rb-stack">${smalls.map((item) => smallHtml(item)).join("")}</div>` : ""}
        </div>
        <span class="rb-group-label">${group.label}</span>
      </div>`;
    })
    .join("");
}
