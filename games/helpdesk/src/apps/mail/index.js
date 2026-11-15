// Mail. The inbox is a selector over store.mail: the day's briefing, the
// company-wide noise and the support queue, which links straight back to
// tickets. Reading a message is an action, so unread counts are shared.

const instances = new WeakMap();

export default {
  id: "mail",
  title: "Mail",
  icon: "mail",
  size: [600, 520],
  desktop: true,
  pinned: true,
  order: 2,
  right: true,
  position: [null, 20],

  mount(container, ctx) {
    ctx.ui.styles("mail", css);
    const uiState = () => ctx.world.session.ui("mail");

    function messages() {
      const day = ctx.world.session.day();
      const folder = uiState().folder || "inbox";
      if (folder === "support") {
        return ctx.world.tickets
          .forDay(day)
          .filter((ticket) => ticket.day <= day)
          .map((ticket) => {
            const view = ctx.world.tickets.view(ticket.id);
            const mail = ctx.world.mail.get(ticket.mailId);
            return {
              id: ticket.mailId,
              ticketId: ticket.id,
              from: view.from,
              fromAddress: view.fromAddress,
              subject: view.subject,
              lines: [view.body],
              read: mail?.read ?? false,
              briefing: false,
            };
          });
      }
      return ctx.world.mail.inbox(day);
    }

    function paint() {
      const folder = uiState().folder || "inbox";
      const list = messages();
      const selectedId =
        uiState().selectedId && list.some((m) => m.id === uiState().selectedId) ? uiState().selectedId : list[0]?.id || null;
      const selected = list.find((m) => m.id === selectedId) || null;

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="mail">
          <div class="mail-list">
            <div class="mail-folders">
              <button data-folder="inbox" class="${folder === "inbox" ? "sel" : ""}">Inbox</button>
              <button data-folder="support" class="${folder === "support" ? "sel" : ""}">Support</button>
            </div>
            <div data-items></div>
          </div>
          <div class="mail-read"></div>
        </div>`);
      container.append(root);

      for (const button of root.querySelectorAll("[data-folder]")) {
        button.addEventListener("click", () => {
          ctx.actions.setUi("mail", { folder: button.dataset.folder, selectedId: null });
        });
      }

      const items = root.querySelector("[data-items]");
      for (const message of list) {
        const button = ctx.ui.el(`<button class="${message.id === selectedId ? "sel" : ""}${message.read ? "" : " unread"}">
          <b>${ctx.ui.esc(message.from)}</b>${ctx.ui.esc(message.subject)}</button>`);
        button.addEventListener("click", () => {
          ctx.actions.markMailRead(message.id);
          ctx.actions.setUi("mail", { selectedId: message.id });
        });
        items.append(button);
      }
      if (!list.length) items.append(ctx.ui.el(`<p class="muted tiny" style="padding:10px">Nothing here.</p>`));

      const read = root.querySelector(".mail-read");
      if (!selected) {
        read.innerHTML = `<p class="muted">No message selected.</p>`;
        return;
      }
      const day = ctx.world.session.day();
      read.innerHTML = `
        <h3>${ctx.ui.esc(selected.subject)}</h3>
        <div class="from">${ctx.ui.esc(selected.from)} &lt;${ctx.ui.esc(selected.fromAddress)}&gt; · to you</div>
        ${selected.lines.map((line) => `<p>${ctx.ui.esc(line)}</p>`).join("")}
        ${
          selected.briefing && day > 1
            ? `<div class="newrule"><b>Policy update:</b> Policy ${day + 4} is now in the handbook. It applies from today.</div>`
            : ""
        }
        ${selected.ticketId ? `<div class="mail-link"><button class="btn" data-open-ticket>Open ticket #${selected.ticketId} in Ticket Desk</button></div>` : ""}`;

      read.querySelector("[data-open-ticket]")?.addEventListener("click", () => {
        ctx.actions.setUi("ticketdesk", { selectedId: selected.ticketId });
        ctx.open("ticketdesk");
      });
    }

    const offEvents = ctx.events.on("*", paint);
    instances.set(container, { offEvents });
    paint();
  },

  unmount(container) {
    instances.get(container)?.offEvents?.();
    instances.delete(container);
  },
};

const css = `
.app-mail .mail { display: flex; height: 100%; }
.app-mail .mail-list { width: 196px; flex: none; border-right: 1px solid var(--stroke); overflow: auto; padding: 5px; }
.app-mail .mail-folders { display: flex; gap: 3px; padding: 2px 2px 7px; border-bottom: 1px solid var(--stroke); margin-bottom: 5px; }
.app-mail .mail-folders button {
  flex: 1; padding: 4px 6px; border-radius: 4px; font-size: 11px; color: var(--text-3);
  border: 1px solid transparent;
}
.app-mail .mail-folders button:hover { background: var(--hover); }
.app-mail .mail-folders button.sel { color: #fff; background: rgba(76, 194, 255, 0.14); border-color: rgba(76, 194, 255, 0.35); }
.app-mail .mail-list button { display: block; width: 100%; text-align: left; padding: 8px; border-radius: 4px; font-size: 11.5px; color: var(--text-2); border-left: 3px solid transparent; margin-bottom: 1px; }
.app-mail .mail-list button:hover { background: var(--hover); }
.app-mail .mail-list button.sel { background: rgba(76, 194, 255, 0.14); border-left-color: var(--accent); }
.app-mail .mail-list button.unread b::after { content: " ·"; color: var(--accent); }
.app-mail .mail-list b { display: block; font-weight: 600; color: #fff; margin-bottom: 2px; }
.app-mail .mail-read { flex: 1; min-width: 0; overflow: auto; padding: 18px 20px; }
.app-mail .mail-read h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.app-mail .mail-read .from { font-size: 12px; color: var(--text-3); margin-bottom: 14px; }
.app-mail .mail-read p { margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: var(--text-2); }
.app-mail .mail-read .newrule { margin-top: 14px; padding: 10px 12px; border-radius: 4px; background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.32); font-size: 12.5px; }
.app-mail .mail-link { margin-top: 16px; }
`;
