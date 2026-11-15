// servicedesk.halcyon.co — Jank Cloud, the Service Desk's issue tracker.
//
// This is where tickets are worked now that the native Ticket Desk is gone.
// It reads the shared world through the browser's site platform and calls the
// same ticket actions as every other app: the queue, the watcher and the
// closure scoring are the platform's, not this page's.
//
// The open case still lives in session.ui.ticketdesk because the watcher reads
// that slot when it decides whether a wrong-target finding belongs to the case
// the technician is looking at.

import { COMPANY, DESK, MAIL_DOMAIN } from "../company.js";

const HOST = "servicedesk.halcyon.co";
const CASE_UI = "ticketdesk";
const SITE_UI = "servicedesk";

const REPLY_TEMPLATES = [
  ["deny", "Deny — not eligible"],
  ["approve", "Approve — actioned"],
  ["info", "Need more information"],
];

const CLOSE_CATEGORIES = [
  ["resolved", "Resolved"],
  ["returned", "Returned to user"],
  ["escalated", "Escalated"],
  ["duplicate", "Duplicate"],
  ["unable", "Unable to fix"],
];

const CLOSE_ERRORS = {
  "note-too-short": "The closing note must be at least 10 characters.",
  "objectives-incomplete": "Resolved is only available when every checklist item is done.",
  "escalation-required": "Escalate the issue before closing it as Escalated.",
  "already-closed": "This issue is already closed.",
  "unknown-category": "Choose a closing category.",
};

const REPLY_ERRORS = {
  "ticket-resolved": "This issue is already closed.",
  "unknown-reply-template": "Choose a response template.",
  "no-network": "The network is down. The reply was not sent.",
  "recipient-disabled": "The reporter's mailbox is disabled.",
  "unknown-ticket": "This issue could not be found.",
};

const ESCALATION_ERRORS = {
  "already-escalated": "That team already has this issue.",
  "unknown-team": "Choose a team.",
  "ticket-resolved": "This issue is already closed.",
};

const REASON_LABELS = {
  "wrong-target": "Wrong target",
  "over-permission": "Over-permission",
  "wrong-action": "Wrong action",
  "wrong-team": "Wrong team",
  "wrong-reply": "Wrong reply",
  "broader-role": "Broader role",
  "unapproved-install": "Unapproved install",
  "unnecessary-escalation": "Unnecessary escalation",
  "wrong-closure": "Wrong closure",
};

const STATUS = {
  open: ["Open", "sd-open"],
  progress: ["In Progress", "sd-progress"],
  waiting: ["Waiting on User", "sd-waiting"],
  escalated: ["Escalated", "sd-escalated"],
  resolved: ["Resolved", "sd-resolved"],
};

const STATUS_RANK = { open: 0, progress: 1, waiting: 2, escalated: 3, resolved: 4 };
const STATUS_FILTERS = ["open", "progress", "waiting", "escalated", "resolved"];

