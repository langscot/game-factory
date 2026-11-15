// File > Properties. The dialog is the point of the app for a phishing case:
// it shows what the transport headers actually say, next to what the message
// list claims. It uses the shared dialog surface, so Escape and Enter work.

import { headerWarnings, internetHeaders, folderLabel } from "./model.js";

const INLINE_PRE = [
  "margin:8px 0 0",
  "padding:10px",
  "border-radius:4px",
  "background:rgba(0,0,0,.32)",
  "border:1px solid var(--stroke-2)",
  "font:11px/1.55 Consolas, 'Cascadia Mono', monospace",
  "color:var(--text-2)",
  "max-height:260px",
  "overflow:auto",
  "white-space:pre-wrap",
  "overflow-wrap:anywhere",
  "user-select:text",
].join(";");

const INLINE_WARN = [
  "margin:10px 0 0",
  "padding:9px 11px",
  "border-radius:4px",
  "background:rgba(251,191,36,.09)",
  "border:1px solid rgba(251,191,36,.34)",
  "color:#f0d79a",
  "font-size:11.5px",
  "line-height:1.5",
].join(";");

const row = (label, value) =>
  `<div style="display:flex;gap:12px;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--stroke);font-size:11.5px">
    <span style="color:var(--text-3)">${label}</span>
    <span style="text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis">${value}</span>
  </div>`;

export function showMessageProperties(ctx, message) {
  const info = internetHeaders(ctx, message);
  const warnings = headerWarnings(ctx, message);

  const html = `
    <h2>Properties</h2>
    <div class="sub">${ctx.ui.esc(message.subject)}</div>
    ${row("From", ctx.ui.esc(`${message.from} <${info.fromAddress}>`))}
    ${row("Reply-To", ctx.ui.esc(info.replyTo))}
    ${row("Return-Path", ctx.ui.esc(`<${info.returnPath}>`))}
    ${row("To", ctx.ui.esc(message.toText || "you"))}
    ${row("Received", ctx.ui.esc(message.when || "today"))}
    ${row("Size", ctx.ui.esc(message.size))}
    ${row("Location", ctx.ui.esc(folderLabel(message.folder)))}
    <h4 style="margin:16px 0 0;font-size:12px;font-weight:600">Internet headers</h4>
    <pre style="${INLINE_PRE}">${ctx.ui.esc(info.text)}</pre>
    ${
      warnings.length
        ? `<div style="${INLINE_WARN}">${warnings.map((warning) => `• ${ctx.ui.esc(warning)}`).join("<br>")}</div>`
        : ""
    }
    <div class="row"><button class="btn primary" data-dialog-ok>Close</button></div>`;

  return ctx.ui.dialog({ html });
}
