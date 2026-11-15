// Remote Deskhop (mstsc.exe). Shell only: the dialog, its options,
// a mock handshake and a remote desktop you can look at. The world supplies the
// machines; this app supplies the client. No sockets, no remote machine.

import { createConnectionDialog } from "./dialog.js";
import { createRemoteSession } from "./session.js";
import { showCredentialPrompt, showErrorDialog, showHandshake, showInfoDialog } from "./overlays.js";
import { defaultRecentHosts, ERROR_COPY, findMachine, hostLabel, pushRecent } from "./hosts.js";
import { readState, writeState } from "./state.js";
import { css } from "./css.js";

const instances = new WeakMap();

export default {
  id: "rdp",
  title: "Remote Deskhop",
  icon: "rdp",
  size: [680, 540],
  desktop: true,
  pinned: true,
  order: 11,
  position: [470, 60],

  mount(container, ctx) {
    ctx.ui.styles("rdp", css);

    const state = readState(ctx);
    if (!state.recentHosts) {
      state.recentHosts = defaultRecentHosts(ctx.world);
      writeState(ctx, { recentHosts: state.recentHosts });
    }
    if (state.connected && !ctx.world.machines.get(state.connected.machineId)) {
      state.connected = null;
      writeState(ctx, { connected: null });
    }

    const root = ctx.ui.el(`<div class="rdp-root"></div>`);
    container.append(root);

    let view = null;
    let overlay = null;
    let timers = new Set();
    let connectRun = 0;
    let disposed = false;

    const app = {
      state,
      patch(changes) {
        Object.assign(state, changes);
        if (!disposed) writeState(ctx, changes);
      },
      info(details) {
        overlay = showInfoDialog(root, { ...details, onClose: () => (overlay = null) });
      },
      notice(text) {
        app.info({ heading: "Remote Deskhop", message: text });
      },
      connect(value) {
        beginConnect(value);
      },
      disconnect() {
        disconnect();
      },
    };

    // --------------------------------------------------------------- plumbing

    function later(seconds, fn) {
      const cancel = ctx.clock.schedule(seconds, () => {
        timers.delete(cancel);
        if (!disposed) fn();
      });
      timers.add(cancel);
      return cancel;
    }

    function clearTimers() {
      for (const cancel of timers) cancel();
      timers.clear();
    }

    function closeOverlays() {
      overlay?.close();
      overlay = null;
      for (const node of root.querySelectorAll(".rdp-overlay")) node.remove();
    }

    function render() {
      view?.destroy();
      view = null;
      root.innerHTML = "";
      const title = state.connected
        ? `${state.connected.host} - Remote Deskhop`
        : "Remote Deskhop";
      ctx.window.setTitle(title);
      view = state.connected ? createRemoteSession(root, ctx, app) : createConnectionDialog(root, ctx, app);
    }

    // -------------------------------------------------------------- handshake

    function beginConnect(typedValue) {
      const typed = String(typedValue ?? state.computer).trim();
      if (!typed) return;
      connectRun += 1;
      const runId = connectRun;
      clearTimers();
      closeOverlays();

      const host = hostLabel(typed);
      const machine = findMachine(ctx.world, typed);
      app.patch({ computer: typed });

      const handshake = showHandshake(root, {
        host,
        onCancel: () => {
          if (runId !== connectRun) return;
          cancelConnect();
        },
      });
      overlay = handshake;
      const alive = () => !disposed && runId === connectRun;

      handshake.status(`Connecting to ${host}...`, 18);
      later(0.9, () => {
        if (!alive()) return;
        if (!machine) {
          fail(runId, "find", host);
          return;
        }
        if (!machine.network?.connected) {
          fail(runId, "unavailable", machine.hostname);
          return;
        }
        if (!machine.rdpEnabled) {
          fail(runId, "disabled", machine.hostname);
          return;
        }
        handshake.status(`Securing connection to ${machine.hostname}...`, 46);
        later(0.7, () => {
          if (!alive()) return;
          handshake.status("Verifying credentials...", 62);
          askCredentials(runId, machine, handshake);
        });
      });
    }

    function cancelConnect() {
      connectRun += 1;
      clearTimers();
      closeOverlays();
    }

    function fail(runId, kind, host) {
      if (runId !== connectRun) return;
      clearTimers();
      closeOverlays();
      showErrorDialog(root, {
        ...ERROR_COPY[kind](host),
        buttons: [{ label: "OK", primary: true }],
        onClose: () => (overlay = null),
      });
    }

    function askCredentials(runId, machine, handshake) {
      if (runId !== connectRun) return;
      const technician = ctx.session.technician();
      const username = state.username || (technician ? `HALCYON\\${technician.logonName}` : "");

      overlay = showCredentialPrompt(root, {
        host: machine.hostname,
        username,
        remember: Boolean(state.rememberUser),
        onSubmit: ({ username: typedUser, password, remember }) => {
          if (!credentialsValid(machine, typedUser, password)) {
            credentialsFailed(runId, machine, typedUser, remember);
            return;
          }
          clearTimers();
          handshake.status("Configuring remote session...", 88);
          later(0.9, () => {
            if (disposed || runId !== connectRun) return;
            finishConnect(machine, typedUser);
          });
        },
        onCancel: () => {
          if (runId !== connectRun) return;
          cancelConnect();
        },
      });
    }

    /** Either the technician's own account or the machine owner's can get in. */
    function credentialsValid(machine, username, password) {
      const name = String(username || "")
        .replace(/^.*\\/, "")
        .trim()
        .split("@")[0]
        .toLowerCase();
      if (!name || !String(password || "").length) return false;
      const technician = ctx.session.technician();
      const owner = ctx.world.people.get(machine.ownerId);
      return [technician?.logonName, owner?.logonName]
        .filter(Boolean)
        .some((logon) => logon.toLowerCase() === name);
    }

    function credentialsFailed(runId, machine, username, remember) {
      if (runId !== connectRun) return;
      clearTimers();
      closeOverlays();
      // Keep the name the user tried, so "Try again" starts from the same place.
      app.patch({ username: username.trim(), rememberUser: Boolean(remember) });
      showErrorDialog(root, {
        ...ERROR_COPY.credentials(machine.hostname),
        buttons: [
          { label: "Try again", primary: true, onClick: () => beginConnect() },
          { label: "Cancel" },
        ],
        onClose: () => (overlay = null),
      });
    }

    function finishConnect(machine, username) {
      connectRun += 1;
      clearTimers();
      closeOverlays();
      app.patch({
        computer: machine.hostname,
        username: username.trim(),
        recentHosts: pushRecent(state.recentHosts || [], machine.hostname),
        connected: {
          host: machine.hostname,
          machineId: machine.id,
          user: username.trim(),
          at: ctx.clock.stamp(),
        },
      });
      render();
    }

    // -------------------------------------------------------------- disconnect

    function disconnect() {
      const session = state.connected;
      if (!session) return;
      app.patch({
        connected: null,
        lastSession: { host: session.host, user: session.user, endedAt: ctx.clock.timeText() },
      });
      // mstsc closes the session window; the local desktop (and this app) stays.
      ctx.window.close();
    }

    // ------------------------------------------------------------------ mount

    render();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      connectRun += 1;
      clearTimers();
      closeOverlays();
      view?.destroy();
      view = null;
    };
    instances.set(container, cleanup);
  },

  unmount(container) {
    instances.get(container)?.();
    instances.delete(container);
  },
};
