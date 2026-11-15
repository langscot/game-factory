// The shift loop: start, tick, end, roll into tomorrow, score. The platform owns
// trust and scoring; apps only resolve tickets through the actions.

export const TRUST_START = 100;
export const TRUST_HIT = 12;

// The upgrade tree. Prices are in performance-bonus pounds, not a second
// currency: the only money that spends is the allowance from the payslip.
// Timing columns are real seconds from the DESIGN.md hardware table.
export const HARDWARE_TIERS = [
  {
    tier: 1,
    name: "Beige Brick 2C",
    cpu: "Sandstone C2 @ 1.80GHz",
    cores: 2,
    ramGB: 4,
    memoryType: "DDR2",
    disk: "5400 rpm spinning rust",
    launchSeconds: 1.2,
    installSeconds: 8.4,
    scanSeconds: 12,
    fan: 0.55,
    fanNote: "Always audible, and it is not a metaphor.",
    blurb: "Two cores, four gigabytes and a fan that has opinions about all of it.",
    price: 0,
  },
  {
    tier: 2,
    name: "Nadir OptiBrick 410",
    cpu: "Nadir N4 @ 2.60GHz",
    cores: 4,
    ramGB: 8,
    memoryType: "DDR3",
    disk: "SATA SSD · 240 GB",
    launchSeconds: 0.9,
    installSeconds: 7.2,
    scanSeconds: 9,
    fan: 0.42,
    fanNote: "Loud under load. You will hear when the queue gets busy.",
    blurb: "The company standard. The standard is 'it boots before lunch'.",
    price: 210,
  },
  {
    tier: 3,
    name: "Glorp Book 14",
    cpu: "Glorp G6 @ 3.20GHz",
    cores: 6,
    ramGB: 16,
    memoryType: "DDR4",
    disk: "NVMe SSD · 476 GB",
    launchSeconds: 0.6,
    installSeconds: 6,
    scanSeconds: 6,
    fan: 0.3,
    fanNote: "A whisper. Nobody has complained yet.",
    blurb: "Actually has an SSD. People will ask what you did to deserve it.",
    price: 480,
  },
  {
    tier: 4,
    name: "Halcyon Pro 16 (Refurb)",
    cpu: "Halcyon H12 @ 4.10GHz",
    cores: 12,
    ramGB: 32,
    memoryType: "DDR5",
    disk: "NVMe SSD · 1 TB",
    launchSeconds: 0.4,
    installSeconds: 4.8,
    scanSeconds: 4,
    fan: 0.2,
    fanNote: "Quiet. Suspiciously quiet for an IT laptop.",
    blurb: "Someone in Finance had this. It came back with stickers and a story.",
    price: 780,
  },
  {
    tier: 5,
    name: "The Good One",
    cpu: "Halcyon H24 Unobtainium @ 5.20GHz",
    cores: 24,
    ramGB: 64,
    memoryType: "DDR5",
    disk: "NVMe SSD · 2 TB",
    launchSeconds: 0.25,
    installSeconds: 3.6,
    scanSeconds: 3,
    fan: 0.12,
    fanNote: "Silent, allegedly. Marge says it is a rumour.",
    blurb: "Marge signed this one out of the locked cupboard. Do not ask how.",
    price: 1200,
  },
];

// Cosmetics are bought once and then applied through the same prefs the shell
// already reads. They change nothing mechanical, which is the point.
export const COSMETICS = [
  {
    id: "wall_boss",
    kind: "wallpaper",
    name: "Executive Beige",
    price: 40,
    blurb: "The wallpaper from the executive floor. It looks expensive because it is.",
    apply: { wallpaper: "w4" },
  },
  {
    id: "accent_aubergine",
    kind: "accent",
    name: "Compliance Aubergine",
    price: 60,
    color: "#d8a5ff",
    blurb: "A restrained purple. Says 'I have read the policy' without saying it.",
    apply: { accent: "aubergine" },
  },
];

// A shift's allowance. The weekly cap in the design is £500; this build plays a
// shift at a time, so the per-shift cap is £250 and a very good shift buys the
// first real machine.
const BONUS = {
  attendance: 30,
  coverageMax: 60,
  accuracyMax: 70,
  trustHigh: 30,
  trustMid: 15,
  cleanShift: 40,
  wrongClosure: 15,
  cap: 250,
};

const SALARY_DAY = 84.62;

const roundMoney = (value) => Math.round(value * 100) / 100;

