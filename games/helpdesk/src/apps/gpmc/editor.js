// Group Policing Editor, opened from the console as a second window
// of the same app. The tree mirrors the editor's Computer/User Configuration
// shape; the detail pane writes setting values back into session.ui("gpmc"),
// which is the same state the console's Settings tab reads.

import { SETTINGS, gpoById, persist, readState, setSetting, settingValueLabel } from "./state.js";

const CATEGORY_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.2A1.2 1.2 0 0 1 2.7 3h3.1l1.2 1.4h6.3a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2z" fill="#d9a441"/></svg>';
const SETTING_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1.3" fill="#e8eef7"/><rect x="2.5" y="1.5" width="11" height="2.4" rx="1.2" fill="#2f7ad6"/><g stroke="#8fa6c4" stroke-width="1" stroke-linecap="round"><path d="M4.6 6h6.8M4.6 8.2h6.8M4.6 10.4h4.6"/></g></svg>';

const DEFAULT_OPEN = [
  "computer",
  "computer|Policies",
  "computer|Policies|Administrative Templates",
  "user",
  "user|Policies",
  "user|Policies|Administrative Templates",
];

export function mountEditor(container, ctx, gpoId) {
  const esc = (value) => ctx.ui.esc(value);
  const gpo = gpoById(gpoId);
  const openBranches = new Set(DEFAULT_OPEN);
  let selectedKey = "all";
  let selectedSettingId = null;

  const read = () => readState(ctx);
  const recordFor = (state, settingId) => (state.settings[gpo.id] || {})[settingId] || null;

  function visibleSettings() {
    if (selectedKey === "all") return SETTINGS;
    const [scope, ...path] = selectedKey.split("|");
    return SETTINGS.filter(
      (setting) =>
        setting.scope === scope && path.every((part, index) => setting.path[index] === part),
    );
  }

  function buildTree(scope) {
    const root = { name: "Policies", path: ["Policies"], children: [] };
    for (const setting of SETTINGS.filter((item) => item.scope === scope)) {
      let parent = root;
      for (let index = 1; index < setting.path.length; index += 1) {
        const path = setting.path.slice(0, index + 1);
        let child = parent.children.find((item) => item.name === setting.path[index]);
        if (!child) {
          child = { name: setting.path[index], path, children: [] };
          parent.children.push(child);
        }
        parent = child;
      }
    }
    return root;
  }

  function row({ key, label, depth, icon, hasChildren = false, open = false, selected = false }) {
    const twisty = hasChildren
      ? `<button type="button" class="gpmc-tw" data-editor-toggle="${esc(key)}" aria-label="${
          open ? "Collapse" : "Expand"
        }" aria-expanded="${open}">${open ? "\u25be" : "\u25b8"}</button>`
      : `<span class="gpmc-tw"></span>`;
    return `<div class="gpmc-trow${selected ? " sel" : ""}" style="padding-left:${6 + depth * 13}px">${twisty}
      <button type="button" class="gpmc-tlabel" data-editor-node="${esc(key)}" data-fk="editor-tree:${esc(
        key,
      )}"${selected ? ' aria-current="true"' : ""}>${icon}<span class="gpmc-ttext">${esc(label)}</span></button>
    </div>`;
  }

  function branchRows(scope, node, depth) {
    const key = `${scope}|${node.path.join("|")}`;
    const hasChildren = node.children.length > 0;
    const open = openBranches.has(key);
    let html = row({
      key,
      label: node.name,
      depth,
      icon: hasChildren ? CATEGORY_ICON : SETTING_ICON,
      hasChildren,
      open,
      selected: key === selectedKey,
    });
    if (hasChildren && open) {
      for (const child of node.children) html += branchRows(scope, child, depth + 1);
    }
    return html;
  }

  function treeHtml() {
    let html = row({
      key: "all",
      label: gpo.name,
      depth: 0,
      icon: ctx.ui.icon("gpmc"),
      selected: selectedKey === "all",
    });

    for (const [scope, label, icon] of [
      ["computer", "Computer Configuration", ctx.ui.icon("$monitor")],
      ["user", "User Configuration", ctx.ui.icon("$user")],
    ]) {
      const open = openBranches.has(scope);
      html += row({
        key: scope,
        label,
        depth: 1,
        icon,
        hasChildren: true,
        open,
        selected: selectedKey === scope,
      });
      if (!open) continue;
      html += branchRows(scope, buildTree(scope), 2);
      html += row({
        key: `${scope}|Preferences`,
        label: "Preferences",
        depth: 2,
        icon: CATEGORY_ICON,
        selected: selectedKey === `${scope}|Preferences`,
      });
    }
    return html;
  }

  function settingState(setting) {
    const state = read();
    return recordFor(state, setting.id);
  }

  function paint() {
    const state = read();
    const visible = visibleSettings();
    if (!visible.some((setting) => setting.id === selectedSettingId)) {
      selectedSettingId = visible[0]?.id || null;
    }
    const focusKey = container.contains(document.activeElement) ? document.activeElement.dataset?.fk : null;
    const selected = visible.find((setting) => setting.id === selectedSettingId) || null;
    const selectedRecord = selected ? settingState(selected) : null;
    const stateValue = selectedRecord?.state || "not-configured";
    const enabled = stateValue === "enabled";

    const settingRows = visible.length
      ? visible
          .map((setting) => {
            const record = settingState(setting);
            return `<button type="button" class="gpmc-editor-row${
              setting.id === selectedSettingId ? " sel" : ""
            }" data-editor-setting="${setting.id}" data-fk="editor-setting:${setting.id}">
              <span class="gpmc-settingname">${esc(setting.name)}<small>${esc(
                setting.path.join(" > "),
              )}</small></span>
              <span class="gpmc-state">${esc(settingValueLabel(setting, record))}</span>
              <span class="gpmc-muted">${setting.scope === "computer" ? "Computer" : "User"}</span>
            </button>`;
          })
          .join("")
      : `<div class="gpmc-empty">No settings in this branch.</div>`;

    const detail = selected
      ? `<div class="gpmc-editor-form">
            <div class="gpmc-editor-formhead"><span>${SETTING_ICON}</span><div><h3>${esc(
              selected.name,
            )}</h3><small>${esc(selected.path.join(" > "))}</small></div></div>
            <p class="gpmc-desc">${esc(selected.description)}</p>
            <div class="gpmc-radio-row" role="radiogroup" aria-label="Setting state">
              ${[
                ["not-configured", "Not Configured"],
                ["enabled", "Enabled"],
                ["disabled", "Disabled"],
              ]
                .map(
                  ([value, label]) =>
                    `<label><input type="radio" name="gpmc-state" value="${value}"${
                      stateValue === value ? " checked" : ""
                    }> ${label}</label>`,
                )
                .join("")}
            </div>
            ${
              selected.kind === "boolean"
                ? ""
                : `<label class="gpmc-form-field"><span>${
                    selected.kind === "number" ? "Value" : "Drive mappings"
                  }</span><input data-setting-value type="${selected.kind === "number" ? "number" : "text"}"${
                    selected.kind === "number"
                      ? ` min="${selected.min ?? 0}" max="${selected.max ?? 999999}" step="${selected.step ?? 1}"`
                      : ""
                  } value="${esc(selectedRecord?.value ?? "")}" placeholder="${esc(
                    selected.placeholder || "",
                  )}"${enabled ? "" : " disabled"}>${
                    selected.unit ? `<em>${esc(selected.unit)}</em>` : ""
                  }</label>`
            }
            <div class="gpmc-form-actions"><button type="button" class="btn" data-editor-apply>Apply</button>
              <span class="gpmc-muted">${
                state.lastEdited[gpo.id] ? `Last applied at ${esc(state.lastEdited[gpo.id])}` : "Not applied yet"
              }</span></div>
          </div>`
        : `<div class="gpmc-editor-form is-empty">
            <h3>${esc(gpo.name)}</h3>
            <p class="gpmc-desc">${
              selectedKey === "all" ? "No setting is selected." : "This branch has no settings."
            }</p>
          </div>`;

    const root = ctx.ui.el(`
      <div class="gpmc-shell gpmc-editor-shell">
        <div class="gpmc-menubar" role="menubar">
          <button type="button" data-editor-menu="file">File</button>
          <button type="button" data-editor-menu="action">Action</button>
          <button type="button" data-editor-menu="view">View</button>
          <button type="button" data-editor-menu="help">Help</button>
        </div>
        <div class="gpmc-toolbar">
          <button type="button" class="gpmc-tool" data-editor-act="refresh">Refresh</button>
          <span class="gpmc-tool-sep"></span>
          <button type="button" class="gpmc-tool" data-editor-act="templates">Administrative Templates</button>
        </div>
        <div class="gpmc-body is-editor">
          <div class="gpmc-tree" role="tree" aria-label="Group Policing Editor tree">${treeHtml()}</div>
          <div class="gpmc-main is-single">
            <div class="gpmc-panehead"><div><b>Group Policing Editor</b><small>${esc(
              gpo.name,
            )} · ${esc(gpo.security)}</small></div><span class="gpmc-pill">${visible.length} setting${
              visible.length === 1 ? "" : "s"
            }</span></div>
            <div class="gpmc-editor-table">
              <div class="gpmc-editor-head"><span>Setting</span><span>State</span><span>Scope</span></div>
              <div class="gpmc-editor-list">${settingRows}</div>
            </div>
            ${detail}
          </div>
        </div>
        <div class="gpmc-status">
          <span>${esc(gpo.name)} · ${esc(selectedKey === "all" ? "All settings" : selectedKey.replaceAll("|", " > "))}</span>
          <span class="gpmc-status-last">Last applied ${
            state.lastEdited[gpo.id] ? esc(state.lastEdited[gpo.id]) : "—"
          }</span>
        </div>
      </div>`);

    container.replaceChildren(root);
    wire(root, selected);

    if (focusKey) {
      [...root.querySelectorAll("[data-fk]")].find((node) => node.dataset.fk === focusKey)?.focus({ preventScroll: true });
    }
  }

  function applySelected(setting) {
    const state = read();
    const checked = container.querySelector('input[name="gpmc-state"]:checked');
    const nextState = checked?.value || "not-configured";
    const valueInput = container.querySelector("[data-setting-value]");
    const record = { state: nextState };

    if (setting.kind === "boolean") {
      record.value = nextState === "enabled";
    } else if (valueInput) {
      if (setting.kind === "number") {
        let value = Number(valueInput.value);
        if (!Number.isFinite(value)) value = setting.min ?? 0;
        value = Math.min(setting.max ?? 999999, Math.max(setting.min ?? 0, value));
        record.value = value;
      } else {
        record.value = valueInput.value.trim();
      }
    }

    persist(ctx, {
      settings: setSetting(state, gpo.id, setting.id, record),
      lastEdited: { ...state.lastEdited, [gpo.id]: ctx.clock.timeText() },
      lastAction: `Edited ${setting.name} on ${gpo.name}`,
    });
    paint();
    ctx.ui.toast("Group Policing Editor", `${setting.name} applied to ${gpo.name}.`, "gpmc");
  }

  function wire(root, selected) {
    root.querySelectorAll("[data-editor-menu]").forEach((button) => {
      button.addEventListener("click", () => openMenu(button.dataset.editorMenu, button));
    });
    root.querySelectorAll("[data-editor-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.editorToggle;
        if (openBranches.has(key)) openBranches.delete(key);
        else openBranches.add(key);
        paint();
      });
    });
    root.querySelectorAll("[data-editor-node]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKey = button.dataset.editorNode;
        selectedSettingId = null;
        paint();
      });
    });
    root.querySelectorAll("[data-editor-setting]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSettingId = button.dataset.editorSetting;
        paint();
      });
    });
    root.querySelectorAll("[data-editor-act]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.editorAct === "refresh") paint();
        if (button.dataset.editorAct === "templates") {
          selectedKey = "computer|Policies|Administrative Templates";
          selectedSettingId = null;
          paint();
        }
      });
    });

    const valueInput = root.querySelector("[data-setting-value]");
    root.querySelectorAll('input[name="gpmc-state"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const enabledNow = root.querySelector('input[name="gpmc-state"]:checked')?.value === "enabled";
        if (valueInput) valueInput.disabled = !enabledNow;
      });
    });

    root.querySelector("[data-editor-apply]")?.addEventListener("click", () => {
      if (selected) applySelected(selected);
    });
  }

  function openMenu(kind, button) {
    const rect = button.getBoundingClientRect();
    const x = rect.left;
    const y = rect.bottom + 2;
    if (kind === "file") {
      ctx.ui.menu(x, y, [{ label: "Exit", onClick: () => ctx.window.close() }]);
    } else if (kind === "action") {
      ctx.ui.menu(x, y, [
        { label: "Refresh", icon: "$refresh", onClick: paint },
        { separator: true },
        {
          label: "Administrative Templates",
          onClick: () => {
            selectedKey = "computer|Policies|Administrative Templates";
            selectedSettingId = null;
            paint();
          },
        },
      ]);
    } else if (kind === "view") {
      ctx.ui.menu(x, y, [
        { label: "Show All Settings", checked: selectedKey === "all", onClick: () => {
          selectedKey = "all";
          selectedSettingId = null;
          paint();
        } },
        { separator: true },
        { label: "Refresh", icon: "$refresh", onClick: paint },
      ]);
    } else {
      ctx.ui.menu(x, y, [
        {
          label: "About Group Policing Editor",
          onClick: () =>
            ctx.ui.alert(
              "Group Policing Editor",
              "Group Policing Editor\n\nUse this editor to change the settings in a Group Policing object.\n\nVersion 10.0 (Build 22621)",
            ),
        },
      ]);
    }
  }

  const off = ctx.events.on("ui:changed", paint);
  const stop = () => off?.();
  ctx.onDispose(stop);
  paint();
  return stop;
}
