// Staff Directory — the migrated tool app. It is the same people table AD,
// Outlook's GAL and the ticket desk all read, and it also shows what the rest of
// the world derives from it: group membership, machine sign-in and share access.

const instances = new WeakMap();

const TYPE_LABEL = { "full-time": "Full-time", contractor: "Contractor", intern: "Intern" };
const TYPE_CLASS = { "full-time": "ft", contractor: "ct", intern: "in" };
const ACCOUNT_LABEL = { enabled: "Enabled", locked: "Locked", disabled: "Disabled" };

export default {
  id: "directory",
  title: "Staff Directory",
  icon: "people",
  size: [640, 560],
  desktop: true,
  pinned: true,
  order: 4,
  position: [null, 20],
  right: true,

  mount(container, ctx) {
    ctx.ui.styles("directory", css);
    const uiState = () => ctx.world.session.ui("directory");

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="dir">
        <div class="dir-top">
          <input type="search" placeholder="Search staff, department, employment type, email…" aria-label="Search staff" spellcheck="false">
        </div>
        <div class="dir-scroll">
          <table class="staff">
            <thead><tr><th>Name</th><th>Department</th><th>Type</th><th>Email</th><th>Remote</th><th>Account</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="dir-detail" data-detail></div>
      </div>`);
    container.append(root);

    const input = root.querySelector("input");
    const tbody = root.querySelector("tbody");
    const detail = root.querySelector("[data-detail]");

    input.value = uiState().query || "";

    function paint() {
      const query = uiState().query || "";
      const rows = ctx.world.people.search(query);
      const selectedId = uiState().selectedId && rows.some((p) => p.id === uiState().selectedId)
        ? uiState().selectedId
        : rows[0]?.id || null;

      tbody.innerHTML = "";
      if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="muted" style="padding:14px">Nobody matches that.</td>`;
        tbody.append(tr);
      }
      for (const person of rows) {
        const machine = ctx.world.machines.byOwner(person.id);
        const tr = document.createElement("tr");
        tr.tabIndex = 0;
        tr.dataset.person = person.id;
        tr.classList.toggle("sel", person.id === selectedId);
        tr.innerHTML = `
          <td>${ctx.ui.esc(person.displayName)}${
            person.id === ctx.world.session.current().technicianId ? ' <span class="you">you</span>' : ""
          }</td>
          <td class="muted">${ctx.ui.esc(ctx.world.people.departmentName(person.id))}</td>
          <td><span class="tag ${TYPE_CLASS[person.employmentType] || ""}">${TYPE_LABEL[person.employmentType] || person.employmentType}</span></td>
          <td class="muted tiny">${ctx.ui.esc(person.email)}</td>
          <td class="${person.remote ? "yes" : "no"}">${person.remote ? "Yes" : "No"}</td>
          <td><span class="acct ${person.account.state}">${ACCOUNT_LABEL[person.account.state] || person.account.state}</span></td>`;
        tr.addEventListener("click", () => ctx.actions.setUi("directory", { selectedId: person.id }));
        tr.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            ctx.actions.setUi("directory", { selectedId: person.id });
          }
        });
        if (machine && !ctx.world.machines.canSignIn(machine.id)) tr.classList.add("no-signin");
        tbody.append(tr);
      }

      paintDetail(selectedId);
    }

    function paintDetail(personId) {
      const person = personId ? ctx.world.people.get(personId) : null;
      if (!person) {
        detail.innerHTML = `<span class="muted tiny">Select a person to see their account.</span>`;
        return;
      }
      const manager = person.managerId ? ctx.world.people.get(person.managerId) : null;
      const machine = ctx.world.machines.byOwner(person.id);
      const groups = ctx.world.people.groupsOf(person.id);
      const shares = ctx.world.files.sharesFor(person.id);
      const signIn = machine ? ctx.world.machines.canSignIn(machine.id) : null;

      detail.innerHTML = `
        <div class="who">
          <b>${ctx.ui.esc(person.displayName)}</b>
          <span class="muted">${ctx.ui.esc(person.title)} · ${ctx.ui.esc(person.logonName)}</span>
        </div>
        <div class="facts">
          <span><i>Manager</i>${ctx.ui.esc(manager?.displayName || "—")}</span>
          <span><i>Machine</i>${ctx.ui.esc(machine?.hostname || "—")} ${
            signIn === null ? "" : signIn ? "· sign-in ok" : '· <b class="bad">sign-in blocked</b>'
          }</span>
          <span><i>Last logon</i>${ctx.ui.esc(person.account.lastLogon || "never")}</span>
          <span><i>Password</i>${ctx.ui.esc(person.account.password)}</span>
          <span class="wide"><i>Groups</i>${groups.map((g) => ctx.ui.esc(g.name)).join(", ") || "—"}</span>
          <span class="wide"><i>Share access</i>${
            shares.map((s) => `${ctx.ui.esc(s.label)} (${s.access})`).join(", ") || "None"
          }</span>
        </div>
        <div class="stopgap">
          <span class="stopgap-note">Stopgap account console. ADUC (#13) replaces this.</span>
          <div class="dir-actions">
            <button class="btn" data-reset>Reset password</button>
            <button class="btn" data-unlock${person.account.state === "locked" ? "" : " disabled"}>Unlock</button>
            <button class="btn no" data-disable${person.account.state === "disabled" ? " disabled" : ""}>Disable account</button>
            <select data-group aria-label="Add to group">
              <option value="">Add to group…</option>
              ${ctx.world.org
                .groups()
                .filter((group) => group.id !== "g_all" && !person.groupIds.includes(group.id))
                .map((group) => `<option value="${group.id}">${ctx.ui.esc(group.name)}</option>`)
                .join("")}
            </select>
            <button class="btn" data-group-add>Add</button>
          </div>
        </div>`;

      detail.querySelector("[data-reset]").addEventListener("click", () => {
        const result = ctx.actions.resetPassword(person.id, { role: "helpdesk" });
        if (result.ok) ctx.ui.toast("Directory", `Password reset for ${person.logonName}.`, "people");
      });
      detail.querySelector("[data-unlock]").addEventListener("click", () => {
        const result = ctx.actions.setAccountLocked(person.id, false, { role: "helpdesk" });
        if (result.ok) ctx.ui.toast("Directory", `${person.logonName} unlocked.`, "people");
      });
      detail.querySelector("[data-disable]").addEventListener("click", async () => {
        const yes = await ctx.ui.confirm(
          "Disable account",
          `Disable ${person.displayName} (${person.logonName})? They will lose mail delivery and sign-in until re-enabled.`,
          { ok: "Disable", cancel: "Cancel" },
        );
        if (!yes) return;
        const result = ctx.actions.setAccountEnabled(person.id, false, { role: "helpdesk" });
        if (result.ok) ctx.ui.toast("Directory", `${person.logonName} disabled.`, "people");
      });
      detail.querySelector("[data-group-add]").addEventListener("click", () => {
        const groupId = detail.querySelector("[data-group]").value;
        if (!groupId) return;
        const result = ctx.actions.addToGroup(person.id, groupId, { role: "helpdesk" });
        if (!result.ok) {
          ctx.ui.toast("Directory", `Group change failed: ${result.reason}.`, "people");
          return;
        }
        ctx.ui.toast("Directory", `${person.logonName} added to ${ctx.world.org.group(groupId)?.name}.`, "people");
      });
    }

    input.addEventListener("input", () => {
      ctx.actions.setUi("directory", { query: input.value });
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

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
.app-directory .dir { display: flex; flex-direction: column; height: 100%; }
.app-directory .dir-top { padding: 9px 10px; border-bottom: 1px solid var(--stroke); display: flex; gap: 8px; }
.app-directory .dir input {
  flex: 1; min-width: 0; background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2);
  border-radius: 4px; padding: 5px 9px; font-size: 12.5px; outline: 0; color: var(--text);
}
.app-directory .dir input:focus { border-color: var(--accent); border-bottom-width: 2px; }
.app-directory .dir-scroll { flex: 1; min-height: 0; overflow: auto; }
.app-directory table.staff { width: 100%; border-collapse: collapse; font-size: 12px; }
.app-directory table.staff th {
  position: sticky; top: 0; z-index: 1; text-align: left; font-weight: 400; color: var(--text-3);
  background: #262626; padding: 7px 10px; border-bottom: 1px solid var(--stroke);
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
}
.app-directory table.staff td { padding: 6px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.045); }
.app-directory table.staff tr { cursor: default; outline: 0; }
.app-directory table.staff tbody tr:hover td { background: var(--hover); }
.app-directory table.staff tr.sel td { background: rgba(76, 194, 255, 0.15); }
.app-directory table.staff tr:focus-visible td { box-shadow: inset 0 0 0 1px var(--accent); }
.app-directory .tag { font-size: 10.5px; padding: 1px 7px; border-radius: 9px; border: 1px solid var(--stroke-2); color: var(--text-3); }
.app-directory .tag.ft { color: #a9d5ff; border-color: rgba(120, 175, 255, 0.4); }
.app-directory .tag.ct { color: #fbd38d; border-color: rgba(251, 191, 36, 0.36); }
.app-directory .tag.in { color: #c4b5fd; border-color: rgba(167, 139, 250, 0.36); }
.app-directory .yes { color: #6ee7a0; }
.app-directory .no { color: var(--text-3); }
.app-directory .you { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--accent); border: 1px solid rgba(76, 194, 255, 0.4); border-radius: 8px; padding: 0 5px; margin-left: 4px; }
.app-directory .acct { font-size: 10.5px; padding: 1px 7px; border-radius: 9px; border: 1px solid var(--stroke-2); }
.app-directory .acct.enabled { color: #6ee7a0; border-color: rgba(74, 222, 128, 0.36); }
.app-directory .acct.locked { color: #fbd38d; border-color: rgba(251, 191, 36, 0.4); }
.app-directory .acct.disabled { color: #ff9a9a; border-color: rgba(248, 113, 113, 0.42); }
.app-directory .dir-detail {
  flex: none; border-top: 1px solid var(--stroke); padding: 9px 12px; min-height: 92px;
  background: rgba(255, 255, 255, 0.025); font-size: 11.5px;
}
.app-directory .dir-detail .who { display: flex; align-items: baseline; gap: 8px; margin-bottom: 7px; }
.app-directory .dir-detail .who b { font-size: 13px; }
.app-directory .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px; }
.app-directory .facts span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); }
.app-directory .facts span.wide { grid-column: 1 / -1; }
.app-directory .facts i { font-style: normal; color: var(--text-3); display: inline-block; min-width: 74px; }
.app-directory .facts b.bad { color: #ff9a9a; font-weight: 600; }
.app-directory .stopgap { margin-top: 9px; padding-top: 8px; border-top: 1px dashed var(--stroke-2); }
.app-directory .stopgap-note { display: block; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-3); margin-bottom: 5px; }
.app-directory .dir-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.app-directory .dir-actions .btn { padding: 4px 9px; font-size: 11.5px; }
.app-directory .dir-actions select {
  background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 4px;
  padding: 4px 6px; font-size: 11.5px; color: var(--text); outline: 0;
}
.app-directory .dir-actions select:focus { border-color: var(--accent); }
`;
