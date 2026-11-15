import { BASE_FONT_PX } from "./text.js";

export const css = `
.app-notepad {
  --np-bg: #202020;
  --np-tab-active: #2d2d2d;
  --np-editor: #202020;
  --np-find: #2b2b2b;
  --np-input: #1b1b1b;
  --np-text: #f0f0f0;
  --np-text-2: #cfcfcf;
  --np-muted: #a0a0a0;
  --np-border: rgba(255, 255, 255, 0.09);
  --np-hover: rgba(255, 255, 255, 0.065);
  --np-focus: rgba(76, 194, 255, 0.75);
  --np-zoom: 1;
}
.app-notepad.np-light {
  --np-bg: #f3f3f3;
  --np-tab-active: #ffffff;
  --np-editor: #ffffff;
  --np-find: #f7f7f7;
  --np-input: #ffffff;
  --np-text: #1a1a1a;
  --np-text-2: #3c3c3c;
  --np-muted: #666666;
  --np-border: rgba(0, 0, 0, 0.1);
  --np-hover: rgba(0, 0, 0, 0.06);
  --np-focus: rgba(0, 103, 192, 0.75);
}
.app-notepad .notepad {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  background: var(--np-bg); color: var(--np-text); overflow: hidden;
}

.app-notepad .np-tabbar {
  display: flex; align-items: flex-end; gap: 3px; flex: none;
  height: 37px; padding: 5px 7px 0; background: var(--np-bg); overflow: hidden;
}
.app-notepad .np-tabs {
  display: flex; align-items: flex-end; gap: 2px; flex: 1; min-width: 0;
  overflow-x: auto; scrollbar-width: none;
}
.app-notepad .np-tabs::-webkit-scrollbar { display: none; }
.app-notepad .np-tab {
  display: flex; align-items: center; gap: 7px; flex: 0 1 auto;
  height: 31px; min-width: 104px; max-width: 220px; padding: 0 7px 0 9px;
  border-radius: 6px 6px 0 0; color: var(--np-text-2); font-size: 12px; outline: 0;
  cursor: default; white-space: nowrap;
}
.app-notepad .np-tab:hover { background: var(--np-hover); }
.app-notepad .np-tab.active { background: var(--np-tab-active); color: var(--np-text); }
.app-notepad .np-tab:focus-visible { box-shadow: inset 0 0 0 1px var(--np-focus); }
.app-notepad .np-tab svg { width: 14px; height: 14px; flex: none; }
.app-notepad .np-tab-name { overflow: hidden; text-overflow: ellipsis; }
.app-notepad .np-dot { color: var(--np-focus); font-size: 15px; line-height: 1; flex: none; }
.app-notepad .np-tab-x {
  width: 18px; height: 18px; flex: none; border-radius: 4px;
  display: grid; place-items: center; font-size: 10px; color: var(--np-muted);
  opacity: 0; transition: opacity 0.1s ease;
}
.app-notepad .np-tab:hover .np-tab-x, .app-notepad .np-tab.active .np-tab-x { opacity: 1; }
.app-notepad .np-tab-x:hover { background: var(--np-hover); color: var(--np-text); }
.app-notepad .np-newtab {
  width: 28px; height: 28px; flex: none; margin-bottom: 2px; border-radius: 4px;
  font-size: 18px; font-weight: 300; line-height: 1; color: var(--np-text-2);
}
.app-notepad .np-newtab:hover { background: var(--np-hover); }

.app-notepad .np-menubar {
  display: flex; align-items: center; gap: 2px; flex: none;
  height: 32px; padding: 0 5px; border-bottom: 1px solid var(--np-border); background: var(--np-bg);
}
.app-notepad .np-menubar button {
  height: 25px; padding: 0 9px; border-radius: 4px;
  font-size: 12px; color: var(--np-text-2); outline: 0;
}
.app-notepad .np-menubar button:hover { background: var(--np-hover); color: var(--np-text); }
.app-notepad .np-menubar button:focus-visible { box-shadow: inset 0 0 0 1px var(--np-focus); }

.app-notepad .np-find {
  display: flex; align-items: center; gap: 4px; flex: none;
  height: 38px; padding: 0 8px; background: var(--np-find); border-bottom: 1px solid var(--np-border);
}
.app-notepad .np-find input {
  width: min(250px, 42%); height: 26px; padding: 0 8px;
  border: 1px solid var(--np-border); border-radius: 4px;
  background: var(--np-input); color: var(--np-text); font-size: 12px; outline: 0;
}
.app-notepad .np-find input:focus { border-color: var(--np-focus); }
.app-notepad .np-find-count { min-width: 66px; font-size: 11.5px; color: var(--np-muted); }
.app-notepad .np-find-spacer { flex: 1; }
.app-notepad .np-tool {
  width: 27px; height: 27px; border-radius: 4px;
  display: grid; place-items: center; font-size: 13px; color: var(--np-text-2);
}
.app-notepad .np-tool:hover { background: var(--np-hover); color: var(--np-text); }
.app-notepad .np-tool:focus-visible { box-shadow: inset 0 0 0 1px var(--np-focus); }
.app-notepad .np-tool:disabled { opacity: 0.35; cursor: default; }
.app-notepad .np-case { font-size: 11.5px; font-weight: 600; }
.app-notepad .np-case.on { background: var(--np-hover); color: var(--np-text); box-shadow: inset 0 0 0 1px var(--np-border); }

.app-notepad .np-editor { flex: 1; min-height: 0; background: var(--np-editor); }
.app-notepad .np-editor textarea {
  display: block; width: 100%; height: 100%; padding: 8px 12px; margin: 0;
  resize: none; border: 0; outline: 0; background: transparent; color: var(--np-text);
  font: calc(${BASE_FONT_PX}px * var(--np-zoom)) / 1.55 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0.002em; white-space: pre; overflow: auto; overflow-wrap: normal;
  tab-size: 4; user-select: text; -webkit-user-select: text; caret-color: var(--np-focus);
}
.app-notepad .np-editor.wrap textarea { white-space: pre-wrap; overflow-wrap: anywhere; overflow-x: hidden; }
.app-notepad .np-editor textarea::selection { background: rgba(76, 194, 255, 0.34); color: inherit; }
.app-notepad.np-light .np-editor textarea::selection { background: rgba(0, 120, 212, 0.25); }

.app-notepad .np-status {
  display: flex; align-items: center; gap: 10px; flex: none;
  height: 26px; padding: 0 9px; border-top: 1px solid var(--np-border);
  background: var(--np-bg); font-size: 11.5px; color: var(--np-muted); white-space: nowrap;
  user-select: none;
}
.app-notepad .np-pos { min-width: 88px; }
.app-notepad .np-select { color: var(--np-muted); }
.app-notepad .np-status-spacer { flex: 1; }
.app-notepad .np-sep { width: 1px; height: 12px; background: var(--np-border); font-style: normal; }
.app-notepad .np-zoom { padding: 3px 8px; border-radius: 4px; font-size: 11.5px; color: var(--np-text-2); }
.app-notepad .np-zoom:hover { background: var(--np-hover); color: var(--np-text); }

.app-notepad .np-editor textarea::-webkit-scrollbar { width: 12px; height: 12px; }
.app-notepad .np-editor textarea::-webkit-scrollbar-thumb {
  background: var(--np-border); border: 3px solid transparent; border-radius: 8px; background-clip: content-box;
}
.app-notepad .np-editor textarea::-webkit-scrollbar-thumb:hover { background: var(--np-muted); background-clip: content-box; }

.app-notepad .np-dialog { color: var(--text); }
.app-notepad .np-dialog .np-tool { color: var(--text-2); }
.app-notepad .np-dialog .np-tool:hover { background: var(--hover); color: var(--text); }
.app-notepad .np-dialog .np-dlg-path {
  display: flex; align-items: center; gap: 7px; padding: 6px 0 8px;
  font-size: 12px; color: var(--text-3); overflow: hidden;
}
.app-notepad .np-dialog .np-dlg-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-notepad .np-dialog .np-dlg-list {
  height: 214px; overflow: auto; padding: 3px; border: 1px solid var(--stroke-2);
  border-radius: 5px; background: rgba(0, 0, 0, 0.18);
}
.app-notepad .np-dialog .np-dlg-row {
  display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 8px;
  width: 100%; padding: 5px 7px; border-radius: 4px; text-align: left;
  font-size: 12px; color: var(--text-2);
}
.app-notepad .np-dialog .np-dlg-row:hover { background: var(--hover); }
.app-notepad .np-dialog .np-dlg-row.sel { background: rgba(76, 194, 255, 0.16); }
.app-notepad .np-dialog .np-dlg-row svg { width: 17px; height: 17px; }
.app-notepad .np-dialog .np-dlg-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-notepad .np-dialog .np-dlg-size { color: var(--text-3); font-size: 11px; }
.app-notepad .np-dialog .np-dlg-empty { padding: 18px 10px; color: var(--text-3); font-size: 12px; }
.app-notepad .np-dialog .np-dlg-name { display: flex; align-items: center; gap: 9px; margin-top: 10px; }
.app-notepad .np-dialog .np-dlg-name label { font-size: 12px; color: var(--text-2); white-space: nowrap; }
.app-notepad .np-dialog .np-dlg-name input {
  flex: 1; min-width: 0; height: 28px; padding: 0 8px; font-size: 12px;
  border: 1px solid var(--stroke-2); border-radius: 4px; background: rgba(0, 0, 0, 0.22);
  color: var(--text); outline: 0;
}
.app-notepad .np-dialog .np-dlg-name input:focus { border-color: var(--accent); border-bottom-width: 2px; }
.app-notepad .np-dialog .np-dlg-msg { min-height: 17px; padding-top: 5px; font-size: 11.5px; color: #fbbf24; }
.app-notepad .np-prompt p { margin: 10px 0 0; }
`;
