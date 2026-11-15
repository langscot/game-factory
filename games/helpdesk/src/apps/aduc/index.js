// Active Directory Users and Computers — a dsa.msc shell over the shared
// people table. Every account and group change goes through ctx.actions, so the
// ticket watcher sees the same events a real technician would generate.
//
// OU placement is console-local for now: the world has no move action yet, so
// the chosen OU is remembered in this app's UI state rather than in `people`.

const instances = new WeakMap();

const DOMAIN = "halcyon.co";
const DEFAULT_COLLAPSED = ["ou_contractors", "ou_service"];

const TABS = ["General", "Address", "Account", "Profile", "Telephones", "Organization", "Member Of"];

const ACCOUNT_LABEL = { enabled: "Enabled", locked: "Locked out", disabled: "Disabled" };

export default {
  id: "aduc",
  title: "Active Directory Users and Computers",
  icon: "aduc",
  size: [880, 620],
  desktop: true,
  pinned: true,
  fixed: true,
  order: 11,
  position: [190, 30],

  mount(container, ctx) {
    ctx.ui.styles("aduc", css);

    const uiState = () => ctx.world.session.ui("aduc");
    const selectedContainer = () => uiState().selectedContainer || "domain";
    const selectedId = () => uiState().selectedId || null;
    const collapsedSet = () => new Set(uiState().collapsed ?? DEFAULT_COLLAPSED);
    const overrides = () => uiState().ouOverrides || {};

    const sheets = [];
    let lastAction = "";

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="aduc">
        <div class="aduc-menubar">
          <button data-menu="file">File</button>
          <button data-menu="action">Action</button>
          <button data-menu="view">View</button>
          <button data-menu="help">Help</button>
        </div>
        <div class="aduc-toolbar">
          <button class="tbtn" data-act="back" title="Back" disabled>${ctx.ui.icon("$arrowLeft")}</button>
          <button class="tbtn" data-act="forward" title="Forward" disabled>${ctx.ui.icon("$arrowRight")}</button>
          <button class="tbtn" data-act="up" title="Up one level">${ctx.ui.icon("$up")}</button>
          <span class="tsep"></span>
          <button class="tbtn" data-act="refresh" title="Refresh (F5)">${ctx.ui.icon("$refresh")}</button>
          <button class="tbtn" data-act="find" title="Find (Ctrl+F)">${ctx.ui.icon("$search")}</button>
        </div>
        <div class="aduc-address" data-address></div>
        <div class="aduc-split" data-split>
          <div class="aduc-treepane" data-tree role="tree" aria-label="Console tree"></div>
          <div class="aduc-listpane">
            <div class="aduc-listhead"><span>Name</span><span>Type</span><span>Description</span></div>
            <div class="aduc-rows" data-rows role="listbox" aria-label="Contents"></div>
          </div>
        </div>
        <div class="aduc-status">
          <span data-status-count></span>
          <span class="grow" data-status-message></span>
          <span>HALCYON &middot; dsa.msc</span>
        </div>
        <div class="aduc-sheets" data-sheets></div>
      </div>`);
    container.append(root);

    const treePane = root.querySelector("[data-tree]");
    const rowsPane = root.querySelector("[data-rows]");
    const address = root.querySelector("[data-address]");
    const sheetLayer = root.querySelector("[data-sheets]");
    const countEl = root.querySelector("[data-status-count]");
    const messageEl = root.querySelector("[data-status-message]");

    // -------------------------------------------------------------------------
    // containers and membership
    // -------------------------------------------------------------------------

    function containers() {
      const departments = ctx.world.org.departments();
      const departmentOus = departments.map((department) => ({
        id: `ou_dept_${department.id}`,
        name: department.name,
        kind: "ou",
        parent: "ou_staff",
        description: `${department.name} department`,
      }));
      return [
        { id: "domain", name: DOMAIN, kind: "domain", parent: null, description: "Domain root" },
        { id: "users", name: "Users", kind: "container", parent: "domain", description: "Built-in container · all user accounts" },
        { id: "ou_staff", name: "Halcyon Staff", kind: "ou", parent: "domain", description: "Staff organizational unit" },
        ...departmentOus,
        { id: "ou_contractors", name: "Contractors", kind: "ou", parent: "domain", description: "Contractor organizational unit" },
        { id: "ou_service", name: "Service Accounts", kind: "ou", parent: "domain", description: "Service account organizational unit" },
      ];
    }

    function containerRecord(id) {
      return containers().find((entry) => entry.id === id);
    }

    function childrenOf(id) {
      return containers().filter((entry) => entry.parent === id);
    }

    function baseOu(person) {
      if (person.employmentType === "contractor") return "ou_contractors";
      return `ou_dept_${person.departmentId}`;
    }

    function ouOf(person) {
      return overrides()[person.id] || baseOu(person);
    }

    function peopleIn(id) {
      const all = ctx.world.people.all();
      if (id === "users") return all;
      return all.filter((person) => ouOf(person) === id);
    }

    function containerPath(id) {
      const trail = ["Active Directory Users and Computers"];
      const byId = new Map(containers().map((entry) => [entry.id, entry]));
      const chain = [];
      let current = byId.get(id);
      while (current) {
        chain.unshift(current.name);
        current = current.parent ? byId.get(current.parent) : null;
      }
      return [...trail, ...chain];
    }

    function reveal(id) {
      const next = collapsedSet();
      const byId = new Map(containers().map((entry) => [entry.id, entry]));
      let current = byId.get(id);
      while (current?.parent) {
        next.delete(current.parent);
        current = byId.get(current.parent);
      }
      next.delete("root");
      return [...next];
    }

    function describePerson(person) {
      const bits = [person.title, ctx.world.people.departmentName(person.id)];
      if (person.account.state === "locked") bits.push("Account is locked out");
      if (person.account.state === "disabled") bits.push("Account is disabled");
      return bits.filter(Boolean).join(" · ");
    }

    // -------------------------------------------------------------------------
    // paint
    // -------------------------------------------------------------------------

    function paint() {
      const active = document.activeElement;
      const activeInTree = treePane.contains(active);
      const activeInRows = rowsPane.contains(active);
      const focusKey = active?.dataset?.nav
        ? { attr: "nav", value: active.dataset.nav }
        : active?.dataset?.person
          ? { attr: "person", value: active.dataset.person }
          : null;

      root.classList.toggle("tree-hidden", Boolean(uiState().treeHidden));
      paintTree();
      paintList();
      paintAddress();
      paintStatus();

      for (const sheet of [...sheets]) sheet.onPaint?.();

      if (focusKey && (activeInTree || activeInRows)) {
        root.querySelector(`[data-${focusKey.attr}="${focusKey.value}"]`)?.focus({ preventScroll: true });
      }
    }

    function paintTree() {
      const byId = new Map(containers().map((entry) => [entry.id, entry]));
      const collapsed = collapsedSet();
      const chosen = selectedContainer();

      const row = (id, name, depth, kind, hasChildren, expanded, selected) => `
        <button class="tnode${selected ? " sel" : ""}" data-nav="${id}" data-depth="${depth}"
          role="treeitem" ${hasChildren ? `aria-expanded="${expanded}"` : ""}>
          <span class="chev${hasChildren ? "" : " leaf"}" data-chev="${id}">${hasChildren ? ctx.ui.icon("$chevron") : ""}</span>
          <span class="tico">${ctx.ui.icon(kind === "root" ? "aduc" : kind === "domain" ? "monitor" : "folder")}</span>
          <span class="tlabel">${ctx.ui.esc(name)}</span>
        </button>`;

      const branch = (node, depth) => {
        const kids = childrenOf(node.id);
        const expanded = !collapsed.has(node.id);
        let html = row(node.id, node.name, depth, node.kind, kids.length > 0, expanded, node.id === chosen);
        if (kids.length && expanded) {
          for (const kid of kids) html += branch(kid, depth + 1);
        }
        return html;
      };

      const rootExpanded = !collapsed.has("root");
      let html = row("root", "Active Directory Users and Computers", 0, "root", true, rootExpanded, false);
      if (rootExpanded) html += branch(byId.get("domain"), 1);
      treePane.innerHTML = html;
    }

    function paintList() {
      const chosen = selectedContainer();
      const current = containerRecord(chosen) || containerRecord("domain");
      const kids = childrenOf(current.id);
      const people = kids.length || current.kind === "domain" ? [] : peopleIn(current.id);

      rowsPane.innerHTML = "";

      for (const kid of kids) {
        const node = document.createElement("button");
        node.className = "arow container";
        node.dataset.container = kid.id;
        node.setAttribute("role", "option");
        node.innerHTML = `
          <span class="nm"><span class="arow-ico">${ctx.ui.icon(kid.id === "users" ? "people" : "folder")}</span>${ctx.ui.esc(kid.name)}</span>
          <span class="atype">${kid.kind === "ou" ? "Organizational Unit" : "Container"}</span>
          <span class="adesc">${ctx.ui.esc(kid.description)}</span>`;
        rowsPane.append(node);
      }

      const chosenPerson = selectedId();
      for (const person of people) {
        const node = document.createElement("button");
        node.className = `arow person${person.id === chosenPerson ? " sel" : ""}`;
        node.dataset.person = person.id;
        node.setAttribute("role", "option");
        node.setAttribute("aria-selected", String(person.id === chosenPerson));
        node.innerHTML = `
          <span class="nm"><span class="arow-ico">${ctx.ui.icon("$user")}</span>${ctx.ui.esc(person.displayName)}</span>
          <span class="atype">User</span>
          <span class="adesc">${ctx.ui.esc(describePerson(person))}</span>`;
        rowsPane.append(node);
      }

      if (!kids.length && !people.length) {
        const empty = document.createElement("div");
        empty.className = "aduc-empty";
        empty.textContent =
          current.id === "ou_service"
            ? "No service accounts are configured in this domain."
            : `${current.name} has no user accounts.`;
        rowsPane.append(empty);
      }

      messageEl.dataset.objectCount = String(kids.length + people.length);
    }

    function paintAddress() {
      const trail = containerPath(selectedContainer());
      address.innerHTML = `
        <span>${ctx.ui.icon("aduc")}</span>
        ${trail
          .map(
            (name, index) =>
              `<span class="crumb${index === trail.length - 1 ? " last" : ""}">${ctx.ui.esc(name)}</span>${
                index === trail.length - 1 ? "" : '<span class="sep">›</span>'
              }`,
          )
          .join("")}`;
    }

    function paintStatus() {
      const count = Number(messageEl.dataset.objectCount || 0);
      countEl.textContent = `${count} object${count === 1 ? "" : "s"}`;
      const person = selectedId() ? ctx.world.people.get(selectedId()) : null;
      messageEl.textContent =
        lastAction ||
        (person
          ? `${person.displayName} · ${person.logonName}@${DOMAIN} · ${ACCOUNT_LABEL[person.account.state] || person.account.state}`
          : "Ready");
    }

    // -------------------------------------------------------------------------
    // navigation
    // -------------------------------------------------------------------------

    function selectContainer(id) {
      ctx.actions.setUi("aduc", { selectedContainer: id, selectedId: null });
    }

    function navigate(id) {
      const next = reveal(id);
      ctx.actions.setUi("aduc", { selectedContainer: id, selectedId: null, collapsed: next });
    }

    function notify(message) {
      lastAction = message;
      ctx.ui.toast("Active Directory Users and Computers", message, "aduc");
      paintStatus();
    }

    // -------------------------------------------------------------------------
    // context menus and commands
    // -------------------------------------------------------------------------

    function personMenu(person, x, y) {
      const locked = person.account.state === "locked";
      const disabled = person.account.state === "disabled";
      ctx.ui.menu(x, y, [
        { label: "Reset Password…", icon: "$lock", onClick: () => openResetPassword(person.id) },
        {
          label: disabled ? "Enable Account" : "Disable Account",
          icon: "$user",
          onClick: () => (disabled ? enableAccount(person.id) : disableAccount(person.id)),
        },
        { label: "Unlock Account", icon: "$lock", disabled: !locked, onClick: () => unlockAccount(person.id) },
        { separator: true },
        { label: "Move…", icon: "folder", onClick: () => openMove(person.id) },
        { label: "Add to a group…", icon: "people", onClick: () => openGroupPicker(person.id) },
        { separator: true },
        { label: "Properties", icon: "$info", onClick: () => openProperties(person.id) },
      ]);
    }

    function containerMenu(node, x, y) {
      ctx.ui.menu(x, y, [
        { label: "Open", icon: "folder", onClick: () => navigate(node.id) },
        { label: "Find…", icon: "$search", shortcut: "Ctrl+F", onClick: openFind },
      ]);
    }

    function actionItems() {
      const person = selectedId() ? ctx.world.people.get(selectedId()) : null;
      const locked = person?.account.state === "locked";
      const disabled = person?.account.state === "disabled";
      return [
        { label: "Reset Password…", disabled: !person, onClick: () => person && openResetPassword(person.id) },
        {
          label: disabled ? "Enable Account" : "Disable Account",
          disabled: !person,
          onClick: () => person && (disabled ? enableAccount(person.id) : disableAccount(person.id)),
        },
        { label: "Unlock Account", disabled: !locked, onClick: () => person && unlockAccount(person.id) },
        { separator: true },
        { label: "Move…", disabled: !person, onClick: () => person && openMove(person.id) },
        { label: "Add to a group…", disabled: !person, onClick: () => person && openGroupPicker(person.id) },
        { separator: true },
        { label: "Properties", disabled: !person, onClick: () => person && openProperties(person.id) },
      ];
    }

    function openMenuFor(name, anchor) {
      const rect = anchor.getBoundingClientRect();
      let items = [];
      if (name === "file") {
        items = [
          { label: "Find…", icon: "$search", shortcut: "Ctrl+F", onClick: openFind },
          { separator: true },
          { label: "Close", onClick: () => ctx.window.close() },
        ];
      } else if (name === "action") {
        items = actionItems();
      } else if (name === "view") {
        items = [
          { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: () => paint() },
          { separator: true },
          {
            label: "Show console tree",
            checked: !uiState().treeHidden,
            onClick: () => ctx.actions.setUi("aduc", { treeHidden: !uiState().treeHidden }),
          },
          { label: "Choose Columns…", disabled: true },
        ];
      } else {
        items = [
          {
            label: "About Active Directory Users and Computers",
            icon: "$info",
            onClick: () =>
              ctx.ui.alert(
                "Active Directory Users and Computers",
                "dsa.msc · Halcyon Dynamics\n\nA console for managing users, groups and organizational units in the HALCYON domain.\n\nVersion 10.0 (Build 22621)",
              ),
          },
        ];
      }
      ctx.ui.menu(rect.left, rect.bottom + 2, items);
    }

    function enableAccount(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;
      const result = ctx.actions.setAccountEnabled(personId, true, { role: "helpdesk" });
      if (!result.ok) notify(`Could not enable ${person.logonName}: ${result.reason}.`);
      else notify(`${person.logonName} enabled.`);
    }

    async function disableAccount(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;
      const yes = await ctx.ui.confirm(
        "Disable Account",
        `Disable the account for ${person.displayName} (${person.logonName})?\n\nThey will lose sign-in and mail delivery until the account is enabled again.`,
        { ok: "Disable", cancel: "Cancel" },
      );
      if (!yes) return;
      const result = ctx.actions.setAccountEnabled(personId, false, { role: "helpdesk" });
      if (!result.ok) notify(`Could not disable ${person.logonName}: ${result.reason}.`);
      else notify(`${person.logonName} disabled.`);
    }

    function unlockAccount(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;
      if (person.account.state !== "locked") {
        notify(`${person.logonName} is not locked out.`);
        return;
      }
      const result = ctx.actions.setAccountLocked(personId, false, { role: "helpdesk" });
      if (!result.ok) notify(`Could not unlock ${person.logonName}: ${result.reason}.`);
      else notify(`${person.logonName} unlocked.`);
    }

    // -------------------------------------------------------------------------
    // sheets
    // -------------------------------------------------------------------------

    function openSheet({ title, subtitle = "", size = "", className = "", buttons = [], build, onClose = null }) {
      const overlay = document.createElement("div");
      overlay.className = `aduc-sheet ${size} ${className}`.trim();
      overlay.innerHTML = `
        <div class="aduc-card" role="dialog" aria-modal="true" aria-label="${ctx.ui.esc(title)}">
          <div class="aduc-card-head">
            <span class="aduc-card-ico">${ctx.ui.icon("aduc")}</span>
            <span class="aduc-card-title">${ctx.ui.esc(title)}</span>
            <button class="aduc-x" data-sheet-close aria-label="Close">&times;</button>
          </div>
          ${subtitle ? `<div class="aduc-card-sub">${ctx.ui.esc(subtitle)}</div>` : ""}
          <div class="aduc-card-body" data-sheet-body></div>
          <div class="aduc-card-foot" data-sheet-foot></div>
        </div>`;

      const body = overlay.querySelector("[data-sheet-body]");
      const foot = overlay.querySelector("[data-sheet-foot]");
      const entry = {
        overlay,
        body,
        foot,
        close,
        onPaint: null,
      };

      function close() {
        const index = sheets.indexOf(entry);
        if (index >= 0) sheets.splice(index, 1);
        overlay.remove();
        onClose?.();
      }

      overlay.querySelector("[data-sheet-close]").addEventListener("click", close);

      for (const spec of buttons) {
        const button = document.createElement("button");
        button.className = `btn${spec.primary ? " primary" : ""}${spec.danger ? " no" : ""}`;
        button.textContent = spec.label;
        button.addEventListener("click", () => spec.onClick?.(close));
        foot.append(button);
      }
      if (!buttons.length) foot.hidden = true;

      sheetLayer.append(overlay);
      sheets.push(entry);
      build?.({ body, foot, close, entry });

      body.querySelector("input, select, button")?.focus();
      return entry;
    }

    function openResetPassword(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;

      let bodyRef = null;
      let entry = null;

      const showError = (text) => {
        const node = bodyRef?.querySelector("[data-pw-error]");
        if (!node) return;
        node.textContent = text;
        node.hidden = !text;
      };

      const submit = (close) => {
        if (!bodyRef) return;
        const password = bodyRef.querySelector("[data-new]").value;
        const confirm = bodyRef.querySelector("[data-confirm]").value;
        if (!password) return showError("Enter a new password.");
        if (password.length < 8) return showError("The password must be at least 8 characters.");
        if (password !== confirm) return showError("The passwords do not match.");
        const result = ctx.actions.resetPassword(personId, { role: "helpdesk" });
        if (!result.ok) return showError(`The password could not be reset: ${result.reason}.`);
        // The typed value is deliberately thrown away: the world only records
        // that the account must change its password at next logon.
        close();
        notify(`Password reset for ${person.logonName}. The user must change it at next logon.`);
      };

      entry = openSheet({
        title: "Reset Password",
        subtitle: `${person.displayName} · ${person.logonName}@${DOMAIN}`,
        size: "small",
        buttons: [
          { label: "Cancel", onClick: (close) => close() },
          { label: "OK", primary: true, onClick: (close) => submit(close) },
        ],
        build: ({ body }) => {
          bodyRef = body;
          body.innerHTML = `
            <div class="pw-user">
              <span class="pw-avatar">${ctx.ui.icon("$user")}</span>
              <span><b>${ctx.ui.esc(person.displayName)}</b><small>${ctx.ui.esc(person.logonName)}@${DOMAIN}</small></span>
            </div>
            <div class="pw-field">
              <label for="aduc-new-password">New password:</label>
              <input id="aduc-new-password" type="password" data-new autocomplete="new-password" spellcheck="false">
              <label for="aduc-confirm-password">Confirm password:</label>
              <input id="aduc-confirm-password" type="password" data-confirm autocomplete="new-password" spellcheck="false">
            </div>
            <div class="pw-warn">
              <b>Do not reveal the password</b>
              You must not reveal this password to the user. The user must change the password at the next logon.
            </div>
            <div class="pw-error" data-pw-error hidden></div>`;
          const confirmInput = body.querySelector("[data-confirm]");
          confirmInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit(() => entry?.close());
            }
          });
        },
      });
    }

    function openGroupPicker(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;

      openSheet({
        title: "Add to a group",
        subtitle: `Select the groups you want to add ${person.displayName} to.`,
        size: "medium",
        buttons: [{ label: "Close", onClick: (close) => close() }],
        build: ({ body }) => {
          const draw = () => {
            const current = ctx.world.people.get(personId);
            if (!current) {
              body.innerHTML = `<div class="empty-state">That account is no longer in the directory.</div>`;
              return;
            }
            const available = ctx.world.org.groups().filter((group) => !current.groupIds.includes(group.id));
            if (!available.length) {
              body.innerHTML = `<div class="empty-state">${ctx.ui.esc(current.displayName)} is already a member of every group in the domain.</div>`;
              return;
            }
            body.innerHTML = `<div class="pick-list">${available
              .map(
                (group) => `
                <button class="pick-row" data-group="${group.id}">
                  <span class="pick-name">${ctx.ui.icon("people")}${ctx.ui.esc(group.name)}</span>
                  <span class="pick-desc">${ctx.ui.esc(group.description || "")}</span>
                  <span class="pick-add">Add</span>
                </button>`,
              )
              .join("")}</div>`;
            for (const button of body.querySelectorAll("[data-group]")) {
              button.addEventListener("click", () => {
                const result = ctx.actions.addToGroup(personId, button.dataset.group, { role: "helpdesk" });
                if (!result.ok) {
                  notify(`Group change failed: ${result.reason}.`);
                  return;
                }
                const group = ctx.world.org.group(button.dataset.group);
                notify(`${current.logonName} added to ${group?.name || button.dataset.group}.`);
                draw();
              });
            }
          };
          draw();
        },
      });
    }

    function openMove(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;

      const targets = containers().filter(
        (entry) => entry.kind === "ou" && entry.id !== "ou_staff",
      );
      const current = ouOf(person);
      let bodyRef = null;

      const submit = (close) => {
        const target = bodyRef?.querySelector('input[name="aduc-ou"]:checked')?.value;
        if (!target) return;
        const next = { ...overrides() };
        if (target === baseOu(person)) delete next[person.id];
        else next[person.id] = target;
        const destination = containerRecord(target);
        close();
        ctx.actions.setUi("aduc", {
          ouOverrides: next,
          selectedContainer: target,
          selectedId: person.id,
          collapsed: reveal(target),
        });
        notify(`${person.displayName} moved to ${destination?.name || target}.`);
      };

      openSheet({
        title: "Move",
        subtitle: `Move ${person.displayName} to another organizational unit.`,
        size: "medium",
        buttons: [
          { label: "Cancel", onClick: (close) => close() },
          { label: "OK", primary: true, onClick: (close) => submit(close) },
        ],
        build: ({ body }) => {
          bodyRef = body;
          body.innerHTML = `
            <div class="ou-list">
              ${targets
                .map(
                  (entry) => `
                  <label class="ou-row">
                    <input type="radio" name="aduc-ou" value="${entry.id}" ${entry.id === current ? "checked" : ""}>
                    <span class="ou-name">${ctx.ui.icon("folder")}${ctx.ui.esc(entry.name)}</span>
                    <span class="ou-desc">${ctx.ui.esc(entry.description)}</span>
                  </label>`,
                )
                .join("")}
            </div>`;
        },
      });
    }

    let findEntry = null;

    function openFind() {
      if (findEntry) {
        findEntry.body.querySelector("[data-find-name]")?.focus();
        return;
      }
      let chosenId = null;
      let entry = null;

      const drawResults = (body) => {
        const input = body.querySelector("[data-find-name]");
        const results = body.querySelector("[data-results]");
        const term = input.value.trim().toLowerCase();
        if (!term) {
          results.innerHTML = `<div class="find-hint">Type a name to search every OU in ${DOMAIN}.</div>`;
          return;
        }
        const matches = ctx.world.people
          .all()
          .filter(
            (person) =>
              person.displayName.toLowerCase().includes(term) ||
              person.logonName.toLowerCase().includes(term),
          );
        if (!matches.length) {
          results.innerHTML = `<div class="find-hint">No users match “${ctx.ui.esc(input.value.trim())}”.</div>`;
          return;
        }
        results.innerHTML = `
          <div class="find-head"><span>Name</span><span>Type</span><span>Description</span></div>
          ${matches
            .map(
              (person) => `
              <button class="find-row-result" data-find-person="${person.id}" role="option">
                <span>${ctx.ui.esc(person.displayName)}</span>
                <span>User</span>
                <span>${ctx.ui.esc(describePerson(person))}</span>
              </button>`,
            )
            .join("")}`;
        for (const row of results.querySelectorAll("[data-find-person]")) {
          row.addEventListener("click", () => {
            chosenId = row.dataset.findPerson;
            for (const other of results.querySelectorAll("[data-find-person]")) other.classList.remove("sel");
            row.classList.add("sel");
          });
          row.addEventListener("dblclick", () => openFromFind(row.dataset.findPerson, () => entry?.close()));
        }
      };

      entry = openSheet({
        title: "Find Users, Contacts, and Groups",
        size: "wide",
        buttons: [
          {
            label: "Properties",
            onClick: (close) => chosenId && openFromFind(chosenId, close),
          },
          { label: "Close", onClick: (close) => close() },
        ],
        onClose: () => {
          if (findEntry === entry) findEntry = null;
        },
        build: ({ body }) => {
          body.innerHTML = `
            <div class="find">
              <div class="find-row">
                <label for="aduc-find-name">Name:</label>
                <input id="aduc-find-name" data-find-name type="search" placeholder="Find a user by name" spellcheck="false" autocomplete="off">
                <button class="btn" data-find-clear>Clear</button>
              </div>
              <div class="find-scope">In: <b>${DOMAIN}</b> · every organizational unit</div>
              <div class="find-results" data-results></div>
            </div>`;
          const input = body.querySelector("[data-find-name]");
          input.addEventListener("input", () => drawResults(body));
          input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const first = body.querySelector("[data-find-person]");
            if (first) openFromFind(first.dataset.findPerson, () => entry?.close());
          });
          body.querySelector("[data-find-clear]").addEventListener("click", () => {
            input.value = "";
            drawResults(body);
            input.focus();
          });
          drawResults(body);
        },
      });
      findEntry = entry;
    }

    function openFromFind(personId, close) {
      close();
      const person = ctx.world.people.get(personId);
      if (!person) return;
      const target = ouOf(person);
      ctx.actions.setUi("aduc", {
        selectedContainer: target,
        selectedId: personId,
        collapsed: reveal(target),
      });
      openProperties(personId);
    }

    // -------------------------------------------------------------------------
    // properties
    // -------------------------------------------------------------------------

    function openProperties(personId) {
      const person = ctx.world.people.get(personId);
      if (!person) return;
      // Selection repaints the list, so a real double-click can arrive here
      // twice (manual click counting plus the native dblclick).
      if (sheets.some((sheet) => sheet.kind === "props" && sheet.personId === personId)) return;

      let tab = "General";
      let sheetBody = null;
      let entry = null;

      const draw = () => {
        if (!sheetBody) return;
        const current = ctx.world.people.get(personId);
        if (!current) return;
        for (const button of sheetBody.querySelectorAll("[data-tab]")) {
          const selected = button.dataset.tab === tab;
          button.classList.toggle("sel", selected);
          button.setAttribute("aria-selected", String(selected));
        }
        const body = sheetBody.querySelector("[data-tab-body]");
        if (!body) return;
        if (tab === "Account") {
          body.innerHTML = accountTab(current);
          wireAccount(body, current);
        } else if (tab === "Member Of") {
          body.innerHTML = memberOfTab(current);
          wireMemberOf(body, current);
        } else {
          body.innerHTML = staticTab(tab, current);
        }
      };

      entry = openSheet({
        title: `${person.displayName} Properties`,
        size: "wide",
        className: "props",
        buttons: [
          { label: "OK", primary: true, onClick: (close) => close() },
          { label: "Cancel", onClick: (close) => close() },
        ],
        build: ({ body }) => {
          sheetBody = body;
          body.innerHTML = `
            <div class="props">
              <div class="props-head">
                <span class="props-avatar">${ctx.ui.icon("$user")}</span>
                <span><b>${ctx.ui.esc(person.displayName)}</b><small>${ctx.ui.esc(person.logonName)}@${DOMAIN}</small></span>
              </div>
              <div class="props-tabs" role="tablist">
                ${TABS.map(
                  (name) =>
                    `<button class="props-tab" data-tab="${name}" role="tab" aria-selected="false">${name}</button>`,
                ).join("")}
              </div>
              <div class="props-body" data-tab-body></div>
            </div>`;
          body.querySelector(".props-tabs").addEventListener("click", (event) => {
            const button = event.target.closest("[data-tab]");
            if (!button) return;
            tab = button.dataset.tab;
            draw();
          });
          draw();
        },
      });

      entry.kind = "props";
      entry.personId = personId;
      entry.onPaint = () => {
        if (!ctx.world.people.get(personId)) {
          entry?.close();
          return;
        }
        draw();
      };
      draw();
    }

    function staticTab(tab, person) {
      if (tab === "Address") {
        return `
          <div class="prop-form">
            <label>Street:</label><input readonly value="12 Halcyon Way">
            <label>City:</label><input readonly value="London">
            <label>State/province:</label><input readonly value="Greater London">
            <label>Zip/Postal code:</label><input readonly value="EC2A 4NE">
            <label>Country/region:</label><input readonly value="United Kingdom">
          </div>`;
      }
      if (tab === "Profile") {
        return `
          <div class="prop-form">
            <label>Profile path:</label><input readonly value="\\\\HALCYON\\Profiles\\${ctx.ui.esc(person.logonName)}">
            <label>Logon script:</label><input readonly value="">
            <label>Home folder:</label><input readonly value="Connect to H: as \\\\HALCYON\\Home\\${ctx.ui.esc(person.logonName)}">
          </div>`;
      }
      if (tab === "Telephones") {
        return `
          <div class="prop-form">
            <label>Home:</label><input readonly value="">
            <label>Pager:</label><input readonly value="">
            <label>Mobile:</label><input readonly value="${ctx.ui.esc(person.phone)}">
            <label>Fax:</label><input readonly value="">
            <label>IP phone:</label><input readonly value="">
            <label>Notes:</label><input readonly value="">
          </div>`;
      }
      if (tab === "Organization") {
        const manager = person.managerId ? ctx.world.people.get(person.managerId) : null;
        return `
          <div class="prop-form">
            <label>Title:</label><input readonly value="${ctx.ui.esc(person.title)}">
            <label>Department:</label><input readonly value="${ctx.ui.esc(ctx.world.people.departmentName(person.id))}">
            <label>Company:</label><input readonly value="Halcyon Dynamics">
            <label>Manager:</label><input readonly value="${ctx.ui.esc(manager?.displayName || "")}">
            <label>Reports to:</label><input readonly value="${ctx.ui.esc(manager ? manager.logonName : "")}">
          </div>`;
      }
      const parts = person.displayName.split(" ");
      const first = parts.shift() || "";
      const last = parts.join(" ");
      return `
        <div class="prop-form">
          <label>First name:</label><input readonly value="${ctx.ui.esc(first)}">
          <label>Last name:</label><input readonly value="${ctx.ui.esc(last)}">
          <label>Display name:</label><input readonly value="${ctx.ui.esc(person.displayName)}">
          <label>Description:</label><input readonly value="${ctx.ui.esc(person.title)}">
          <label>Office:</label><input readonly value="Halcyon HQ · Floor 3">
          <label>Telephone number:</label><input readonly value="${ctx.ui.esc(person.phone)}">
          <label>E-mail:</label><input readonly value="${ctx.ui.esc(person.email)}">
        </div>`;
    }

    function accountTab(person) {
      const locked = person.account.state === "locked";
      const disabled = person.account.state === "disabled";
      const mustChange = person.account.password === "reset-required";
      const passwordStatus =
        person.account.password === "reset-required"
          ? "User must change at next logon"
          : person.account.password === "expired"
            ? "Expired"
            : "Set by the user";
      return `
        <div class="account-head">
          <b>${ctx.ui.esc(person.displayName)}</b>
          <span class="acct ${person.account.state}">${ACCOUNT_LABEL[person.account.state] || person.account.state}</span>
        </div>
        <div class="prop-form">
          <label>User logon name:</label>
          <div class="logon"><input readonly value="${ctx.ui.esc(person.logonName)}"><span class="suffix">@${DOMAIN}</span></div>
          <label>User logon name (pre-Windows 2000):</label>
          <input readonly value="HALCYON\\${ctx.ui.esc(person.logonName)}">
        </div>
        <div class="account-actions">
          <button class="btn" data-reset>Reset Password…</button>
          <button class="btn" data-unlock ${locked ? "" : "disabled"}>Unlock account</button>
          <button class="btn ${disabled ? "ok" : "no"}" data-toggle>${disabled ? "Enable account" : "Disable account"}</button>
        </div>
        <fieldset>
          <legend>Account options</legend>
          <label class="checkline"><input type="checkbox" ${mustChange ? "checked" : ""} disabled> User must change password at next logon</label>
          <label class="checkline"><input type="checkbox" disabled> User cannot change password</label>
          <label class="checkline"><input type="checkbox" checked disabled> Password never expires</label>
          <label class="checkline"><input type="checkbox" ${locked ? "checked" : ""} disabled> Account is locked out</label>
          <label class="checkline"><input type="checkbox" ${disabled ? "checked" : ""} disabled> Account is disabled</label>
        </fieldset>
        <fieldset>
          <legend>Account status</legend>
          <div class="status-line"><span>Password</span><b>${passwordStatus}</b></div>
          <div class="status-line"><span>Last logon</span><b>${ctx.ui.esc(person.account.lastLogon || "Never")}</b></div>
          <div class="status-line"><span>Logon name</span><b>HALCYON\\${ctx.ui.esc(person.logonName)}</b></div>
        </fieldset>`;
    }

    function wireAccount(body, person) {
      body.querySelector("[data-reset]").addEventListener("click", () => openResetPassword(person.id));
      body.querySelector("[data-unlock]").addEventListener("click", () => unlockAccount(person.id));
      body.querySelector("[data-toggle]").addEventListener("click", () => {
        if (person.account.state === "disabled") enableAccount(person.id);
        else disableAccount(person.id);
      });
    }

    function memberOfTab(person) {
      const groups = ctx.world.people.groupsOf(person.id);
      return `
        <div class="member-head">Member of:</div>
        <div class="member-row">
          <select class="member-list" data-groups size="8" multiple aria-label="Groups ${ctx.ui.esc(person.displayName)} belongs to">
            ${groups
              .map((group) => `<option value="${group.id}">${ctx.ui.esc(group.name)}</option>`)
              .join("")}
          </select>
          <div class="member-btns">
            <button class="btn" data-add-group>Add…</button>
            <button class="btn" data-remove-group disabled>Remove</button>
          </div>
        </div>
        <div class="status-line"><span>Primary group</span><b>Domain Users</b></div>
        <p class="note">Domain Users is the primary group and cannot be removed.</p>`;
    }

    function wireMemberOf(body, person) {
      const list = body.querySelector("[data-groups]");
      const remove = body.querySelector("[data-remove-group]");

      const syncRemove = () => {
        const chosen = [...list.selectedOptions].map((option) => option.value);
        remove.disabled = chosen.length === 0 || chosen.includes("g_all");
      };

      list.addEventListener("change", syncRemove);
      body.querySelector("[data-add-group]").addEventListener("click", () => openGroupPicker(person.id));
      remove.addEventListener("click", () => {
        const groupId = [...list.selectedOptions].map((option) => option.value).find((id) => id !== "g_all");
        if (!groupId) return;
        const result = ctx.actions.removeFromGroup(person.id, groupId, { role: "helpdesk" });
        if (!result.ok) {
          notify(`Remove failed: ${result.reason}.`);
          return;
        }
        notify(`${person.logonName} removed from ${ctx.world.org.group(groupId)?.name || groupId}.`);
      });
      syncRemove();
    }

    // -------------------------------------------------------------------------
    // wiring
    // -------------------------------------------------------------------------

    root.querySelector(".aduc-menubar").addEventListener("click", (event) => {
      const button = event.target.closest("[data-menu]");
      if (!button) return;
      openMenuFor(button.dataset.menu, button);
    });

    root.querySelector(".aduc-toolbar").addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button) return;
      if (button.dataset.act === "up") {
        const current = containerRecord(selectedContainer());
        if (current?.parent) navigate(current.parent);
      } else if (button.dataset.act === "refresh") {
        paint();
      } else if (button.dataset.act === "find") {
        openFind();
      }
    });

    treePane.addEventListener("click", (event) => {
      const node = event.target.closest("[data-nav]");
      if (!node) return;
      const id = node.dataset.nav;
      if (event.target.closest("[data-chev]") || id === "root") {
        toggleCollapsed(id);
        return;
      }
      selectContainer(id);
    });

    treePane.addEventListener("dblclick", (event) => {
      const node = event.target.closest("[data-nav]");
      if (node && node.dataset.nav !== "root") toggleCollapsed(node.dataset.nav);
    });

    treePane.addEventListener("contextmenu", (event) => {
      const node = event.target.closest("[data-nav]");
      if (!node || node.dataset.nav === "root") return;
      event.preventDefault();
      event.stopPropagation();
      const record = containerRecord(node.dataset.nav);
      if (record) containerMenu(record, event.clientX, event.clientY);
    });

    treePane.addEventListener("keydown", (event) => {
      const node = event.target.closest("[data-nav]");
      if (!node) return;
      const id = node.dataset.nav;
      const nodes = [...treePane.querySelectorAll("[data-nav]")];
      const index = nodes.indexOf(node);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = nodes[index + (event.key === "ArrowDown" ? 1 : -1)];
        next?.focus();
        return;
      }
      if (event.key === "ArrowRight" && node.getAttribute("aria-expanded") === "false") {
        event.preventDefault();
        toggleCollapsed(id);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (node.getAttribute("aria-expanded") === "true") {
          toggleCollapsed(id);
        } else {
          const parent = containerRecord(id)?.parent;
          if (parent) treePane.querySelector(`[data-nav="${parent}"]`)?.focus();
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (id === "root") toggleCollapsed(id);
        else selectContainer(id);
      }
    });

    function toggleCollapsed(id) {
      const next = collapsedSet();
      if (next.has(id)) next.delete(id);
      else next.add(id);
      ctx.actions.setUi("aduc", { collapsed: [...next] });
    }

    // The list is rebuilt on selection, so count clicks ourselves instead of
    // relying on a native dblclick surviving the first repaint.
    let lastRowClick = { id: null, at: 0 };
    rowsPane.addEventListener("click", (event) => {
      const person = event.target.closest("[data-person]");
      if (person) {
        const id = person.dataset.person;
        const at = performance.now();
        const again = lastRowClick.id === id && at - lastRowClick.at < 500;
        lastRowClick = { id: again ? null : id, at };
        if (again) {
          openProperties(id);
          return;
        }
        ctx.actions.setUi("aduc", { selectedId: id });
        return;
      }
      const folder = event.target.closest("[data-container]");
      if (folder) navigate(folder.dataset.container);
    });

    rowsPane.addEventListener("dblclick", (event) => {
      const person = event.target.closest("[data-person]");
      if (person) openProperties(person.dataset.person);
    });

    rowsPane.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      // The row is replaced by the paint below, so stop here before the
      // detached target reaches the desktop's own context menu.
      event.stopPropagation();
      const personRow = event.target.closest("[data-person]");
      if (personRow) {
        const person = ctx.world.people.get(personRow.dataset.person);
        if (!person) return;
        ctx.actions.setUi("aduc", { selectedId: person.id });
        personMenu(person, event.clientX, event.clientY);
        return;
      }
      const folderRow = event.target.closest("[data-container]");
      if (folderRow) {
        const record = containerRecord(folderRow.dataset.container);
        if (record) containerMenu(record, event.clientX, event.clientY);
      }
    });

    rowsPane.addEventListener("keydown", (event) => {
      const personRow = event.target.closest("[data-person]");
      const folderRow = event.target.closest("[data-container]");
      const row = personRow || folderRow;
      if (!row) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (personRow) openProperties(personRow.dataset.person);
        else navigate(folderRow.dataset.container);
      } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const rect = row.getBoundingClientRect();
        if (personRow) {
          const person = ctx.world.people.get(personRow.dataset.person);
          if (person) personMenu(person, rect.left + 24, rect.top + 12);
        } else {
          const record = containerRecord(folderRow.dataset.container);
          if (record) containerMenu(record, rect.left + 24, rect.top + 12);
        }
      }
    });

    const onKey = (event) => {
      const win = container.closest(".win");
      if (win && !win.classList.contains("is-focused")) return;
      // A platform dialog or context menu owns Escape while it is open.
      const modal = document.querySelector("#modal");
      if (modal && !modal.hidden) return;
      const menuLayer = document.querySelector("#ctxLayer");
      if (menuLayer && !menuLayer.hidden) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openFind();
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        paint();
        return;
      }
      if (event.key === "Escape" && sheets.length) {
        event.preventDefault();
        event.stopPropagation();
        sheets[sheets.length - 1].close();
      }
    };
    window.addEventListener("keydown", onKey, true);

    const offEvents = ctx.events.on("*", paint);

    instances.set(container, {
      stop: () => {
        offEvents?.();
        window.removeEventListener("keydown", onKey, true);
        for (const sheet of [...sheets]) sheet.close();
      },
    });

    paint();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};

const css = `
.app-aduc .aduc {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  background: #1f1f1f; color: var(--text); font-size: 12px;
  position: relative; overflow: hidden;
}
.app-aduc .aduc-menubar {
  display: flex; align-items: stretch; height: 24px; flex: none;
  background: #2b2b2b; border-bottom: 1px solid var(--stroke);
}
.app-aduc .aduc-menubar button { padding: 0 10px; font-size: 12px; color: var(--text-2); }
.app-aduc .aduc-menubar button:hover { background: var(--hover); }
.app-aduc .aduc-toolbar {
  display: flex; align-items: center; gap: 2px; height: 32px; padding: 0 6px; flex: none;
  background: #262626; border-bottom: 1px solid var(--stroke);
}
.app-aduc .tbtn {
  width: 26px; height: 24px; display: grid; place-items: center;
  border-radius: 3px; color: var(--text-2);
}
.app-aduc .tbtn svg { width: 15px; height: 15px; }
.app-aduc .tbtn:hover:not(:disabled) { background: var(--hover); }
.app-aduc .tbtn:disabled { opacity: 0.38; }
.app-aduc .tsep { width: 1px; height: 16px; background: var(--stroke-2); margin: 0 4px; }
.app-aduc .aduc-address {
  display: flex; align-items: center; gap: 5px; height: 25px; padding: 0 9px; flex: none;
  background: #1a1a1a; border-bottom: 1px solid var(--stroke);
  font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden;
}
.app-aduc .aduc-address > span:first-child { display: grid; place-items: center; }
.app-aduc .aduc-address svg { width: 13px; height: 13px; }
.app-aduc .aduc-address .crumb { color: var(--text-3); }
.app-aduc .aduc-address .crumb.last { color: var(--text); }
.app-aduc .aduc-address .sep { opacity: 0.5; }
.app-aduc .aduc-split {
  flex: 1; min-height: 0; display: grid; grid-template-columns: 268px minmax(0, 1fr);
}
.app-aduc .tree-hidden .aduc-split { grid-template-columns: minmax(0, 1fr); }
.app-aduc .tree-hidden .aduc-treepane { display: none; }
.app-aduc .aduc-treepane {
  min-width: 0; overflow: auto; padding: 5px 0 8px;
  border-right: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.015);
}
.app-aduc .tnode {
  display: flex; align-items: center; gap: 5px; width: 100%; height: 22px;
  padding-right: 6px; text-align: left; color: var(--text-2);
}
.app-aduc .tnode:hover { background: var(--hover); }
.app-aduc .tnode.sel { background: rgba(76, 194, 255, 0.18); color: #fff; }
.app-aduc .tnode:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
.app-aduc .tnode .chev {
  width: 13px; height: 13px; flex: none; display: grid; place-items: center;
  color: var(--text-3); transition: transform 0.1s;
}
.app-aduc .tnode .chev svg { width: 11px; height: 11px; }
.app-aduc .tnode[aria-expanded="true"] .chev { transform: rotate(90deg); }
.app-aduc .tnode .chev.leaf { visibility: hidden; }
.app-aduc .tnode .tico { width: 15px; height: 15px; flex: none; display: grid; place-items: center; }
.app-aduc .tnode .tico svg { width: 15px; height: 15px; }
.app-aduc .tnode .tlabel { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-aduc .tnode[data-depth="0"] { padding-left: 6px; }
.app-aduc .tnode[data-depth="1"] { padding-left: 21px; }
.app-aduc .tnode[data-depth="2"] { padding-left: 37px; }
.app-aduc .tnode[data-depth="3"] { padding-left: 53px; }
.app-aduc .aduc-listpane {
  display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #232323;
}
.app-aduc .aduc-listhead,
.app-aduc .arow { display: grid; grid-template-columns: 34% 20% minmax(0, 1fr); gap: 8px; align-items: center; }
.app-aduc .aduc-listhead {
  height: 24px; padding: 0 10px; flex: none;
  background: #262626; border-bottom: 1px solid var(--stroke);
  color: var(--text-3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
}
.app-aduc .aduc-rows { flex: 1; min-height: 0; overflow: auto; padding: 2px 0; }
.app-aduc .arow {
  width: 100%; height: 23px; padding: 0 10px; text-align: left; color: var(--text-2);
}
.app-aduc .arow:hover { background: var(--hover); }
.app-aduc .arow.sel { background: rgba(76, 194, 255, 0.2); color: #fff; }
.app-aduc .arow:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
.app-aduc .arow .nm {
  display: flex; align-items: center; gap: 6px; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-aduc .arow .arow-ico { width: 15px; height: 15px; flex: none; display: grid; place-items: center; }
.app-aduc .arow .arow-ico svg { width: 15px; height: 15px; }
.app-aduc .arow .atype,
.app-aduc .arow .adesc {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3);
}
.app-aduc .arow.sel .atype,
.app-aduc .arow.sel .adesc { color: var(--text-2); }
.app-aduc .aduc-empty { padding: 18px 14px; color: var(--text-3); font-size: 12px; }
.app-aduc .aduc-status {
  display: flex; align-items: center; gap: 14px; height: 24px; padding: 0 10px; flex: none;
  background: #262626; border-top: 1px solid var(--stroke);
  color: var(--text-3); font-size: 11px;
}
.app-aduc .aduc-status .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-aduc .aduc-sheets { position: absolute; inset: 0; pointer-events: none; }
.app-aduc .aduc-sheet {
  position: absolute; inset: 0; z-index: 5;
  display: grid; place-items: center; padding: 16px;
  background: rgba(0, 0, 0, 0.5); pointer-events: auto;
}
.app-aduc .aduc-card {
  width: 520px; max-width: 100%; max-height: 100%;
  display: flex; flex-direction: column; overflow: hidden;
  background: #282828; border: 1px solid var(--stroke-2); border-radius: 6px;
  box-shadow: 0 24px 60px -18px #000;
}
.app-aduc .aduc-sheet.wide .aduc-card { width: 700px; }
.app-aduc .aduc-sheet.small .aduc-card { width: 440px; }
.app-aduc .aduc-card-head {
  display: flex; align-items: center; gap: 8px; padding: 9px 10px; flex: none;
  background: #303030; border-bottom: 1px solid var(--stroke);
}
.app-aduc .aduc-card-ico { width: 18px; height: 18px; display: grid; place-items: center; }
.app-aduc .aduc-card-ico svg { width: 18px; height: 18px; }
.app-aduc .aduc-card-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; }
.app-aduc .aduc-x {
  width: 24px; height: 20px; border-radius: 3px;
  color: var(--text-2); font-size: 16px; line-height: 1;
}
.app-aduc .aduc-x:hover { background: #c42b1c; color: #fff; }
.app-aduc .aduc-card-sub {
  padding: 7px 14px; flex: none; border-bottom: 1px solid var(--stroke);
  color: var(--text-3); font-size: 11.5px;
}
.app-aduc .aduc-card-body { padding: 13px 14px; min-height: 0; overflow: auto; }
.app-aduc .aduc-card-foot {
  display: flex; justify-content: flex-end; gap: 8px; padding: 9px 14px; flex: none;
  background: rgba(0, 0, 0, 0.1); border-top: 1px solid var(--stroke);
}
.app-aduc .aduc-sheet.props .aduc-card-body { padding: 0; overflow: hidden; display: flex; }
.app-aduc .props { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.app-aduc .props-head {
  display: flex; align-items: center; gap: 9px; padding: 10px 14px; flex: none;
  border-bottom: 1px solid var(--stroke);
}
.app-aduc .props-avatar {
  width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%;
  background: rgba(76, 194, 255, 0.14); border: 1px solid rgba(76, 194, 255, 0.35);
}
.app-aduc .props-avatar svg { width: 17px; height: 17px; }
.app-aduc .props-head b { display: block; font-size: 13px; }
.app-aduc .props-head small { display: block; color: var(--text-3); font-size: 11px; }
.app-aduc .props-tabs {
  display: flex; flex-wrap: wrap; gap: 1px; padding: 6px 10px 0; flex: none;
  background: rgba(0, 0, 0, 0.08); border-bottom: 1px solid var(--stroke);
}
.app-aduc .props-tab {
  padding: 5px 9px; border-radius: 4px 4px 0 0; border: 1px solid transparent; border-bottom: 0;
  color: var(--text-3); font-size: 11.5px;
}
.app-aduc .props-tab:hover { background: var(--hover); }
.app-aduc .props-tab.sel { background: #282828; border-color: var(--stroke); color: #fff; }
.app-aduc .props-body { flex: 1; min-height: 0; overflow: auto; padding: 14px; }
.app-aduc .prop-form {
  display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 7px 12px; align-items: center;
}
.app-aduc .prop-form label { text-align: right; color: var(--text-3); font-size: 11.5px; }
.app-aduc .prop-form input,
.app-aduc .prop-form select {
  width: 100%; min-width: 0; outline: 0; font: inherit; font-size: 11.5px;
  padding: 4px 6px; color: var(--text); background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--stroke-2); border-radius: 3px;
}
.app-aduc .prop-form input[readonly] { color: var(--text-2); }
.app-aduc .prop-form input:focus { border-color: var(--accent); }
.app-aduc .logon { display: flex; align-items: stretch; min-width: 0; }
.app-aduc .logon input { border-radius: 3px 0 0 3px; }
.app-aduc .logon .suffix {
  display: grid; place-items: center; padding: 0 8px; border-radius: 0 3px 3px 0;
  border: 1px solid var(--stroke-2); border-left: 0; background: rgba(255, 255, 255, 0.04);
  color: var(--text-3); font-size: 11.5px; white-space: nowrap;
}
.app-aduc .account-head { display: flex; align-items: center; gap: 8px; margin-bottom: 11px; }
.app-aduc .account-head b { font-size: 13px; }
.app-aduc .acct {
  padding: 1px 7px; border-radius: 9px; border: 1px solid var(--stroke-2);
  color: var(--text-3); font-size: 10.5px;
}
.app-aduc .acct.enabled { color: #6ee7a0; border-color: rgba(74, 222, 128, 0.36); }
.app-aduc .acct.locked { color: #fbd38d; border-color: rgba(251, 191, 36, 0.4); }
.app-aduc .acct.disabled { color: #ff9a9a; border-color: rgba(248, 113, 113, 0.42); }
.app-aduc .account-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 4px; }
.app-aduc fieldset { margin: 10px 0 0; padding: 8px 10px; border: 1px solid var(--stroke); border-radius: 4px; }
.app-aduc legend { padding: 0 4px; color: var(--text-3); font-size: 11px; }
.app-aduc .checkline {
  display: flex; align-items: center; gap: 7px; padding: 2px 0;
  color: var(--text-2); font-size: 11.5px;
}
.app-aduc .checkline input { margin: 0; accent-color: var(--accent-strong); }
.app-aduc .status-line {
  display: flex; justify-content: space-between; gap: 12px; padding: 3px 0;
  color: var(--text-3); font-size: 11.5px;
}
.app-aduc .status-line b { font-weight: 400; color: var(--text-2); text-align: right; }
.app-aduc .note { margin: 10px 0 0; color: var(--text-3); font-size: 11px; line-height: 1.5; }
.app-aduc .member-head { margin-bottom: 6px; color: var(--text-2); font-size: 11.5px; }
.app-aduc .member-row { display: flex; align-items: flex-start; gap: 8px; }
.app-aduc .member-list {
  flex: 1; min-width: 0; min-height: 144px; padding: 4px; outline: 0; font: inherit; font-size: 11.5px;
  color: var(--text); background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 3px;
}
.app-aduc .member-list:focus { border-color: var(--accent); }
.app-aduc .member-btns { display: flex; flex-direction: column; gap: 6px; }
.app-aduc .pick-list { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow: auto; }
.app-aduc .pick-row {
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) 46px;
  align-items: center; gap: 10px; padding: 6px 8px; text-align: left;
  background: rgba(255, 255, 255, 0.025); border: 1px solid var(--stroke); border-radius: 4px;
}
.app-aduc .pick-row:hover { background: var(--hover); border-color: var(--stroke-2); }
.app-aduc .pick-name {
  display: flex; align-items: center; gap: 7px; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-aduc .pick-name svg { width: 14px; height: 14px; flex: none; }
.app-aduc .pick-desc {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--text-3); font-size: 11px;
}
.app-aduc .pick-add { color: var(--accent); font-size: 11px; text-align: right; }
.app-aduc .pw-user {
  display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 8px 10px;
  background: rgba(255, 255, 255, 0.025); border: 1px solid var(--stroke); border-radius: 4px;
}
.app-aduc .pw-avatar {
  width: 28px; height: 28px; display: grid; place-items: center;
  border-radius: 50%; background: rgba(76, 194, 255, 0.14);
}
.app-aduc .pw-avatar svg { width: 16px; height: 16px; }
.app-aduc .pw-user b { display: block; font-size: 12.5px; }
.app-aduc .pw-user small { display: block; color: var(--text-3); font-size: 11px; }
.app-aduc .pw-field {
  display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 8px 10px; align-items: center;
}
.app-aduc .pw-field label { text-align: right; color: var(--text-3); font-size: 11.5px; }
.app-aduc .pw-field input {
  width: 100%; min-width: 0; padding: 5px 7px; outline: 0; font: inherit; font-size: 12px;
  color: var(--text); background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 3px;
}
.app-aduc .pw-field input:focus { border-color: var(--accent); }
.app-aduc .pw-warn {
  margin-top: 12px; padding: 9px 10px; font-size: 11.5px; line-height: 1.5;
  color: #fbe3a3; background: rgba(251, 191, 36, 0.08); border-left: 2px solid #fbbf24;
}
.app-aduc .pw-warn b { display: block; margin-bottom: 2px; color: #fff; font-size: 11.5px; }
.app-aduc .pw-error { margin-top: 8px; color: #ff9a9a; font-size: 11.5px; }
.app-aduc .ou-list { display: flex; flex-direction: column; gap: 4px; }
.app-aduc .ou-row {
  display: flex; align-items: center; gap: 8px; padding: 7px 9px; cursor: pointer;
  background: rgba(255, 255, 255, 0.025); border: 1px solid var(--stroke); border-radius: 4px;
}
.app-aduc .ou-row:hover { background: var(--hover); }
.app-aduc .ou-row input { margin: 0; accent-color: var(--accent-strong); }
.app-aduc .ou-name { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.app-aduc .ou-name svg { width: 14px; height: 14px; }
.app-aduc .ou-desc { margin-left: auto; color: var(--text-3); font-size: 10.5px; }
.app-aduc .find-row { display: flex; align-items: center; gap: 8px; }
.app-aduc .find-row label { color: var(--text-3); font-size: 11.5px; }
.app-aduc .find-row input {
  flex: 1; min-width: 0; padding: 5px 8px; outline: 0; font: inherit; font-size: 12px;
  color: var(--text); background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 3px;
}
.app-aduc .find-row input:focus { border-color: var(--accent); }
.app-aduc .find-scope { margin: 8px 0; color: var(--text-3); font-size: 11px; }
.app-aduc .find-scope b { font-weight: 400; color: var(--text-2); }
.app-aduc .find-results {
  margin-top: 6px; min-height: 160px; max-height: 280px; overflow: auto;
  border: 1px solid var(--stroke); border-radius: 4px;
}
.app-aduc .find-head,
.app-aduc .find-row-result {
  display: grid; grid-template-columns: 34% 20% minmax(0, 1fr); gap: 8px; padding: 5px 9px;
}
.app-aduc .find-head {
  background: rgba(255, 255, 255, 0.05); color: var(--text-3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
}
.app-aduc .find-row-result {
  width: 100%; text-align: left; color: var(--text-2); font-size: 11.5px;
  border-top: 1px solid rgba(255, 255, 255, 0.045);
}
.app-aduc .find-row-result:hover { background: var(--hover); }
.app-aduc .find-row-result.sel { background: rgba(76, 194, 255, 0.2); color: #fff; }
.app-aduc .find-row-result span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-aduc .find-hint { padding: 22px 14px; color: var(--text-3); font-size: 11.5px; }
.app-aduc .empty-state { padding: 20px 14px; color: var(--text-3); font-size: 12px; text-align: center; }
`;
