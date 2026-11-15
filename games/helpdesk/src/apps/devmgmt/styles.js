// Device Mangler's stylesheet. Every selector is scoped under .app-devmgmt,
// including the bits that live in the shared modal (the wrapper carries the
// class too).
export const CSS = `
.app-devmgmt { display: flex; flex-direction: column; height: 100%; min-height: 0; font-size: 12px; color: var(--text-2); }
.app-devmgmt button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.app-devmgmt .mmc { display: flex; flex-direction: column; height: 100%; min-height: 0; }

.app-devmgmt .mmc-menu {
  height: 29px; flex: none; display: flex; align-items: center; gap: 1px; padding: 0 6px;
  border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025);
}
.app-devmgmt .mmc-menu button {
  padding: 5px 9px; border-radius: 4px; font-size: 12px; color: var(--text-2);
}
.app-devmgmt .mmc-menu button:hover { background: var(--hover); }

.app-devmgmt .mmc-toolbar {
  height: 38px; flex: none; display: flex; align-items: center; gap: 2px;
  padding: 4px 6px; border-bottom: 1px solid var(--stroke);
}
.app-devmgmt .tb {
  height: 28px; min-width: 28px; display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 0 7px; border-radius: 4px; color: var(--text-2); font-size: 11.5px;
}
.app-devmgmt .tb svg { width: 16px; height: 16px; flex: none; }
.app-devmgmt .tb:hover:not(:disabled) { background: var(--hover); }
.app-devmgmt .tb:disabled { opacity: 0.32; cursor: default; }
.app-devmgmt .tb.wide { padding: 0 9px; }
.app-devmgmt .tb-sep { width: 1px; height: 20px; background: var(--stroke-2); margin: 0 4px; flex: none; }

.app-devmgmt .mmc-path {
  height: 25px; flex: none; display: flex; align-items: center; gap: 5px;
  padding: 0 9px; border-bottom: 1px solid var(--stroke);
  color: var(--text-3); font-size: 11.5px; background: rgba(0, 0, 0, 0.1);
  white-space: nowrap; overflow: hidden;
}
.app-devmgmt .mmc-path svg { width: 13px; height: 13px; flex: none; }
.app-devmgmt .mmc-path .crumb { color: rgba(255, 255, 255, 0.3); }
.app-devmgmt .mmc-path .crumb-here { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; }

.app-devmgmt .mmc-main { flex: 1; min-height: 0; display: grid; grid-template-columns: 272px minmax(0, 1fr); }
.app-devmgmt .mmc-tree {
  min-height: 0; overflow: auto; padding: 6px 4px;
  border-right: 1px solid var(--stroke); background: rgba(0, 0, 0, 0.14);
}

.app-devmgmt .tnode {
  width: 100%; height: 24px; display: flex; align-items: center; gap: 5px;
  padding: 0 6px; border-radius: 4px; text-align: left; color: var(--text-2);
  white-space: nowrap; font-size: 12px;
}
.app-devmgmt .tnode:hover { background: var(--hover); }
.app-devmgmt .tnode.sel { background: rgba(76, 194, 255, 0.18); box-shadow: inset 0 0 0 1px rgba(76, 194, 255, 0.32); color: #fff; }
.app-devmgmt .tnode .twisty { width: 14px; height: 14px; flex: none; display: grid; place-items: center; color: var(--text-3); }
.app-devmgmt .tnode .twisty svg { width: 10px; height: 10px; transition: transform 0.12s ease; }
.app-devmgmt .tnode .twisty.open svg { transform: rotate(90deg); }
.app-devmgmt .tnode .twisty.leaf { visibility: hidden; }
.app-devmgmt .tnode .tico { flex: none; width: 17px; height: 17px; display: grid; place-items: center; color: #8cc4ff; }
.app-devmgmt .tnode .tico.root { color: #d5e8ff; }
.app-devmgmt .tnode .tlabel { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

.app-devmgmt .dev-ico { position: relative; width: 17px; height: 17px; display: grid; place-items: center; }
.app-devmgmt .dev-ico .dev-glyph { width: 17px; height: 17px; }
.app-devmgmt .dev-ico.disabled .dev-glyph { color: #8a8a8a; }
.app-devmgmt .dev-ico .badge { position: absolute; right: -4px; bottom: -4px; width: 10px; height: 10px; }
.app-devmgmt .dev-ico.lg,
.app-devmgmt .dev-ico.lg .dev-glyph { width: 42px; height: 42px; }
.app-devmgmt .dev-ico.lg .badge { width: 18px; height: 18px; right: -5px; bottom: -5px; }

.app-devmgmt .mmc-result { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.app-devmgmt .result-head {
  flex: none; display: grid; grid-template-columns: minmax(170px, 2.2fr) minmax(90px, 1.1fr) 92px;
  gap: 10px; padding: 7px 13px; border-bottom: 1px solid var(--stroke);
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3);
}
.app-devmgmt .result-rows { flex: 1; min-height: 0; overflow: auto; padding: 3px 5px 8px; }
.app-devmgmt .rrow {
  display: grid; grid-template-columns: minmax(170px, 2.2fr) minmax(90px, 1.1fr) 92px;
  gap: 10px; width: 100%; min-height: 26px; align-items: center;
  padding: 3px 8px; border-radius: 4px; text-align: left; color: var(--text-2); font-size: 12px;
}
.app-devmgmt .rrow:hover { background: var(--hover); }
.app-devmgmt .rrow.sel { background: rgba(76, 194, 255, 0.16); box-shadow: inset 0 0 0 1px rgba(76, 194, 255, 0.3); color: #fff; }
.app-devmgmt .rname { min-width: 0; display: flex; align-items: center; gap: 7px; }
.app-devmgmt .rname .nm { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-devmgmt .rclass { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); font-size: 11.5px; }
.app-devmgmt .rstate.ok { color: #9fe2b3; }
.app-devmgmt .rstate.problem { color: #f2c94c; }
.app-devmgmt .rstate.disabled { color: #b9b9b9; }
.app-devmgmt .result-empty { padding: 28px 20px; color: var(--text-3); text-align: center; font-size: 12px; }

.app-devmgmt .mmc-status {
  height: 24px; flex: none; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 0 10px; border-top: 1px solid var(--stroke);
  background: rgba(0, 0, 0, 0.12); color: var(--text-3); font-size: 11px;
}
.app-devmgmt .status-l { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; white-space: nowrap; }
.app-devmgmt .status-l svg { width: 13px; height: 13px; flex: none; }
.app-devmgmt .status-r { flex: none; }
.app-devmgmt .status-r .warn { color: #f2c94c; }

/* dialogs shown through ctx.ui.dialog carry the app class on their wrapper */
.app-devmgmt.props { display: block; height: auto; min-height: 0; background: transparent; color: var(--text-2); }
.app-devmgmt.props > h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #fff; }
.app-devmgmt.props > p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.55; color: var(--text-2); }
.app-devmgmt.props .props-title { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.app-devmgmt.props .props-ico { width: 44px; height: 44px; flex: none; display: grid; place-items: center; color: #8cc4ff; }
.app-devmgmt.props .props-title h2 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; }
.app-devmgmt.props .props-title p { margin: 2px 0 0; color: var(--text-3); font-size: 11.5px; }
.app-devmgmt.props .props-tabs { display: flex; gap: 1px; border-bottom: 1px solid var(--stroke); margin-bottom: 13px; }
.app-devmgmt.props .props-tabs button {
  padding: 6px 12px; margin-bottom: -1px; border-bottom: 2px solid transparent;
  font-size: 12px; color: var(--text-3);
}
.app-devmgmt.props .props-tabs button:hover { color: var(--text-2); }
.app-devmgmt.props .props-tabs button.sel { color: #fff; border-bottom-color: var(--accent); }
.app-devmgmt.props .props-body { min-height: 188px; }
.app-devmgmt.props .prop-row {
  display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 10px;
  padding: 3px 0; font-size: 12px; color: var(--text-2); line-height: 1.45;
}
.app-devmgmt.props .prop-row b { font-weight: 400; color: var(--text-3); }
.app-devmgmt.props .prop-row span { overflow-wrap: anywhere; }
.app-devmgmt.props .props-body h4 { margin: 13px 0 6px; font-size: 12px; font-weight: 600; color: #fff; }
.app-devmgmt.props .status-box {
  display: flex; gap: 9px; align-items: flex-start; padding: 9px 10px;
  border: 1px solid var(--stroke); border-radius: 6px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-2); font-size: 12px; line-height: 1.5;
}
.app-devmgmt.props .status-box.problem { border-color: rgba(242, 201, 76, 0.45); background: rgba(242, 201, 76, 0.08); color: #f7e7b1; }
.app-devmgmt.props .status-box.disabled { color: var(--text-3); }
.app-devmgmt.props .status-svg { width: 18px; height: 18px; flex: none; margin-top: 1px; }
.app-devmgmt.props .driver-note { margin: 10px 0 0; color: #f2c94c; font-size: 11.5px; }
.app-devmgmt.props .driver-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; }
.app-devmgmt.props .driver-actions .btn { padding: 5px 9px; font-size: 11.5px; }
.app-devmgmt.props .detail-field { display: grid; gap: 6px; margin-bottom: 9px; }
.app-devmgmt.props .detail-field label { color: var(--text-3); font-size: 11.5px; }
.app-devmgmt.props .detail-select {
  width: 100%; padding: 6px 8px; border: 1px solid var(--stroke-2); border-radius: 4px;
  background: rgba(255, 255, 255, 0.06); color: var(--text-2); font-size: 12px;
}
.app-devmgmt.props .detail-value {
  min-height: 82px; max-height: 142px; overflow: auto; padding: 8px 10px;
  border: 1px solid var(--stroke); border-radius: 4px; background: rgba(0, 0, 0, 0.18);
  font-family: Consolas, "Cascadia Mono", monospace; font-size: 11px; line-height: 1.5;
  color: var(--text-2); white-space: pre-wrap; overflow-wrap: anywhere; user-select: text;
}
.app-devmgmt.props .props-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--stroke);
}
.app-devmgmt.props .prog {
  height: 10px; border-radius: 5px; border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.09); overflow: hidden; margin: 16px 0 8px;
}
.app-devmgmt.props .prog i {
  display: block; width: 100%; height: 100%;
  background: repeating-linear-gradient(115deg, #2b8fe0 0 14px, #1b6db3 14px 28px);
  background-size: 56px 100%;
  animation: devmgmt-progress 0.8s linear infinite;
}
@keyframes devmgmt-progress {
  from { background-position: 0 0; }
  to { background-position: 56px 0; }
}
`;
