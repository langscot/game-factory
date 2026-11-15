// Settings. Machine facts come from the store; wallpaper and accent are a
// platform preference, exposed through ctx.ui.prefs so Settings never imports
// the shell.

const instances = new WeakMap();

const TIER_LABEL = {
  1: ["Tier 1 — ageing desktop", "8.0 GB", "Intel Core i3-8100 @ 3.60GHz"],
  2: ["Tier 2 — standard issue", "16.0 GB", "Intel Core i5-10400 @ 2.90GHz"],
  3: ["Tier 3 — developer spec", "32.0 GB", "Intel Core i7-12700 @ 2.10GHz"],
};

export default {
  id: "settings",
  title: "Settings",
  icon: "settings",
  size: [800, 560],
  desktop: true,
  pinned: true,
  order: 8,
  position: [220, 60],

  mount(container, ctx) {
    ctx.ui.styles("settings", css);
    let page = "system";

    function paint() {
      const prefs = ctx.ui.prefs.get();
      const session = ctx.world.session.current();
      const machine = ctx.world.machines.byOwner(session.technicianId);
      const tier = TIER_LABEL[machine?.hardwareTier || 1] || TIER_LABEL[1];
      const software = machine ? ctx.world.machines.installedSoftware(machine.id) : [];
      const available = machine
        ? ctx.world.directoryServices.approvedSoftware().filter((app) => !machine.software.includes(app.id))
        : [];

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="set">
          <div class="set-nav">
            <button data-page="system">${ctx.ui.icon("monitor")}System</button>
            <button data-page="personal">${ctx.ui.icon("$brush")}Personalisation</button>
            <button data-page="about">${ctx.ui.icon("$info")}About</button>
          </div>
          <div class="set-main" data-main></div>
        </div>`);
      container.append(root);

      root.querySelectorAll("[data-page]").forEach((button) => {
        button.classList.toggle("sel", button.dataset.page === page);
        button.addEventListener("click", () => {
          page = button.dataset.page;
          paint();
        });
      });

      const main = root.querySelector("[data-main]");
      if (page === "system") {
        main.innerHTML = `
          <h3>System</h3>
          <div class="sub">${ctx.ui.esc(machine?.hostname || "DESKTOP")} · ${ctx.ui.esc(tier[0])}</div>
          <div class="set-card">
            <h4>Device specifications</h4>
            <div class="set-row">Processor <b>${ctx.ui.esc(tier[2])}</b></div>
            <div class="set-row">Installed RAM <b>${tier[1]}</b></div>
            <div class="set-row">Device ID <b>8C4F-2210-77AB</b></div>
            <div class="set-row">System type <b>64-bit, x64-based processor</b></div>
            <div class="set-row">Hardware tier <b>${machine?.hardwareTier || 1} of 3</b></div>
            <div class="set-row">Network <b>${machine?.network.connected ? "Connected · 1 Gbps" : "Disconnected"}</b></div>
          </div>
          <div class="set-card">
            <h4>Windows specifications</h4>
            <div class="set-row">Edition <b>${ctx.ui.esc(machine?.os || "Windows 11 Pro")}</b></div>
            <div class="set-row">OS build <b>22621.4317</b></div>
            <div class="set-row">Activation <b style="color:#fbbf24">Not activated</b></div>
          </div>
          <div class="set-card">
            <h4>Installed software</h4>
            ${
              software.length
                ? software.map((app) => `<div class="set-row">${ctx.ui.esc(app.name)} <b>${ctx.ui.esc(app.version)}</b></div>`).join("")
                : `<div class="set-row">Nothing installed. <b>Impressive.</b></div>`
            }
          </div>
          <div class="set-card">
            <h4>Install approved software</h4>
            ${
              available.length
                ? available
                    .map(
                      (app) => `<div class="set-row">${ctx.ui.esc(app.name)} <b>${ctx.ui.esc(app.version)}</b>
                        <button class="btn" data-install="${app.id}">Install</button></div>`,
                    )
                    .join("")
                : `<div class="set-row">Everything approved is already on this PC. <b>Rare.</b></div>`
            }
          </div>`;
        for (const button of main.querySelectorAll("[data-install]")) {
          button.addEventListener("click", () => {
            const result = ctx.actions.installSoftware(machine.id, button.dataset.install, { role: "helpdesk" });
            if (!result.ok) {
              ctx.ui.toast("Settings", `Install failed: ${result.reason}.`, "settings");
              return;
            }
            ctx.ui.toast("Settings", `${result.software.name} installed on ${machine.hostname}.`, "settings");
          });
        }
      } else if (page === "personal") {
        main.innerHTML = `
          <h3>Personalisation</h3>
          <div class="sub">Background, colour and the rest of it.</div>
          <div class="set-card">
            <h4>Background</h4>
            <div class="walls" data-walls></div>
          </div>
          <div class="set-card">
            <h4>Accent colour</h4>
            <div class="swatches" data-swatches></div>
          </div>`;
        const walls = main.querySelector("[data-walls]");
        for (const wallpaper of ctx.ui.prefs.wallpapers) {
          const button = ctx.ui.el(`<button class="wall-thumb${prefs.wallpaper === wallpaper.id ? " sel" : ""}" title="${wallpaper.name}">
            <i class="wallpaper ${wallpaper.id}" style="position:absolute;inset:0"></i></button>`);
          button.addEventListener("click", () => {
            ctx.ui.prefs.save({ wallpaper: wallpaper.id });
            paint();
          });
          walls.append(button);
        }
        const swatches = main.querySelector("[data-swatches]");
        for (const accent of ctx.ui.prefs.accents) {
          const button = ctx.ui.el(`<button class="swatch${prefs.accent === accent.id ? " sel" : ""}" style="background:${accent.color}" title="${accent.id}"></button>`);
          button.addEventListener("click", () => {
            ctx.ui.prefs.save({ accent: accent.id });
            paint();
          });
          swatches.append(button);
        }
      } else {
        main.innerHTML = `
          <h3>About</h3>
          <div class="sub">Halcyon Dynamics · IT Service Desk build</div>
          <div class="set-card">
            <div class="set-row">Machine name <b>${ctx.ui.esc(machine?.hostname || "DESKTOP")}</b></div>
            <div class="set-row">Assigned to <b>${ctx.ui.esc(session.technician?.logonName || "m.hayes")} (IT)</b></div>
            <div class="set-row">Shift <b>Day ${session.day} of ${session.maxDay}</b></div>
            <div class="set-row">Support ID <b>HD-${session.seed}</b></div>
            <div class="set-row">Support queue <b>tickets.halcyon.co</b></div>
          </div>
          <p class="muted tiny">This PC is managed by Halcyon Dynamics IT.</p>`;
      }
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
.app-settings .set { display: grid; grid-template-columns: 190px 1fr; height: 100%; }
.app-settings .set-nav { border-right: 1px solid var(--stroke); padding: 8px 6px; }
.app-settings .set-nav button { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; padding: 7px 9px; border-radius: 4px; font-size: 12px; color: var(--text-2); border-left: 3px solid transparent; }
.app-settings .set-nav button:hover { background: var(--hover); }
.app-settings .set-nav button.sel { background: rgba(76, 194, 255, 0.14); border-left-color: var(--accent); color: #fff; }
.app-settings .set-nav svg { width: 16px; height: 16px; }
.app-settings .set-main { overflow: auto; padding: 18px 22px; }
.app-settings .set-main h3 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
.app-settings .set-main .sub { color: var(--text-3); font-size: 12px; margin-bottom: 18px; }
.app-settings .set-card { background: rgba(255, 255, 255, 0.045); border: 1px solid var(--stroke); border-radius: 6px; padding: 12px 14px; margin-bottom: 10px; }
.app-settings .set-card h4 { margin: 0 0 8px; font-size: 12.5px; font-weight: 600; }
.app-settings .set-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; padding: 5px 0; color: var(--text-2); }
.app-settings .set-row b { font-weight: 400; color: var(--text-3); text-align: right; }
.app-settings .set-row .btn { padding: 2px 8px; font-size: 11px; margin-left: 8px; }
.app-settings .stopgap-note { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); margin-left: 6px; }
.app-settings .swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.app-settings .swatch { width: 34px; height: 34px; border-radius: 5px; border: 2px solid transparent; }
.app-settings .swatch.sel { border-color: #fff; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35); }
.app-settings .walls { display: flex; gap: 10px; }
.app-settings .wall-thumb { width: 108px; height: 62px; border-radius: 5px; border: 2px solid transparent; overflow: hidden; position: relative; }
.app-settings .wall-thumb.sel { border-color: var(--accent); }
.app-settings .wall-thumb i { position: absolute; inset: 0; display: block; }
`;
