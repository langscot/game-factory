// Calculator — the proof app. It is not in the #10–#25 app list on purpose: it
// exists to show the contract is usable end to end. It reads no world state,
// keeps only its own display in the window, and uses ctx.ui for the menu,
// dialog and styles.

const instances = new WeakMap();

const OPS = ["+", "−", "×", "÷"];

export default {
  id: "calculator",
  title: "Calculator",
  icon: "calculator",
  size: [360, 560],
  desktop: true,
  pinned: true,
  order: 7,
  position: [830, 110],

  mount(container, ctx) {
    ctx.ui.styles("calculator", css);
    const state = { cur: "0", prev: null, op: null, fresh: true, expr: "", memory: null };

    const fmt = (n) => {
      if (!isFinite(n)) return "Cannot divide by zero";
      const [int, dec] = String(n).split(".");
      const grouped = Number(int).toLocaleString("en-GB");
      return dec ? `${grouped}.${dec}` : grouped;
    };

    const compute = (a, b, op) => {
      switch (op) {
        case "+":
          return a + b;
        case "−":
          return a - b;
        case "×":
          return a * b;
        case "÷":
          return b === 0 ? Infinity : a / b;
        default:
          return b;
      }
    };

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="calc" tabindex="0" aria-label="Calculator">
        <div class="calc-mode"><span>Standard</span><button class="calc-menu" title="More" aria-label="More">⋮</button></div>
        <div class="calc-screen" title="Right-click for options">
          <div class="calc-expr" data-calc="expr"></div>
          <div class="calc-value" data-calc="value">0</div>
        </div>
        <div class="calc-mem">
          <button data-mem="MC">MC</button><button data-mem="MR">MR</button>
          <button data-mem="M+">M+</button><button data-mem="M-">M−</button><button data-mem="MS">MS</button>
        </div>
        <div class="calc-grid">
          <button class="fn" data-k="%">%</button><button class="fn" data-k="CE">CE</button>
          <button class="fn" data-k="C">C</button><button class="fn" data-k="back">⌫</button>
          <button class="fn" data-k="inv">¹⁄ₓ</button><button class="fn" data-k="sqr">x²</button>
          <button class="fn" data-k="sqrt">√x</button><button class="op" data-k="÷">÷</button>
          <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
          <button class="op" data-k="×">×</button>
          <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
          <button class="op" data-k="−">−</button>
          <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
          <button class="op" data-k="+">+</button>
          <button data-k="±">±</button><button data-k="0">0</button><button data-k=".">.</button>
          <button class="eq" data-k="=">=</button>
        </div>
      </div>`);
    container.append(root);

    const valueEl = root.querySelector('[data-calc="value"]');
    const exprEl = root.querySelector('[data-calc="expr"]');
    const num = () => Number(state.cur.replace(/,/g, "").replace("Cannot divide by zero", "0")) || 0;

    const paint = () => {
      valueEl.textContent = state.cur;
      exprEl.textContent = state.expr || (state.memory === null ? "" : "M");
    };

    const press = (key) => {
      if (/^[0-9]$/.test(key)) {
        state.cur = state.fresh || state.cur === "0" ? key : state.cur + key;
        state.fresh = false;
      } else if (key === ".") {
        if (state.fresh) {
          state.cur = "0.";
          state.fresh = false;
        } else if (!state.cur.includes(".") && !state.cur.startsWith("Cannot")) {
          state.cur += ".";
        }
      } else if (OPS.includes(key)) {
        const n = num();
        if (state.op && !state.fresh) {
          state.prev = compute(state.prev ?? 0, n, state.op);
          state.cur = fmt(state.prev);
        } else {
          state.prev = n;
        }
        state.op = key;
        state.fresh = true;
        state.expr = `${fmt(state.prev)} ${key}`;
      } else if (key === "=") {
        if (state.op) {
          const n = num();
          const result = compute(state.prev ?? 0, n, state.op);
          state.expr = `${fmt(state.prev ?? 0)} ${state.op} ${fmt(n)} =`;
          state.cur = fmt(result);
          state.prev = result;
          state.op = null;
          state.fresh = true;
        }
      } else if (key === "C") {
        state.cur = "0";
        state.prev = null;
        state.op = null;
        state.expr = "";
        state.fresh = true;
      } else if (key === "CE") {
        state.cur = "0";
        state.fresh = true;
      } else if (key === "back") {
        if (state.cur.length > 1 && !state.cur.startsWith("Cannot")) state.cur = state.cur.slice(0, -1);
        else state.cur = "0";
      } else if (key === "±") {
        state.cur = state.cur.startsWith("-") ? state.cur.slice(1) : `-${state.cur}`;
      } else if (key === "%") {
        state.cur = fmt(num() / 100);
        state.fresh = true;
      } else if (key === "inv") {
        state.cur = fmt(1 / num());
        state.fresh = true;
      } else if (key === "sqr") {
        state.cur = fmt(num() * num());
        state.fresh = true;
      } else if (key === "sqrt") {
        state.cur = fmt(Math.sqrt(num()));
        state.fresh = true;
      }
      paint();
    };

    for (const button of root.querySelectorAll("[data-k]")) {
      button.addEventListener("click", () => press(button.dataset.k));
    }

    for (const button of root.querySelectorAll("[data-mem]")) {
      button.addEventListener("click", () => {
        const n = num();
        const which = button.dataset.mem;
        if (which === "MS") state.memory = n;
        if (which === "MC") state.memory = null;
        if (which === "MR" && state.memory !== null) {
          state.cur = fmt(state.memory);
          state.fresh = true;
        }
        if (which === "M+") state.memory = (state.memory ?? 0) + n;
        if (which === "M-") state.memory = (state.memory ?? 0) - n;
        if (which === "MS") ctx.ui.toast("Calculator", "Value saved to memory.", "calculator");
        paint();
      });
    }

    function openMenu(x, y) {
      ctx.ui.menu(x, y, [
        {
          label: "About Calculator",
          onClick: () =>
            ctx.ui.alert(
              "Calculator",
              "Version 11.2210.0.0\n\n© Microsoft Corporation. All rights reserved.",
            ),
        },
        { separator: true },
        { label: "Copy result", onClick: () => ctx.ui.toast("Calculator", `Result: ${state.cur}`, "calculator") },
      ]);
    }

    root.querySelector(".calc-menu").addEventListener("click", (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      openMenu(rect.left - 120, rect.bottom + 4);
    });
    root.querySelector(".calc-screen").addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openMenu(event.clientX, event.clientY);
    });

    function onKeyDown(event) {
      const map = { "*": "×", x: "×", "/": "÷", "-": "−", Enter: "=", Backspace: "back", Delete: "CE", Escape: "C", "%": "%" };
      const key = map[event.key] ?? event.key;
      if (/^[0-9.]$/.test(key) || OPS.includes(key) || key === "=" || key === "back" || key === "C" || key === "CE" || key === "%") {
        event.preventDefault();
        press(key);
      }
    }

    root.addEventListener("keydown", onKeyDown);
    root.focus();
    paint();
    instances.set(container, { root });
  },

  unmount(container) {
    instances.delete(container);
  },
};

const css = `
.app-calculator .calc { display: flex; flex-direction: column; height: 100%; background: #202020; padding: 0 8px 8px; outline: 0; }
.app-calculator .calc-mode { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 8px 4px 2px; }
.app-calculator .calc-menu { width: 26px; height: 22px; border-radius: 4px; color: var(--text-3); font-size: 14px; line-height: 1; }
.app-calculator .calc-menu:hover { background: var(--hover); color: #fff; }
.app-calculator .calc-screen { text-align: right; padding: 4px 6px 10px; }
.app-calculator .calc-expr { min-height: 16px; font-size: 11.5px; color: var(--text-3); }
.app-calculator .calc-value { font-size: 34px; font-weight: 300; font-variant-numeric: tabular-nums; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; }
.app-calculator .calc-mem { display: flex; gap: 2px; padding-bottom: 6px; }
.app-calculator .calc-mem button { flex: 1; font-size: 11px; padding: 4px 0; border-radius: 3px; color: var(--text-3); }
.app-calculator .calc-mem button:hover { background: var(--hover); color: #fff; }
.app-calculator .calc-grid { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
.app-calculator .calc-grid button { border-radius: 3px; background: rgba(255, 255, 255, 0.055); font-size: 15px; color: #f2f2f2; }
.app-calculator .calc-grid button:hover { background: rgba(255, 255, 255, 0.11); }
.app-calculator .calc-grid button.fn { background: rgba(255, 255, 255, 0.035); font-size: 13px; color: var(--text-2); }
.app-calculator .calc-grid button.op { background: rgba(255, 255, 255, 0.035); }
.app-calculator .calc-grid button.eq { background: var(--accent-strong); }
.app-calculator .calc-grid button.eq:hover { background: #0b7bd6; }
`;
