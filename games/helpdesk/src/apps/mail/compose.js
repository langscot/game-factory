// The compose panel. Classic mail clients open a separate window for a message;
// inside one game window the honest equivalent is a modal-ish panel with its
// own title bar and mini ribbon. Drafts are app-local (the world has no drafts
// table), but sending goes through the real `sendMail` action, so sent mail
// lands in Sent Items for every app to see.

import { GLYPH } from "./glyphs.js";
import { formatBytes, quoteMessage } from "./model.js";

const ATTACHMENTS = [
  { name: "Printer queue.txt", bytes: 3 * 1024 },
  { name: "Policy 6 - purchases.pdf", bytes: 182 * 1024 },
  { name: "Visitor badge form.docx", bytes: 24 * 1024 },
  { name: "Floor 2 photo.jpg", bytes: 640 * 1024 },
];

const REPLY_ALL_CC = "IT Service Desk <it-service-desk@halcyon.co>";

const SEND_ERRORS = {
  "no-network": "You are working offline. Reconnect the adapter in Settings, then send again.",
  "recipient-disabled": "That mailbox is disabled, so Halcyon Post will not deliver to it.",
  "unknown-recipient": "That recipient is not in the directory.",
  "unknown-sender": "The signed-in mailbox is missing, so Lookout cannot send.",
};

const prefix = (subject, tag) => {
  const plain = tag.replace(":", "");
  return new RegExp(`^${plain}:`, "i").test(subject) ? subject : `${tag} ${subject}`;
};

let nextDraft = 1;

