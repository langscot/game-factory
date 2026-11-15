// Outlook, classic desktop client.
//
// The id stays `mail` so the day-start, desktop link, Start menu and ticket
// flows keep opening the same app. Everything below is the shell: ribbon,
// folders, message list, reading pane, composer and File > Properties. Mail
// rows still come from `world.mail`, the support queue from `world.tickets`,
// and sending still goes through `actions.sendMail`.
//
// Folder moves and "mark unread" are an app-local overlay in the per-app UI
// state: this PR is shell-only and does not add world actions for them.

import { createComposer } from "./compose.js";
import { GLYPH, glyph } from "./glyphs.js";
import { showMessageProperties } from "./headers.js";
import { ribbonHtml, TABS } from "./ribbon.js";
import { css } from "./styles.js";
import {
  FOLDERS,
  FOLDER_IDS,
  SUPPORT_FOLDER,
  folderLabel,
  folderMessages,
  folderSummary,
  formatBytes,
  initials,
  isExternal,
  personText,
  searchMessages,
  sortMessages,
} from "./model.js";

const seedDraft = () => ({
  id: "mail_draft_seed",
  to: "IT Service Desk <it-service-desk@halcyon.co>",
  cc: "",
  subject: "Printer queue checks",
  body: "Morning,\n\nI will clear the floor 2 queue after the briefing and check the spooler on the way past.\n\nMorgan",
  attachments: [],
  savedAt: "08:45",
});

const EMPTY =
  '<div class="rp-empty">' +
  glyph("newMail") +
  "<div><b>Select an item to read</b><br>Pick a message in the list to open it here.</div></div>";

