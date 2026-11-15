// Task Manager. Processes come from the machine in the store (installed
// software and running services) plus the platform's open windows. It owns no
// data: ending a window asks the platform to close it.

const instances = new WeakMap();

export default {
  id: "taskmanager",
  title: "Task Manager",
  icon: "taskmgr",
  size: [620, 520],
  desktop: false,
  pinned: true,
  order: 9,
  position: [330, 80],

  mount(container, ctx) {
    ctx.ui.styles("taskmanager", css);
    let selectedKey = null;
    let active = true;

    const technicianMachine = () => ctx.world.machines.byOwner(ctx.world.session.current().technicianId);

    function rows() {
      const machine = technicianMachine();
      const list = (machine ? ctx.world.machines.processes(machine.id) : []).map((process, index) => ({
        key: `p:${process.name}:${index}`,
        name: process.name,
        kind: process.kind,
        icon: process.kind === "software" ? "settings" : "taskmgr",
        cpu: (ctx.clock.float(0.1, process.kind === "system" ? 2.4 : 1.6)).toFixed(1),
        mem: Math.round(ctx.clock.float(18, process.kind === "software" ? 220 : 160)),
        windowId: null,
      }));
      for (const win of ctx.ui.windows()) {
        list.push({
          key: `w:${win.id}`,
          name: win.title,
          kind: "window",
          icon: win.icon || "folder",
          cpu: ctx.clock.float(0.2, 1.8).toFixed(1),
          mem: Math.round(ctx.clock.float(40, 140)),
          windowId: win.id,
        });
      }
      return list;
    }

    function paint() {
      const list = rows();
      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="tm">
          <div class="tm-tabs"><button class="tm-tab sel">Processes</button><button class="tm-tab" disabled>Performance</button></div>
          <div class="tm-body">
            <div class="tm-head"><span>Name</span><span>CPU</span><span>Memory</span></div>
            <div class="tm-rows" data-rows></div>
            <div class="tm-bar"><i style="width:${ctx.clock.float(14, 32).toFixed(0)}%"></i></div>
            <div class="tm-foot"><button class="btn" data-end disabled>End task</button></div>
          </div>
        </div>`);
      container.append(root);

      const rowWrap = root.querySelector("[data-rows]");
      for (const process of list) {
        const row = ctx.ui.el(`<button class="tm-row${process.key === selectedKey ? " sel" : ""}">
          <span class="nm">${ctx.ui.icon(process.icon)}<span>${ctx.ui.esc(process.name)}</span></span>
          <span>${process.cpu}%</span><span>${process.mem} MB</span></button>`);
        row.addEventListener("click", () => {
          selectedKey = process.key;
          rowWrap.querySelectorAll(".tm-row").forEach((node) => node.classList.remove("sel"));
          row.classList.add("sel");
          root.querySelector("[data-end]").disabled = false;
        });
        rowWrap.append(row);
      }

      root.querySelector("[data-end]").addEventListener("click", () => {
        const process = list.find((item) => item.key === selectedKey);
        if (!process) return;
        if (process.windowId) {
          ctx.ui.endWindow(process.windowId);
          ctx.ui.toast("Task Manager", `${process.name} has been ended.`, "taskmgr");
          selectedKey = null;
          paint();
        } else {
          ctx.ui.toast("Task Manager", "Access denied. That one is holding the machine together.", "taskmgr");
        }
      });
    }

    // A platform-scheduled refresh, not setInterval: it stops with the window
    // and pauses while the tab is hidden.
    const scheduleRefresh = () => {
      ctx.clock.schedule(1.6, () => {
        if (!active) return;
        paint();
        scheduleRefresh();
      });
    };

    const offEvents = ctx.events.on("*", paint);
    instances.set(container, {
      stop: () => {
        active = false;
        offEvents?.();
      },
    });
    paint();
    scheduleRefresh();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};

const css = `
.app-taskmanager .tm { display: flex; flex-direction: column; height: 100%; }
.app-taskmanager .tm-tabs { display: flex; gap: 2px; padding: 6px 8px 0; border-bottom: 1px solid var(--stroke); }
.app-taskmanager .tm-tab { padding: 6px 10px; font-size: 12px; color: var(--text-3); border-bottom: 2px solid transparent; }
.app-taskmanager .tm-tab.sel { color: #fff; border-bottom-color: var(--accent); }
.app-taskmanager .tm-tab:disabled { opacity: 0.5; }
.app-taskmanager .tm-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.app-taskmanager .tm-head { display: grid; grid-template-columns: 1fr 70px 70px; gap: 8px; padding: 8px 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); border-bottom: 1px solid var(--stroke); }
.app-taskmanager .tm-rows { flex: 1; overflow: auto; }
.app-taskmanager .tm-row { display: grid; grid-template-columns: 1fr 70px 70px; gap: 8px; width: 100%; text-align: left; align-items: center; padding: 6px 12px; font-size: 12px; color: var(--text-2); }
.app-taskmanager .tm-row:hover { background: var(--hover); }
.app-taskmanager .tm-row.sel { background: rgba(76, 194, 255, 0.16); }
.app-taskmanager .tm-row .nm { display: flex; align-items: center; gap: 8px; min-width: 0; }
.app-taskmanager .tm-row .nm svg { width: 15px; height: 15px; flex: none; }
.app-taskmanager .tm-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--stroke); }
.app-taskmanager .tm-bar { height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.12); overflow: hidden; margin: 10px 12px; }
.app-taskmanager .tm-bar i { display: block; height: 100%; background: var(--accent); }
`;