export function createComposer(host, ctx, handlers) {
  const galId = `mail-gal-${nextDraft++}`;
  const el = ctx.ui.el(`
    <div class="cmp" hidden>
      <div class="cmp-bar">
        <span class="ico">${GLYPH.newMail}</span>
        <b data-cmp-title>Message (HTML)</b>
        <div class="cmp-caps">
          <button data-cmp-close title="Close" aria-label="Close message"><span class="ico">${GLYPH.close}</span></button>
        </div>
      </div>
      <div class="cmp-ribbon">
        <button class="cmp-btn primary" data-cmp-send><span class="ico">${GLYPH.send}</span><span>Send</span></button>
        <button class="cmp-btn" data-cmp-attach><span class="ico">${GLYPH.attach}</span><span>Attach File</span></button>
        <button class="cmp-btn" data-cmp-save><span class="ico">${GLYPH.save}</span><span>Save</span></button>
        <button class="cmp-btn" data-cmp-discard><span class="ico">${GLYPH.delete}</span><span>Discard</span></button>
      </div>
      <div class="cmp-fields">
        <div class="cmp-field"><label>To</label><input data-cmp-to list="${galId}" autocomplete="off" aria-label="To"></div>
        <div class="cmp-field"><label>Cc</label><input data-cmp-cc autocomplete="off" aria-label="Cc"></div>
        <div class="cmp-field"><label>Subject</label><input data-cmp-subject autocomplete="off" aria-label="Subject"></div>
      </div>
      <textarea class="cmp-body" data-cmp-body spellcheck="false" aria-label="Message body"></textarea>
      <div class="cmp-attach" data-cmp-attachments></div>
      <div class="cmp-status" data-cmp-status></div>
      <datalist id="${galId}" data-cmp-gal></datalist>
    </div>`);
  host.append(el);

  const refs = {
    title: el.querySelector("[data-cmp-title]"),
    to: el.querySelector("[data-cmp-to]"),
    cc: el.querySelector("[data-cmp-cc]"),
    subject: el.querySelector("[data-cmp-subject]"),
    body: el.querySelector("[data-cmp-body]"),
    attachments: el.querySelector("[data-cmp-attachments]"),
    status: el.querySelector("[data-cmp-status]"),
    gal: el.querySelector("[data-cmp-gal]"),
  };

  let state = null;

  function setStatus(text) {
    refs.status.textContent = text || "";
  }

  function renderAttachments() {
    refs.attachments.innerHTML = state
      ? state.attachments
          .map(
            (file, index) => `<span class="chip"><span class="ico">${GLYPH.attach}</span><span class="chip-name">${ctx.ui.esc(file.name)}</span>
              <small>${formatBytes(file.bytes)}</small>
              <button data-remove-attach="${index}" title="Remove attachment" aria-label="Remove ${ctx.ui.esc(file.name)}"><span class="ico">${GLYPH.close}</span></button></span>`,
          )
          .join("")
      : "";
  }

  function rebuildGal() {
    refs.gal.innerHTML = ctx.world.people
      .gal()
      .map(
        (person) =>
          `<option value="${ctx.ui.esc(person.email)}" label="${ctx.ui.esc(person.displayName)}${
            person.department ? ` — ${ctx.ui.esc(person.department)}` : ""
          }"></option>`,
      )
      .join("");
  }

  const isOpen = () => !el.hidden;

  function close() {
    el.hidden = true;
    state = null;
    setStatus("");
  }

  function resolveRecipient(raw) {
    const text = String(raw || "").trim().toLowerCase();
    if (!text) return null;
    const gal = ctx.world.people.gal();
    const addresses = String(raw).match(/[\w.+-]+@[\w.-]+/g) || [];

    // A typed or prefilled address wins over the display name: an impersonation
    // message uses Alice's name with a Gmail address, and a reply must not be
    // silently redirected to the internal mailbox.
    if (addresses.length) {
      return gal.find((person) => addresses.some((address) => address.toLowerCase() === person.email.toLowerCase())) || null;
    }
    return (
      gal.find((person) => person.email.toLowerCase() === text || person.displayName.toLowerCase() === text) ||
      gal.find((person) => text.includes(person.displayName.toLowerCase())) ||
      null
    );
  }

  function send() {
    if (!state) return;
    const toRaw = refs.to.value.trim();
    const ccRaw = refs.cc.value.trim();
    const subject = refs.subject.value.trim();
    if (!toRaw) {
      setStatus("Enter at least one recipient in To.");
      refs.to.focus();
      return;
    }
    const recipient = resolveRecipient(toRaw);
    if (!recipient && !toRaw.includes("@")) {
      setStatus("That name is not in the address book. Pick a suggestion or type an address.");
      refs.to.focus();
      return;
    }

    const body = refs.body.value;
    const lines = body.length ? body.split(/\r?\n/) : [""];
    const result = ctx.actions.sendMail({
      fromPersonId: ctx.world.session.current().technicianId,
      toPersonId: recipient?.id || null,
      subject: subject || "(no subject)",
      lines,
    });

    if (!result.ok) {
      setStatus(SEND_ERRORS[result.reason] || `Lookout could not send this message (${result.reason}).`);
      return;
    }

    const details = {
      mail: result.mail,
      to: recipient ? `${recipient.displayName} <${recipient.email}>` : toRaw,
      cc: ccRaw,
      attachments: state.attachments.slice(),
    };
    close();
    handlers.onSent(details);
  }

  function saveDraft() {
    if (!state) return;
    const draft = {
      id: state.draftId || `mail_draft_${nextDraft++}`,
      to: refs.to.value.trim(),
      cc: refs.cc.value.trim(),
      subject: refs.subject.value.trim(),
      body: refs.body.value,
      attachments: state.attachments.slice(),
      savedAt: ctx.clock.timeText(),
    };
    close();
    handlers.onDraft(draft);
  }

  function requestClose() {
    if (!state) return;
    const dirty =
      refs.to.value.trim() ||
      refs.cc.value.trim() ||
      refs.subject.value.trim() ||
      refs.body.value.trim() ||
      state.attachments.length;
    if (!dirty) {
      close();
      return;
    }
    ctx.ui
      .confirm("Lookout", "Discard this message? Choose Cancel to keep editing.", {
        ok: "Discard",
        cancel: "Keep editing",
      })
      .then((yes) => {
        if (yes) close();
      });
  }

  function open({ mode = "new", message = null, draft = null }) {
    state = {
      mode,
      message,
      draftId: draft?.id || null,
      attachments: draft ? [...(draft.attachments || [])] : [],
    };

    let to = "";
    let cc = "";
    let subject = "";
    let body = "";

    if (draft) {
      to = draft.to || "";
      cc = draft.cc || "";
      subject = draft.subject || "";
      body = draft.body || "";
    } else if (message) {
      const quote = quoteMessage(ctx, message);
      if (mode === "reply" || mode === "replyAll") {
        to = `${message.from} <${message.fromAddress}>`;
        subject = prefix(message.subject, "RE:");
        body = quote;
        if (mode === "replyAll") cc = REPLY_ALL_CC;
      } else if (mode === "forward") {
        subject = prefix(message.subject, "FW:");
        body = quote;
      }
    }

    refs.to.value = to;
    refs.cc.value = cc;
    refs.subject.value = subject;
    refs.body.value = body;
    refs.title.textContent = draft ? `Draft - ${subject || "Untitled"} - Message (HTML)` : `${subject || "Untitled"} - Message (HTML)`;
    setStatus("");
    rebuildGal();
    renderAttachments();
    el.hidden = false;

    if (mode === "new" || draft) {
      refs.to.focus();
    } else {
      refs.body.focus();
      refs.body.setSelectionRange(0, 0);
    }
  }

  refs.attachments.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-attach]");
    if (!button || !state) return;
    state.attachments.splice(Number(button.dataset.removeAttach), 1);
    renderAttachments();
  });

  el.querySelector("[data-cmp-send]").addEventListener("click", send);
  el.querySelector("[data-cmp-save]").addEventListener("click", saveDraft);
  el.querySelector("[data-cmp-discard]").addEventListener("click", close);
  el.querySelector("[data-cmp-close]").addEventListener("click", requestClose);
  el.querySelector("[data-cmp-attach]").addEventListener("click", (event) => {
    if (!state) return;
    const rect = event.currentTarget.getBoundingClientRect();
    ctx.ui.menu(
      rect.left,
      rect.bottom + 4,
      ATTACHMENTS.map((file) => ({
        label: `${file.name} (${formatBytes(file.bytes)})`,
        disabled: state.attachments.some((item) => item.name === file.name),
        onClick: () => {
          state.attachments.push({ ...file });
          renderAttachments();
        },
      })),
    );
  });

  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      send();
    }
  });

  return { open, close, isOpen };
}
