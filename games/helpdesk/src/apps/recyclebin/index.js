// Recycle Bin. Reads the store's recycle bin; emptying it is still a ticket.

const instances = new WeakMap();

export default {
  id: "recyclebin",
  title: "Recycle Bin",
  icon: "bin",
  size: [520, 400],
  desktop: true,
  pinned: true,
  order: 10,
  position: [360, 140],

  mount(container, ctx) {
    ctx.ui.styles("recyclebin", css);

    function paint() {
      const items = ctx.world.files.recycleBin();
      container.innerHTML = "";
      const total = items.reduce((sum, item) => sum + parseFloat(item.size || "0"), 0);
      const root = ctx.ui.el(`
        <div class="bin">
          <p class="bin-head"><b>${items.length} items</b> · ${total.toFixed(1)} GB</p>
          <div class="bin-list">${items
            .map(
              (item) => `<div class="bin-item">
                <span>${ctx.ui.esc(item.name)}</span>
                <span class="muted tiny">${ctx.ui.esc(item.kind)} · ${ctx.ui.esc(item.size)} · ${ctx.ui.esc(item.deletedAt)}</span>
              </div>`,
            )
            .join("")}</div>
          <p class="muted tiny">Emptying this is a ticket in itself. A big one. Facilities will not help.</p>
        </div>`);
      container.append(root);
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
.app-recyclebin .bin { padding: 14px 18px; font-size: 12.5px; color: var(--text-2); }
.app-recyclebin .bin-head { margin: 0 0 10px; }
.app-recyclebin .bin-list { display: grid; gap: 2px; margin-bottom: 14px; }
.app-recyclebin .bin-item { display: flex; justify-content: space-between; gap: 14px; padding: 6px 8px; border-radius: 4px; }
.app-recyclebin .bin-item:hover { background: var(--hover); }
.app-recyclebin .bin-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
