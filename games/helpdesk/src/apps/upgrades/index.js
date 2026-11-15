// The IT Cupboard: the only shop. It spends the performance bonus from the
// payslip, never the salary, and it sells no access, roles or answers.
//
// Catalogue data lives in world/session.js so the purchase rules and the shelf
// cannot disagree. The app only renders and calls the two purchase actions.

import { COSMETICS, HARDWARE_TIERS, tierSpec } from "../../world/session.js";

const APP_ID = "upgrades";
const TABS = [
  { id: "hardware", label: "Hardware" },
  { id: "cosmetics", label: "Cosmetics" },
  { id: "payslip", label: "Payslip" },
];

const money = (value) => {
  const amount = Math.abs(Number(value) || 0);
  const text = amount.toFixed(2).replace(/\.00$/, "");
  return `${Number(value) < 0 ? "−" : ""}£${text}`;
};

const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

export default {
  id: APP_ID,
  title: "The IT Cupboard",
  icon: "upgrades",
  size: [780, 600],
  desktop: true,
  order: 12,
  position: [150, 70],

  mount(container, ctx) {
    ctx.ui.styles(APP_ID, css);

    const saved = ctx.world.session.ui(APP_ID) || {};
    let tab = TABS.some((entry) => entry.id === saved.tab) ? saved.tab : "hardware";
    let active = true;
    let check = { running: false, progress: 0, seconds: 0, done: null };
    let offCheck = null;

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="up">
        <header class="up-head">
          <div class="up-intro">
            <h1>The IT Cupboard</h1>
            <p>Parts, paint and petty indulgences, bought with the performance bonus. Salary stays imaginary.</p>
          </div>
          <div class="up-wallet">
            <small>Bonus balance</small>
            <b data-wallet>£0</b>
            <span data-lifetime>£0 earned all week</span>
          </div>
        </header>
        <nav class="up-tabs" role="tablist" data-tabs></nav>
        <div class="up-body" data-body></div>
      </div>`);
    container.append(root);

    const tabsEl = root.querySelector("[data-tabs]");
    const body = root.querySelector("[data-body]");
    const walletEl = root.querySelector("[data-wallet]");
    const lifetimeEl = root.querySelector("[data-lifetime]");

    for (const entry of TABS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "up-tab";
      button.dataset.tab = entry.id;
      button.setAttribute("role", "tab");
      button.textContent = entry.label;
      button.addEventListener("click", () => {
        tab = entry.id;
        ctx.actions.setUi(APP_ID, { tab });
        paint();
      });
      tabsEl.append(button);
    }

    function snapshot() {
      const session = ctx.world.session.current();
      const wallet = session.economy || {};
      return {
        tier: session.hardwareTier || 1,
        bonus: Number(wallet.bonus) || 0,
        lifetime: Number(wallet.lifetimeBonus) || 0,
        purchases: Array.isArray(wallet.purchases) ? wallet.purchases : [],
        payslip: wallet.lastPayslip || null,
        prefs: ctx.ui.prefs.get(),
      };
    }

    function paint() {
      if (!active) return;
      const state = snapshot();
      walletEl.textContent = money(state.bonus);
      lifetimeEl.textContent = `${money(state.lifetime)} earned so far`;
      for (const button of tabsEl.querySelectorAll("[data-tab]")) {
        const selected = button.dataset.tab === tab;
        button.classList.toggle("sel", selected);
        button.setAttribute("aria-selected", String(selected));
      }

      if (tab === "hardware") body.replaceChildren(hardwarePage(state));
      else if (tab === "cosmetics") body.replaceChildren(cosmeticsPage(state));
      else body.replaceChildren(payslipPage(state));
    }

    // -----------------------------------------------------------------------
    // hardware
    // -----------------------------------------------------------------------

    function hardwarePage(state) {
      const page = ctx.ui.el(`<div class="up-page"></div>`);
      const intro = ctx.ui.el(`
        <div class="up-note">
          <b>Real timings, not a stat block.</b>
          <span>A better tier shortens window launches, installs and scans, and lets the fan stop pretending. Upgrades are one rung at a time.</span>
        </div>`);
      page.append(intro);
      page.append(checkPanel(state));

      for (const spec of HARDWARE_TIERS) {
        const owned = spec.tier <= state.tier;
        const current = spec.tier === state.tier;
        const next = spec.tier === state.tier + 1;
        const affordable = state.bonus >= spec.price;
        const status = current
          ? `<span class="up-state on">In use</span>`
          : owned
            ? `<span class="up-state">In the cupboard</span>`
            : next
              ? affordable
                ? `<button class="btn primary" data-buy="${spec.tier}" type="button">Buy for ${money(spec.price)}</button>`
                : `<button class="btn" type="button" disabled>Need ${money(spec.price - state.bonus)} more</button>`
              : `<button class="btn" type="button" disabled>Requires Tier ${spec.tier - 1}</button>`;

        const card = ctx.ui.el(`
          <article class="up-tier${current ? " current" : ""}${owned ? " owned" : ""}">
            <div class="up-tier-head">
              <span class="up-index">Tier ${spec.tier}</span>
              <h2>${esc(spec.name)}</h2>
              <span class="up-price">${spec.price ? money(spec.price) : "Starter issue"}</span>
            </div>
            <p class="up-blurb">${esc(spec.blurb)}</p>
            <div class="up-specs">
              <span><small>CPU</small>${esc(spec.cpu)}</span>
              <span><small>Cores</small>${spec.cores}</span>
              <span><small>RAM</small>${spec.ramGB} GB ${esc(spec.memoryType)}</span>
              <span><small>Disk</small>${esc(spec.disk)}</span>
              <span><small>Window launch</small>${spec.launchSeconds.toFixed(2)} s</span>
              <span><small>Install / scan</small>${spec.installSeconds.toFixed(1)} s / ${spec.scanSeconds} s</span>
            </div>
            <div class="up-fan"><i></i>${esc(spec.fanNote)}</div>
            <div class="up-tier-foot">${status}</div>
          </article>`);
        card.querySelector("[data-buy]")?.addEventListener("click", () => buyHardware(spec));
        page.append(card);
      }

      page.append(
        ctx.ui.el(`
          <p class="up-fine">Nothing here grants a role, skips an approval or answers a ticket. It is a laptop, not a promotion.</p>`),
      );
      return page;
    }

    function checkPanel(state) {
      const spec = tierSpec(state.tier);
      const percent = Math.round(check.progress * 100);
      const status = check.running
        ? `${percent}% · this PC claims it will take ${check.seconds.toFixed(0)}s`
        : check.done !== null
          ? `Scan complete in ${check.done.toFixed(1)}s. No new hardware, as expected.`
          : `A local scan for hardware changes. ${spec.scanSeconds}s on this tier.`;
      const panel = ctx.ui.el(`
        <div class="up-check${check.running ? " running" : ""}">
          <div class="up-check-copy"><b>Hardware check</b><span>${esc(status)}</span></div>
          ${
            check.running
              ? `<span class="up-check-pct">${percent}%</span>`
              : `<button class="btn" data-check type="button">Run check</button>`
          }
          <span class="up-check-bar"><i style="width:${check.running ? percent : 0}%"></i></span>
        </div>`);
      panel.querySelector("[data-check]")?.addEventListener("click", () => runCheck());
      return panel;
    }

    function runCheck() {
      if (check.running) return;
      const seconds = tierSpec(snapshot().tier).scanSeconds;
      check = { running: true, progress: 0, seconds, done: null };
      paint();
      let elapsed = 0;
      offCheck?.();
      offCheck = ctx.clock.onTick((dt) => {
        if (!active || !check.running) return;
        elapsed += dt;
        check.progress = Math.min(1, elapsed / check.seconds);
        const panel = body.querySelector(".up-check");
        if (panel) {
          const percent = Math.round(check.progress * 100);
          panel.querySelector(".up-check-pct").textContent = `${percent}%`;
          panel.querySelector(".up-check-bar i").style.width = `${percent}%`;
        }
        if (check.progress >= 1) {
          offCheck?.();
          offCheck = null;
          check = { running: false, progress: 1, seconds, done: elapsed };
          paint();
        }
      });
    }

    function buyHardware(spec) {
      const result = ctx.actions.buyHardware?.(spec.tier) || { ok: false, reason: "unavailable" };
      if (!result.ok) {
        ctx.ui.toast("The IT Cupboard", purchaseFailure(result), "upgrades");
        paint();
        return;
      }
      ctx.ui.toast(
        "The IT Cupboard",
        `${spec.name} signed out. Launches now take about ${tierSpec(spec.tier).launchSeconds.toFixed(2)} s on an idle desktop.`,
        "upgrades",
      );
      check = { running: false, progress: 0, seconds: 0, done: null };
      offCheck?.();
      offCheck = null;
      paint();
    }

    // -----------------------------------------------------------------------
    // cosmetics
    // -----------------------------------------------------------------------

    function cosmeticsPage(state) {
      const page = ctx.ui.el(`<div class="up-page up-cosmetics"></div>`);
      page.append(
        ctx.ui.el(`
          <div class="up-note">
            <b>Visible in one click.</b>
            <span>Cosmetics change the desktop and the accent. They do not change a number anywhere, which is the honest version of a reward.</span>
          </div>`),
      );

      for (const item of COSMETICS) {
        const owned = state.purchases.includes(item.id);
        const applied =
          item.kind === "wallpaper"
            ? state.prefs.wallpaper === item.apply.wallpaper
            : state.prefs.accent === item.apply.accent;
        const control = !owned
          ? state.bonus >= item.price
            ? `<button class="btn primary" data-buy-cosmetic="${esc(item.id)}" type="button">Buy for ${money(item.price)}</button>`
            : `<button class="btn" type="button" disabled>Need ${money(item.price - state.bonus)} more</button>`
          : applied
            ? `<span class="up-state on">Applied</span>`
            : `<button class="btn" data-apply="${esc(item.id)}" type="button">Apply</button>`;

        const preview =
          item.kind === "wallpaper"
            ? `<span class="up-wall"><i class="wallpaper ${esc(item.apply.wallpaper)}"></i></span>`
            : `<span class="up-swatch" style="background:${esc(item.color || "#4cc2ff")}"></span>`;

        const card = ctx.ui.el(`
          <article class="up-cosmetic">
            ${preview}
            <div class="up-cosmetic-copy">
              <b>${esc(item.name)}</b>
              <span>${esc(item.blurb)}</span>
              <small>${item.kind === "wallpaper" ? "Desktop wallpaper" : "Accent colour"} · ${money(item.price)}</small>
            </div>
            <div class="up-cosmetic-action">${control}</div>
          </article>`);
        card.querySelector("[data-buy-cosmetic]")?.addEventListener("click", () => buyCosmetic(item));
        card.querySelector("[data-apply]")?.addEventListener("click", () => applyCosmetic(item));
        page.append(card);
      }
      return page;
    }

    function buyCosmetic(item) {
      const result = ctx.actions.buyCosmetic?.(item.id) || { ok: false, reason: "unavailable" };
      if (!result.ok) {
        ctx.ui.toast("The IT Cupboard", purchaseFailure(result), "upgrades");
        paint();
        return;
      }
      ctx.ui.prefs.save(item.apply);
      ctx.ui.toast("The IT Cupboard", `${item.name} bought and applied. Expensive-looking.`, "upgrades");
      paint();
    }

    function applyCosmetic(item) {
      ctx.ui.prefs.save(item.apply);
      ctx.ui.toast("The IT Cupboard", `${item.name} applied. Nobody will mention it, which is the point.`, "upgrades");
      paint();
    }

    // -----------------------------------------------------------------------
    // payslip
    // -----------------------------------------------------------------------

    function payslipPage(state) {
      const page = ctx.ui.el(`<div class="up-page up-payslip"></div>`);
      const slip = state.payslip;
      if (!slip) {
        page.append(
          ctx.ui.el(`
            <div class="up-empty">
              <h2>No payslip yet</h2>
              <p>Finish a shift and Marge posts a performance bonus. The salary line is flavour; the bonus is what spends.</p>
              <span class="muted tiny">Attendance + queue coverage + correct closures + trust, minus the mistakes.</span>
            </div>`),
        );
        return page;
      }

      const ticket = ctx.ui.el(`
        <div class="up-slip">
          <div class="up-slip-head"><span>Halcyon Dynamics · remittance advice</span><span>Day ${slip.day}</span></div>
          ${slip.lines
            .map(
              (line) => `<div class="payslip-line"><span>${esc(line.label)}</span><b>${money(line.amount)}</b></div>`,
            )
            .join("")}
          <div class="payslip-line muted"><span>Salary (flavour, not spendable)</span><b>${money(slip.salary)}</b></div>
          <div class="payslip-total"><span>Performance bonus</span><b>${money(slip.bonus)}</b></div>
          <div class="payslip-balance">Bonus balance after the shift: ${money(slip.balance)}</div>
        </div>`);
      page.append(ticket);
      page.append(
        ctx.ui.el(`
          <div class="up-note">
            <b>How it is earned.</b>
            <span>£30 for turning up, up to £60 for queue coverage and £70 for correct closures. A clean shift adds £40, trust adds up to £30, and every incorrect closure costs £15. The cap is £250 a shift.</span>
          </div>`),
      );
      return page;
    }

    // -----------------------------------------------------------------------
    // events
    // -----------------------------------------------------------------------

    const offEvents = ctx.events.on("*", paint);
    ctx.onDispose(() => {
      active = false;
      offCheck?.();
      offEvents();
    });
    paint();
  },
};

