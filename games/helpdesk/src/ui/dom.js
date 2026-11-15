// Small DOM helpers shared by every app. The only CSS any app ships is scoped
// to its own id, injected once through ctx.ui.styles().

export function esc(value) {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );
}

export function el(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html).trim();
  return template.content.firstElementChild;
}

const injected = new Set();

/** Inject an app stylesheet once. `css` must be scoped under `.app-<id>`. */
export function injectStyles(appId, css) {
  if (injected.has(appId)) return;
  injected.add(appId);
  const style = document.createElement("style");
  style.dataset.appStyle = appId;
  style.textContent = css;
  document.head.append(style);
}

export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
}
