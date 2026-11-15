// The shift loop: start, tick, end, roll into tomorrow, score. The platform owns
// trust and scoring; apps only resolve tickets through the actions.

export const TRUST_START = 100;
export const TRUST_HIT = 12;

export function createSession({ store, events, clock }) {
  const root = () => store.state;
  const session = () => root().session;
  const ticketsFor = (day) => root().tickets.filter((t) => t.day <= day);

  const secondsFor = (day) => session().days.find((d) => d.n === day)?.seconds || 200;

  function overview() {
    const day = session().day;
    const due = ticketsFor(day);
    const answered = due.filter((t) => t.resolvedDay === day);
    return {
      day,
      maxDay: session().maxDay,
      trust: session().trust,
      total: due.length,
      answered: answered.length,
      correct: answered.filter((t) => t.correct).length,
      missed: due.filter((t) => t.status === "open").length,
      remaining: Math.max(0, Math.round(session().shift.remaining)),
      shiftSeconds: session().shift.total,
      state: session().shift.state,
    };
  }

  function startShift() {
    if (session().shift.state !== "briefing") return { ok: false, reason: "shift-already-started" };
    store.commit((state) => {
      state.session.shift.state = "running";
      state.session.shift.startedAt = clock.stamp();
    });
    events.emit("session:shift-started", {
      category: "Application",
      code: 1,
      message: `Shift started. Day ${session().day} queue is open.`,
      subjectId: session().technicianId,
    });
    return { ok: true };
  }

  /**
   * Called once per visible frame by the platform. Mutates the remaining time
   * without a commit: the clock tick is the subscription apps use, and the
   * store should not churn a revision 60 times a second.
   */
  function tick(dt) {
    const shift = session().shift;
    if (shift.state !== "running") return null;
    shift.remaining = Math.max(0, shift.remaining - dt);
    if (shift.remaining > 0) return { remaining: shift.remaining, expired: false };
    return { remaining: 0, expired: true, summary: endShift("time") };
  }

  function endShift(reason = "manual") {
    const shift = session().shift;
    if (shift.state === "ended") return null;

    const summary = overview();
    summary.reason = reason;
    summary.missedNote = summary.missed ? "The queue rolls over to tomorrow." : "Every ticket answered.";

    store.commit((state) => {
      state.session.shift.state = "ended";
      state.session.shift.endedAt = clock.stamp();
      if (reason === "time") state.session.shift.remaining = 0;
      state.session.history.push({
        day: summary.day,
        reason,
        correct: summary.correct,
        answered: summary.answered,
        total: summary.total,
        missed: summary.missed,
        trust: summary.trust,
      });
    });

    events.emit("session:shift-ended", {
      category: "Application",
      code: 2,
      level: reason === "time" ? "warning" : "info",
      message: `Shift ended on day ${summary.day}: ${summary.answered}/${summary.total} answered, ${summary.correct} correct, ${summary.missed} left open.`,
      data: { reason, ...summary },
    });

    return summary;
  }

  /** Move to tomorrow. Unresolved tickets stay open and appear in the queue. */
  function nextDay() {
    const current = session().day;
    if (current >= session().maxDay) {
      events.emit("session:week-ended", {
        category: "Application",
        code: 3,
        message: "End of week. Performance review filed.",
        data: { trust: session().trust, week: session().week },
      });
      return { ok: false, finished: true };
    }
    const next = current + 1;
    const total = secondsFor(next);
    store.commit((state) => {
      state.session.day = next;
      state.session.resolvedToday = [];
      state.session.shift = { state: "briefing", remaining: total, total, startedAt: null, endedAt: null };
    });
    events.emit("session:day-started", {
      category: "Application",
      code: 4,
      message: `Day ${next} started. ${ticketsFor(next).filter((t) => t.status === "open").length} tickets waiting.`,
    });
    return { ok: true, day: next, total };
  }

  /** Score exactly once: callers must have marked the ticket resolved first. */
  function recordResolved({ correct, trustDelta = 0 }) {
    const state = root();
    const nextTrust = Math.max(0, Math.min(TRUST_START, state.session.trust + trustDelta));
    const delta = nextTrust - state.session.trust;
    store.commit((draft) => {
      draft.session.trust = nextTrust;
      draft.session.week.answered += 1;
      if (correct) draft.session.week.correct += 1;
    });
    return { trust: nextTrust, delta };
  }

  function adjustTrust(delta) {
    const state = root();
    const nextTrust = Math.max(0, Math.min(TRUST_START, state.session.trust + delta));
    store.commit((draft) => {
      draft.session.trust = nextTrust;
    });
    return nextTrust;
  }

  function resetWeek() {
    store.commit((state) => {
      state.session.trust = TRUST_START;
      state.session.week = { correct: 0, answered: 0 };
      state.session.history = [];
    });
  }

  return { overview, startShift, tick, endShift, nextDay, recordResolved, adjustTrust, resetWeek, secondsFor };
}