export default {
  id: "mail",
  title: "Outlook",
  icon: "mail",
  size: [980, 640],
  desktop: true,
  pinned: true,
  order: 2,
  right: true,
  position: [null, 20],
  fixed: true,

  mount(container, ctx) {
    ctx.ui.styles("mail", css);

    const uiState = () => ctx.world.session.ui("mail");
    const setUi = (patch) => ctx.actions.setUi("mail", patch);

    let drafts = [seedDraft()];
    let currentList = [];
    let painting = false;
    let backstagePage = null; // null = closed, otherwise the File page id

    const root = ctx.ui.el(`
      <div class="olk">
        <div class="ribbon" data-ribbon>
          <div class="ribbon-tabs">
            <button class="tab file" data-tab="file">File</button>
            <button class="tab" data-tab="home">Home</button>
            <button class="tab" data-tab="sendreceive">Send / Receive</button>
            <button class="tab" data-tab="folder">Folder</button>
            <button class="tab" data-tab="view">View</button>
            <button class="tellme" data-cmd="search">${glyph("search")}<span>Tell me what you want to do</span></button>
          </div>
          <div class="ribbon-body" data-ribbon-body></div>
        </div>
        <div class="olk-main" data-main>
          <aside class="folder-pane">
            <div class="fp-account">
              <div class="fp-avatar" data-avatar>MH</div>
              <div><b data-tech-name>Morgan Hayes</b><small data-tech-mail>m.hayes@halcyon.co</small></div>
            </div>
            <div class="fp-scroll" data-folders></div>
            <div class="fp-foot">Outlook · Microsoft Exchange</div>
          </aside>
          <section class="list-pane">
            <div class="lp-head">
              <div class="lp-title"><b data-folder-title>Inbox</b><span data-list-count></span></div>
              <label class="searchbox">${glyph("search")}<input type="search" data-search placeholder="Search current mailbox" aria-label="Search sender or subject" spellcheck="false"></label>
            </div>
            <div class="lp-cols"><span>From</span><span>Subject</span><span>Received</span><span>Size</span></div>
            <div class="list-rows" data-rows></div>
          </section>
          <section class="read-pane" data-read></section>
        </div>
        <div class="statusbar">
          <span class="conn" data-conn><i class="dot"></i><span data-conn-text>Connected to Microsoft Exchange</span></span>
          <span data-status-count></span>
          <span class="grow"></span>
          <span>All items are up to date</span>
          <span class="clock" data-clock>09:00</span>
        </div>
      </div>`);

    container.innerHTML = "";
    container.append(root);

    const refs = {
      ribbon: root.querySelector("[data-ribbon]"),
      ribbonBody: root.querySelector("[data-ribbon-body]"),
      main: root.querySelector("[data-main]"),
      folders: root.querySelector("[data-folders]"),
      folderTitle: root.querySelector("[data-folder-title]"),
      listCount: root.querySelector("[data-list-count]"),
      search: root.querySelector("[data-search]"),
      rows: root.querySelector("[data-rows]"),
      read: root.querySelector("[data-read]"),
      techName: root.querySelector("[data-tech-name]"),
      techMail: root.querySelector("[data-tech-mail]"),
      avatar: root.querySelector("[data-avatar]"),
      conn: root.querySelector("[data-conn]"),
      connText: root.querySelector("[data-conn-text]"),
      statusCount: root.querySelector("[data-status-count]"),
      clock: root.querySelector("[data-clock]"),
    };

    // File backstage lives above the panes and below the shared modal.
    const bsEl = ctx.ui.el(`<div class="bs" data-backstage hidden></div>`);
    root.append(bsEl);

    const composer = createComposer(root, ctx, {
      onSent(details) {
        const sentDetails = {
          ...(uiState().sentDetails || {}),
          [details.mail.id]: {
            to: details.to,
            cc: details.cc,
            attachments: details.attachments,
          },
        };
        refs.search.value = "";
        setUi({ sentDetails, folder: "sent", selectedId: details.mail.id, search: "" });
        ctx.ui.toast("Outlook", "Message sent. It is in Sent Items.", "mail");
      },
      onDraft(draft) {
        const index = drafts.findIndex((entry) => entry.id === draft.id);
        if (index >= 0) drafts[index] = draft;
        else drafts.push(draft);
        ctx.ui.toast("Outlook", "Draft saved in Drafts.", "mail");
        paint();
      },
    });

    // ---------------------------------------------------------------------
    // derived state
    // ---------------------------------------------------------------------

    const activeFolder = () => {
      const folder = uiState().folder || "inbox";
      return FOLDER_IDS.includes(folder) ? folder : "inbox";
    };

    function selectedMessage() {
      const id = uiState().selectedId;
      return currentList.find((message) => message.id === id) || null;
    }

    function openComposer(args) {
      if (composer.isOpen()) {
        ctx.ui.toast("Outlook", "Finish or discard the open message first.", "mail");
        return;
      }
      if (backstagePage) closeBackstage();
      composer.open(args);
    }

    // ---------------------------------------------------------------------
    // ribbon
    // ---------------------------------------------------------------------

    function renderRibbon() {
      const ui = uiState();
      const tab = TABS.some((entry) => entry.id === ui.tab) ? ui.tab : "home";
      refs.ribbonBody.innerHTML = ribbonHtml(tab, GLYPH);
      for (const button of root.querySelectorAll(".ribbon-tabs [data-tab]")) {
        const id = button.dataset.tab;
        button.classList.toggle("sel", id === "file" ? Boolean(backstagePage) : !backstagePage && id === tab);
      }
    }

    // ---------------------------------------------------------------------
    // folder pane
    // ---------------------------------------------------------------------

    function renderFolders() {
      const ui = uiState();
      const folder = activeFolder();
      const rows = FOLDERS.map((entry) => {
        const summary = folderSummary(ctx, ui, entry.id, drafts);
        return `<button class="folder-item${entry.id === folder ? " sel" : ""}${summary.unread ? " unread" : ""}"
            data-folder="${entry.id}" ${entry.id === folder ? 'aria-current="true"' : ""}>
          <span class="ico">${GLYPH[entry.glyph]}</span>
          <span class="fi-name">${entry.label}</span>
          ${summary.unread ? `<span class="fi-count">${summary.unread}</span>` : entry.id === "drafts" && summary.count ? `<span class="fi-count">${summary.count}</span>` : ""}
        </button>`;
      }).join("");

      const support = folderSummary(ctx, ui, SUPPORT_FOLDER.id, drafts);
      refs.folders.innerHTML = `
        <div class="fp-section">${glyph("chevron")}Favourites</div>
        ${rows}
        <div class="fp-divider"></div>
        <button class="folder-item${SUPPORT_FOLDER.id === folder ? " sel" : ""}${support.unread ? " unread" : ""}"
          data-folder="${SUPPORT_FOLDER.id}" ${SUPPORT_FOLDER.id === folder ? 'aria-current="true"' : ""}>
          <span class="ico">${GLYPH.support}</span>
          <span class="fi-name">${SUPPORT_FOLDER.label}</span>
          ${support.unread ? `<span class="fi-count">${support.unread}</span>` : ""}
        </button>
        <div class="fp-section">Today's desk</div>
        <button class="folder-item" data-open-desk>
          <span class="ico">${GLYPH.support}</span>
          <span class="fi-name">Open Ticket Desk</span>
        </button>`;
    }

    // ---------------------------------------------------------------------
    // message list
    // ---------------------------------------------------------------------

    function rowHtml(message, preview) {
      const firstLine = message.lines.find((line) => String(line).trim()) || "";
      return `<button class="row${message.id === uiState().selectedId ? " sel" : ""}${message.read ? "" : " unread"}"
          data-message="${ctx.ui.esc(message.id)}" aria-selected="${message.id === uiState().selectedId}">
        <span class="from"><i class="dot"></i><span>${ctx.ui.esc(message.draft ? "You (draft)" : message.from)}</span></span>
        <span class="subj-cell">
          <span class="subj">${ctx.ui.esc(message.subject)}</span>
          ${preview ? `<small class="preview">${ctx.ui.esc(firstLine)}</small>` : ""}
        </span>
        <span class="when">${ctx.ui.esc(message.when)}</span>
        <span class="size">${ctx.ui.esc(message.size)}</span>
      </button>`;
    }

    function renderList() {
      const ui = uiState();
      const folder = activeFolder();
      const all = folderMessages(ctx, ui, folder, drafts);
      const list = sortMessages(searchMessages(all, ui.search), ui.sort || "date");
      currentList = list;

      const fallback = folder === "drafts" ? null : list[0]?.id || null;
      const selectedId = list.some((message) => message.id === ui.selectedId) ? ui.selectedId : fallback;
      if (selectedId !== ui.selectedId) {
        // Painted below; the nested paint from this action is blocked by the guard.
        setUi({ selectedId });
      }

      const unread = list.filter((message) => !message.read).length;
      refs.folderTitle.textContent = folderLabel(folder);
      refs.listCount.textContent = `${list.length} item${list.length === 1 ? "" : "s"}${unread ? `, ${unread} unread` : ""}`;

      const preview = ui.preview !== false;
      refs.rows.classList.toggle("no-preview", !preview);
      refs.rows.innerHTML = list.length
        ? list.map((message) => rowHtml(message, preview)).join("")
        : `<div class="lp-empty">${
            ui.search
              ? `No items match <b>${ctx.ui.esc(ui.search)}</b>.<br>Try a sender name or part of the subject.`
              : "There are no items to show in this view."
          }</div>`;
    }

    // ---------------------------------------------------------------------
    // reading pane
    // ---------------------------------------------------------------------

    function attachmentChips(message) {
      if (!message.attachments.length) return "";
      return `<div class="rp-attach">${message.attachments
        .map(
          (file) =>
            `<span class="chip">${glyph("attach")}<span class="chip-name">${ctx.ui.esc(file.name)}</span><small>${formatBytes(file.bytes)}</small></span>`,
        )
        .join("")}</div>`;
    }

    function readingHtml(message) {
      const day = ctx.world.session.day();
      const external = isExternal(message.fromAddress);
      const pills = [
        message.briefing ? '<span class="pill">Daily briefing</span>' : "",
        message.sent ? '<span class="pill">Sent</span>' : "",
        message.ticketId ? `<span class="pill">Support ticket #${message.ticketId}</span>` : "",
        external ? '<span class="pill warn">External sender</span>' : "",
      ]
        .filter(Boolean)
        .join("");

      return `<div class="rp">
        <div class="rp-toolbar">
          <button class="rp-tool" data-act="reply" title="Reply">${glyph("reply")}<span class="rpl">Reply</span></button>
          <button class="rp-tool" data-act="replyAll" title="Reply All">${glyph("replyAll")}<span class="rpl">Reply All</span></button>
          <button class="rp-tool" data-act="forward" title="Forward">${glyph("forward")}<span class="rpl">Forward</span></button>
          <span class="spacer"></span>
          <button class="rp-tool compact" data-act="unread" title="${message.read ? "Mark Unread" : "Mark Read"}" aria-label="${message.read ? "Mark Unread" : "Mark Read"}">${glyph(
            message.read ? "unread" : "read",
          )}</button>
          <button class="rp-tool compact" data-act="junk" title="Move to Junk Email" aria-label="Move to Junk Email">${glyph("junk")}</button>
          <button class="rp-tool compact" data-act="delete" title="Delete" aria-label="Delete">${glyph("delete")}</button>
        </div>
        <div class="rp-scroll">
          <h2 class="rp-subject">${ctx.ui.esc(message.subject)}</h2>
          <div class="rp-from">
            <div class="rp-avatar">${ctx.ui.esc(initials(message.from))}</div>
            <div class="rp-who">
              <div class="rp-name">${ctx.ui.esc(message.from)} <span class="rp-addr">&lt;${ctx.ui.esc(message.fromAddress)}&gt;</span></div>
              <div class="rp-addr">To: ${ctx.ui.esc(message.toText || personText(ctx.world.session.current().technician))}${
                message.ccText ? ` · Cc: ${ctx.ui.esc(message.ccText)}` : ""
              }</div>
              ${pills ? `<div class="rp-tags">${pills}</div>` : ""}
            </div>
            <div class="rp-when">${ctx.ui.esc(message.when)}</div>
          </div>
          <div class="rp-body">${
            message.lines.length
              ? message.lines.map((line) => `<p>${ctx.ui.esc(line)}</p>`).join("")
              : '<p class="muted">(No message body.)</p>'
          }</div>
          ${
            message.briefing && day > 1
              ? `<div class="rp-note"><b>Policy update:</b> Policy ${day + 4} is now in the handbook. It applies from today.</div>`
              : ""
          }
          ${attachmentChips(message)}
          ${
            message.ticketId
              ? `<div class="rp-ticket"><button class="btn" data-act="ticket">Open ticket #${message.ticketId} in Ticket Desk</button></div>`
              : ""
          }
          ${
            message.ticketId
              ? ""
              : `<p class="rp-hint">Inspect the transport headers with File &gt; Properties before acting on anything that asks for a password, a token or money.</p>`
          }
        </div>
      </div>`;
    }

    function renderReading() {
      const message = selectedMessage();
      if (!message) {
        refs.read.innerHTML =
          activeFolder() === "drafts"
            ? '<div class="rp-empty">' +
              glyph("draft") +
              "<div><b>Drafts open in the composer</b><br>Click a draft in the list to keep writing it.</div></div>"
            : EMPTY;
        return;
      }
      if (message.draft) {
        refs.read.innerHTML =
          '<div class="rp-empty">' +
          glyph("draft") +
          "<div><b>A draft is not a sent message</b><br>Click it in the list to open the composer.</div></div>";
        return;
      }
      refs.read.innerHTML = readingHtml(message);
    }

    // ---------------------------------------------------------------------
    // status bar
    // ---------------------------------------------------------------------

    function renderStatus() {
      const tech = ctx.world.session.current().technician;
      const connected = ctx.world.mail.canSendFrom(tech.id);
      refs.conn.classList.toggle("off", !connected);
      refs.connText.textContent = connected ? "Connected to Microsoft Exchange" : "Working offline";
      const unread = currentList.filter((message) => !message.read).length;
      refs.statusCount.textContent = `${currentList.length} item${currentList.length === 1 ? "" : "s"}${
        unread ? `, ${unread} unread` : ""
      }`;
      refs.clock.textContent = ctx.clock.timeText();
    }

    // ---------------------------------------------------------------------
    // paint
    // ---------------------------------------------------------------------

    function paint() {
      if (painting) return;
      painting = true;
      try {
        const tech = ctx.world.session.current().technician;
        refs.techName.textContent = tech?.displayName || "Morgan Hayes";
        refs.techMail.textContent = tech?.email || "m.hayes@halcyon.co";
        refs.avatar.textContent = initials(tech?.displayName || "MH");

        const ui = uiState();
        refs.main.classList.toggle("hide-folders", ui.folderPane === false);
        refs.main.classList.toggle("hide-read", ui.readingPane === false);
        if (refs.search.value !== (ui.search || "")) refs.search.value = ui.search || "";

        renderFolders();
        renderList();
        renderReading();
        renderStatus();
        renderRibbon();
        if (backstagePage) renderBackstage();
      } finally {
        painting = false;
      }
    }

    // ---------------------------------------------------------------------
    // message actions
    // ---------------------------------------------------------------------

    function openMessage(messageId) {
      const message = currentList.find((entry) => entry.id === messageId);
      if (!message) return;

      if (message.draft) {
        setUi({ selectedId: message.id });
        const draft = drafts.find((entry) => entry.id === message.id);
        if (draft) openComposer({ mode: "draft", draft });
        return;
      }

      setUi({ selectedId: message.id });
      if (!message.read) {
        const unread = { ...(uiState().unread || {}) };
        delete unread[message.id];
        ctx.actions.markMailRead(message.id);
        setUi({ unread });
      }
    }

    function toast(message) {
      ctx.ui.toast("Outlook", message, "mail");
    }

    function moveSelected(folder) {
      const message = selectedMessage();
      if (!message) return toast("Select a message first.");
      if (message.draft) return toast("That is a draft. Send it, save it or discard it in the composer.");
      if (message.folder === folder) return toast(`That message is already in ${folderLabel(folder)}.`);
      const moved = { ...(uiState().moved || {}), [message.id]: folder };
      setUi({ moved, selectedId: null });
      toast(`Moved to ${folderLabel(folder)}.`);
    }

    function setSelectedRead(read) {
      const message = selectedMessage();
      if (!message) return toast("Select a message first.");
      if (message.draft) return toast("Drafts are always read.");
      const unread = { ...(uiState().unread || {}) };
      if (read) {
        delete unread[message.id];
        ctx.actions.markMailRead(message.id);
        setUi({ unread });
      } else {
        unread[message.id] = true;
        setUi({ unread });
        toast("Marked unread.");
      }
    }

    function respond(mode) {
      const message = selectedMessage();
      if (!message) return toast("Select a message first.");
      if (message.draft) return toast("Open the draft in the composer to edit it.");
      openComposer({ mode, message });
    }

    // ---------------------------------------------------------------------
    // File backstage
    // ---------------------------------------------------------------------

    function backstageMessage() {
      return selectedMessage();
    }

    function infoPage() {
      const ui = uiState();
      const tech = ctx.world.session.current().technician;
      const message = backstageMessage();
      const folder = folderLabel(ui.folder || "inbox");
      return `
        <h2>Info</h2>
        <div class="bs-sub">Account and mailbox settings for ${ctx.ui.esc(tech?.displayName || "the signed-in user")}.</div>
        <div class="bs-card">
          <h3>Account Information</h3>
          <div class="bs-acct">
            <div class="bs-avatar">${ctx.ui.esc(initials(tech?.displayName || "MH"))}</div>
            <div>
              <b>${ctx.ui.esc(tech?.displayName || "Morgan Hayes")}</b>
              <span>${ctx.ui.esc(tech?.email || "m.hayes@halcyon.co")} · Microsoft Exchange</span>
              <span>Current folder: ${ctx.ui.esc(folder)}</span>
            </div>
          </div>
        </div>
        <div class="bs-card">
          <h3>Selected message</h3>
          ${
            message
              ? `<div class="bs-row"><span>Subject</span><b>${ctx.ui.esc(message.subject)}</b></div>
                 <div class="bs-row"><span>From</span><b>${ctx.ui.esc(message.from)} &lt;${ctx.ui.esc(message.fromAddress)}&gt;</b></div>
                 <div class="bs-row"><span>Received</span><b>${ctx.ui.esc(message.when || "today")}</b></div>
                 <div class="bs-row"><span>Size</span><b>${ctx.ui.esc(message.size)}</b></div>
                 <div class="bs-actions">
                   <button class="btn primary" data-props>Properties</button>
                   <span class="tiny muted">Internet headers</span>
                 </div>
                 <p style="margin-top:10px">Open Properties to read the transport headers — From, Reply-To, Return-Path and Received — before you trust the display name.</p>`
              : `<p>No message is selected. Pick one in the message list, then come back to File &gt; Properties to inspect its Internet headers.</p>`
          }
        </div>
        <div class="bs-card">
          <h3>Mailbox Settings</h3>
          <div class="bs-row"><span>Automatic Replies</span><b>Off</b></div>
          <div class="bs-row"><span>Rules and Alerts</span><b>No rules</b></div>
          <div class="bs-row"><span>Offline mode</span><b>${
            ctx.world.mail.canSendFrom(ctx.world.session.current().technicianId) ? "Online" : "Working offline"
          }</b></div>
        </div>`;
    }

    const PAGES = {
      open: ["Open & Export", "Import and export are disabled by mailbox policy. Nothing leaves this machine."],
      save: ["Save As", "This mock mailbox does not write .eml or .msg files to disk. Send the message or save a draft instead."],
      print: ["Print", "No printer is attached to this mailbox. The floor printer only knows how to jam."],
      options: ["Options", "Account, layout and offline settings live in Settings. Outlook keeps only the view state for this app."],
    };

    function simplePage(page) {
      const [title, text] = PAGES[page];
      return `<h2>${title}</h2><div class="bs-sub">File</div><div class="bs-card"><p>${text}</p></div>`;
    }

    function renderBackstage() {
      const page = backstagePage || "info";
      const nav = [
        ["info", "Info"],
        ["open", "Open & Export"],
        ["save", "Save As"],
        ["print", "Print"],
        ["options", "Options"],
      ];
      bsEl.innerHTML = `
        <aside class="bs-side">
          <button class="bs-back" data-bs-close title="Back to Outlook" aria-label="Back to Outlook">${glyph("chevron")}</button>
          <div class="bs-logo">Outlook</div>
          <nav class="bs-nav">
            ${nav.map(([id, label]) => `<button data-bs-page="${id}" class="${page === id ? "sel" : ""}">${label}</button>`).join("")}
            <div class="bs-sep"></div>
            <button data-bs-page="exit">Exit</button>
          </nav>
        </aside>
        <section class="bs-main">${page === "info" ? infoPage() : simplePage(page)}</section>`;
    }

    function openBackstage() {
      backstagePage = "info";
      bsEl.hidden = false;
      renderBackstage();
      renderRibbon();
    }

    function closeBackstage() {
      backstagePage = null;
      bsEl.hidden = true;
      bsEl.innerHTML = "";
      renderRibbon();
    }

    // ---------------------------------------------------------------------
    // commands
    // ---------------------------------------------------------------------

    function runCommand(cmd, button) {
      switch (cmd) {
        case "new":
          openComposer({ mode: "new" });
          break;
        case "delete":
          moveSelected("deleted");
          break;
        case "junk":
          moveSelected("junk");
          break;
        case "archive":
          moveSelected("archive");
          break;
        case "inbox":
          moveSelected("inbox");
          break;
        case "reply":
          respond("reply");
          break;
        case "replyAll":
          respond("replyAll");
          break;
        case "forward":
          respond("forward");
          break;
        case "unread":
          setSelectedRead(false);
          break;
        case "read":
          setSelectedRead(true);
          break;
        case "search":
          refs.search.focus();
          refs.search.select();
          break;
        case "sendAll":
          toast(composer.isOpen() ? "Use Send in the message window to send this one." : "Nothing is waiting in the Outbox.");
          break;
        case "update":
          paint();
          toast("All folders are up to date.");
          break;
        case "offline":
          toast(
            ctx.world.mail.canSendFrom(ctx.world.session.current().technicianId)
              ? "Outlook is online. Disconnect the adapter in Settings to work offline."
              : "This machine is offline. Reconnect the adapter in Settings before sending.",
          );
          break;
        case "newFolder":
        case "newSearch":
          toast("Custom folders are not part of this shell yet.");
          break;
        case "emptyFolder":
          toast("Permanent deletion is not enabled in this mock mailbox. Delete moves items to Deleted Items.");
          break;
        case "cleanUp":
          toast("Nothing to clean up in this folder.");
          break;
        case "readingPane":
          setUi({ readingPane: uiState().readingPane === false });
          break;
        case "folderPane":
          setUi({ folderPane: uiState().folderPane === false });
          break;
        case "preview":
          setUi({ preview: uiState().preview === false });
          break;
        case "resetView":
          setUi({ readingPane: true, folderPane: true, preview: true, sort: "date" });
          break;
        case "sort": {
          const rect = button.getBoundingClientRect();
          const sort = uiState().sort || "date";
          ctx.ui.menu(rect.left, rect.bottom + 4, [
            ["date", "Date"], ["from", "From"], ["subject", "Subject"], ["size", "Size"],
          ].map(([id, label]) => ({ label, checked: sort === id, onClick: () => setUi({ sort: id }) })));
          break;
        }
        default:
          break;
      }
    }

    // ---------------------------------------------------------------------
    // wiring
    // ---------------------------------------------------------------------

    refs.ribbon.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-tab]");
      if (tabButton) {
        const tab = tabButton.dataset.tab;
        if (tab === "file") {
          if (backstagePage) closeBackstage();
          else openBackstage();
        } else {
          if (backstagePage) closeBackstage();
          setUi({ tab });
        }
        return;
      }
      const commandButton = event.target.closest("[data-cmd]");
      if (commandButton) runCommand(commandButton.dataset.cmd, commandButton);
    });

    refs.folders.addEventListener("click", (event) => {
      const button = event.target.closest("[data-folder]");
      if (button) {
        refs.search.value = "";
        setUi({ folder: button.dataset.folder, selectedId: null, search: "" });
        return;
      }
      if (event.target.closest("[data-open-desk]")) {
        ctx.actions.setUi("ticketdesk", { selectedId: null });
        ctx.open("ticketdesk");
      }
    });

    refs.rows.addEventListener("click", (event) => {
      const row = event.target.closest("[data-message]");
      if (row) openMessage(row.dataset.message);
    });

    refs.search.addEventListener("input", () => {
      setUi({ search: refs.search.value });
    });
    refs.search.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && refs.search.value) {
        event.preventDefault();
        refs.search.value = "";
        setUi({ search: "" });
      }
    });

    refs.read.addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button) return;
      const action = button.dataset.act;
      if (action === "reply" || action === "replyAll" || action === "forward") {
        respond(action);
      } else if (action === "unread") {
        const message = selectedMessage();
        if (message) setSelectedRead(!message.read);
      } else if (action === "junk") {
        moveSelected("junk");
      } else if (action === "delete") {
        moveSelected("deleted");
      } else if (action === "ticket") {
        const message = selectedMessage();
        if (!message?.ticketId) return;
        ctx.actions.setUi("ticketdesk", { selectedId: message.ticketId });
        ctx.open("ticketdesk");
      }
    });

    bsEl.addEventListener("click", (event) => {
      if (event.target.closest("[data-bs-close]")) {
        closeBackstage();
        return;
      }
      const navButton = event.target.closest("[data-bs-page]");
      if (navButton) {
        if (navButton.dataset.bsPage === "exit") {
          ctx.window.close();
          return;
        }
        backstagePage = navButton.dataset.bsPage;
        renderBackstage();
        return;
      }
      if (event.target.closest("[data-props]")) {
        const message = backstageMessage();
        if (message) showMessageProperties(ctx, message);
      }
    });

    // The shell owns Escape for its flyouts; only close our own surfaces.
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (backstagePage) {
        event.preventDefault();
        event.stopPropagation();
        closeBackstage();
      }
    });

    // ---------------------------------------------------------------------
    // subscriptions + first paint
    // ---------------------------------------------------------------------

    const offEvents = ctx.events.on("*", () => paint());
    ctx.onDispose(offEvents);

    let lastClock = "";
    const offTick = ctx.clock.onTick(() => {
      const text = ctx.clock.timeText();
      if (text === lastClock) return;
      lastClock = text;
      if (refs.clock.isConnected) refs.clock.textContent = text;
    });
    ctx.onDispose(offTick);

    paint();
  },
};
