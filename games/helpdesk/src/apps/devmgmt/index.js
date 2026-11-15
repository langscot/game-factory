// Device Manager (devmgmt.msc), shell only. The MMC tree, properties dialog and
// driver actions all run on the catalogue in ./catalogue.js plus session UI
// overrides; nothing here touches the world's machines or the real registry.

import {
  CLASSES,
  DETAIL_PROPERTIES,
  DEVICES,
  canRollBack,
  classNameFor,
  cpuName,
  driverFiles,
  propertyValue,
  statusLabel,
  statusText,
} from "./catalogue.js";
import { deviceIcon, glyph, statusGlyph } from "./art.js";
import { CSS } from "./styles.js";

const instances = new WeakMap();
const APP_ID = "devmgmt";
const TAB_NAMES = { general: "General", driver: "Driver", details: "Details" };

export default {
  id: APP_ID,
  title: "Device Manager",
  icon: "devmgmt",
  size: [840, 590],
  desktop: true,
  pinned: true,
  order: 11,
  position: [140, 30],
  fixed: true,

  mount(container, ctx) {
    ctx.ui.styles(APP_ID, CSS);

    const uiState = () => ctx.world.session.ui(APP_ID);
    const timers = new Set();
    const technicianMachine = () => ctx.world.machines.byOwner(ctx.world.session.current().technicianId);
    const hostname = () => technicianMachine()?.hostname || "DESKTOP-8H2K9L";

    let active = true;
    let selected = uiState().selectedId || "root";
    let expanded = new Set(uiState().expanded || []);
    let focusNode = null;

    // -----------------------------------------------------------------------
    // state: catalogue + session overrides
    // -----------------------------------------------------------------------

    function deviceList() {
      const overrides = uiState().devices || {};
      const tier = technicianMachine()?.hardwareTier || ctx.world.session.hardwareTier();
      return DEVICES.filter((base) => !overrides[base.id]?.removed).map((base) => {
        const override = overrides[base.id] || {};
        const record = { ...base };
        if (base.id === "dev_cpu_0") record.name = cpuName(tier);
        record.disabled = Boolean(override.disabled);
        record.status = override.disabled ? "disabled" : base.status;
        record.driver = {
          ...base.driver,
          version: override.driverVersion || base.driver.version,
          date: override.driverDate || base.driver.date,
          provider: override.driverProvider || base.driver.provider,
          signer: override.driverSigner || base.driver.signer,
          rolledBack: Boolean(override.driverVersion),
        };
        return record;
      });
    }

    const selectedDevice = (list) => {
      if (!selected.startsWith("device:")) return null;
      return list.find((device) => device.id === selected.slice(7)) || null;
    };

    function sanitizeSelection(list) {
      if (selected === "root" || selected === "machine") return;
      if (selected.startsWith("class:")) {
        const classId = selected.slice(6);
        if (!list.some((device) => device.classId === classId)) selected = "root";
        return;
      }
      if (selected.startsWith("device:")) {
        const deviceId = selected.slice(7);
        if (!list.some((device) => device.id === deviceId)) selected = "root";
        return;
      }
      selected = "root";
    }

    function selectionLabel(list) {
      if (selected.startsWith("class:")) return classNameFor(selected.slice(6));
      if (selected.startsWith("device:")) return selectedDevice(list)?.name || "Device";
      if (selected === "machine") return hostname();
      return "Device Manager";
    }

    function resultDevices(list) {
      if (selected.startsWith("class:")) {
        return list.filter((device) => device.classId === selected.slice(6));
      }
      if (selected.startsWith("device:")) {
        const current = selectedDevice(list);
        return current ? list.filter((device) => device.classId === current.classId) : list;
      }
      return list;
    }

    const parentOf = () => {
      if (selected.startsWith("device:")) {
        const current = selectedDevice(deviceList());
        return current ? `class:${current.classId}` : "machine";
      }
      if (selected.startsWith("class:")) return "machine";
      if (selected === "machine") return "root";
      return null;
    };

    const save = (patch) => ctx.actions.setUi(APP_ID, patch);

    function setDeviceOverride(deviceId, patch) {
      const devices = { ...(uiState().devices || {}) };
      devices[deviceId] = { ...(devices[deviceId] || {}), ...patch };
      save({ devices });
    }

    function restoreRemoved(deviceIds) {
      const devices = { ...(uiState().devices || {}) };
      for (const id of deviceIds) delete devices[id];
      save({ devices });
    }

    // -----------------------------------------------------------------------
    // selection + tree
    // -----------------------------------------------------------------------

    function selectNode(id, { focus = true } = {}) {
      if (selected === id) return;
      if (focus) focusNode = id;
      selected = id;
      save({ selectedId: id });
    }

    function selectDevice(deviceId) {
      if (selected === `device:${deviceId}`) return;
      selected = `device:${deviceId}`;
      save({ selectedId: selected });
    }

    function toggleClass(classId, focusId = null) {
      const next = new Set(expanded);
      if (next.has(classId)) {
        next.delete(classId);
        // Do not leave a hidden device as the selected tree node.
        const current = selectedDevice(deviceList());
        if (current?.classId === classId) selected = `class:${classId}`;
      } else {
        next.add(classId);
      }
      expanded = next;
      if (focusId) focusNode = focusId;
      save({ expanded: [...next], selectedId: selected });
    }

    function expandAll() {
      const list = deviceList();
      const ids = CLASSES.filter((entry) => list.some((device) => device.classId === entry.id)).map((entry) => entry.id);
      expanded = new Set(ids);
      save({ expanded: ids });
    }

    function collapseAll() {
      const current = selectedDevice(deviceList());
      if (current) selected = `class:${current.classId}`;
      expanded = new Set();
      save({ expanded: [], selectedId: selected });
    }

    function treeNode({ id, depth, icon, label, twisty = null, leaf = false, twistyId = null }) {
      const isSelected = selected === id;
      const twistyClass = `twisty${twisty === "open" ? " open" : ""}${leaf ? " leaf" : ""}`;
      const twistyMarkup = leaf ? "" : ctx.ui.icon("$chevron");
      return `<button class="tnode${isSelected ? " sel" : ""}" data-node="${id}" role="treeitem" title="${ctx.ui.esc(label)}"
        aria-selected="${isSelected}"${twisty === null ? "" : ` aria-expanded="${twisty === "open"}"`}
        tabindex="${isSelected ? 0 : -1}" style="padding-left:${6 + depth * 16}px">
        <span class="${twistyClass}"${twistyId ? ` data-twisty="${twistyId}"` : ""}>${twistyMarkup}</span>
        <span class="tico${id === "root" ? " root" : ""}">${icon}</span>
        <span class="tlabel">${ctx.ui.esc(label)}</span>
      </button>`;
    }

    function treeHtml(list) {
      let html = treeNode({ id: "root", depth: 0, icon: glyph("console"), label: "Device Manager", twisty: "open" });
      html += treeNode({ id: "machine", depth: 1, icon: glyph("machine"), label: hostname(), twisty: "open" });
      for (const group of CLASSES) {
        const devices = list.filter((device) => device.classId === group.id);
        if (!devices.length) continue;
        const open = expanded.has(group.id);
        html += treeNode({
          id: `class:${group.id}`,
          depth: 2,
          icon: glyph(group.id),
          label: group.name,
          twisty: open ? "open" : "",
          twistyId: group.id,
        });
        if (!open) continue;
        for (const device of devices) {
          html += treeNode({
            id: `device:${device.id}`,
            depth: 3,
            icon: deviceIcon(device),
            label: device.name,
            leaf: true,
          });
        }
      }
      return html;
    }

    function rowsHtml(list) {
      const rows = resultDevices(list);
      if (!rows.length) return `<div class="result-empty">No devices are installed for this class.</div>`;
      return rows
        .map(
          (device) => `<button class="rrow${selected === `device:${device.id}` ? " sel" : ""}"
            data-device="${device.id}" role="option" aria-selected="${selected === `device:${device.id}`}"
            aria-label="${ctx.ui.esc(device.name)}, ${ctx.ui.esc(statusLabel(device))}">
            <span class="rname"><span class="tico">${deviceIcon(device)}</span><span class="nm">${ctx.ui.esc(device.name)}</span></span>
            <span class="rclass">${ctx.ui.esc(classNameFor(device.classId))}</span>
            <span class="rstate ${device.status}">${ctx.ui.esc(statusLabel(device))}</span>
          </button>`,
        )
        .join("");
    }

    // -----------------------------------------------------------------------
    // paint
    // -----------------------------------------------------------------------

    function paint() {
      if (!active) return;
      const list = deviceList();
      sanitizeSelection(list);
      const current = selectedDevice(list);
      const label = selectionLabel(list);
      const problemCount = list.filter((device) => device.status === "problem").length;
      const oldTree = container.querySelector(".mmc-tree");
      const oldRows = container.querySelector(".result-rows");
      const treeScroll = oldTree?.scrollTop || 0;
      const rowsScroll = oldRows?.scrollTop || 0;

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="mmc">
          <div class="mmc-menu" role="menubar">
            <button data-menu="file" role="menuitem" aria-haspopup="true">File</button>
            <button data-menu="action" role="menuitem" aria-haspopup="true">Action</button>
            <button data-menu="view" role="menuitem" aria-haspopup="true">View</button>
            <button data-menu="help" role="menuitem" aria-haspopup="true">Help</button>
          </div>
          <div class="mmc-toolbar">
            <button class="tb" disabled title="Back" aria-label="Back">${ctx.ui.icon("$arrowLeft")}</button>
            <button class="tb" disabled title="Forward" aria-label="Forward">${ctx.ui.icon("$arrowRight")}</button>
            <button class="tb" data-act="up" title="Up one level" aria-label="Up one level" ${selected === "root" ? "disabled" : ""}>${ctx.ui.icon("$up")}</button>
            <button class="tb" data-act="refresh" title="Refresh" aria-label="Refresh">${ctx.ui.icon("$refresh")}</button>
            <span class="tb-sep"></span>
            <button class="tb wide" data-act="props" title="Properties" ${current ? "" : "disabled"}>${ctx.ui.icon("$info")}<span>Properties</span></button>
            <button class="tb wide" data-act="scan" title="Scan for hardware changes" aria-label="Scan for hardware changes">${glyph("scan")}<span>Scan for hardware changes</span></button>
          </div>
          <div class="mmc-path">
            ${ctx.ui.icon("monitor")}
            <span>Device Manager</span><span class="crumb">›</span>
            <span>${ctx.ui.esc(hostname())}</span><span class="crumb">›</span>
            <span class="crumb-here">${ctx.ui.esc(label)}</span>
          </div>
          <div class="mmc-main">
            <div class="mmc-tree" data-tree role="tree" aria-label="Device tree">${treeHtml(list)}</div>
            <div class="mmc-result">
              <div class="result-head"><span>Name</span><span>Type</span><span>Status</span></div>
              <div class="result-rows" data-rows role="listbox" aria-label="Devices">${rowsHtml(list)}</div>
            </div>
          </div>
          <div class="mmc-status">
            <span class="status-l">${glyph("machine")}<span>${ctx.ui.esc(label)}</span></span>
            <span class="status-r">${
              problemCount
                ? `<span class="warn">${problemCount} device${problemCount === 1 ? "" : "s"} ${problemCount === 1 ? "has" : "have"} problems</span>`
                : "No device problems detected"
            }</span>
          </div>
        </div>`);
      container.append(root);

      wireMenus(root);
      wireTree(root);
      wireResults(root);
      wireToolbar(root, list);

      if (treeScroll) root.querySelector(".mmc-tree").scrollTop = treeScroll;
      if (rowsScroll) root.querySelector(".result-rows").scrollTop = rowsScroll;
      if (focusNode) {
        root.querySelector(`[data-node="${focusNode}"]`)?.focus();
        focusNode = null;
      }
    }

    // -----------------------------------------------------------------------
    // menus
    // -----------------------------------------------------------------------

    function wireMenus(root) {
      for (const button of root.querySelectorAll("[data-menu]")) {
        button.addEventListener("click", () => {
          const rect = button.getBoundingClientRect();
          ctx.ui.menu(rect.left, rect.bottom + 2, menuItems(button.dataset.menu));
        });
      }
    }

    const scanItem = () => ({ label: "Scan for hardware changes", icon: "$refresh", onClick: scan });

    function menuItems(name) {
      if (name === "file") return [{ label: "Exit", icon: "$power", onClick: () => ctx.window.close() }];
      if (name === "action") {
        const current = selectedDevice(deviceList());
        if (current) return deviceActions(current);
        return [scanItem(), { separator: true }, { label: "Properties", icon: "$info", disabled: true }];
      }
      if (name === "view") {
        return [
          { label: "Expand All", onClick: expandAll },
          { label: "Collapse All", onClick: collapseAll },
          { separator: true },
          { label: "Refresh", icon: "$refresh", onClick: paint },
        ];
      }
      return [
        {
          label: "Help Topics",
          icon: "$info",
          onClick: () =>
            ctx.ui.alert(
              "Device Manager Help",
              "Device Manager displays the hardware installed on this computer and lets you update, disable or uninstall a device and its driver.",
            ),
        },
        {
          label: "About Device Manager",
          onClick: () =>
            ctx.ui.alert(
              "About Device Manager",
              "Device Manager\nVersion 10.0.22621.1\n\n© Halcyon Dynamics IT.",
            ),
        },
      ];
    }

    function deviceActions(device) {
      return [
        { label: "Update driver", icon: "$refresh", onClick: () => updateDriver(device.id) },
        {
          label: "Roll Back Driver",
          icon: "$arrowLeft",
          disabled: !canRollBack(device),
          onClick: () => rollBack(device.id),
        },
        { separator: true },
        device.status === "disabled"
          ? { label: "Enable device", icon: "$check", onClick: () => enableDevice(device.id) }
          : { label: "Disable device", icon: "$lock", onClick: () => disableDevice(device.id) },
        { label: "Uninstall device", icon: "$trash", danger: true, onClick: () => uninstall(device.id) },
        { separator: true },
        scanItem(),
        { label: "Properties", icon: "$info", onClick: () => openProperties(device.id) },
      ];
    }

    function openNodeMenu(nodeId, x, y) {
      if (nodeId.startsWith("device:")) {
        const device = deviceList().find((entry) => entry.id === nodeId.slice(7));
        if (device) ctx.ui.menu(x, y, deviceActions(device));
        return;
      }
      if (nodeId.startsWith("class:")) {
        const classId = nodeId.slice(6);
        ctx.ui.menu(x, y, [
          scanItem(),
          { separator: true },
          {
            label: expanded.has(classId) ? "Collapse" : "Expand",
            onClick: () => toggleClass(classId, `class:${classId}`),
          },
          { label: "Expand All", onClick: expandAll },
          { label: "Refresh", icon: "$refresh", onClick: paint },
        ]);
        return;
      }
      ctx.ui.menu(x, y, [
        scanItem(),
        { separator: true },
        { label: "Expand All", onClick: expandAll },
        { label: "Collapse All", onClick: collapseAll },
        { label: "Refresh", icon: "$refresh", onClick: paint },
      ]);
    }

    // -----------------------------------------------------------------------
    // tree + result wiring
    // -----------------------------------------------------------------------

    function wireTree(root) {
      for (const node of root.querySelectorAll("[data-node]")) {
        const nodeId = node.dataset.node;
        node.addEventListener("click", (event) => {
          const twisty = event.target.closest("[data-twisty]");
          if (twisty) {
            toggleClass(twisty.dataset.twisty, nodeId);
            return;
          }
          if (event.detail >= 2) {
            if (nodeId.startsWith("class:")) {
              toggleClass(nodeId.slice(6), nodeId);
              return;
            }
            if (nodeId.startsWith("device:")) {
              openProperties(nodeId.slice(7));
              return;
            }
          }
          selectNode(nodeId);
        });
        node.addEventListener("contextmenu", (event) => {
          // Selecting repaints the tree, which detaches this node. Stop the
          // event here so the shell's desktop menu does not take the orphan.
          event.preventDefault();
          event.stopPropagation();
          selectNode(nodeId, { focus: false });
          openNodeMenu(nodeId, event.clientX, event.clientY);
        });
        node.addEventListener("keydown", (event) => onTreeKey(event, node, nodeId));
      }
    }

    function onTreeKey(event, node, nodeId) {
      const tree = node.closest(".mmc-tree");
      const nodes = [...tree.querySelectorAll("[data-node]")];
      const index = nodes.indexOf(node);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nodes[Math.min(nodes.length - 1, index + 1)]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nodes[Math.max(0, index - 1)]?.focus();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (nodeId.startsWith("class:")) {
          const classId = nodeId.slice(6);
          if (!expanded.has(classId)) {
            toggleClass(classId, nodeId);
          } else {
            node.nextElementSibling?.focus();
          }
        }
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (nodeId.startsWith("device:")) {
          const device = deviceList().find((entry) => entry.id === nodeId.slice(7));
          node.parentElement.querySelector(`[data-node="class:${device?.classId}"]`)?.focus();
        } else if (nodeId.startsWith("class:") && expanded.has(nodeId.slice(6))) {
          toggleClass(nodeId.slice(6), nodeId);
        } else if (nodeId === "machine") {
          node.parentElement.querySelector('[data-node="root"]')?.focus();
        } else if (nodeId.startsWith("class:")) {
          node.parentElement.querySelector('[data-node="machine"]')?.focus();
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (nodeId.startsWith("device:")) {
          selectNode(nodeId);
          openProperties(nodeId.slice(7));
        } else if (nodeId.startsWith("class:")) {
          toggleClass(nodeId.slice(6), nodeId);
        } else {
          selectNode(nodeId);
        }
      }
    }

    function wireResults(root) {
      for (const row of root.querySelectorAll("[data-device]")) {
        const deviceId = row.dataset.device;
        row.addEventListener("click", (event) => {
          if (event.detail >= 2) {
            openProperties(deviceId);
            return;
          }
          selectDevice(deviceId);
        });
        row.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectDevice(deviceId);
          const device = deviceList().find((entry) => entry.id === deviceId);
          if (device) ctx.ui.menu(event.clientX, event.clientY, deviceActions(device));
        });
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            openProperties(deviceId);
          } else if (event.key === " ") {
            event.preventDefault();
            selectDevice(deviceId);
          }
        });
      }
    }

    function wireToolbar(root, list) {
      root.querySelector('[data-act="up"]')?.addEventListener("click", () => {
        const parent = parentOf();
        if (parent) selectNode(parent, { focus: false });
      });
      root.querySelector('[data-act="refresh"]')?.addEventListener("click", paint);
      root.querySelector('[data-act="props"]')?.addEventListener("click", () => {
        const current = selectedDevice(list);
        if (current) openProperties(current.id);
      });
      root.querySelector('[data-act="scan"]')?.addEventListener("click", scan);
    }

    // -----------------------------------------------------------------------
    // properties
    // -----------------------------------------------------------------------

    function openProperties(deviceId, tab = "general") {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device) return;
      ctx.ui.dialog({
        html: `<div class="app-devmgmt props">${propertiesHtml(device, tab)}</div>`,
        wire: (card) => {
          for (const button of card.querySelectorAll("[data-tab]")) {
            button.addEventListener("click", () => openProperties(deviceId, button.dataset.tab));
          }
          for (const button of card.querySelectorAll("[data-close]")) {
            button.addEventListener("click", () => ctx.ui.closeDialog());
          }
          if (tab === "driver") {
            card.querySelector('[data-driver="details"]')?.addEventListener("click", () => showDriverDetails(device));
            card.querySelector('[data-driver="update"]')?.addEventListener("click", () => updateDriver(deviceId, { reopen: true }));
            card.querySelector('[data-driver="rollback"]')?.addEventListener("click", () => rollBack(deviceId, { reopen: true }));
            card.querySelector('[data-driver="uninstall"]')?.addEventListener("click", () => uninstall(deviceId));
          }
          if (tab === "details") {
            const select = card.querySelector("[data-detail-prop]");
            const value = card.querySelector("[data-detail-value]");
            select?.addEventListener("change", () => {
              value.textContent = propertyValue(device, select.value);
            });
          }
        },
      });
    }

    function propertiesHtml(device, tab) {
      const tabs = Object.entries(TAB_NAMES)
        .map(
          ([id, label]) => `<button role="tab" aria-selected="${tab === id}" data-tab="${id}" class="${tab === id ? "sel" : ""}">${label}</button>`,
        )
        .join("");
      return `
        <div class="props-title">
          <span class="props-ico">${deviceIcon(device, "lg")}</span>
          <div><h2>${ctx.ui.esc(device.name)}</h2><p>${ctx.ui.esc(classNameFor(device.classId))}</p></div>
        </div>
        <div class="props-tabs" role="tablist">${tabs}</div>
        <div class="props-body">${tab === "general" ? generalTab(device) : tab === "driver" ? driverTab(device) : detailsTab(device)}</div>
        <div class="props-actions">
          <button class="btn primary" data-close>OK</button>
          <button class="btn" data-close>Cancel</button>
        </div>`;
    }

    function generalTab(device) {
      const problem = device.status === "problem";
      return `
        <div class="prop-row"><b>Device type</b><span>${ctx.ui.esc(classNameFor(device.classId))}</span></div>
        <div class="prop-row"><b>Manufacturer</b><span>${ctx.ui.esc(device.manufacturer)}</span></div>
        <div class="prop-row"><b>Location</b><span>${ctx.ui.esc(device.location)}</span></div>
        ${problem ? `<div class="prop-row"><b>Problem code</b><span>${device.code}</span></div>` : ""}
        <h4>Device status</h4>
        <div class="status-box ${device.status}">${statusGlyph(device.status)}<div>${ctx.ui.esc(statusText(device))}</div></div>`;
    }

    function driverTab(device) {
      return `
        <div class="prop-row"><b>Driver Provider</b><span>${ctx.ui.esc(device.driver.provider)}</span></div>
        <div class="prop-row"><b>Driver Date</b><span>${ctx.ui.esc(device.driver.date)}</span></div>
        <div class="prop-row"><b>Driver Version</b><span>${ctx.ui.esc(device.driver.version)}</span></div>
        <div class="prop-row"><b>Digital Signer</b><span>${ctx.ui.esc(device.driver.signer)}</span></div>
        ${device.driver.rolledBack ? `<p class="driver-note">Rolled back to the previously installed driver.</p>` : ""}
        <div class="driver-actions">
          <button class="btn" data-driver="details">Driver Details</button>
          <button class="btn" data-driver="update">Update Driver</button>
          <button class="btn" data-driver="rollback" ${canRollBack(device) ? "" : "disabled"}>Roll Back Driver</button>
          <button class="btn no" data-driver="uninstall">Uninstall Device</button>
        </div>`;
    }

    function detailsTab(device) {
      const options = DETAIL_PROPERTIES.map(
        ([key, label]) => `<option value="${key}">${ctx.ui.esc(label)}</option>`,
      ).join("");
      return `
        <div class="detail-field">
          <label for="devmgmt-detail-prop">Property</label>
          <select id="devmgmt-detail-prop" class="detail-select" data-detail-prop>${options}</select>
        </div>
        <div class="detail-field">
          <label>Value</label>
          <div class="detail-value" data-detail-value>${ctx.ui.esc(propertyValue(device, DETAIL_PROPERTIES[0][0]))}</div>
        </div>`;
    }

    function showDriverDetails(device) {
      const files = driverFiles(device).join("\n");
      ctx.ui.alert(
        "Driver Details",
        `Driver files:\n${files}\n\nProvider: ${device.driver.provider}\nFile version: ${device.driver.version}\n\nDigital Signer: ${device.driver.signer}`,
      );
    }

    // -----------------------------------------------------------------------
    // device actions
    // -----------------------------------------------------------------------

    function updateDriver(deviceId, { reopen = false } = {}) {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device) return;
      runProgress({
        title: "Update Drivers",
        message: `Searching for the best drivers for your device...`,
        seconds: 1.3,
        resultTitle: "Update Drivers",
        resultHtml: `<p><b>${ctx.ui.esc(device.name)}</b></p>
          <p>The best drivers for your device are already installed.</p>
          <div class="prop-row"><b>Driver version</b><span>${ctx.ui.esc(device.driver.version)}</span></div>
          <div class="prop-row"><b>Driver date</b><span>${ctx.ui.esc(device.driver.date)}</span></div>`,
        onDone: reopen ? () => openProperties(deviceId, "driver") : null,
      });
    }

    async function rollBack(deviceId, { reopen = false } = {}) {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device || !canRollBack(device)) return;
      const previous = device.driver.previous;
      const confirmed = await ctx.ui.confirm(
        "Roll Back Driver",
        `Are you sure you want to roll back to the previously installed driver?\n\n${device.name}\nCurrent version: ${device.driver.version}\nPrevious version: ${previous.version}`,
        { ok: "Yes", cancel: "No" },
      );
      if (!confirmed) return;
      setDeviceOverride(deviceId, {
        driverVersion: previous.version,
        driverDate: previous.date,
        driverProvider: previous.provider,
        driverSigner: previous.signer,
      });
      ctx.ui.toast("Device Manager", `Driver rolled back to ${previous.version} for ${device.name}.`, "devmgmt");
      if (reopen) openProperties(deviceId, "driver");
    }

    async function disableDevice(deviceId) {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device || device.status === "disabled") return;
      const confirmed = await ctx.ui.confirm(
        "Disable Device",
        `Disabling this device will cause it to stop functioning.\n\nDo you really want to disable ${device.name}?`,
        { ok: "Yes", cancel: "No" },
      );
      if (!confirmed) return;
      setDeviceOverride(deviceId, { disabled: true });
      ctx.ui.toast("Device Manager", `${device.name} is disabled.`, "devmgmt");
    }

    function enableDevice(deviceId) {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device) return;
      setDeviceOverride(deviceId, { disabled: false });
      const restored = deviceList().find((entry) => entry.id === deviceId);
      ctx.ui.toast(
        "Device Manager",
        `${device.name} is enabled${restored?.status === "problem" ? " and still reporting a problem" : ""}.`,
        "devmgmt",
      );
    }

    async function uninstall(deviceId) {
      const device = deviceList().find((entry) => entry.id === deviceId);
      if (!device) return;
      const confirmed = await ctx.ui.confirm(
        "Uninstall Device",
        `Warning: Uninstalling this device will remove its driver from the system.\n\nDo you want to uninstall ${device.name}?`,
        { ok: "Uninstall", cancel: "Cancel" },
      );
      if (!confirmed) return;
      setDeviceOverride(deviceId, { removed: true, disabled: false });
      if (selected === `device:${deviceId}`) {
        selected = `class:${device.classId}`;
        save({ selectedId: selected });
      }
      ctx.ui.closeDialog();
      ctx.ui.toast("Device Manager", `${device.name} was uninstalled. Scan for hardware changes to reinstall it.`, "devmgmt");
    }

    function scan() {
      const devices = uiState().devices || {};
      const removed = Object.entries(devices)
        .filter(([, value]) => value?.removed)
        .map(([id]) => id);
      runProgress({
        title: "Scan for hardware changes",
        message: "Scanning Plug and Play compliant hardware...",
        seconds: 1.6,
        resultTitle: "Scan for hardware changes",
        resultHtml:
          removed.length > 0
            ? `<p>Windows found ${removed.length} device${removed.length === 1 ? "" : "s"} and reinstalled the driver${removed.length === 1 ? "" : "s"}.</p>`
            : `<p>The scan is complete. No new hardware was detected.</p>`,
        onComplete: () => {
          if (removed.length) restoreRemoved(removed);
        },
      });
    }

    function runProgress({ title, message, seconds, resultTitle, resultHtml, onComplete, onDone }) {
      const card = ctx.ui.dialog({
        html: `<div class="app-devmgmt props">
          <h2>${ctx.ui.esc(title)}</h2>
          <p>${ctx.ui.esc(message)}</p>
          <div class="prog" data-prog><i></i></div>
          <p class="muted tiny">This might take a few seconds.</p>
        </div>`,
      });
      const cancel = ctx.clock.schedule(seconds, () => {
        if (!card.querySelector("[data-prog]")) return;
        onComplete?.();
        card.innerHTML = `<div class="app-devmgmt props">
          <h2>${ctx.ui.esc(resultTitle)}</h2>
          ${resultHtml}
          <div class="row"><button class="btn primary" data-progress-ok>OK</button></div>
        </div>`;
        card.querySelector("[data-progress-ok]").addEventListener("click", () => {
          ctx.ui.closeDialog();
          onDone?.();
        });
      });
      timers.add(cancel);
    }

    // -----------------------------------------------------------------------
    // lifecycle
    // -----------------------------------------------------------------------

    const offEvents = ctx.events.on("*", paint);
    instances.set(container, {
      stop() {
        active = false;
        offEvents?.();
        for (const cancel of timers) cancel();
        timers.clear();
      },
    });
    paint();
  },

  unmount(container) {
    instances.get(container)?.stop();
    instances.delete(container);
  },
};
