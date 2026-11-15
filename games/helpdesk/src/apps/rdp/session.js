// The remote session: a blue connection bar, a desktop of its own and a
// remote taskbar. The machine, its owner and its software all come from the
// world; the pixels are drawn here. Nothing is actually remote.

import { machineFacts } from "./hosts.js";

const PIN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 1.4l5.2 5.2-2.9.5-3 3 .4 2.3-1.3 1.3-5.1-5.1L4 7.3l2.3.4 3-3z" fill="currentColor"/><path d="M6.3 9.7L1.8 14.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const RESTORE = `<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="0.6" y="3.2" width="6.2" height="6.2" rx="1" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M3 2.6V1.8A1.2 1.2 0 0 1 4.2.6h4.2A1.2 1.2 0 0 1 9.6 1.8v4.2A1.2 1.2 0 0 1 8.4 7.2h-.6" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
const MAXIMISE = `<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
const CLOSE = `<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>`;

// One colour per catalogue app, so the remote taskbar is not a row of blanks.
const APP_TILE = {
  sw_office: ["#c43e1c", "W"],
  sw_chrome: ["#4285f4", "C"],
  sw_slack: ["#4a154b", "S"],
  sw_vscode: ["#007acc", "V"],
  sw_notepadpp: ["#79b85a", "N"],
  sw_7zip: ["#3b3b3b", "7"],
};

const tile = (software) => {
  const [colour, letter] = APP_TILE[software.id] || ["#5b6b7c", software.name.slice(0, 1).toUpperCase()];
  return `<button class="rp-tile" data-software="${software.id}" title="${software.name}" style="--tile:${colour}">${letter}</button>`;
};

