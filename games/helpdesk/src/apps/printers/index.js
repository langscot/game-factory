// Spool & Pray. A shell over mock printers and jobs; the only live
// input is the Print Spooler service, which turns every printer offline when
// it is stopped.

import { ensureState, readState } from "./state.js";
import { closeQueue, renderApp } from "./view.js";
import { css } from "./styles.js";

const instances = new WeakMap();

export default {
  id: "printers",
  title: "Spool & Pray",
  icon: "printer",
  size: [940, 650],
  desktop: true,
  pinned: true,
  order: 11,
  position: [150, 40],
  fixed: true,

  mount(container, ctx) {
    ctx.ui.styles("printers", css);
    ensureState(ctx);

    let active = true;
    const paint = () => {
      if (active) renderApp(container, ctx);
    };

    const offEvents = ctx.events.on("*", paint);
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !readState(ctx).queueOpen) return;
      if (!document.querySelector("#modal")?.hidden) return;
      event.preventDefault();
      closeQueue(ctx);
    };
    window.addEventListener("keydown", onKeyDown);

    instances.set(container, {
      stop() {
        active = false;
        offEvents?.();
        window.removeEventListener("keydown", onKeyDown);
      },
    });
    paint();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};
