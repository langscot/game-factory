// The mstsc connection dialog: Computer, User name, recent hosts, Show Options
// and the five option tabs. It owns no state of its own; every edit goes back
// through app.patch() so closing the window keeps the dialog as you left it.

import { TABS } from "./state.js";
import { findMachine } from "./hosts.js";

const CHEVRON = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const SAVE_PATH = "C:\\Users\\m.hayes\\Documents\\Default.rdp";

export function createConnectionDialog(root, ctx, app) {
  const { state } = app;
  const technician = ctx.session.technician();
  const defaultUser = technician ? `HALCYON\\${technician.logonName}` : "";

  const node = ctx.ui.el(`
    <div class="rdp-dialog">
      <div class="rdp-head">
        <div class="rdp-logo" aria-hidden="true">${ctx.ui.icon("rdp")}</div>
        <div class="rdp-fields">
          <div class="rdp-field">
            <label for="rdp-computer">Computer:</label>
            <input id="rdp-computer" data-computer spellcheck="false" autocomplete="off"
              placeholder="LT-PR24" value="${ctx.ui.esc(state.computer)}">
          </div>
          <div class="rdp-field">
            <label for="rdp-user">User name:</label>
            <input id="rdp-user" data-user spellcheck="false" autocomplete="off"
              placeholder="${ctx.ui.esc(defaultUser)}" value="${ctx.ui.esc(state.username)}">
          </div>
          <div class="rdp-recent" data-recent-row>
            <span>Recent:</span>
            <div class="rdp-chips" data-recents></div>
          </div>
        </div>
      </div>

      <div class="rdp-options" data-options hidden>
        <div class="rdp-tabs" role="tablist" aria-label="Connection options">
          ${TABS.map(
            (tab) =>
              `<button role="tab" class="rdp-tab" data-tab="${tab.id}" aria-selected="false">${tab.label}</button>`,
          ).join("")}
        </div>
        <div class="rdp-pane" data-pane role="tabpanel"></div>
      </div>

      <div class="rdp-recents" data-recents-panel>
        <div class="rdp-recents-head">Recent computers</div>
        <div class="rdp-recent-list" data-recent-list></div>
        <p class="rdp-recents-note">Saved on this computer. Type a name above to connect somewhere else.</p>
      </div>

      <div class="rdp-last" data-last hidden></div>

      <div class="rdp-actions">
        <button class="rdp-link" data-toggle-options><span data-toggle-label>Show Options</span>${CHEVRON}</button>
        <div class="rdp-spacer"></div>
        <button class="rdp-btn" data-help>Help</button>
        <button class="rdp-btn primary" data-connect>Connect</button>
      </div>
    </div>`);
  root.append(node);

  const computerInput = node.querySelector("[data-computer]");
  const userInput = node.querySelector("[data-user]");
  const connectButton = node.querySelector("[data-connect]");
  const optionsNode = node.querySelector("[data-options]");
  const paneNode = node.querySelector("[data-pane]");
  const toggleNode = node.querySelector("[data-toggle-options]");
  const toggleLabel = node.querySelector("[data-toggle-label]");
  const lastNode = node.querySelector("[data-last]");
  let paintedTab = null;

  // ---------------------------------------------------------------- recents

  function paintRecents() {
    const box = node.querySelector("[data-recents]");
    box.innerHTML = "";
    const hosts = state.recentHosts || [];
    if (!hosts.length) {
      box.append(ctx.ui.el(`<span class="rdp-muted">No recent computers.</span>`));
    }
    for (const host of hosts) {
      const chip = ctx.ui.el(`<button class="rdp-chip" data-host="${ctx.ui.esc(host)}" title="Use ${ctx.ui.esc(host)}">${ctx.ui.esc(host)}</button>`);
      chip.addEventListener("click", () => useHost(host));
      box.append(chip);
    }

    const list = node.querySelector("[data-recent-list]");
    list.innerHTML = "";
    for (const host of hosts) {
      const machine = findMachine(ctx.world, host);
      const owner = machine ? ctx.world.people.get(machine.ownerId) : null;
      const row = ctx.ui.el(`<button class="rdp-recent-row" data-host="${ctx.ui.esc(host)}">
        <span class="rdp-recent-ico">${ctx.ui.icon("monitor")}</span>
        <span class="rdp-recent-text"><b>${ctx.ui.esc(host)}</b>
          <span>${ctx.ui.esc(owner ? `${owner.displayName} · ${ctx.world.people.departmentName(owner.id)}` : "Unknown computer")}</span></span>
        <span class="rdp-recent-go">›</span></button>`);
      row.addEventListener("click", () => useHost(host));
      list.append(row);
    }
    if (!hosts.length) {
      list.append(ctx.ui.el(`<p class="rdp-muted" style="padding:10px">No recent computers yet.</p>`));
    }
  }

  function useHost(host) {
    computerInput.value = host;
    userInput.value = state.username || defaultUser;
    app.patch({ computer: host });
    syncConnect();
    computerInput.focus();
  }

  // ----------------------------------------------------------------- options

  function paneHtml(tab) {
    switch (tab) {
      case "display":
        return `
          <div class="rdp-group">
            <h4>Display configuration</h4>
            <div class="rdp-row">
              <label>Remote desktop size:</label>
              <input type="range" min="640" max="1920" step="16" data-opt="display.size">
              <output class="rdp-out" data-out="display.size"></output>
            </div>
            <label class="rdp-check"><input type="checkbox" data-opt="display.allMonitors"> Use all my monitors for the remote session</label>
          </div>
          <div class="rdp-group">
            <h4>Colors</h4>
            <div class="rdp-row">
              <label>Colors:</label>
              <select data-opt="display.colors">
                <option value="32">Highest Quality (32 bit)</option>
                <option value="24">True Color (24 bit)</option>
                <option value="16">High Color (16 bit)</option>
                <option value="15">High Color (15 bit)</option>
              </select>
            </div>
            <label class="rdp-check"><input type="checkbox" data-opt="display.connectionBar"> Display the connection bar when I use the full screen</label>
          </div>`;
      case "local":
        return `
          <div class="rdp-group">
            <h4>Remote audio</h4>
            <div class="rdp-row">
              <label>Remote audio playback:</label>
              <select data-opt="local.remoteAudio">
                <option value="play-here">Play on this computer</option>
                <option value="none">Do not play</option>
                <option value="play-remote">Play on remote computer</option>
              </select>
            </div>
            <button class="rdp-btn" data-info="audio">Settings...</button>
          </div>
          <div class="rdp-group">
            <h4>Keyboard</h4>
            <div class="rdp-row">
              <label>Apply Windows key combinations:</label>
              <select data-opt="local.keyboard">
                <option value="windows">Only when using the full screen</option>
                <option value="remote">On the remote computer</option>
                <option value="local">On this computer</option>
              </select>
            </div>
          </div>
          <div class="rdp-group">
            <h4>Local devices and resources</h4>
            <div class="rdp-grid2">
              <label class="rdp-check"><input type="checkbox" data-opt="local.clipboard"> Clipboard</label>
              <label class="rdp-check"><input type="checkbox" data-opt="local.printers"> Printers</label>
              <label class="rdp-check"><input type="checkbox" data-opt="local.drives"> Drives</label>
              <label class="rdp-check"><input type="checkbox" data-opt="local.smartcards"> Smart cards</label>
            </div>
            <button class="rdp-btn" data-info="devices">More...</button>
          </div>`;
      case "experience":
        return `
          <div class="rdp-group">
            <h4>Connection speed</h4>
            <div class="rdp-row">
              <label>Choose your connection speed:</label>
              <select data-opt="experience.speed">
                <option value="auto">Detect connection quality automatically</option>
                <option value="modem">Modem (56 kbps)</option>
                <option value="broadband">Low-speed broadband (256 kbps - 2 Mbps)</option>
                <option value="lan">LAN (10 Mbps or higher)</option>
              </select>
            </div>
          </div>
          <div class="rdp-group">
            <h4>Performance</h4>
            <div class="rdp-grid2">
              <label class="rdp-check"><input type="checkbox" data-opt="experience.background"> Desktop background</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.fontSmoothing"> Font smoothing</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.desktopComposition"> Desktop composition</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.windowContents"> Show window contents while dragging</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.menuAnimation"> Menu and window animation</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.visualStyles"> Visual styles</label>
              <label class="rdp-check"><input type="checkbox" data-opt="experience.bitmapCache"> Persistent bitmap caching</label>
            </div>
          </div>
          <label class="rdp-check"><input type="checkbox" data-opt="experience.reconnect"> Reconnect if the connection is dropped</label>`;
      case "advanced":
        return `
          <div class="rdp-group">
            <h4>Server authentication</h4>
            <div class="rdp-row">
              <label>Authentication:</label>
              <select data-opt="advanced.auth">
                <option value="warn">Warn me</option>
                <option value="connect">Connect and don't warn me</option>
                <option value="block">Do not connect</option>
              </select>
            </div>
            <p class="rdp-note">Verifies that the remote computer is the one you intended to connect to.</p>
          </div>
          <div class="rdp-group">
            <h4>Connect from anywhere</h4>
            <div class="rdp-row">
              <label>RD Gateway:</label>
              <select data-opt="advanced.gateway">
                <option value="auto">Automatically detect RD Gateway server settings</option>
                <option value="manual">Use these RD Gateway server settings</option>
                <option value="none">Do not use an RD Gateway server</option>
              </select>
            </div>
            <div class="rdp-row">
              <label>Server name:</label>
              <input data-opt="advanced.gatewayHost" spellcheck="false" placeholder="gateway.halcyon.co">
            </div>
            <div class="rdp-row">
              <label>Remote desktop port:</label>
              <input type="number" min="1" max="65535" data-opt="advanced.port">
            </div>
          </div>`;
      default:
        return `
          <div class="rdp-group">
            <h4>Logon settings</h4>
            <label class="rdp-check"><input type="checkbox" data-opt="general.alwaysAsk"> Always ask for credentials</label>
            <p class="rdp-note">The user name above is used when you connect.</p>
          </div>
          <div class="rdp-group">
            <h4>Connection settings</h4>
            <div class="rdp-actions-inline">
              <button class="rdp-btn" data-info="save">Save As...</button>
              <button class="rdp-btn" data-info="open">Open...</button>
            </div>
            <p class="rdp-note">Connection settings are stored in a Remote Desktop (.rdp) file.</p>
          </div>`;
    }
  }

  const INFO = {
    save: {
      heading: "Connection settings saved",
      message: `Your Remote Desktop Connection settings were saved to ${SAVE_PATH}.`,
    },
    open: {
      heading: "Open a connection file",
      message:
        "Remote Desktop Connection cannot open saved .rdp files on this PC. Type the computer name on the General tab instead.",
    },
    audio: {
      heading: "Remote audio",
      message:
        "Audio from the remote session is redirected to this computer. If the connection is slow, choose Do not play to save bandwidth.",
    },
    devices: {
      heading: "Local devices and resources",
      message:
        "Drives, printers and smart cards are redirected into the remote session when it starts. Redirecting fewer devices makes the connection faster.",
    },
  };

  function paintPane(tab) {
    paneNode.innerHTML = paneHtml(tab);
    paintedTab = tab;
    for (const input of paneNode.querySelectorAll("[data-opt]")) {
      const [group, key] = input.dataset.opt.split(".");
      const value = state.options[group][key];
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = value;

      const out = paneNode.querySelector(`[data-out="${input.dataset.opt}"]`);
      const refreshOut = () => {
        if (!out) return;
        const size = Number(input.value);
        out.textContent = `${size} × ${Math.round(size * 0.75)}`;
      };
      refreshOut();

      input.addEventListener("input", refreshOut);
      input.addEventListener("change", () => {
        const nextValue =
          input.type === "checkbox" ? input.checked : input.type === "number" || input.type === "range" ? Number(input.value) : input.value;
        app.patch({ options: { ...state.options, [group]: { ...state.options[group], [key]: nextValue } } });
        if (input.dataset.opt === "advanced.gateway") syncGateway();
      });
    }
    syncGateway();
    for (const button of paneNode.querySelectorAll("[data-info]")) {
      button.addEventListener("click", () => app.info(INFO[button.dataset.info]));
    }
  }

  function syncGateway() {
    const hostInput = paneNode.querySelector('[data-opt="advanced.gatewayHost"]');
    if (hostInput) hostInput.disabled = state.options.advanced.gateway !== "manual";
  }

  function paintTabs() {
    for (const button of node.querySelectorAll("[data-tab]")) {
      const active = button.dataset.tab === state.tab;
      button.classList.toggle("sel", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    if (paintedTab !== state.tab) paintPane(state.tab);
  }

  for (const button of node.querySelectorAll("[data-tab]")) {
    button.addEventListener("click", () => {
      if (state.tab === button.dataset.tab) return;
      app.patch({ tab: button.dataset.tab });
      paintTabs();
    });
  }

  function paintOptions() {
    optionsNode.hidden = !state.showOptions;
    node.querySelector("[data-recents-panel]").hidden = state.showOptions;
    toggleLabel.textContent = state.showOptions ? "Hide Options" : "Show Options";
    toggleNode.classList.toggle("open", state.showOptions);
    if (state.showOptions) paintTabs();
  }

  function paintLast() {
    const session = state.lastSession;
    if (!session) {
      lastNode.hidden = true;
      return;
    }
    lastNode.hidden = false;
    lastNode.innerHTML = `Last session: <b>${ctx.ui.esc(session.host)}</b> as ${ctx.ui.esc(
      session.user || "unknown",
    )} — disconnected ${ctx.ui.esc(session.endedAt || "")}`;
  }

  // ------------------------------------------------------------------ wiring

  const syncConnect = () => {
    connectButton.disabled = !computerInput.value.trim();
  };

  computerInput.addEventListener("input", syncConnect);
  computerInput.addEventListener("change", () => app.patch({ computer: computerInput.value.trim() }));
  userInput.addEventListener("change", () => app.patch({ username: userInput.value.trim() }));

  for (const input of [computerInput, userInput]) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && computerInput.value.trim()) {
        event.preventDefault();
        app.connect(computerInput.value);
      }
    });
  }

  toggleNode.addEventListener("click", () => {
    app.patch({ showOptions: !state.showOptions });
    paintOptions();
  });
  node.querySelector("[data-help]").addEventListener("click", () =>
    app.info({
      heading: "Remote Desktop Connection",
      message:
        "Remote Desktop Connection connects to a Windows computer on the Halcyon network and shows its desktop in this window.\n\nType the computer name (for example LT-PR24) and a user name, then choose Connect. For help with a machine on your desk, open a ticket for IT.",
    }),
  );
  connectButton.addEventListener("click", () => app.connect(computerInput.value));

  paintRecents();
  paintOptions();
  paintLast();
  syncConnect();
  computerInput.focus();

  return {
    destroy() {
      node.remove();
    },
  };
}