export function createRemoteSession(root, ctx, app) {
  const { state } = app;
  const connected = state.connected;
  const facts = machineFacts(ctx.world, connected.machineId);
  const host = ctx.ui.esc(connected.host);
  const rawHost = connected.host;
  const user = ctx.ui.esc(connected.user || "unknown");
  const software = facts?.software || [];

  const node = ctx.ui.el(`
    <div class="rdp-session${state.pinned ? "" : " unpinned"}${state.expanded ? "" : " restored"}">
      <div class="rdp-bar">
        <button class="rp-pin" data-pin title="${state.pinned ? "Unpin the connection bar" : "Pin the connection bar"}"
          aria-label="${state.pinned ? "Unpin the connection bar" : "Pin the connection bar"}"
          aria-pressed="${state.pinned}">${PIN}</button>
        <span class="rp-bar-title">${host}</span>
        <div class="rp-bar-actions">
          <button data-restore title="${state.expanded ? "Restore down" : "Maximise"}"
            aria-label="${state.expanded ? "Restore down" : "Maximise"}">${state.expanded ? RESTORE : MAXIMISE}</button>
          <button data-disconnect class="rp-bar-close" title="Disconnect" aria-label="Disconnect">${CLOSE}</button>
        </div>
      </div>

      <div class="rdp-canvas">
        <div class="rdp-desktop">
          <div class="rp-mono" aria-hidden="true">${ctx.ui.esc(facts?.initials || "RD")}</div>
          <div class="rp-icons">
            <button class="rp-icon" data-open-pc>${ctx.ui.icon("monitor")}<span>This PC</span></button>
            <button class="rp-icon" data-open-bin>${ctx.ui.icon("bin")}<span>Recycle Bin</span></button>
          </div>

          <div class="rp-window" data-pc-window>
            <div class="rp-titlebar">
              <div class="rp-title">${ctx.ui.icon("monitor")}<span>This PC</span></div>
              <div class="rp-captions"><i>−</i><i>▢</i><button data-close-pc aria-label="Close This PC">✕</button></div>
            </div>
            <div class="rp-body">
              <section class="rp-sec">
                <h5>Windows edition</h5>
                <p>${ctx.ui.esc(facts?.os || "Windows 11 Pro 22H2")}</p>
              </section>
              <section class="rp-sec">
                <h5>System</h5>
                <dl class="rp-rows">
                  <div><dt>Processor</dt><dd>${ctx.ui.esc(facts?.cpu || "Unknown")}</dd></div>
                  <div><dt>Installed memory (RAM)</dt><dd>${ctx.ui.esc(facts?.ram || "Unknown")}</dd></div>
                  <div><dt>Device name</dt><dd>${host}</dd></div>
                  <div><dt>Signed in as</dt><dd>${user}</dd></div>
                  <div><dt>Owner</dt><dd>${ctx.ui.esc(facts?.owner?.displayName || "Unknown")} · ${ctx.ui.esc(facts?.department || "")}</dd></div>
                  <div><dt>Remote Desktop</dt><dd class="rp-ok">${facts?.rdpService === "running" ? "Enabled" : "Service stopped"}</dd></div>
                  <div><dt>Connection</dt><dd>${ctx.ui.esc(facts?.ip || "")} · 32 ms</dd></div>
                </dl>
              </section>
              <section class="rp-sec">
                <h5>Installed software</h5>
                <div class="rp-soft">${
                  software.length
                    ? software.map((entry) => `<span>${ctx.ui.esc(entry.name)}</span>`).join("")
                    : "<span>Nothing installed.</span>"
                }</div>
              </section>
              <p class="rp-foot">Remote Desktop Services · ${host} · Session 2</p>
            </div>
          </div>

          <div class="rp-dialog" data-bin-dialog hidden>
            <div class="rp-dialog-title"><span>Recycle Bin</span><button data-close-bin aria-label="Close">✕</button></div>
            <div class="rp-dialog-body">This folder is empty.</div>
            <div class="rp-dialog-foot"><button class="rp-dialog-ok" data-close-bin>OK</button></div>
          </div>

          <div class="rp-start" data-start hidden>
            <div class="rp-start-title">Pinned</div>
            <div class="rp-start-grid">${software.map(tile).join("")}</div>
            <div class="rp-start-foot">
              <span>${ctx.ui.esc(facts?.owner?.displayName || user)}</span>
              <button data-signout>Sign out</button>
              <button data-start-disconnect>Disconnect</button>
            </div>
          </div>

          <div class="rp-taskbar">
            <button class="rp-startbtn" data-start-button title="Start" aria-label="Start">${ctx.ui.icon("$start")}</button>
            <div class="rp-search">Search</div>
            <div class="rp-apps">${software.map(tile).join("")}</div>
            <div class="rp-tray">
              <span class="rp-net" title="Connected">${ctx.ui.icon("$wifi")}</span>
              <span class="rp-clock" data-clock>${ctx.clock.timeText()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`);
  root.append(node);

  const sessionNode = node;
  const startNode = node.querySelector("[data-start]");
  const pcNode = node.querySelector("[data-pc-window]");
  const binNode = node.querySelector("[data-bin-dialog]");

  node.querySelector("[data-pin]").addEventListener("click", () => {
    const pinned = !state.pinned;
    app.patch({ pinned });
    sessionNode.classList.toggle("unpinned", !pinned);
    const button = node.querySelector("[data-pin]");
    button.setAttribute("aria-pressed", String(pinned));
    const label = pinned ? "Unpin the connection bar" : "Pin the connection bar";
    button.title = label;
    button.setAttribute("aria-label", label);
  });

  node.querySelector("[data-restore]").addEventListener("click", () => {
    const expanded = !state.expanded;
    app.patch({ expanded });
    sessionNode.classList.toggle("restored", !expanded);
    const button = node.querySelector("[data-restore]");
    const label = expanded ? "Restore down" : "Maximise";
    button.innerHTML = expanded ? RESTORE : MAXIMISE;
    button.title = label;
    button.setAttribute("aria-label", label);
  });

  node.querySelector("[data-disconnect]").addEventListener("click", () => app.disconnect());
  node.querySelector("[data-start-disconnect]").addEventListener("click", () => app.disconnect());

  node.querySelector("[data-start-button]").addEventListener("click", () => {
    startNode.hidden = !startNode.hidden;
  });
  node.querySelector("[data-signout]").addEventListener("click", () => {
    startNode.hidden = true;
    app.notice(`${rawHost} says: Windows cannot sign out from this session. Use Disconnect to close it.`);
  });

  node.querySelector("[data-open-pc]").addEventListener("click", () => {
    pcNode.hidden = false;
  });
  node.querySelector("[data-close-pc]").addEventListener("click", () => {
    pcNode.hidden = true;
  });
  node.querySelector("[data-open-bin]").addEventListener("click", () => {
    binNode.hidden = false;
  });
  for (const button of node.querySelectorAll("[data-close-bin]")) {
    button.addEventListener("click", () => {
      binNode.hidden = true;
    });
  }

  for (const button of node.querySelectorAll(".rp-tile")) {
    button.addEventListener("click", () => {
      button.classList.toggle("running");
    });
  }

  // The remote clock is the platform clock: the two machines are in the same
  // office and, more importantly, there is only one clock in the store.
  const clockNode = node.querySelector("[data-clock]");
  let accumulator = 0;
  const offTick = ctx.clock.onTick((dt) => {
    accumulator += dt;
    if (accumulator < 1) return;
    accumulator = 0;
    clockNode.textContent = ctx.clock.timeText();
  });

  return {
    destroy() {
      offTick?.();
      node.remove();
    },
  };
}
