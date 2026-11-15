// One bus, one audit log. Every action that changes the world emits an event:
// Event Viewer renders them, scoring reads them, apps subscribe for redraws.
//
// Transient notifications ("world:changed") are dispatched but not written to
// the log, so redraws do not fill the audit trail.

let nextId = 1;

export function createEventBus({ store, clock }) {
  const topics = new Map();
  nextId = store.state.events.length + 1;

  function on(type, handler) {
    if (!topics.has(type)) topics.set(type, new Set());
    topics.get(type).add(handler);
    return () => topics.get(type)?.delete(handler);
  }

  function dispatch(type, payload) {
    for (const handler of [...(topics.get(type) || [])]) handler(payload);
    if (type !== "*") for (const handler of [...(topics.get("*") || [])]) handler(payload);
  }

  /**
   * Record an audited event.
   * @param {string} type  e.g. "account:password-reset"
   * @param {object} payload { category, level, code, message, subjectId, ticketId, data }
   */
  function emit(type, payload = {}) {
    const seq = nextId++;
    const entry = {
      id: `ev_${String(seq).padStart(4, "0")}`,
      seq,
      type,
      category: payload.category || "System",
      level: payload.level || "info",
      code: payload.code ?? 0,
      message: payload.message || type,
      subjectId: payload.subjectId ?? null,
      actorId: payload.actorId ?? store.state.session?.technicianId ?? null,
      ticketId: payload.ticketId ?? null,
      day: store.state.session?.day ?? 1,
      at: clock.stamp(),
      data: payload.data || {},
    };

    store.commit((state) => {
      state.events.push(entry);
    });
    dispatch(type, entry);
    return entry;
  }

  /** Notify listeners without touching the log. */
  function bump(reason = "world:changed") {
    const payload = { type: reason };
    dispatch(reason, payload);
  }

  /** Re-point the sequence at a freshly seeded world. */
  function reset() {
    nextId = store.state.events.length + 1;
  }

  const all = () => store.state.events.slice();
  const byCode = (code) => all().filter((e) => e.code === code);
  const byType = (type) => all().filter((e) => e.type === type);
  const forTicket = (ticketId) => all().filter((e) => e.ticketId === ticketId);
  const recent = (limit = 20) => all().slice(-limit).reverse();

  return { on, emit, bump, reset, all, byCode, byType, forTicket, recent };
}
