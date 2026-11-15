// Ticket Desk — a case file, not a quiz.
//
// The request comes from mail, the person and machine come from the world, and
// the checklist is driven by the platform's ticket watcher. There is no
// Approve/Deny: to close a case you perform the real work (in the Directory or
// Settings stopgap today, in ADUC / Services / Software Center later) and the
// watcher records evidence. Wrong actions are recorded and the case stays open.

const instances = new WeakMap();

const TEMPLATES = [
  ["deny", "Deny — not eligible"],
  ["approve", "Approve — actioned"],
  ["info", "Need more information"],
];

const STATUS_ICON = { pending: "○", met: "✓", wrong: "!" };
const STATUS_LABEL = { pending: "pending", met: "met", wrong: "wrong action" };

const pairs = (value) =>
  Object.entries(value || {})
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : item}`)
    .join(" · ");

export default {
  id: "ticketdesk",
  title: "Ticket Desk",
  icon: "ticket",
  size: [640, 600],
  desktop: true,
  pinned: true,
  fixed: true,
  order: 1,
  position: [104, 16],

  mount(container, ctx) {
    ctx.ui.styles("ticketdesk", css);
    const uiState = () => ctx.world.session.ui("ticketdesk");
    const selectedId = () => uiState().selectedId ?? null;
    const select = (id) => ctx.actions.setUi("ticketdesk", { selectedId: id });

    function paintHead(root) {
      const overview = ctx.world.session.overview();
      const fill = root.querySelector('[data-hd="fill"]');
      if (!fill) return;
      const fraction = overview.shiftSeconds ? overview.remaining / overview.shiftSeconds : 0;
      fill.style.width = `${fraction * 100}%`;
      root.querySelector('[data-hd="bar"]').classList.toggle("low", fraction < 0.25);
      root.querySelector('[data-hd="time"]').textContent = ctx.ui.formatClock(overview.remaining);
      root.querySelector('[data-hd="count"]').textContent = `${overview.answered}/${overview.total}`;
    }

    function paint() {
      const overview = ctx.world.session.overview();
      const day = overview.day;
      const open = ctx.world.tickets.openForDay(day);
      const selected = selectedId();
      const ticket = selected ? ctx.world.tickets.view(selected) : null;
      const showingResolved = ticket && ticket.status === "resolved" && ticket.resolvedDay === day;

      // Drop a stale selection (for example after a reseed).
      if (selected && !ticket) {
        select(null);
      }

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="hd">
          <div class="hd-head">
            <span>Day <b>${day}</b></span>
            <span data-hd="time">${ctx.ui.formatClock(overview.remaining)}</span>
            <div class="hd-bar" data-hd="bar"><i data-hd="fill"></i></div>
            <span data-hd="count">${overview.answered}/${overview.total}</span>
          </div>
          <div class="hd-main" data-hd="main"></div>
        </div>`);
      container.append(root);
      const main = root.querySelector('[data-hd="main"]');

      if (overview.state === "briefing") {
        main.append(introCard(ctx, day, open.length));
      } else if (!open.length && !showingResolved) {
        main.append(completeCard(ctx, open.length, overview));
      } else {
        main.append(queueList(ctx, day, open, selected));
        const detail = document.createElement("div");
        detail.className = "hd-detail";
        detail.append(ticket ? caseFile(ctx, ticket, overview) : emptyDetail(ctx));
        main.append(detail);
      }
      paintHead(root);
    }

    function introCard(api, day, count) {
      const box = api.ui.el(`
        <div class="app-empty">
          <div>
            <div style="width:46px;height:46px;margin:0 auto 10px">${api.ui.icon("ticket")}</div>
            <h3>Day ${day} — ${count} open ticket${count === 1 ? "" : "s"}</h3>
            <p>Read the briefing in Mail, keep the Policy Handbook open, and check the Staff Directory before you act. Cases close when the work is done, not when you click a verdict.</p>
            <button class="btn primary" data-act="start">Start shift</button>
          </div>
        </div>`);
      box.querySelector('[data-act="start"]').addEventListener("click", () => {
        api.actions.startShift();
        const first = api.world.tickets.openForDay(api.world.session.day())[0];
        if (first) select(first.id);
        api.ui.toast(
          "Ticket Desk",
          `Shift started. ${count} ticket${count === 1 ? "" : "s"} in the queue.`,
          "ticket",
        );
      });
      return box;
    }

    function completeCard(api, left, overview) {
      const box = api.ui.el(`
        <div class="app-empty">
          <div>
            <div style="width:46px;height:46px;margin:0 auto 10px">${api.ui.icon("ticket")}</div>
            <h3>${overview.remaining > 0 ? "Queue empty" : "That's the clock"}</h3>
            <p>${
              left
                ? `${left} ticket${left === 1 ? "" : "s"} still open. They roll over to tomorrow, and somebody will be annoyed about it.`
                : "Every ticket answered. Marge will want a word."
            }</p>
            <button class="btn primary" data-act="end">End shift</button>
          </div>
        </div>`);
      box.querySelector('[data-act="end"]').addEventListener("click", () => api.actions.endShift("open"));
      return box;
    }

    function queueList(api, day, open, selected) {
      const wrap = document.createElement("div");
      wrap.className = "hd-queue";
      for (const ticket of api.world.tickets.forDay(day)) {
        const view = api.world.tickets.view(ticket.id);
        const resolvedHere = ticket.status === "resolved" && ticket.resolvedDay === day;
        const marker = resolvedHere ? (ticket.outcome === "correct" ? "✓" : "✗") : ticket.wrongActions.length ? "!" : "•";
        const cls = resolvedHere
          ? ticket.outcome === "correct"
            ? "ok"
            : "bad"
          : ticket.wrongActions.length
            ? "warn"
            : "";
        const button = api.ui.el(`<button class="qitem${selected === ticket.id ? " sel" : ""}" data-ticket="${ticket.id}">
          <span class="st ${cls}">${marker}</span>
          <span class="who">${api.ui.esc(view.from)}</span></button>`);
        button.addEventListener("click", () => select(ticket.id));
        wrap.append(button);
      }
      if (!open.length) {
        const done = document.createElement("div");
        done.className = "muted tiny";
        done.style.padding = "10px";
        done.textContent = "Everything here is answered.";
        wrap.append(done);
      }
      return wrap;
    }

    function emptyDetail(api) {
      return api.ui.el(`<div class="app-empty"><p class="muted">Pick a ticket on the left.</p></div>`);
    }

    function caseFile(api, ticket, overview) {
      const person = api.world.people.get(ticket.personId);
      const machine = ticket.machineId ? api.world.machines.get(ticket.machineId) : null;
      const rule = api.world.handbook.policy(ticket.ruleId);
      const outside = !/@halcyon\.co$/i.test(ticket.fromAddress);
      const met = ticket.objectives.filter((objective) => objective.status === "met").length;
      const wrong = ticket.wrongActions;

      const view = api.ui.el(`<div class="case">
        <div class="meta">
          <div>From: <b>${api.ui.esc(ticket.from)}</b> &lt;${api.ui.esc(ticket.fromAddress)}&gt;</div>
          <div>Ticket #${ticket.id} · priority normal${ticket.day < overview.day ? " · rolled over" : ""} · case file</div>
        </div>
        <h3>${api.ui.esc(ticket.subject)}</h3>
        <div class="body${outside ? " warn" : ""}">${api.ui.esc(ticket.body)}</div>

        <div class="facts">
          <span><i>Person</i>${api.ui.esc(person?.displayName || "Unknown")} · ${api.ui.esc(
            person ? api.world.people.departmentName(person.id) : "—",
          )}${person?.remote ? " · remote" : ""}</span>
          <span><i>Machine</i>${api.ui.esc(machine?.hostname || "—")}${machine ? ` · tier ${machine.hardwareTier}` : ""}</span>
          <span><i>Policy</i>${api.ui.esc(rule?.title || `Policy ${ticket.ruleId}`)}</span>
          <button class="link" data-open-directory>Open Directory</button>
        </div>`);

      if (wrong.length) {
        view.append(
          api.ui.el(`<div class="wrong-banner">
            <b>Wrong action recorded — the case stays open</b>
            ${wrong
              .map(
                (entry) =>
                  `<div><span class="badge">${api.ui.esc(entry.reason)}</span>${api.ui.esc(entry.detail)} <span class="muted">(${api.ui.esc(
                    entry.at,
                  )})</span></div>`,
              )
              .join("")}
          </div>`),
        );
      }

      view.append(
        api.ui.el(`<div class="objectives">
          <div class="obj-head"><b>Objectives</b><span class="muted tiny">${met} of ${ticket.objectives.length} met</span></div>
          <ul>${ticket.objectives
            .map(
              (objective) => `<li class="${objective.status}">
                <span class="tick">${STATUS_ICON[objective.status] || "○"}</span>
                <span class="label">${api.ui.esc(api.world.tickets.objectiveLabel(objective))}</span>
                <span class="state">${STATUS_LABEL[objective.status] || objective.status}</span>
              </li>`,
            )
            .join("")}</ul>
        </div>`),
      );

      if (ticket.status === "resolved") {
        view.append(
          api.ui.el(`<div class="resolved ${ticket.outcome === "correct" ? "good" : "bad"}">
            <b>${ticket.outcome === "correct" ? "Resolved from evidence" : "Resolved, but scored wrong"}</b>
            <p>${api.ui.esc(ticket.why)}</p>
            <span class="muted tiny">Policy ${ticket.ruleId} — ${api.ui.esc(rule?.title || "")} · ${
              ticket.outcome === "correct" ? "trust unchanged" : `trust ${ticket.trustDelta}`
            } · closed ${api.ui.esc(ticket.resolvedAt || "")}</span>
          </div>`),
        );
      } else {
        view.append(replyBox(api, ticket));
        view.append(escalationBox(api, ticket));
      }

      view.append(
        api.ui.el(`<div class="evidence">
          <div class="ev-head"><b>Evidence trail</b><span class="muted tiny">${ticket.evidence.length} record${
            ticket.evidence.length === 1 ? "" : "s"
          }</span></div>
          ${
            ticket.evidence.length
              ? `<ol>${ticket.evidence
                  .slice()
                  .reverse()
                  .map(
                    (entry) => `<li>
                      <div><b>${api.ui.esc(entry.summary)}</b> <span class="muted">${api.ui.esc(entry.actionLabel)}</span></div>
                      <div class="muted tiny">${api.ui.esc(actorName(api, entry.actorId))} · role ${api.ui.esc(entry.role)} · ${
                        api.ui.esc(entry.at)
                      } · ${api.ui.esc(pairs(entry.before))} → ${api.ui.esc(pairs(entry.after))}</div>
                    </li>`,
                  )
                  .join("")}</ol>`
              : `<p class="muted tiny">No evidence yet. Perform the work in the tool that owns it; the watcher records what changed.</p>`
          }
        </div>`),
      );

      view.querySelector("[data-open-directory]").addEventListener("click", () => api.open("directory"));

      const send = view.querySelector("[data-send-reply]");
      if (send) {
        send.addEventListener("click", () => {
          const template = view.querySelector("[data-template]").value;
          const text = view.querySelector("[data-reply-text]").value;
          const result = api.actions.replyToTicket(ticket.id, { template, text });
          if (!result.ok) {
            api.ui.toast("Ticket Desk", `Reply not sent: ${result.reason}.`, "mail");
            return;
          }
          view.querySelector("[data-reply-text]").value = "";
          api.ui.toast("Ticket Desk", "Reply sent to the user.", "mail");
        });
      }

      for (const button of view.querySelectorAll("[data-team]")) {
        button.addEventListener("click", () => {
          const note = view.querySelector("[data-escalation-note]")?.value || "";
          const result = api.actions.escalateTicket(ticket.id, button.dataset.team, note);
          if (!result.ok) {
            api.ui.toast("Ticket Desk", `Escalation failed: ${result.reason}.`, "ticket");
            return;
          }
          api.ui.toast("Ticket Desk", `Escalated to ${result.team.name}.`, "ticket");
        });
      }

      return view;
    }

    function replyBox(api, ticket) {
      const wanted = ticket.objectives.find((objective) => objective.kind === "ticket.reply");
      const preferred = wanted?.template || "info";
      return api.ui.el(`<div class="reply">
        <div class="reply-head"><b>Reply</b><span class="muted tiny">the user sees this in Mail</span></div>
        <div class="reply-row">
          <select data-template aria-label="Reply type">
            ${TEMPLATES.map(
              ([value, label]) => `<option value="${value}"${value === preferred ? " selected" : ""}>${label}</option>`,
            ).join("")}
          </select>
        </div>
        <textarea data-reply-text rows="3" placeholder="Write to the user. Leave empty to send the standard wording."></textarea>
        <div class="reply-foot"><button class="btn primary" data-send-reply>Send reply</button></div>
      </div>`);
    }

    function escalationBox(api, ticket) {
      const teams = api.world.org.teams();
      const done = ticket.escalations.map((entry) => teams.find((team) => team.id === entry.teamId)?.name || entry.teamId);
      return api.ui.el(`<div class="escalate">
        <div class="reply-head"><b>Escalation path</b><span class="muted tiny">${
          done.length ? `already with ${api.ui.esc(done.join(", "))}` : "no escalation yet"
        }</span></div>
        <input data-escalation-note placeholder="Note for the team (optional)" aria-label="Escalation note">
        <div class="team-list">
          ${teams
            .map(
              (team) =>
                `<button class="btn" data-team="${team.id}" title="${api.ui.esc(team.description)}">${api.ui.esc(
                  team.name,
                )}</button>`,
            )
            .join("")}
        </div>
      </div>`);
    }

    function actorName(api, actorId) {
      return api.world.people.get(actorId)?.displayName || actorId || "System";
    }

    function render() {
      paint();
    }

    const offEvents = ctx.events.on("*", render);
    const offTick = ctx.clock.onTick(() => {
      const root = container.querySelector(".hd");
      if (root) paintHead(root);
    });
    instances.set(container, { offEvents, offTick });
    paint();
  },

  unmount(container) {
    const held = instances.get(container);
    if (!held) return;
    held.offEvents?.();
    held.offTick?.();
    instances.delete(container);
  },
};

