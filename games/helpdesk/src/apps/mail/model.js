// Read-only projections for the Lookout shell.
//
// The world owns the mailbox: `world.mail` rows, `world.tickets` for the support
// queue, and `world.people.gal()` for recipients. This module only derives what
// the three panes need — folders, unread counts, list columns, mock Internet
// headers — so the app never writes to the store outside the existing actions.

export const MAIL_DOMAIN = "halcyon.co";

export const FOLDERS = [
  { id: "inbox", label: "Inbox", glyph: "inbox" },
  { id: "drafts", label: "Drafts", glyph: "draft" },
  { id: "sent", label: "Sent Items", glyph: "sent" },
  { id: "deleted", label: "Deleted Items", glyph: "delete" },
  { id: "junk", label: "Junk Email", glyph: "junk" },
  { id: "archive", label: "Archive", glyph: "archive" },
];

// The support queue is the existing ticket/mail integration. It is a custom
// Lookout folder, kept separate from the six standard ones so the game's mail
// data still has an obvious home.
export const SUPPORT_FOLDER = { id: "support", label: "Support Queue", glyph: "support", custom: true };

export const FOLDER_IDS = [...FOLDERS.map((folder) => folder.id), SUPPORT_FOLDER.id];

export const folderLabel = (id) =>
  [...FOLDERS, SUPPORT_FOLDER].find((folder) => folder.id === id)?.label || "Inbox";

const minutes = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};

const domainOf = (address) => String(address || "").split("@").pop().toLowerCase();

export const isExternal = (address) => domainOf(address) !== MAIL_DOMAIN;

export function effectiveFolder(mail, moved = {}) {
  return moved[mail.id] || mail.folder || "inbox";
}

export function effectiveRead(mail, unread = {}) {
  return unread[mail.id] ? false : Boolean(mail.read);
}