const PRIORITY_RANK = { Highest: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_GLYPH = { Highest: "↑↑", High: "↑", Medium: "", Low: "↓" };
const PRIORITY_CLASS = {
  Highest: "sd-p-highest",
  High: "sd-p-high",
  Medium: "sd-p-medium",
  Low: "sd-p-low",
};

// Decoration only: priority is not a ticket field and never changes a score.
const PRIORITY_BY_RULE = { 1: "High", 2: "Medium", 3: "Low", 4: "High", 5: "Medium", 6: "Highest", 7: "Low" };

const SORT_LABELS = {
  key: "Key",
  summary: "Summary",
  reporter: "Reporter",
  priority: "Priority",
  status: "Status",
  updated: "Updated",
};

const DEFAULT_VIEW = { status: "any", q: "", sort: "updated", dir: "desc" };

const instances = new WeakMap();

const keyFor = (ticket) => `SD-${ticket.id}`;
const categoryLabel = (category) => CLOSE_CATEGORIES.find(([value]) => value === category)?.[1] || category;
const templateLabel = (template) => REPLY_TEMPLATES.find(([value]) => value === template)?.[1] || template;

function priorityFor(ticket) {
  return PRIORITY_BY_RULE[ticket.ruleId] || "Medium";
}

/** The newest stamp on the case. The seed has no "updated" field of its own. */
function latestAt(ticket) {
  const stamps = [
    ticket.closure?.at,
    ...(ticket.evidence || []).map((entry) => entry.at),
    ...(ticket.wrongActions || []).map((entry) => entry.at),
    ...(ticket.replies || []).map((entry) => entry.at),
    ...(ticket.escalations || []).map((entry) => entry.at),
  ].filter(Boolean);
  stamps.sort();
  return stamps[stamps.length - 1] || "09:00";
}

function statusFor(ticket) {
  if (ticket.status === "resolved") return "resolved";
  if (ticket.readyToClose) return "progress";
  if (ticket.replies.length) return "waiting";
  if (ticket.escalations.length) return "escalated";
  if (ticket.evidence.length || ticket.wrongActions.length) return "progress";
  return "open";
}

function pairs(value) {
  const entries = Object.entries(value || {});
  if (!entries.length) return "(none)";
  return entries
    .map(([key, item]) => {
      const shown = Array.isArray(item) ? (item.length ? item.join(", ") : "(none)") : item === undefined || item === null ? "(none)" : item;
      return `${key}: ${shown}`;
    })
    .join(" · ");
}

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

export default {
  id: "servicedesk",
  title: "Service Desk",
  host: HOST,
  description: "Tickets, requests and the IT knowledge base",

  mount(content, platform) {
    const { ctx } = platform;
    const world = ctx.world;
    const esc = ctx.ui.esc;
    const technicians = world.session.technician();
    const techName = technicians?.displayName || "Morgan Hayes";
    const techLogon = technicians?.logonName || "m.hayes";
    const toast = (body, icon = "browser") => ctx.ui.toast("Service Desk", body, icon);

    platform.style(css);

    const view = readView();
    const offs = [];
    let alive = true;
    let listPage = false;

    function actorName(actorId) {
      return world.people.get(actorId)?.displayName || actorId || "System";
    }

    function readView() {
      const saved = world.session.ui(SITE_UI) || {};
      const sameDay = saved.day === world.session.day();
      return {
        status:
          sameDay && (saved.status === "any" || STATUS_FILTERS.includes(saved.status))
            ? saved.status
            : DEFAULT_VIEW.status,
        q: sameDay && typeof saved.q === "string" ? saved.q : "",
        sort: Object.hasOwn(SORT_LABELS, saved.sort) ? saved.sort : DEFAULT_VIEW.sort,
        dir: saved.dir === "asc" ? "asc" : "desc",
        day: world.session.day(),
      };
    }

    function persistView() {
      ctx.actions.setUi(SITE_UI, {
        status: view.status,
        q: view.q,
        sort: view.sort,
        dir: view.dir,
        day: world.session.day(),
      });
    }

    // ------------------------------------------------------------------ chrome

    function brandMarkup() {
      return `
        <header class="sd-top">
          <div class="sd-brand">
            <span class="sd-logo" aria-hidden="true">J</span>
            <span class="sd-word">JANK</span>
            <span class="sd-product">${esc(DESK)}</span>
          </div>
          <div class="sd-topright">
            <button class="sd-toplink" data-say="No applications are installed for this project.">Apps</button>
            <span class="sd-topuser">${esc(techName)}</span>
            <span class="sd-avatar" title="HALCYON\\${esc(techLogon)}">${esc(initials(techName))}</span>
          </div>
        </header>
        <div class="sd-notice">
          <b>Notice</b>
          <span>Classic projects will stop receiving updates on 31 December. Some filters and gadgets may not load.</span>
          <button class="sd-link" data-say="The help centre is not available from this project.">Learn more</button>
        </div>`;
    }

    function sideMarkup(currentTicket) {
      const day = world.session.day();
      const today = world.tickets.forDay(day);
      const open = today.filter((ticket) => ticket.status === "open").length;
      const resolved = today.length - open;
      const state = world.session.overview().state;
      const stateText = state === "briefing" ? "Shift not started" : state === "running" ? "Shift running" : "Shift ended";

      const nav = [
        ["Summary", "The project summary is not available on this page."],
        ["Boards", "This project does not have a board."],
        ["Reports", "Report gadgets are not available in classic projects."],
        ["Components", "This project has no components."],
        ["Releases", "This project has no releases."],
      ];

      return `
        <aside class="sd-side">
          <div class="sd-side-title">
            <span class="sd-projavatar" aria-hidden="true">SD</span>
            <div>
              <b>Service Desk</b>
              <span>Service management</span>
            </div>
          </div>
          <nav class="sd-nav" aria-label="Project">
            ${nav
              .map(
                ([label, message]) => `<button data-say="${esc(message)}">${esc(label)}</button>`,
              )
              .join("")}
            <button class="is-active" data-go-home>Issues <span>${open}</span></button>
          </nav>
          <div class="sd-side-h">Filters</div>
          <button class="sd-side-link" data-quick="open">My open issues <span data-quick-count="open">${open}</span></button>
          <button class="sd-side-link" data-quick="resolved">Resolved today <span data-quick-count="resolved">${resolved}</span></button>
          <div class="sd-side-h">Queue</div>
          <div class="sd-side-note" data-side-queue>Day ${day} · ${stateText}<br>${open} open · ${resolved} resolved today</div>
          ${currentTicket ? `<div class="sd-side-h">Current issue</div><div class="sd-side-current">${esc(keyFor(currentTicket))}</div>` : ""}
        </aside>`;
    }

    function shiftMarkup() {
      const overview = world.session.overview();
      const open = world.tickets.openForDay(overview.day).length;
      const state = overview.state;
      const label = state === "briefing" ? "Shift not started" : state === "running" ? "Shift running" : "Shift ended";
      const fraction = overview.total ? overview.answered / overview.total : 1;
      const actions = [];
      if (state === "briefing") actions.push(`<button class="sd-btn sd-primary" data-start-shift>Start shift</button>`);
      if (state === "running" && open === 0 && overview.missed === 0) {
        actions.push(`<button class="sd-btn" data-end-shift>End shift</button>`);
      }

      return `
        <div class="sd-shift" data-shift>
          <span class="sd-shift-day">Day ${overview.day}</span>
          <span class="sd-shift-clock" data-sd-clock>${esc(ctx.clock.timeText())}</span>
          <span class="sd-shift-state sd-${esc(state)}">${esc(label)}</span>
          <span class="sd-shift-count">${overview.answered} of ${overview.total} answered</span>
          <span class="sd-shift-bar" aria-hidden="true"><i style="width:${Math.round(fraction * 100)}%"></i></span>
          <span class="sd-shift-actions">${actions.join("")}</span>
        </div>`;
    }

    function footerMarkup() {
      return `
        <footer class="sd-foot">
          <span>${esc(COMPANY)} · ${esc(DESK)} · service.desk@${esc(MAIL_DOMAIN)}</span>
          <span>Jank Cloud 2026.1 · ${esc(HOST)}</span>
        </footer>`;
    }

    function pageMarkup({ crumbs, body, currentTicket }) {
      return `
        <div class="sd">
          ${brandMarkup()}
          <div class="sd-shell">
            ${sideMarkup(currentTicket)}
            <main class="sd-main">
              <div class="sd-crumbs">${crumbs}</div>
              ${shiftMarkup()}
              ${body}
            </main>
          </div>
          ${footerMarkup()}
        </div>`;
    }

    function homeCrumbs() {
      return `
        <button data-go-home>Projects</button><i>/</i>
        <button data-go-home>Service Desk</button><i>/</i>
        <span>Issues</span>`;
    }

    function issueCrumbs(ticket) {
      return `
        <button data-go-home>Projects</button><i>/</i>
        <button data-go-home>Service Desk</button><i>/</i>
        <button data-go-home>Issues</button><i>/</i>
        <span>${esc(keyFor(ticket))}</span>`;
    }

    // ------------------------------------------------------------------- queue

    function listBody() {
      const statusOptions = [["any", "Any"], ...STATUS_FILTERS.map((id) => [id, STATUS[id][0]])]
        .map(
          ([value, label]) => `<option value="${esc(value)}"${view.status === value ? " selected" : ""}>${esc(label)}</option>`,
        )
        .join("");

      return `
        <div class="sd-pagehead">
          <h1>Issues</h1>
          <div class="sd-pagehead-actions">
            <button class="sd-btn" data-say="This view has been shared with the project.">Share</button>
            <button class="sd-btn" data-say="The export has been queued and will arrive by email.">Export</button>
          </div>
        </div>

        <div class="sd-filterbar">
          <label>Status
            <select data-filter-status>${statusOptions}</select>
          </label>
          <label class="sd-filter-search">Contains text
            <input data-filter-q type="text" value="${esc(view.q)}" placeholder="Key, summary or reporter"
              autocomplete="off" spellcheck="false">
          </label>
          <button class="sd-btn" data-apply>Apply</button>
          <button class="sd-link" data-clear>Clear</button>
          <button class="sd-link" data-say="JQL search is not available in this project.">Advanced</button>
        </div>
        <div class="sd-jql"><b>JQL</b><span data-jql-text></span></div>
        <div class="sd-tablewrap" data-table></div>
        <div class="sd-tablefoot">
          <span data-count></span>
          <span>25 per page · Page 1 of 1</span>
        </div>`;
    }

    function decorate(ticket) {
      const status = statusFor(ticket);
      return {
        ticket,
        key: keyFor(ticket),
        priority: priorityFor(ticket),
        status,
        statusLabel: STATUS[status][0],
        statusClass: STATUS[status][1],
        updated: latestAt(ticket),
      };
    }

    function queueRows() {
      const day = world.session.day();
      const needle = view.q.trim().toLowerCase();
      const rows = world.tickets
        .forDay(day)
        .map((ticket) => world.tickets.view(ticket.id))
        .filter(Boolean)
        .map(decorate)
        .filter((row) => view.status === "any" || row.status === view.status)
        .filter((row) => !needle || `${row.key} ${row.ticket.subject} ${row.ticket.from}`.toLowerCase().includes(needle));

      const direction = view.dir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        let compare = 0;
        switch (view.sort) {
          case "key":
            compare = a.ticket.id - b.ticket.id;
            break;
          case "summary":
            compare = a.ticket.subject.localeCompare(b.ticket.subject);
            break;
          case "reporter":
            compare = a.ticket.from.localeCompare(b.ticket.from);
            break;
          case "priority":
            compare = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            break;
          case "status":
            compare = STATUS_RANK[a.status] - STATUS_RANK[b.status];
            break;
          default:
            compare = a.updated.localeCompare(b.updated);
        }
        // Ties stay in key order whichever way the column is pointing.
        if (compare === 0) return a.ticket.id - b.ticket.id;
        return compare * direction;
      });

      return rows;
    }

    function tableMarkup(rows) {
      const columns = ["key", "summary", "reporter", "priority", "status", "updated"];
      const head = columns
        .map((column) => {
          const sorted = view.sort === column;
          const mark = sorted ? (view.dir === "asc" ? " ▲" : " ▼") : "";
          return `<th aria-sort="${sorted ? (view.dir === "asc" ? "ascending" : "descending") : "none"}">
            <button data-sort="${column}" class="${sorted ? "is-sorted" : ""}">${SORT_LABELS[column]}${mark}</button>
          </th>`;
        })
        .join("");

      const body = rows.length
        ? rows
            .map(
              (row) => `
              <tr data-issue="${row.ticket.id}" tabindex="0">
                <td class="sd-key">${esc(row.key)}</td>
                <td class="sd-col-summary" title="${esc(row.ticket.subject)}">${esc(row.ticket.subject)}</td>
                <td class="sd-col-reporter" title="${esc(row.ticket.from)}">${esc(row.ticket.from)}</td>
                <td class="sd-pri ${PRIORITY_CLASS[row.priority]}">
                  ${PRIORITY_GLYPH[row.priority] ? `<span class="sd-pri-glyph">${PRIORITY_GLYPH[row.priority]}</span> ` : ""}${esc(row.priority)}
                </td>
                <td><span class="sd-pill ${row.statusClass}">${esc(row.statusLabel)}</span></td>
                <td class="sd-updated">${esc(row.updated)}</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="6" class="sd-noresults">No issues match this filter.</td></tr>`;

      return `
        <table class="sd-table">
          <colgroup>
            <col style="width:66px"><col><col style="width:118px"><col style="width:82px"><col style="width:112px"><col style="width:56px">
          </colgroup>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>`;
    }

    function refreshList() {
      if (!alive) return;
      const table = content.querySelector("[data-table]");
      if (!table) return;

      const day = world.session.day();
      const all = world.tickets.forDay(day);
      const rows = queueRows();
      table.innerHTML = tableMarkup(rows);

      for (const button of table.querySelectorAll("[data-sort]")) {
        button.addEventListener("click", () => {
          const key = button.dataset.sort;
          if (view.sort === key) view.dir = view.dir === "asc" ? "desc" : "asc";
          else {
            view.sort = key;
            view.dir = key === "updated" ? "desc" : "asc";
          }
          persistView();
          refreshList();
        });
      }

      for (const row of table.querySelectorAll("[data-issue]")) {
        const open = () => platform.navigate(`${HOST}/browse/SD-${row.dataset.issue}`);
        row.addEventListener("click", open);
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        });
      }

      const count = content.querySelector("[data-count]");
      if (count) count.textContent = `Showing ${rows.length} of ${all.length} issue${all.length === 1 ? "" : "s"}`;

      const jql = content.querySelector("[data-jql-text]");
      if (jql) {
        const status = view.status === "any" ? "" : ` AND status = "${STATUS[view.status][0]}"`;
        const text = view.q ? ` AND text ~ "${view.q}"` : "";
        jql.textContent = `project = SD${status}${text} ORDER BY ${SORT_LABELS[view.sort]} ${view.dir.toUpperCase()}`;
      }

      const openCount = content.querySelector('[data-quick-count="open"]');
      const resolvedCount = content.querySelector('[data-quick-count="resolved"]');
      if (openCount) openCount.textContent = String(all.filter((ticket) => ticket.status === "open").length);
      if (resolvedCount) resolvedCount.textContent = String(all.filter((ticket) => ticket.status === "resolved").length);

      const side = content.querySelector("[data-side-queue]");
      if (side) {
        const overview = world.session.overview();
        const stateText =
          overview.state === "briefing" ? "Shift not started" : overview.state === "running" ? "Shift running" : "Shift ended";
        side.innerHTML = `Day ${overview.day} · ${esc(stateText)}<br>${all.filter((t) => t.status === "open").length} open · ${
          all.filter((t) => t.status === "resolved").length
        } resolved today`;
      }
    }

    function paintList() {
      if (!alive) return;
      const scroll = content.parentElement?.scrollTop || 0;
      content.innerHTML = pageMarkup({ crumbs: homeCrumbs(), body: listBody() });
      wireCommon({ list: true });
      refreshList();
      if (content.parentElement) content.parentElement.scrollTop = scroll;
    }

    function wireList() {
      const status = content.querySelector("[data-filter-status]");
      status?.addEventListener("change", () => {
        view.status = status.value;
        persistView();
        refreshList();
      });

      const query = content.querySelector("[data-filter-q]");
      query?.addEventListener("input", () => {
        view.q = query.value;
        refreshList();
      });
      query?.addEventListener("change", persistView);

      content.querySelector("[data-apply]")?.addEventListener("click", () => {
        refreshList();
        toast("Filters applied to this view.");
      });

      content.querySelector("[data-clear]")?.addEventListener("click", () => {
        view.status = "any";
        view.q = "";
        if (status) status.value = "any";
        if (query) query.value = "";
        persistView();
        refreshList();
      });
    }

    // ------------------------------------------------------------------ detail

    function detailBody(ticket) {
      const person = world.people.get(ticket.personId);
      const machine = ticket.machineId ? world.machines.get(ticket.machineId) : null;
      const policy = world.handbook.policy(ticket.ruleId);
      const mail = world.mail.forTicket(ticket.id);
      const status = statusFor(ticket);
      const priority = priorityFor(ticket);
      const updated = latestAt(ticket);
      const mailTime = mail?.receivedAt || "09:00";
      const meta = STATUS[status];
      const remote = person?.remote ? " · remote" : "";

      return `
        <div class="sd-issuehead">
          <div class="sd-issuehead-main">
            <div class="sd-issuekey">${esc(keyFor(ticket))}<span class="sd-sep">·</span><span class="sd-pill ${meta[1]}">${esc(
              meta[0],
            )}</span><span class="sd-pri ${PRIORITY_CLASS[priority]}">${PRIORITY_GLYPH[priority] ? `${PRIORITY_GLYPH[priority]} ` : ""}${esc(
              priority,
            )}</span></div>
            <h1>${esc(ticket.subject)}</h1>
          </div>
          <div class="sd-issueacts">
            <button class="sd-btn" data-say="You are already the assignee on this issue.">Assign to me</button>
            <button class="sd-btn" data-say="You do not have permission to edit issues in this project.">Edit</button>
          </div>
        </div>

        ${detailBanners(ticket)}

        <div class="sd-grid">
          <div class="sd-col">
            <section class="sd-box">
              <div class="sd-box-h"><h2>Description</h2><span>${esc(person?.email || "")}</span></div>
              <div class="sd-desc">${esc(ticket.body)}</div>
              <div class="sd-desc-meta">Received by email on day ${ticket.day} at ${esc(mailTime)}. No attachments.</div>
            </section>

            ${checklistMarkup(ticket)}
            ${evidenceMarkup(ticket)}
            ${commentsMarkup(ticket)}
            ${activityMarkup(ticket)}
            ${
              ticket.status === "resolved"
                ? closureMarkup(ticket, policy)
                : `${replyMarkup(ticket)}${handoverMarkup(ticket)}${closeMarkup(ticket)}`
            }
          </div>

          <aside class="sd-fields">
            <h2>Details</h2>
            <dl>
              <div><dt>Assignee</dt><dd>${esc(techName)}</dd></div>
              <div><dt>Reporter</dt><dd>${esc(person?.displayName || "Unknown")}<span class="sd-sub">${esc(
                person?.email || "",
              )}</span></dd></div>
              <div><dt>Priority</dt><dd class="sd-pri ${PRIORITY_CLASS[priority]}">${esc(priority)}</dd></div>
              <div><dt>Status</dt><dd><span class="sd-pill ${meta[1]}">${esc(meta[0])}</span></dd></div>
              <div><dt>Affected person</dt><dd>${esc(person?.displayName || "Unknown")} · ${esc(
                person ? world.people.departmentName(person.id) : "—",
              )}${esc(remote)}</dd></div>
              <div><dt>Machine</dt><dd>${esc(machine?.hostname || "—")}<span class="sd-sub">${
                machine ? `${esc(machine.os || "Windows")} · tier ${machine.hardwareTier}${machine.network?.connected ? "" : " · offline"}` : "No managed device"
              }</span></dd></div>
              <div><dt>Policy</dt><dd>Policy ${ticket.ruleId} — ${esc(policy?.title || "Unfiled")}</dd></div>
              <div><dt>Requested</dt><dd>Day ${ticket.day} · ${esc(mailTime)}</dd></div>
              <div><dt>Updated</dt><dd>${esc(updated)}</dd></div>
            </dl>
            <button class="sd-link sd-aduc" data-open-aduc>Open ADUC</button>
          </aside>
        </div>`;
    }

    function detailBanners(ticket) {
      const banners = [];
      if (ticket.status !== "resolved" && ticket.readyToClose) {
        banners.push(`<div class="sd-banner sd-banner-ok"><b>Checklist complete.</b> Every item is done. Pick a resolution and write the closing note.</div>`);
      }
      if (ticket.wrongActions.length) {
        banners.push(
          `<div class="sd-banner sd-banner-warn"><b>${ticket.wrongActions.length} finding${
            ticket.wrongActions.length === 1 ? "" : "s"
          } recorded.</b> This closure will be reviewed.</div>`,
        );
      }
      return banners.join("");
    }

    function checklistMarkup(ticket) {
      const met = ticket.objectives.filter((objective) => objective.status === "met").length;
      const statusText = { pending: "To do", met: "Done", wrong: "Flagged" };
      const tick = { pending: "○", met: "✓", wrong: "!" };

      return `
        <section class="sd-box">
          <div class="sd-box-h"><h2>Checklist</h2><span>${met} of ${ticket.objectives.length} done</span></div>
          <ul class="sd-check">
            ${ticket.objectives
              .map(
                (objective) => `
                <li class="is-${esc(objective.status)}">
                  <span class="sd-tick">${tick[objective.status] || "○"}</span>
                  <span>${esc(world.tickets.objectiveLabel(objective))}</span>
                  <span class="sd-check-state">${esc(statusText[objective.status] || objective.status)}</span>
                </li>`,
              )
              .join("")}
          </ul>
        </section>`;
    }

    function evidenceMarkup(ticket) {
      const records = ticket.evidence
        .slice()
        .reverse()
        .map(
          (entry) => `
          <li>
            <div class="sd-ev-top"><b>${esc(entry.summary)}</b><span>${esc(entry.actionLabel)}</span></div>
            <div class="sd-ev-meta">${esc(actorName(entry.actorId))} · ${esc(entry.role)} · ${esc(entry.at)} · ${esc(
              pairs(entry.before),
            )} → ${esc(pairs(entry.after))}</div>
          </li>`,
        )
        .join("");

      return `
        <section class="sd-box">
          <div class="sd-box-h"><h2>Evidence</h2><span>${ticket.evidence.length} record${
            ticket.evidence.length === 1 ? "" : "s"
          }</span></div>
          ${records ? `<ol class="sd-evidence">${records}</ol>` : `<p class="sd-empty">No evidence recorded.</p>`}
        </section>`;
    }

    function commentsMarkup(ticket) {
      const comments = ticket.replies
        .map(
          (reply) => `
          <article class="sd-comment">
            <span class="sd-avatar" aria-hidden="true">${esc(initials(techName))}</span>
            <div>
              <div class="sd-comment-h"><b>${esc(techName)}</b><span>${esc(reply.at)} · ${esc(templateLabel(reply.template))}</span></div>
              <p>${esc(reply.text)}</p>
            </div>
          </article>`,
        )
        .join("");

      return `
        <section class="sd-box">
          <div class="sd-box-h"><h2>Comments</h2><span>${ticket.replies.length}</span></div>
          ${comments ? `<div class="sd-comments">${comments}</div>` : `<p class="sd-empty">No comments yet.</p>`}
        </section>`;
    }

    function activityMarkup(ticket) {
      const entries = [
        {
          at: world.mail.forTicket(ticket.id)?.receivedAt || "09:00",
          html: `<b>Issue created</b><span>Reported by ${esc(ticket.from)}.</span>`,
        },
      ];
      for (const wrong of ticket.wrongActions) {
        entries.push({
          at: wrong.at,
          html: `<b>Finding: ${esc(REASON_LABELS[wrong.reason] || wrong.reason)}</b><span>${esc(wrong.detail)}</span>`,
        });
      }
      for (const escalation of ticket.escalations) {
        const team = world.org.team(escalation.teamId);
        entries.push({
          at: escalation.at,
          html: `<b>Escalated to ${esc(team?.name || escalation.teamId)}</b><span>${esc(escalation.note || "No note.")}</span>`,
        });
      }
      if (ticket.closure) {
        entries.push({
          at: ticket.closure.at,
          html: `<b>Closed as ${esc(categoryLabel(ticket.closure.category))}</b><span>${esc(
            actorName(ticket.closure.byId),
          )} · ${esc(ticket.outcome || "")}</span>`,
        });
      }
      entries.sort((a, b) => String(b.at).localeCompare(String(a.at)));

      return `
        <section class="sd-box">
          <div class="sd-box-h"><h2>Activity</h2><span>${entries.length} event${entries.length === 1 ? "" : "s"}</span></div>
          ${
            entries.length
              ? `<ul class="sd-activity">${entries
                  .map((entry) => `<li><span class="sd-act-at">${esc(entry.at)}</span><div>${entry.html}</div></li>`)
                  .join("")}</ul>`
              : `<p class="sd-empty">No activity.</p>`
          }
        </section>`;
    }

    function replyMarkup(ticket) {
      const options = REPLY_TEMPLATES.map(
        ([value, label]) => `<option value="${esc(value)}"${draft.replyTemplate === value ? " selected" : ""}>${esc(label)}</option>`,
      ).join("");

      return `
        <section class="sd-box sd-formbox">
          <div class="sd-box-h"><h2>Reply to reporter</h2><span>Visible to ${esc(
            world.people.get(ticket.personId)?.displayName || "the reporter",
          )}</span></div>
          <div class="sd-form">
            <div class="sd-formrow">
              <label>Template <select data-reply-template>${options}</select></label>
            </div>
            <textarea data-reply-text rows="3" placeholder="Write to the reporter. Leave empty to send the standard wording.">${esc(
              draft.replyText,
            )}</textarea>
            <div class="sd-formfoot">
              <span class="sd-hint">The reply is delivered to the reporter's mailbox.</span>
              <button class="sd-btn sd-primary" data-send-reply>Send reply</button>
            </div>
          </div>
        </section>`;
    }

    function handoverMarkup(ticket) {
      const teams = world.org.teams();
      if (!teams.length) return "";
      if (!teams.some((team) => team.id === draft.teamId)) draft.teamId = teams[0].id;
      const done = ticket.escalations.map((entry) => world.org.team(entry.teamId)?.name || entry.teamId);

      return `
        <section class="sd-box sd-formbox">
          <div class="sd-box-h"><h2>Handover</h2><span>${
            done.length ? `Already with ${esc(done.join(", "))}` : "No team assigned"
          }</span></div>
          <div class="sd-form">
            <div class="sd-formrow">
              <label>Route to
                <select data-team>${teams
                  .map(
                    (team) =>
                      `<option value="${esc(team.id)}"${draft.teamId === team.id ? " selected" : ""}>${esc(team.name)}</option>`,
                  )
                  .join("")}</select>
              </label>
            </div>
            <input data-escalation-note type="text" value="${esc(draft.escalationNote)}"
              placeholder="Note for the team (optional)" aria-label="Escalation note">
            <div class="sd-formfoot">
              <span class="sd-hint">Escalating records the handover on this issue.</span>
              <button class="sd-btn" data-escalate>Escalate issue</button>
            </div>
          </div>
        </section>`;
    }

    function closeMarkup(ticket) {
      // Matches the old case file: the preferred category follows the evidence
      // every time the panel is drawn, and the action still has the final say.
      draft.closeCategory = ticket.readyToClose ? "resolved" : "returned";

      const options = CLOSE_CATEGORIES.map(
        ([value, label]) => `<option value="${esc(value)}"${draft.closeCategory === value ? " selected" : ""}>${esc(label)}</option>`,
      ).join("");

      return `
        <section class="sd-box sd-formbox sd-closebox">
          <div class="sd-box-h"><h2>Close issue</h2><span>${
            ticket.readyToClose ? "Checklist complete" : "Checklist incomplete"
          }</span></div>
          <div class="sd-form">
            <div class="sd-formrow">
              <label>Resolution <select data-close-category>${options}</select></label>
            </div>
            <textarea data-close-note rows="2" placeholder="What was done, and why is this issue closed?">${esc(
              draft.closeNote,
            )}</textarea>
            <div class="sd-formfoot">
              <span class="sd-error" data-close-error role="status">${esc(draft.closeError)}</span>
              <button class="sd-btn sd-primary" data-close-issue>Close issue</button>
            </div>
            <span class="sd-hint" data-close-hint>${esc(closeHint(ticket))}</span>
          </div>
        </section>`;
    }

    function closeHint(ticket) {
      if (draft.closeCategory === "resolved" && !ticket.readyToClose) {
        return "Resolved is not available until every checklist item is done.";
      }
      if (draft.closeCategory === "escalated" && !ticket.escalations.length) {
        return "Escalate the issue before closing it as Escalated.";
      }
      return "A closing note is required (10 characters minimum).";
    }

    function closureMarkup(ticket, policy) {
      const closure = ticket.closure || {};
      const category = categoryLabel(closure.category);
      const tone = ticket.outcome === "correct" ? "is-good" : ticket.outcome === "deferred" ? "is-neutral" : "is-bad";
      const title =
        ticket.outcome === "correct"
          ? `Closed as ${category}`
          : ticket.outcome === "deferred"
            ? `Closed as ${category} — deferred`
            : `Closed as ${category} — scored wrong`;
      const trust = ticket.trustDelta === 0 ? "trust unchanged" : `trust ${ticket.trustDelta}`;

      return `
        <section class="sd-box sd-closure ${tone}">
          <div class="sd-box-h"><h2>${esc(title)}</h2><span>${esc(ticket.outcome || "closed")}</span></div>
          <div class="sd-form">
            <p class="sd-closure-note">${esc(closure.note || "No closing note recorded.")}</p>
            <div class="sd-closure-meta">${esc(actorName(closure.byId))} · ${esc(closure.at || ticket.resolvedAt || "")} · Policy ${
              ticket.ruleId
            } — ${esc(policy?.title || "")} · ${esc(trust)}</div>
            ${
              ticket.outcome === "correct"
                ? ""
                : `<p class="sd-hint">${esc(ticket.why)}</p>`
            }
            ${
              ticket.wrongClosures?.length
                ? `<div class="sd-wrongclosure">${ticket.wrongClosures
                    .map(
                      (entry) =>
                        `<div><b>${esc(REASON_LABELS[entry.reason] || entry.reason)}</b> ${esc(entry.detail)}</div>`,
                    )
                    .join("")}</div>`
                : ""
            }
          </div>
        </section>`;
    }

    let draft = {
      replyTemplate: "info",
      replyText: "",
      teamId: "",
      escalationNote: "",
      closeCategory: "returned",
      closeNote: "",
      closeError: "",
    };

    function paintDetail(ticketId) {
      if (!alive) return;
      const ticket = world.tickets.view(ticketId);
      if (!ticket) {
        notFound(`SD-${ticketId}`);
        return;
      }

      const scroll = content.parentElement?.scrollTop || 0;
      content.innerHTML = pageMarkup({
        crumbs: issueCrumbs(ticket),
        body: detailBody(ticket),
        currentTicket: ticket,
      });
      platform.setTitle(`${keyFor(ticket)} · ${ticket.subject}`);
      wireCommon({ list: false });
      wireDetail(ticket);
      if (content.parentElement) content.parentElement.scrollTop = scroll;
    }

    function wireDetail(ticket) {
      const replyTemplate = content.querySelector("[data-reply-template]");
      replyTemplate?.addEventListener("change", () => {
        draft.replyTemplate = replyTemplate.value;
      });

      const replyText = content.querySelector("[data-reply-text]");
      replyText?.addEventListener("input", () => {
        draft.replyText = replyText.value;
      });

      content.querySelector("[data-send-reply]")?.addEventListener("click", () => {
        const result = ctx.actions.replyToTicket(ticket.id, {
          template: draft.replyTemplate,
          text: draft.replyText,
        });
        if (!result.ok) {
          toast(REPLY_ERRORS[result.reason] || `Reply not sent: ${result.reason}.`, "mail");
          return;
        }
        draft.replyText = "";
        paintDetail(ticket.id);
        toast(`Reply sent to ${world.people.get(ticket.personId)?.displayName || "the reporter"}.`, "mail");
      });

      const team = content.querySelector("[data-team]");
      team?.addEventListener("change", () => {
        draft.teamId = team.value;
      });

      const escalationNote = content.querySelector("[data-escalation-note]");
      escalationNote?.addEventListener("input", () => {
        draft.escalationNote = escalationNote.value;
      });

      content.querySelector("[data-escalate]")?.addEventListener("click", () => {
        const result = ctx.actions.escalateTicket(ticket.id, draft.teamId, draft.escalationNote);
        if (!result.ok) {
          toast(ESCALATION_ERRORS[result.reason] || `Escalation failed: ${result.reason}.`, "browser");
          return;
        }
        draft.escalationNote = "";
        toast(`Escalated to ${result.team.name}.`, "browser");
        paintDetail(ticket.id);
      });

      const category = content.querySelector("[data-close-category]");
      const hint = content.querySelector("[data-close-hint]");
      const errorSlot = content.querySelector("[data-close-error]");

      category?.addEventListener("change", () => {
        draft.closeCategory = category.value;
        draft.closeError = "";
        if (hint) hint.textContent = closeHint(ticket);
        if (errorSlot) errorSlot.textContent = "";
      });

      const note = content.querySelector("[data-close-note]");
      note?.addEventListener("input", () => {
        draft.closeNote = note.value;
        if (draft.closeError) {
          draft.closeError = "";
          if (errorSlot) errorSlot.textContent = "";
        }
      });

      content.querySelector("[data-close-issue]")?.addEventListener("click", () => {
        const result = ctx.actions.closeTicket(ticket.id, { category: draft.closeCategory, note: draft.closeNote });
        if (!result.ok) {
          draft.closeError = CLOSE_ERRORS[result.reason] || `Cannot close: ${result.reason}.`;
          if (errorSlot) errorSlot.textContent = draft.closeError;
          toast(draft.closeError, "browser");
          return;
        }
        draft.closeNote = "";
        draft.closeError = "";
        toast(`${keyFor(ticket)} closed as ${categoryLabel(draft.closeCategory)}.`, "browser");
        paintDetail(ticket.id);
      });
    }

    function notFound(what) {
      const isIssue = /^SD-\d+$/i.test(String(what));
      content.innerHTML = pageMarkup({
        crumbs: homeCrumbs(),
        body: `
          <div class="sd-notfound">
            <h1>${isIssue ? "We couldn't find that issue" : "We couldn't find that page"}</h1>
            <p>${esc(what)} does not exist or you do not have permission to view it.</p>
            <button class="sd-btn sd-primary" data-go-home>Back to issues</button>
          </div>`,
      });
      platform.setTitle(isIssue ? "Issue not found" : "Page not found");
      wireCommon({ list: false });
    }

    // ------------------------------------------------------------------ wiring

    function wireShiftButtons() {
      const shift = content.querySelector("[data-shift]");
      if (!shift) return;
      shift.querySelector("[data-start-shift]")?.addEventListener("click", () => {
        const result = ctx.actions.startShift();
        if (!result.ok) {
          toast("The shift is already running.");
          return;
        }
        toast(`Shift started. ${world.tickets.openForDay(world.session.day()).length} issues in the queue.`);
      });
      shift.querySelector("[data-end-shift]")?.addEventListener("click", () => ctx.actions.endShift("open"));
    }

    function wireCommon({ list }) {
      for (const button of content.querySelectorAll("[data-say]")) {
        button.addEventListener("click", () => toast(button.dataset.say));
      }
      for (const button of content.querySelectorAll("[data-go-home]")) {
        button.addEventListener("click", () => platform.navigate(`${HOST}/`));
      }
      for (const button of content.querySelectorAll("[data-open-aduc]")) {
        button.addEventListener("click", () => ctx.open("aduc"));
      }
      for (const button of content.querySelectorAll("[data-quick]")) {
        button.addEventListener("click", () => {
          ctx.actions.setUi(SITE_UI, {
            status: button.dataset.quick,
            q: "",
            day: world.session.day(),
          });
          platform.navigate(`${HOST}/`);
        });
      }
      wireShiftButtons();
      if (list) wireList();
    }

    function onEvent(event) {
      if (!alive || !event || event.type === "ui:changed") return;
      const ticketEvent = event.type.startsWith("ticket:") || event.type === "world:reset";
      const sessionEvent = event.type.startsWith("session:");
      if (!ticketEvent && !sessionEvent) return;

      if (detailId && ticketEvent && event.ticketId && event.ticketId !== detailId) return;
      if (detailId) {
        paintDetail(detailId);
      } else if (listPage) {
        paintList();
      }
    }

    function onTick() {
      if (!alive) return;
      const clock = content.querySelector("[data-sd-clock]");
      if (clock) clock.textContent = ctx.clock.timeText();
    }

    // ---------------------------------------------------------------- mounting

    const issueMatch = String(platform.path || "/").match(/^\/browse\/(?:sd-)?(\d+)\/?$/i);
    const detailId = issueMatch ? Number(issueMatch[1]) : null;

    if (detailId) {
      const visible = world.tickets.forDay(world.session.day()).some((ticket) => ticket.id === detailId);
      if (!visible) {
        notFound(`SD-${detailId}`);
      } else {
        const ticket = world.tickets.view(detailId);
        const wanted = ticket.objectives.find((objective) => objective.kind === "ticket.reply");
        draft = {
          ...draft,
          replyTemplate: wanted?.template || "info",
          closeCategory: ticket.readyToClose ? "resolved" : "returned",
        };
        ctx.actions.setUi(CASE_UI, { selectedId: detailId });
        paintDetail(detailId);
      }
    } else if (String(platform.path || "/") === "/" || !platform.path) {
      // The queue is not a case: do not attribute an ADUC action to the last
      // ticket the technician happened to open.
      listPage = true;
      if (world.session.ui(CASE_UI).selectedId != null) ctx.actions.setUi(CASE_UI, { selectedId: null });
      platform.setTitle("Service Desk");
      paintList();
    } else {
      notFound(String(platform.path));
    }

    offs.push(ctx.events.on("*", onEvent));
    offs.push(ctx.clock.onTick(onTick));

    instances.set(content, {
      stop() {
        alive = false;
        for (const off of offs.splice(0)) off?.();
      },
    });
  },

  unmount(content) {
    instances.get(content)?.stop?.();
    instances.delete(content);
  },
};