function purchaseFailure(result) {
  if (result.reason === "insufficient-bonus") return `Not enough bonus. You are ${money(result.short)} short.`;
  if (result.reason === "already-owned") return "You already own that. It is in the cupboard.";
  if (result.reason === "requires-previous-tier") return "One rung at a time. The cupboard is not made of money.";
  return "That purchase is not available right now.";
}

const css = `
.app-upgrades .up { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.app-upgrades .up-head {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 18px;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--stroke);
  background: linear-gradient(120deg, rgba(255, 219, 155, 0.09), transparent 60%);
}
.app-upgrades .up-intro h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
.app-upgrades .up-intro p { margin: 0; max-width: 48ch; color: var(--text-3); font-size: 12px; line-height: 1.5; }
.app-upgrades .up-wallet { text-align: right; flex: none; }
.app-upgrades .up-wallet small { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-3); }
.app-upgrades .up-wallet b { display: block; font-size: 26px; font-weight: 600; color: #9ee6a8; line-height: 1.1; font-variant-numeric: tabular-nums; }
.app-upgrades .up-wallet span { font-size: 10.5px; color: var(--text-3); }
.app-upgrades .up-tabs { display: flex; gap: 2px; padding: 0 14px; border-bottom: 1px solid var(--stroke); flex: none; }
.app-upgrades .up-tab { padding: 9px 14px; font-size: 12px; color: var(--text-3); border-bottom: 2px solid transparent; }
.app-upgrades .up-tab:hover { color: var(--text); }
.app-upgrades .up-tab.sel { color: #fff; border-bottom-color: var(--accent); }
.app-upgrades .up-body { flex: 1; min-height: 0; overflow: auto; padding: 14px 18px 18px; }
.app-upgrades .up-page { display: grid; gap: 10px; }
.app-upgrades .up-note {
  display: grid; gap: 3px; padding: 10px 12px; border-left: 2px solid rgba(251, 191, 36, 0.55);
  background: rgba(255, 255, 255, 0.035); border-radius: 4px;
}
.app-upgrades .up-note b { font-size: 12px; font-weight: 600; }
.app-upgrades .up-note span { font-size: 11.5px; color: var(--text-3); line-height: 1.45; }
.app-upgrades .up-check {
  position: relative; display: flex; align-items: center; gap: 12px;
  padding: 10px 12px 13px; border: 1px solid var(--stroke); border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}
.app-upgrades .up-check-copy { display: grid; gap: 2px; flex: 1; min-width: 0; }
.app-upgrades .up-check-copy b { font-size: 12px; font-weight: 600; }
.app-upgrades .up-check-copy span { font-size: 11px; color: var(--text-3); }
.app-upgrades .up-check-pct { font-size: 12px; color: var(--accent); font-variant-numeric: tabular-nums; }
.app-upgrades .up-check-bar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 2px; overflow: hidden;
  border-radius: 0 0 6px 6px; background: rgba(255, 255, 255, 0.08);
}
.app-upgrades .up-check-bar i { display: block; height: 100%; background: var(--accent); transition: width 0.12s linear; }
.app-upgrades .up-tier {
  border: 1px solid var(--stroke); border-radius: 6px; padding: 12px 14px;
  background: rgba(255, 255, 255, 0.035);
}
.app-upgrades .up-tier.current { border-color: rgba(76, 194, 255, 0.55); background: rgba(76, 194, 255, 0.08); }
.app-upgrades .up-tier.owned:not(.current) { opacity: 0.72; }
.app-upgrades .up-tier-head { display: flex; align-items: baseline; gap: 9px; }
.app-upgrades .up-index {
  font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-3);
  border: 1px solid var(--stroke-2); border-radius: 3px; padding: 1px 5px;
}
.app-upgrades .up-tier-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.app-upgrades .up-price { margin-left: auto; font-size: 12.5px; color: #f4d58a; font-variant-numeric: tabular-nums; }
.app-upgrades .up-blurb { margin: 5px 0 9px; color: var(--text-2); font-size: 11.5px; }
.app-upgrades .up-specs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; }
.app-upgrades .up-specs span { font-size: 11.5px; color: var(--text-2); overflow-wrap: anywhere; }
.app-upgrades .up-specs small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); }
.app-upgrades .up-fan { margin-top: 9px; font-size: 10.5px; color: var(--text-3); display: flex; align-items: center; gap: 7px; }
.app-upgrades .up-fan i { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--text-3); box-shadow: inset 0 0 0 2px rgba(0,0,0,.45); }
.app-upgrades .up-tier-foot { display: flex; justify-content: flex-end; margin-top: 9px; }
.app-upgrades .up-state { font-size: 10.5px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.08em; }
.app-upgrades .up-state.on { color: #9ee6a8; }
.app-upgrades .up-fine { margin: 4px 0 0; font-size: 10.5px; color: var(--text-3); text-align: center; }
.app-upgrades .up-cosmetic {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  border: 1px solid var(--stroke); border-radius: 6px; background: rgba(255, 255, 255, 0.035);
}
.app-upgrades .up-wall { position: relative; width: 104px; height: 60px; flex: none; border-radius: 5px; overflow: hidden; border: 1px solid var(--stroke-2); }
.app-upgrades .up-wall .wallpaper { position: absolute; inset: 0; }
.app-upgrades .up-swatch { width: 56px; height: 56px; flex: none; border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
.app-upgrades .up-cosmetic-copy { display: grid; gap: 3px; flex: 1; min-width: 0; }
.app-upgrades .up-cosmetic-copy b { font-size: 13px; font-weight: 600; }
.app-upgrades .up-cosmetic-copy span { font-size: 11.5px; color: var(--text-3); line-height: 1.4; }
.app-upgrades .up-cosmetic-copy small { font-size: 10px; color: #f4d58a; text-transform: uppercase; letter-spacing: 0.06em; }
.app-upgrades .up-cosmetic-action { flex: none; }
.app-upgrades .up-empty { padding: 26px 8px; text-align: center; color: var(--text-2); }
.app-upgrades .up-empty h2 { margin: 0 0 6px; font-size: 16px; }
.app-upgrades .up-empty p { margin: 0 auto 6px; max-width: 44ch; font-size: 12px; line-height: 1.55; color: var(--text-3); }
.app-upgrades .up-slip {
  margin: 4px 0; padding: 14px 16px; border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 4px; background: rgba(255, 255, 255, 0.045);
}
.app-upgrades .up-slip-head {
  display: flex; justify-content: space-between; gap: 10px; padding-bottom: 8px; margin-bottom: 8px;
  border-bottom: 1px solid var(--stroke); font-size: 10.5px; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--text-3);
}
`;
