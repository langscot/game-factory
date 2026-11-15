// Policy Handbook. Rules and numbers come from the store, so a ticket's
// ruleId, the book and the scoring event all point at the same policy.

const instances = new WeakMap();

export default {
  id: "handbook",
  title: "Policy Handbook",
  icon: "book",
  size: [580, 540],
  desktop: true,
  pinned: true,
  order: 3,
  right: true,
  position: [null, 20],

  mount(container, ctx) {
    ctx.ui.styles("handbook", css);
    const uiState = () => ctx.world.session.ui("handbook");

    function paint() {
      const day = ctx.world.session.day();
      const policies = ctx.world.handbook.policies(day);
      const selectedId = policies.some((p) => p.id === uiState().selectedId) ? uiState().selectedId : policies[0]?.id;
      const current = policies.find((p) => p.id === selectedId);

      container.innerHTML = "";
      const root = ctx.ui.el(`<div class="book"><nav></nav><article></article></div>`);
      container.append(root);
      const nav = root.querySelector("nav");
      for (const policy of policies) {
        const button = ctx.ui.el(`<button class="${policy.id === selectedId ? "sel" : ""}">${policy.id}. ${ctx.ui.esc(policy.title)}</button>`);
        button.addEventListener("click", () => ctx.actions.setUi("handbook", { selectedId: policy.id }));
        nav.append(button);
      }

      root.querySelector("article").innerHTML = `
        <div class="pnum">IT Policy Handbook · rev ${day}.0${
          current.day === day && day > 1 ? '<span class="new">new today</span>' : ""
        }</div>
        <h3>${current.id}. ${ctx.ui.esc(current.title)}</h3>
        <ul>${current.lines.map((line) => `<li>${ctx.ui.esc(line)}</li>`).join("")}</ul>
        <p class="muted tiny" style="margin-top:16px">If a ticket is not covered by a rule, escalate it. Policy 0, section 1, paragraph "use your judgment".</p>`;
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
.app-handbook .book { display: flex; height: 100%; }
.app-handbook .book nav { width: 140px; flex: none; border-right: 1px solid var(--stroke); padding: 6px; overflow: auto; }
.app-handbook .book nav button {
  display: block; width: 100%; text-align: left; padding: 7px 9px; border-radius: 4px;
  font-size: 12px; color: var(--text-2); border-left: 3px solid transparent;
}
.app-handbook .book nav button:hover { background: var(--hover); }
.app-handbook .book nav button.sel { background: rgba(76, 194, 255, 0.16); border-left-color: var(--accent); color: #fff; }
.app-handbook .book article { flex: 1; min-width: 0; overflow: auto; padding: 18px 20px; }
.app-handbook .book h3 { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
.app-handbook .book .pnum { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; }
.app-handbook .book ul { margin: 0; padding-left: 18px; }
.app-handbook .book li { margin-bottom: 9px; line-height: 1.55; font-size: 13px; color: var(--text-2); }
.app-handbook .book .new { color: #fbbf24; font-size: 10.5px; border: 1px solid rgba(251, 191, 36, 0.4); padding: 1px 6px; border-radius: 9px; margin-left: 6px; }
`;