export function tierSpec(tier) {
  return HARDWARE_TIERS.find((entry) => entry.tier === Number(tier)) || HARDWARE_TIERS[0];
}

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
      hardwareTier: session().hardwareTier || 1,
      bonus: economy().bonus,
    };
  }

  function economy() {
    return session().economy || { bonus: 0, lifetimeBonus: 0, purchases: [], lastPayslip: null };
  }

  /** The payslip is earned by performance, and it is the only spendable money. */
  function buildPayslip(summary) {
    const answered = summary.answered || 0;
    const total = summary.total || 0;
    const correct = summary.correct || 0;
    const wrong = Math.max(0, answered - correct);
    const coverage = total > 0 ? Math.min(1, answered / total) : 0;
    const accuracy = answered > 0 ? Math.min(1, correct / answered) : 0;
    const lines = [
      { label: "Attendance (you were here)", amount: BONUS.attendance },
      { label: `Queue coverage · ${answered}/${total} answered`, amount: Math.round(BONUS.coverageMax * coverage) },
      { label: `Correct closures · ${correct}/${answered}`, amount: Math.round(BONUS.accuracyMax * accuracy) },
    ];

    if (summary.trust >= 90) lines.push({ label: "Trust · still employed, allegedly", amount: BONUS.trustHigh });
    else if (summary.trust >= 70) lines.push({ label: "Trust · adequate", amount: BONUS.trustMid });

    if (total > 0 && summary.missed === 0 && wrong === 0) {
      lines.push({ label: "Clean shift (nothing left, nothing wrong)", amount: BONUS.cleanShift });
    }
    if (wrong > 0) {
      lines.push({ label: `Incorrect closures × ${wrong}`, amount: -BONUS.wrongClosure * wrong });
    }

    const raw = lines.reduce((sum, line) => sum + line.amount, 0);
    const bonus = Math.max(0, Math.min(BONUS.cap, raw));
    if (bonus !== raw) {
      lines.push({
        label: raw > BONUS.cap ? `Shift allowance cap (was £${raw})` : "Shift allowance floor",
        amount: bonus - raw,
      });
    }

    return {
      day: summary.day,
      salary: SALARY_DAY,
      bonus,
      lines,
      balance: roundMoney(economy().bonus + bonus),
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
    summary.payslip = buildPayslip(summary);

    store.commit((state) => {
      state.session.shift.state = "ended";
      state.session.shift.endedAt = clock.stamp();
      if (reason === "time") state.session.shift.remaining = 0;
      const wallet = walletFor(state);
      wallet.bonus = summary.payslip.balance;
      wallet.lifetimeBonus = roundMoney((wallet.lifetimeBonus || 0) + summary.payslip.bonus);
      wallet.lastPayslip = summary.payslip;
      state.session.history.push({
        day: summary.day,
        reason,
        correct: summary.correct,
        answered: summary.answered,
        total: summary.total,
        missed: summary.missed,
        trust: summary.trust,
        bonus: summary.payslip.bonus,
        balance: summary.payslip.balance,
      });
    });

    events.emit("session:shift-ended", {
      category: "Application",
      code: 2,
      level: reason === "time" ? "warning" : "info",
      message: `Shift ended on day ${summary.day}: ${summary.answered}/${summary.total} answered, ${summary.correct} correct, ${summary.missed} left open. Performance bonus £${summary.payslip.bonus}.`,
      data: { reason, ...summary },
    });
    events.emit("session:career-changed", {
      category: "Application",
      code: 5,
      message: `Performance bonus posted: £${summary.payslip.bonus}. Balance £${summary.payslip.balance}.`,
      data: { bonus: summary.payslip.bonus, balance: summary.payslip.balance },
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

  // -------------------------------------------------------------------------
  // career: hardware tier, bonus balance and purchases
  // -------------------------------------------------------------------------

  function setMachineTier(draft, tier) {
    const machine = draft.machines.find((entry) => entry.ownerId === draft.session.technicianId);
    // The rest of the world only knows about three machine shapes (Settings,
    // RDP, Device Mangler), so the managed-device record stops at 3. The player's
    // session keeps the real tier and the store/Task Mangler show it.
    if (machine) machine.hardwareTier = Math.min(3, tier);
  }

  function walletFor(draft) {
    return draft.session.economy || (draft.session.economy = {
      bonus: 0,
      lifetimeBonus: 0,
      purchases: ["hardware:1"],
      lastPayslip: null,
    });
  }

  function careerSnapshot() {
    const wallet = economy();
    return {
      hardwareTier: session().hardwareTier || 1,
      bonus: wallet.bonus,
      lifetimeBonus: wallet.lifetimeBonus || 0,
      purchases: [...(wallet.purchases || [])],
      lastPayslip: wallet.lastPayslip || null,
    };
  }

  /** Restore a career saved in prefs. Bad data is not allowed to brick a run. */
  function hydrateCareer(saved = {}) {
    const tier = Math.max(1, Math.min(HARDWARE_TIERS.length, Math.round(Number(saved.hardwareTier) || 1)));
    const bonus = Math.max(0, Number(saved.bonus) || 0);
    const lifetimeBonus = Math.max(bonus, Number(saved.lifetimeBonus) || 0);
    const purchases = Array.isArray(saved.purchases)
      ? [...new Set(saved.purchases.filter((entry) => typeof entry === "string"))]
      : [];
    if (!purchases.includes(`hardware:${tier}`)) purchases.push(`hardware:${tier}`);

    store.commit((draft) => {
      draft.session.hardwareTier = tier;
      draft.session.economy = {
        bonus: roundMoney(bonus),
        lifetimeBonus: roundMoney(lifetimeBonus),
        purchases,
        lastPayslip: saved.lastPayslip || null,
      };
      setMachineTier(draft, tier);
    });
    return careerSnapshot();
  }

  function buyHardware(tier) {
    const wanted = Number(tier);
    if (!HARDWARE_TIERS.some((entry) => entry.tier === wanted)) return { ok: false, reason: "unknown-tier" };
    const current = session().hardwareTier || 1;
    if (wanted <= current) return { ok: false, reason: "already-owned" };
    if (wanted !== current + 1) return { ok: false, reason: "requires-previous-tier" };

    const spec = tierSpec(wanted);
    const wallet = economy();
    if (wallet.bonus < spec.price) return { ok: false, reason: "insufficient-bonus", short: spec.price - wallet.bonus };

    store.commit((draft) => {
      const wallet = walletFor(draft);
      wallet.bonus = roundMoney(wallet.bonus - spec.price);
      draft.session.hardwareTier = wanted;
      wallet.purchases = [...new Set([...(wallet.purchases || []), `hardware:${wanted}`])];
      setMachineTier(draft, wanted);
    });
    events.emit("session:hardware-upgraded", {
      category: "Application",
      code: 6,
      message: `Hardware upgraded to ${spec.name}. Window launches now take about ${spec.launchSeconds.toFixed(2)}s.`,
      subjectId: session().technicianId,
      data: { tier: wanted, name: spec.name, price: spec.price },
    });
    events.emit("session:career-changed", {
      category: "Application",
      code: 5,
      message: `Bought ${spec.name} for £${spec.price}. Bonus balance £${economy().bonus}.`,
      data: { purchase: `hardware:${wanted}` },
    });
    return { ok: true, tier: wanted, spec, balance: economy().bonus };
  }

  function buyCosmetic(itemId) {
    const item = COSMETICS.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, reason: "unknown-item" };
    const wallet = economy();
    if ((wallet.purchases || []).includes(item.id)) return { ok: false, reason: "already-owned" };
    if (wallet.bonus < item.price) return { ok: false, reason: "insufficient-bonus", short: item.price - wallet.bonus };

    store.commit((draft) => {
      const wallet = walletFor(draft);
      wallet.bonus = roundMoney(wallet.bonus - item.price);
      wallet.purchases = [...new Set([...(wallet.purchases || []), item.id])];
    });
    events.emit("session:career-changed", {
      category: "Application",
      code: 5,
      message: `Bought ${item.name} for £${item.price}. Bonus balance £${economy().bonus}.`,
      data: { purchase: item.id },
    });
    return { ok: true, item, balance: economy().bonus };
  }

  /** Debug/evidence hook: post a bonus without replaying a whole shift. */
  function grantBonus(amount, reason = "debug") {
    const value = roundMoney(Math.max(0, Number(amount) || 0));
    if (!value) return { ok: false, reason: "nothing-to-grant" };
    store.commit((draft) => {
      const wallet = walletFor(draft);
      wallet.bonus = roundMoney((wallet.bonus || 0) + value);
      wallet.lifetimeBonus = roundMoney((wallet.lifetimeBonus || 0) + value);
    });
    events.emit("session:career-changed", {
      category: "Application",
      code: 5,
      message: `Performance bonus posted: £${value} (${reason}).`,
      data: { bonus: value, balance: economy().bonus, reason },
    });
    return { ok: true, bonus: economy().bonus };
  }

  return {
    overview,
    startShift,
    tick,
    endShift,
    nextDay,
    recordResolved,
    adjustTrust,
    resetWeek,
    secondsFor,
    buildPayslip,
    careerSnapshot,
    hydrateCareer,
    buyHardware,
    buyCosmetic,
    grantBonus,
  };
}
