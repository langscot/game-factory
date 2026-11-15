// The app context. Both the desktop shell and the dev harness build it, so an
// app cannot tell whether it is running on the desktop or in the harness.

export function createAppContext({ platform, ui, app, handle, options = {}, open }) {
  const disposers = [];

  const context = {
    world: platform.world,
    actions: platform.actions,
    events: {
      on: (type, handler) => {
        const off = platform.events.on(type, handler);
        disposers.push(off);
        return off;
      },
      log: () => platform.world.audit.all(),
    },
    clock: platform.clock,
    session: {
      day: () => platform.world.session.day(),
      trust: () => platform.world.session.trust(),
      shift: () => platform.world.session.shift(),
      technician: () => platform.world.session.technician(),
      hardwareTier: () => platform.world.session.hardwareTier(),
      seed: () => platform.world.session.seed(),
    },
    ui,
    options,
    open: (appId, opts) => open(appId, opts),
    window: {
      id: handle.id,
      get title() {
        return handle.title;
      },
      setTitle: (title) => handle.setTitle(title),
      close: () => handle.close(),
    },
    /** Register cleanup that runs when the window closes. */
    onDispose: (fn) => disposers.push(fn),
    dispose() {
      for (const dispose of disposers.splice(0)) dispose?.();
    },
  };

  void app;
  return context;
}