export function personText(person) {
  if (!person) return "";
  return `${person.displayName} <${person.email}>`;
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function messageBytes(mail, attachments = []) {
  const body = (mail.lines || []).join("\n");
  return 2048 + (String(mail.subject || "").length + body.length) * 3 + attachments.reduce((sum, item) => sum + (item.bytes || 0), 0);
}

function decodeMail(ctx, mail, ui) {
  const tech = ctx.world.session.current().technician;
  const details = (ui.sentDetails || {})[mail.id] || null;
  const attachments = details?.attachments || [];
  const bytes = messageBytes(mail, attachments);
  const recipient = mail.toPersonId ? ctx.world.people.get(mail.toPersonId) : null;

  return {
    id: mail.id,
    raw: mail,
    storeFolder: mail.folder,
    folder: effectiveFolder(mail, ui.moved),
    from: mail.from,
    fromAddress: mail.fromAddress,
    subject: mail.subject,
    lines: mail.lines || [],
    personId: mail.personId,
    ticketId: mail.ticketId,
    briefing: Boolean(mail.briefing),
    day: mail.day,
    when: mail.receivedAt || "",
    size: formatBytes(bytes),
    bytes,
    baseRead: Boolean(mail.read),
    read: effectiveRead(mail, ui.unread),
    attachments,
    sent: mail.folder === "sent",
    toText: details?.to || personText(recipient) || personText(tech),
    ccText: details?.cc || "",
    draft: false,
  };
}

export function decodeDraft(ctx, draft) {
  const tech = ctx.world.session.current().technician;
  const lines = draft.body ? draft.body.split(/\r?\n/) : [];
  const bytes = messageBytes({ subject: draft.subject, lines }, draft.attachments || []);
  return {
    id: draft.id,
    raw: null,
    storeFolder: "drafts",
    folder: "drafts",
    from: tech?.displayName || "You",
    fromAddress: tech?.email || "",
    subject: draft.subject || "(No subject)",
    lines,
    personId: tech?.id || null,
    ticketId: null,
    briefing: false,
    day: null,
    when: draft.savedAt || "",
    size: formatBytes(bytes),
    bytes,
    baseRead: true,
    read: true,
    attachments: draft.attachments || [],
    sent: false,
    toText: draft.to || "(No recipients yet)",
    ccText: draft.cc || "",
    draft: true,
  };
}

/** Messages in one folder, already shaped for the list and reading pane. */
export function folderMessages(ctx, ui, folder, drafts = []) {
  const day = ctx.world.session.day();
  const moved = ui.moved || {};
  let list;

  if (folder === "drafts") {
    list = drafts.map((draft) => decodeDraft(ctx, draft));
  } else if (folder === "inbox") {
    list = ctx.world.mail
      .inbox(day)
      .filter((mail) => effectiveFolder(mail, moved) === "inbox")
      .map((mail) => decodeMail(ctx, mail, ui));
  } else if (folder === "support") {
    list = ctx.world.tickets
      .forDay(day)
      .map((ticket) => ctx.world.mail.get(ticket.mailId))
      .filter(Boolean)
      .filter((mail) => effectiveFolder(mail, moved) === "support")
      .map((mail) => decodeMail(ctx, mail, ui));
  } else {
    list = ctx.world.mail
      .all()
      .filter((mail) => effectiveFolder(mail, moved) === folder)
      .map((mail) => decodeMail(ctx, mail, ui));
  }

  // The inbox keeps the world's order (briefing first); the other folders read
  // newest first, the way Lookout shows Sent and Deleted Items.
  if (!["inbox", "support", "drafts"].includes(folder)) {
    list.sort((a, b) => minutes(b.when) - minutes(a.when) || String(b.id).localeCompare(String(a.id)));
  }
  return list;
}

export function folderSummary(ctx, ui, folder, drafts = []) {
  const list = folderMessages(ctx, ui, folder, drafts);
  return { count: list.length, unread: list.filter((message) => !message.read).length };
}

export function searchMessages(list, query) {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return list;
  return list.filter((message) =>
    `${message.from} ${message.fromAddress} ${message.subject}`.toLowerCase().includes(term),
  );
}

export function sortMessages(list, sort) {
  const copy = [...list];
  if (sort === "from") return copy.sort((a, b) => a.from.localeCompare(b.from) || a.subject.localeCompare(b.subject));
  if (sort === "subject") return copy.sort((a, b) => a.subject.localeCompare(b.subject));
  if (sort === "size") return copy.sort((a, b) => b.bytes - a.bytes);
  return copy;
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function quoteMessage(ctx, message) {
  const tech = ctx.world.session.current().technician;
  const lines = [
    "",
    "",
    "-----Original Message-----",
    `From: ${message.from} <${message.fromAddress}>`,
    `Sent: ${message.when || "today"}`,
    `To: ${message.toText || personText(tech)}`,
    `Subject: ${message.subject}`,
    "",
    ...(message.lines.length ? message.lines : [""]),
  ];
  return lines.join("\n");
}

/** The address a reply will actually go to. */
function replyAddress(mail, fromAddress) {
  if (mail.replyTo && mail.replyTo.toLowerCase() !== String(fromAddress).toLowerCase()) return mail.replyTo;
  if (isExternal(fromAddress)) {
    // An outside sender whose Reply-To equals From is the seeded impersonation
    // case. Give it a distinct reply target so File > Properties has something
    // worth reading, without changing the seeded world.
    const [local, domain] = String(fromAddress).split("@");
    return `${local}+reply@${domain}`;
  }
  return fromAddress;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function headerDate(day, time) {
  const base = new Date(Date.UTC(2026, 10, 9));
  base.setUTCDate(base.getUTCDate() + Math.max(0, Number(day || 1) - 1));
  const [hour, minute] = String(time || "09:00").split(":").map(Number);
  const pad = (value) => String(Number.isFinite(value) ? value : 0).padStart(2, "0");
  return `${WEEKDAYS[base.getUTCDay()]}, ${base.getUTCDate()} ${MONTHS[base.getUTCMonth()]} ${base.getUTCFullYear()} ${pad(hour)}:${pad(minute)}:00 +0000`;
}

export function internetHeaders(ctx, message) {
  const mail = message.raw || {};
  const tech = ctx.world.session.current().technician;
  const fromAddress = mail.fromAddress || message.fromAddress || "unknown@halcyon.co";
  const returnPath = mail.returnPath || "bounce@halcyon.co";
  const replyTo = replyAddress(mail, fromAddress);
  const day = mail.day ?? ctx.world.session.day();
  const date = headerDate(day, message.when);
  const external = isExternal(fromAddress);
  const senderDomain = domainOf(fromAddress);

  const received = external
    ? `from smtp.${senderDomain} (mail-relay.${senderDomain} [203.0.113.44])
 by mx1.${MAIL_DOMAIN} (10.20.4.11) with ESMTPS id 4F2A9C1B;
 ${date}`
    : `from mx1.${MAIL_DOMAIN} (10.20.4.11)
 by EXCH-01.${MAIL_DOMAIN} (10.20.4.20) with Halcyon SMTP (version=TLS1_2) id 15.20.7;
 ${date}`;

  const lines = [
    `Return-Path: <${returnPath}>`,
    `Received: ${received}`,
    `From: "${message.from}" <${fromAddress}>`,
    `Reply-To: "${message.from}" <${replyTo}>`,
    `To: "${tech?.displayName || "Morgan Hayes"}" <${tech?.email || "m.hayes@halcyon.co"}>`,
    `Subject: ${message.subject}`,
    `Date: ${date}`,
    `Message-ID: <${message.id}@mail.${MAIL_DOMAIN}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "X-Mailer: Lookout 16.0",
  ];
  if (external) {
    lines.push(`Authentication-Results: mx1.${MAIL_DOMAIN}; spf=softfail smtp.mailfrom=${senderDomain}`);
  }

  return { text: lines.join("\n"), fromAddress, replyTo, returnPath, external };
}

/** The mismatches the Properties dialog calls out. */
export function headerWarnings(ctx, message) {
  const mail = message.raw || {};
  const fromAddress = mail.fromAddress || message.fromAddress || "";
  const replyTo = replyAddress(mail, fromAddress);
  const warnings = [];

  if (isExternal(fromAddress)) warnings.push(`The sender address is outside ${MAIL_DOMAIN}.`);
  if (replyTo.toLowerCase() !== String(fromAddress).toLowerCase()) {
    warnings.push("Reply-To does not match From. A reply goes to a different address.");
  }
  const person = message.personId ? ctx.world.people.get(message.personId) : null;
  if (person && person.email.toLowerCase() !== String(fromAddress).toLowerCase()) {
    warnings.push(
      `The display name matches ${person.displayName} in the directory, but ${fromAddress} is not their address.`,
    );
  }
  return warnings;
}