const css = `
.app-ticketdesk .hd { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.app-ticketdesk .hd-head {
  display: flex; align-items: center; gap: 10px; padding: 7px 12px; flex: none;
  border-bottom: 1px solid var(--stroke); font-size: 11.5px; color: var(--text-3);
}
.app-ticketdesk .hd-head b { color: var(--text); font-weight: 600; }
.app-ticketdesk .hd-bar { flex: 1; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.app-ticketdesk .hd-bar i { display: block; height: 100%; background: var(--accent); transition: width 0.2s linear; }
.app-ticketdesk .hd-bar.low i { background: #e8a33d; }
.app-ticketdesk .hd-main { flex: 1; min-height: 0; display: flex; }
.app-ticketdesk .hd-queue { width: 172px; flex: none; border-right: 1px solid var(--stroke); overflow: auto; padding: 5px; }
.app-ticketdesk .qitem {
  display: flex; gap: 7px; align-items: baseline; width: 100%; text-align: left;
  padding: 6px 7px; border-radius: 4px; font-size: 12px; color: var(--text-2);
  border-left: 3px solid transparent;
}
.app-ticketdesk .qitem:hover { background: var(--hover); }
.app-ticketdesk .qitem.sel { background: rgba(76, 194, 255, 0.16); border-left-color: var(--accent); color: #fff; }
.app-ticketdesk .qitem .st { width: 11px; text-align: center; font-size: 11px; }
.app-ticketdesk .qitem .st.ok { color: #6ee7a0; }
.app-ticketdesk .qitem .st.bad { color: #ff9a9a; }
.app-ticketdesk .qitem .st.warn { color: #fbbf24; }
.app-ticketdesk .qitem .who { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.app-ticketdesk .hd-detail { flex: 1; min-width: 0; overflow: auto; padding: 16px; }
.app-ticketdesk .case h3 { margin: 2px 0 10px; font-size: 16px; font-weight: 600; line-height: 1.25; }
.app-ticketdesk .case .meta { font-size: 12px; color: var(--text-3); margin-bottom: 12px; line-height: 1.6; }
.app-ticketdesk .case .meta b { color: var(--text-2); font-weight: 600; }
.app-ticketdesk .case .body {
  font-size: 13px; line-height: 1.6; color: var(--text-2); background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--stroke); border-radius: 4px; padding: 12px; white-space: pre-wrap;
}
.app-ticketdesk .case .body.warn { border-color: rgba(248, 113, 113, 0.4); background: rgba(248, 113, 113, 0.06); }
.app-ticketdesk .facts {
  display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; margin-top: 12px;
  font-size: 11.5px; color: var(--text-2);
}
.app-ticketdesk .facts i { font-style: normal; color: var(--text-3); margin-right: 5px; }
.app-ticketdesk .facts .link { color: var(--accent); font-size: 11.5px; text-decoration: underline; }
.app-ticketdesk .wrong-banner {
  margin-top: 12px; padding: 10px 12px; border-radius: 4px; font-size: 12px; line-height: 1.55;
  background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.4);
}
.app-ticketdesk .wrong-banner > b { display: block; margin-bottom: 4px; color: #fbd38d; }
.app-ticketdesk .wrong-banner .badge {
  display: inline-block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em;
  border: 1px solid rgba(251, 191, 36, 0.5); border-radius: 8px; padding: 0 5px; margin-right: 6px;
}
.app-ticketdesk .objectives { margin-top: 14px; border-top: 1px solid var(--stroke); padding-top: 12px; }
.app-ticketdesk .obj-head, .app-ticketdesk .ev-head, .app-ticketdesk .reply-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 7px;
}
.app-ticketdesk .objectives ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
.app-ticketdesk .objectives li {
  display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: baseline;
  font-size: 12.5px; color: var(--text-2); padding: 5px 7px; border-radius: 4px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid transparent;
}
.app-ticketdesk .objectives li.met { color: #c9f7d9; border-color: rgba(74, 222, 128, 0.28); background: rgba(74, 222, 128, 0.06); }
.app-ticketdesk .objectives li.met .tick { color: #6ee7a0; }
.app-ticketdesk .objectives li.wrong { border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.07); }
.app-ticketdesk .objectives li.wrong .tick { color: #fbd38d; }
.app-ticketdesk .objectives .tick { text-align: center; }
.app-ticketdesk .objectives .state { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-3); }
.app-ticketdesk .resolved { margin-top: 14px; padding: 11px 12px; border-radius: 4px; font-size: 12.5px; line-height: 1.55; }
.app-ticketdesk .resolved.good { background: rgba(74, 222, 128, 0.09); border: 1px solid rgba(74, 222, 128, 0.34); }
.app-ticketdesk .resolved.bad { background: rgba(248, 113, 113, 0.09); border: 1px solid rgba(248, 113, 113, 0.34); }
.app-ticketdesk .resolved > b { display: block; margin-bottom: 3px; }
.app-ticketdesk .resolved p { margin: 0 0 6px; }
.app-ticketdesk .reply, .app-ticketdesk .escalate { margin-top: 14px; border-top: 1px solid var(--stroke); padding-top: 12px; }
.app-ticketdesk .reply-row { display: flex; gap: 6px; margin-bottom: 6px; }
.app-ticketdesk .reply select, .app-ticketdesk .escalate input {
  background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 4px;
  padding: 5px 8px; font-size: 12px; color: var(--text); outline: 0;
}
.app-ticketdesk .reply select:focus, .app-ticketdesk .escalate input:focus { border-color: var(--accent); }
.app-ticketdesk .reply textarea {
  width: 100%; resize: vertical; min-height: 58px; background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--stroke-2); border-radius: 4px; padding: 7px 9px; font-size: 12.5px;
  color: var(--text); outline: 0;
}
.app-ticketdesk .reply textarea:focus { border-color: var(--accent); }
.app-ticketdesk .reply-foot { display: flex; justify-content: flex-end; margin-top: 6px; }
.app-ticketdesk .team-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.app-ticketdesk .team-list .btn { font-size: 11.5px; padding: 4px 9px; }
.app-ticketdesk .escalate input { width: 100%; margin-top: 2px; }
.app-ticketdesk .evidence { margin-top: 14px; border-top: 1px solid var(--stroke); padding-top: 12px; }
.app-ticketdesk .evidence ol { margin: 0; padding-left: 18px; display: grid; gap: 7px; }
.app-ticketdesk .evidence li { font-size: 12px; color: var(--text-2); line-height: 1.45; }
.app-ticketdesk .evidence li b { font-weight: 600; }
`;