const css = `
.site-servicedesk.bw-page {
  padding: 0;
  background: #f4f5f7;
  color: #172b4d;
  font-family: "Segoe UI", Tahoma, Verdana, sans-serif;
  font-size: 12px;
  line-height: 1.4;
}
.site-servicedesk .sd { min-height: 100%; display: flex; flex-direction: column; }
.site-servicedesk .sd button { font-family: inherit; }

/* ---------- top bar ---------- */
.site-servicedesk .sd-top {
  display: flex; align-items: center; gap: 11px; flex: none;
  height: 38px; padding: 0 14px; background: #0747a6; color: #fff;
}
.site-servicedesk .sd-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
.site-servicedesk .sd-logo {
  display: grid; place-items: center; width: 22px; height: 22px; border-radius: 4px;
  background: #2684ff; color: #fff; font-weight: 700; font-size: 13px;
}
.site-servicedesk .sd-word { font-weight: 700; font-size: 12px; letter-spacing: .1em; }
.site-servicedesk .sd-product {
  padding-left: 9px; border-left: 1px solid rgba(255, 255, 255, .35);
  color: #c7dcff; font-size: 11.5px; white-space: nowrap;
}
.site-servicedesk .sd-topright { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.site-servicedesk .sd-toplink { color: #c7dcff; font-size: 11px; }
.site-servicedesk .sd-toplink:hover { color: #fff; text-decoration: underline; }
.site-servicedesk .sd-topuser { color: #dbe8ff; font-size: 11px; }
.site-servicedesk .sd-avatar {
  display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%;
  background: #2684ff; color: #fff; font-size: 9.5px; font-weight: 700;
}

/* ---------- notice ---------- */
.site-servicedesk .sd-notice {
  display: flex; align-items: center; gap: 8px; flex: none;
  padding: 5px 14px; background: #fffae6; border-bottom: 1px solid #ffab00;
  color: #172b4d; font-size: 11px;
}
.site-servicedesk .sd-notice b {
  padding: 0 5px; border-radius: 2px; background: #ffab00; color: #172b4d;
  font-size: 9px; letter-spacing: .07em; text-transform: uppercase;
}
.site-servicedesk .sd-notice span { min-width: 0; }
.site-servicedesk .sd-link {
  padding: 0; border: 0; background: none; color: #0052cc; font-size: 11px;
}
.site-servicedesk .sd-link:hover { text-decoration: underline; }

/* ---------- shell ---------- */
.site-servicedesk .sd-shell { display: flex; align-items: stretch; flex: 1; min-height: 0; }
.site-servicedesk .sd-side {
  width: 184px; flex: none; padding: 10px 8px;
  border-right: 1px solid #dfe1e6; background: #fff;
}
.site-servicedesk .sd-side-title {
  display: flex; align-items: center; gap: 8px;
  margin: 0 4px 9px; padding-bottom: 9px; border-bottom: 1px solid #ebecf0;
}
.site-servicedesk .sd-projavatar {
  display: grid; place-items: center; width: 27px; height: 27px; border-radius: 4px;
  background: #0052cc; color: #fff; font-size: 10px; font-weight: 700;
}
.site-servicedesk .sd-side-title b { display: block; font-size: 12px; color: #172b4d; }
.site-servicedesk .sd-side-title span { display: block; color: #5e6c84; font-size: 10px; }
.site-servicedesk .sd-nav { display: grid; }
.site-servicedesk .sd-nav button,
.site-servicedesk .sd-side-link {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  width: 100%; padding: 5px 7px; border-radius: 3px;
  color: #42526e; font-size: 11.5px; text-align: left;
}
.site-servicedesk .sd-nav button:hover,
.site-servicedesk .sd-side-link:hover { background: #f4f5f7; }
.site-servicedesk .sd-nav button.is-active { background: #deebff; color: #0747a6; font-weight: 600; }
.site-servicedesk .sd-nav button span,
.site-servicedesk .sd-side-link span { color: #7a869a; font-size: 10px; font-weight: 400; }
.site-servicedesk .sd-side-h {
  margin: 11px 7px 3px; color: #7a869a;
  font-size: 9px; letter-spacing: .08em; text-transform: uppercase;
}
.site-servicedesk .sd-side-note { margin: 3px 7px; color: #5e6c84; font-size: 10.5px; line-height: 1.5; }
.site-servicedesk .sd-side-current {
  margin: 3px 7px; padding: 3px 6px; border-left: 2px solid #0052cc;
  background: #f4f5f7; color: #0747a6; font-size: 10.5px; font-weight: 600;
}
.site-servicedesk .sd-main { flex: 1; min-width: 0; padding: 11px 16px 22px; background: #f4f5f7; }

/* ---------- crumbs + shift ---------- */
.site-servicedesk .sd-crumbs {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  margin-bottom: 7px; color: #5e6c84; font-size: 11px;
}
.site-servicedesk .sd-crumbs button { padding: 0; color: #0052cc; font-size: 11px; }
.site-servicedesk .sd-crumbs button:hover { text-decoration: underline; }
.site-servicedesk .sd-crumbs i { color: #a5adba; font-style: normal; }
.site-servicedesk .sd-shift {
  display: flex; align-items: center; gap: 9px;
  margin-bottom: 11px; padding: 5px 8px;
  border: 1px solid #dfe1e6; border-left: 3px solid #0052cc; background: #fff;
  color: #5e6c84; font-size: 11px;
}
.site-servicedesk .sd-shift-day { color: #172b4d; font-weight: 700; }
.site-servicedesk .sd-shift-clock { color: #172b4d; font-family: Consolas, "Cascadia Mono", monospace; }
.site-servicedesk .sd-shift-state {
  padding: 1px 5px; border: 1px solid #dfe1e6; border-radius: 2px; background: #f4f5f7;
  color: #5e6c84; font-size: 9px; letter-spacing: .06em; text-transform: uppercase;
}
.site-servicedesk .sd-shift-state.sd-briefing { border-color: #ffab00; background: #fffae6; color: #7a4b00; }
.site-servicedesk .sd-shift-state.sd-running { border-color: #79f2c0; background: #e3fcef; color: #006644; }
.site-servicedesk .sd-shift-state.sd-ended { border-color: #ff8f73; background: #ffebe6; color: #bf2600; }
.site-servicedesk .sd-shift-count { color: #42526e; }
.site-servicedesk .sd-shift-bar { flex: 1; min-width: 32px; height: 3px; background: #dfe1e6; overflow: hidden; }
.site-servicedesk .sd-shift-bar i { display: block; height: 100%; background: #0052cc; }
.site-servicedesk .sd-shift-actions { display: flex; gap: 5px; margin-left: auto; }
.site-servicedesk .sd-shift .sd-btn { height: 23px; padding: 0 8px; font-size: 10.5px; }

/* ---------- buttons + fields ---------- */
.site-servicedesk .sd-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 26px; padding: 0 9px; border: 1px solid #dfe1e6; border-radius: 3px;
  background: #f4f5f7; color: #42526e; font-size: 11.5px; font-weight: 500; white-space: nowrap;
}
.site-servicedesk .sd-btn:hover { background: #ebecf0; }
.site-servicedesk .sd-btn.sd-primary { border-color: #0052cc; background: #0052cc; color: #fff; }
.site-servicedesk .sd-btn.sd-primary:hover { background: #0065ff; }
.site-servicedesk .sd-btn:focus-visible,
.site-servicedesk .sd-link:focus-visible,
.site-servicedesk .sd-nav button:focus-visible {
  outline: 2px solid #4c9aff; outline-offset: 1px;
}

/* ---------- page head + filters ---------- */
.site-servicedesk .sd-pagehead {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  margin: 0 0 9px;
}
.site-servicedesk .sd-pagehead h1 { margin: 0; color: #172b4d; font-size: 20px; font-weight: 600; }
.site-servicedesk .sd-pagehead-actions { display: flex; gap: 6px; }
.site-servicedesk .sd-filterbar {
  display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap;
  padding: 7px 8px; border: 1px solid #dfe1e6; border-bottom: 0; background: #fff;
}
.site-servicedesk .sd-filterbar label {
  display: flex; flex-direction: column; gap: 2px;
  color: #5e6c84; font-size: 9px; letter-spacing: .06em; text-transform: uppercase;
}
.site-servicedesk .sd-filterbar select,
.site-servicedesk .sd-filterbar input {
  height: 24px; padding: 0 5px;
  border: 1px solid #dfe1e6; border-radius: 2px; background: #fafbfc; color: #172b4d;
  font-family: inherit; font-size: 11.5px;
}
.site-servicedesk .sd-filterbar input { width: 190px; }
.site-servicedesk .sd-filterbar .sd-btn { height: 24px; }
.site-servicedesk .sd-filterbar .sd-link { margin-bottom: 4px; }
.site-servicedesk .sd-jql {
  display: flex; align-items: center; gap: 7px;
  padding: 3px 8px; border: 1px solid #dfe1e6; background: #fafbfc;
  color: #5e6c84; font-family: Consolas, "Cascadia Mono", monospace; font-size: 9.5px;
}
.site-servicedesk .sd-jql b { color: #42526e; font-weight: 600; }
.site-servicedesk .sd-jql span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* ---------- table ---------- */
.site-servicedesk .sd-tablewrap {
  overflow-x: auto; border: 1px solid #dfe1e6; border-top: 0; background: #fff;
}
.site-servicedesk .sd-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11.5px; }
.site-servicedesk .sd-table th {
  padding: 0; border-bottom: 1px solid #dfe1e6; background: #ebecf0;
  text-align: left; vertical-align: bottom;
}
.site-servicedesk .sd-table th button {
  width: 100%; padding: 6px 7px; color: #5e6c84; text-align: left;
  font-size: 9.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
}
.site-servicedesk .sd-table th button:hover { background: #ebecf0; }
.site-servicedesk .sd-table th button.is-sorted { color: #0747a6; }
.site-servicedesk .sd-table td {
  padding: 4px 7px; border-bottom: 1px solid #ebecf0; vertical-align: middle;
  color: #172b4d;
}
.site-servicedesk .sd-table tbody tr:last-child td { border-bottom: 0; }
.site-servicedesk .sd-table tbody tr:hover { background: #f4f8ff; cursor: pointer; }
.site-servicedesk .sd-table tbody tr:focus-visible { outline: 2px solid #4c9aff; outline-offset: -2px; }
.site-servicedesk .sd-key { color: #0052cc; font-weight: 600; }
.site-servicedesk .sd-col-summary,
.site-servicedesk .sd-col-reporter { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.site-servicedesk .sd-updated { color: #5e6c84; }
.site-servicedesk .sd-noresults { padding: 18px 9px; color: #7a869a; text-align: center; }
.site-servicedesk .sd-tablefoot {
  display: flex; justify-content: space-between; gap: 10px;
  padding: 4px 8px; border: 1px solid #dfe1e6; border-top: 0; background: #fafbfc;
  color: #7a869a; font-size: 10px;
}

/* ---------- pills + priority ---------- */
.site-servicedesk .sd-pill {
  display: inline-block; padding: 1px 5px; border-radius: 3px;
  font-size: 9px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
}
.site-servicedesk .sd-pill.sd-open { background: #deebff; color: #0747a6; }
.site-servicedesk .sd-pill.sd-progress { background: #fff0b3; color: #7a4b00; }
.site-servicedesk .sd-pill.sd-waiting { background: #ebecf0; color: #42526e; }
.site-servicedesk .sd-pill.sd-escalated { background: #eae6ff; color: #403294; }
.site-servicedesk .sd-pill.sd-resolved { background: #e3fcef; color: #006644; }
.site-servicedesk .sd-pri { font-size: 10.5px; white-space: nowrap; }
.site-servicedesk .sd-pri-glyph { font-size: 10px; }
.site-servicedesk .sd-p-highest { color: #bf2600; font-weight: 700; }
.site-servicedesk .sd-p-high { color: #de350b; }
.site-servicedesk .sd-p-medium { color: #7a4b00; }
.site-servicedesk .sd-p-low { color: #5e6c84; }

/* ---------- issue head ---------- */
.site-servicedesk .sd-issuehead {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  margin: 0 0 9px;
}
.site-servicedesk .sd-issuehead-main { min-width: 0; }
.site-servicedesk .sd-issuekey {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  color: #5e6c84; font-size: 10.5px;
}
.site-servicedesk .sd-sep { color: #a5adba; }
.site-servicedesk .sd-issuehead h1 {
  margin: 4px 0 0; color: #172b4d; font-size: 19px; font-weight: 600; line-height: 1.25;
}
.site-servicedesk .sd-issueacts { display: flex; gap: 5px; flex: none; }

.site-servicedesk .sd-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) 246px; gap: 13px; align-items: start;
}
.site-servicedesk .sd-col { display: grid; gap: 9px; min-width: 0; }

/* ---------- boxes ---------- */
.site-servicedesk .sd-box { border: 1px solid #dfe1e6; border-radius: 3px; background: #fff; }
.site-servicedesk .sd-box-h {
  display: flex; align-items: baseline; justify-content: space-between; gap: 9px;
  padding: 5px 8px; border-bottom: 1px solid #ebecf0;
}
.site-servicedesk .sd-box-h h2 { margin: 0; color: #172b4d; font-size: 12px; font-weight: 600; }
.site-servicedesk .sd-box-h span { color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-desc { padding: 8px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
.site-servicedesk .sd-desc-meta { padding: 0 8px 7px; color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-empty { margin: 0; padding: 9px 8px; color: #7a869a; font-size: 11px; }

.site-servicedesk .sd-banner {
  margin-bottom: 9px; padding: 6px 9px; border: 1px solid #dfe1e6; border-radius: 3px;
  background: #fff; font-size: 11px;
}
.site-servicedesk .sd-banner b { margin-right: 4px; }
.site-servicedesk .sd-banner-ok { border-color: #79f2c0; background: #e3fcef; color: #06402b; }
.site-servicedesk .sd-banner-warn { border-color: #ffab00; background: #fffae6; color: #5f3b00; }

/* ---------- checklist ---------- */
.site-servicedesk .sd-check { display: grid; gap: 1px; margin: 0; padding: 4px; list-style: none; }
.site-servicedesk .sd-check li {
  display: grid; grid-template-columns: 15px 1fr auto; gap: 6px; align-items: baseline;
  padding: 4px 6px; border-radius: 2px; color: #172b4d; font-size: 11.5px;
}
.site-servicedesk .sd-check li.is-met { background: #e3fcef; }
.site-servicedesk .sd-check li.is-wrong { background: #fffae6; }
.site-servicedesk .sd-tick { color: #a5adba; font-weight: 700; text-align: center; }
.site-servicedesk .sd-check li.is-met .sd-tick { color: #006644; }
.site-servicedesk .sd-check li.is-wrong .sd-tick { color: #bf2600; }
.site-servicedesk .sd-check-state { color: #7a869a; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }

/* ---------- evidence + activity ---------- */
.site-servicedesk .sd-evidence { display: grid; gap: 6px; margin: 0; padding: 6px 8px; list-style: none; }
.site-servicedesk .sd-evidence li { padding-left: 6px; border-left: 2px solid #dfe1e6; }
.site-servicedesk .sd-ev-top { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; }
.site-servicedesk .sd-ev-top span { color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-ev-meta { margin-top: 1px; color: #5e6c84; font-size: 10px; line-height: 1.4; }
.site-servicedesk .sd-activity { display: grid; gap: 6px; margin: 0; padding: 6px 8px; list-style: none; }
.site-servicedesk .sd-activity li { display: grid; grid-template-columns: 32px 1fr; gap: 6px; font-size: 11px; }
.site-servicedesk .sd-act-at { color: #7a869a; font-family: Consolas, "Cascadia Mono", monospace; font-size: 9.5px; }
.site-servicedesk .sd-activity b { display: block; font-size: 11px; }
.site-servicedesk .sd-activity span { color: #5e6c84; font-size: 10.5px; }

/* ---------- comments ---------- */
.site-servicedesk .sd-comments { display: grid; gap: 8px; padding: 6px 8px 8px; }
.site-servicedesk .sd-comment { display: grid; grid-template-columns: 24px 1fr; gap: 7px; }
.site-servicedesk .sd-avatar {
  display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  background: #0052cc; color: #fff; font-size: 9px; font-weight: 700;
}
.site-servicedesk .sd-comment-h { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-comment-h b { color: #172b4d; font-size: 11px; }
.site-servicedesk .sd-comment p { margin: 2px 0 0; color: #172b4d; font-size: 11.5px; line-height: 1.45; white-space: pre-wrap; }

/* ---------- forms ---------- */
.site-servicedesk .sd-form { display: grid; gap: 6px; padding: 7px 8px 8px; }
.site-servicedesk .sd-formrow { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.site-servicedesk .sd-formrow label {
  display: flex; flex-direction: column; gap: 2px;
  color: #5e6c84; font-size: 9px; letter-spacing: .06em; text-transform: uppercase;
}
.site-servicedesk .sd-form select,
.site-servicedesk .sd-form input,
.site-servicedesk .sd-form textarea {
  border: 1px solid #dfe1e6; border-radius: 2px; background: #fff; color: #172b4d;
  font-family: inherit; font-size: 11.5px;
}
.site-servicedesk .sd-form select,
.site-servicedesk .sd-form input { height: 26px; padding: 0 6px; }
.site-servicedesk .sd-form input { width: 100%; }
.site-servicedesk .sd-form textarea { width: 100%; min-height: 48px; padding: 5px 6px; resize: vertical; }
.site-servicedesk .sd-form select:focus,
.site-servicedesk .sd-form input:focus,
.site-servicedesk .sd-form textarea:focus {
  outline: none; border-color: #4c9aff; box-shadow: 0 0 0 1px rgba(76, 154, 255, .35);
}
.site-servicedesk .sd-formfoot {
  display: flex; align-items: center; justify-content: space-between; gap: 9px; flex-wrap: wrap;
}
.site-servicedesk .sd-hint { color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-error { color: #bf2600; font-size: 10.5px; }

/* ---------- closed ---------- */
.site-servicedesk .sd-closure { border-left: 3px solid #36b37e; }
.site-servicedesk .sd-closure.is-bad { border-left-color: #de350b; }
.site-servicedesk .sd-closure.is-neutral { border-left-color: #a5adba; }
.site-servicedesk .sd-closure-note { margin: 0; color: #172b4d; font-size: 12px; line-height: 1.45; }
.site-servicedesk .sd-closure-meta { color: #5e6c84; font-size: 10.5px; }
.site-servicedesk .sd-wrongclosure {
  padding: 5px 7px; border: 1px solid #ff8f73; background: #ffebe6;
  color: #601e16; font-size: 10.5px;
}
.site-servicedesk .sd-wrongclosure b { text-transform: uppercase; letter-spacing: .05em; font-size: 9px; }

/* ---------- details panel ---------- */
.site-servicedesk .sd-fields { padding: 8px; border: 1px solid #dfe1e6; border-radius: 3px; background: #fff; }
.site-servicedesk .sd-fields h2 {
  margin: 0 0 7px; color: #5e6c84;
  font-size: 9px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
}
.site-servicedesk .sd-fields dl { display: grid; gap: 7px; margin: 0; }
.site-servicedesk .sd-fields dt { color: #7a869a; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }
.site-servicedesk .sd-fields dd { margin: 1px 0 0; color: #172b4d; font-size: 11.5px; line-height: 1.35; overflow-wrap: anywhere; }
.site-servicedesk .sd-sub { display: block; color: #7a869a; font-size: 10px; }
.site-servicedesk .sd-aduc { margin-top: 9px; }

/* ---------- not found + footer ---------- */
.site-servicedesk .sd-notfound {
  padding: 22px; border: 1px solid #dfe1e6; border-radius: 3px; background: #fff; text-align: center;
}
.site-servicedesk .sd-notfound h1 { margin: 0 0 5px; color: #172b4d; font-size: 18px; font-weight: 600; }
.site-servicedesk .sd-notfound p { margin: 0 0 12px; color: #5e6c84; font-size: 12px; }
.site-servicedesk .sd-foot {
  display: flex; justify-content: space-between; gap: 14px;
  padding: 6px 14px; border-top: 1px solid #dfe1e6; background: #fff;
  color: #7a869a; font-size: 9.5px;
}

@media (max-width: 760px) {
  .site-servicedesk .sd-shell { flex-direction: column; }
  .site-servicedesk .sd-side { width: auto; border-right: 0; border-bottom: 1px solid #dfe1e6; }
  .site-servicedesk .sd-grid { grid-template-columns: 1fr; }
}
`;
