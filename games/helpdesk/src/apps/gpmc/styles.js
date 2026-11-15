// GPMC console chrome. Every selector is scoped under .app-gpmc, including
// the link dialog and the editor window, because both mount inside that app.

export const CSS = `
.app-gpmc .gpmc-shell {
  height: 100%; min-height: 0; display: flex; flex-direction: column;
  color: var(--text-2); background: rgba(0, 0, 0, 0.09); overflow: hidden;
}

.app-gpmc .gpmc-menubar {
  flex: none; display: flex; gap: 1px; padding: 2px 4px;
  border-bottom: 1px solid var(--stroke);
}
.app-gpmc .gpmc-menubar button {
  padding: 4px 9px; border-radius: 3px; font-size: 12px; color: var(--text-2);
}
.app-gpmc .gpmc-menubar button:hover { background: var(--hover); }

.app-gpmc .gpmc-toolbar {
  flex: none; display: flex; align-items: center; gap: 3px;
  padding: 4px 6px; border-bottom: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.018);
}
.app-gpmc .gpmc-tool {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 9px; border: 1px solid transparent; border-radius: 3px;
  font-size: 11.5px; color: var(--text-2);
}
.app-gpmc .gpmc-tool:hover:not(:disabled) { background: var(--hover); border-color: var(--stroke); }
.app-gpmc .gpmc-tool:disabled { opacity: 0.35; cursor: default; }
.app-gpmc .gpmc-tool-plus { color: var(--accent); font-weight: 700; }
.app-gpmc .gpmc-tool-sep { width: 1px; height: 17px; background: var(--stroke); margin: 0 4px; }

.app-gpmc .gpmc-body {
  flex: 1; min-height: 0; display: grid;
  grid-template-columns: 218px minmax(0, 1fr) 198px;
}
.app-gpmc .gpmc-body.is-editor { grid-template-columns: 248px minmax(0, 1fr); }

.app-gpmc .gpmc-tree {
  min-height: 0; overflow: auto; padding: 4px 0;
  border-right: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.024);
}
.app-gpmc .gpmc-troot {
  display: flex; align-items: center; gap: 6px; padding: 5px 9px 6px;
  font-size: 11.5px; font-weight: 600; color: var(--text);
  border-bottom: 1px solid var(--stroke); margin-bottom: 3px;
}
.app-gpmc .gpmc-troot svg { width: 15px; height: 15px; flex: none; }
.app-gpmc .gpmc-trow {
  display: flex; align-items: center; gap: 1px; min-height: 24px; padding-right: 5px;
}
.app-gpmc .gpmc-trow:hover { background: var(--hover); }
.app-gpmc .gpmc-trow.sel { background: rgba(76, 194, 255, 0.17); }
.app-gpmc .gpmc-trow.current { background: rgba(255, 255, 255, 0.055); }
.app-gpmc .gpmc-tw {
  width: 14px; height: 18px; flex: none; display: grid; place-items: center;
  font-size: 10px; color: var(--text-3); border-radius: 2px;
}
.app-gpmc .gpmc-tw:hover { color: var(--text); background: var(--hover); }
.app-gpmc .gpmc-tlabel {
  display: flex; align-items: center; gap: 5px; flex: 1; min-width: 0;
  padding: 3px 4px; border-radius: 2px; text-align: left; font-size: 11.5px;
  color: var(--text-2);
}
.app-gpmc .gpmc-tlabel svg { width: 14px; height: 14px; flex: none; }
.app-gpmc .gpmc-trow.sel .gpmc-tlabel { color: #fff; }
.app-gpmc .gpmc-ttext { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-gpmc .gpmc-thint, .app-gpmc .gpmc-count {
  margin-left: auto; font-size: 9.5px; color: var(--text-3); font-weight: 400;
}
.app-gpmc .gpmc-count { padding: 0 4px; border: 1px solid var(--stroke); border-radius: 8px; }

.app-gpmc .gpmc-main { min-width: 0; min-height: 0; overflow: hidden; }
.app-gpmc .gpmc-main.is-gpo {
  display: grid; grid-template-rows: minmax(224px, 0.9fr) minmax(224px, 1.1fr);
}
.app-gpmc .gpmc-main.is-single { display: flex; flex-direction: column; }

.app-gpmc .gpmc-panehead {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  min-height: 32px; padding: 4px 10px; border-bottom: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.03);
}
.app-gpmc .gpmc-panehead b { font-size: 12px; font-weight: 600; color: var(--text); }
.app-gpmc .gpmc-panehead small { display: block; margin-top: 1px; font-size: 10.5px; color: var(--text-3); }
.app-gpmc .gpmc-panehead > span { font-size: 10.5px; color: var(--text-3); }

.app-gpmc .gpmc-pill {
  display: inline-flex; align-items: center; padding: 1px 7px; border: 1px solid var(--stroke);
  border-radius: 9px; font-size: 9.5px; color: var(--text-3); white-space: nowrap;
}

.app-gpmc .gpmc-listpane {
  min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  border-bottom: 1px solid var(--stroke);
}
.app-gpmc .gpmc-table { min-height: 0; display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.app-gpmc .gpmc-gpo-cols { grid-template-columns: minmax(176px, 1.65fr) 58px minmax(120px, 1.2fr) 142px; }
.app-gpmc .gpmc-thead {
  flex: none; display: grid; gap: 8px; align-items: center; padding: 0 10px;
  border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03);
}
.app-gpmc .gpmc-thead span, .app-gpmc .gpmc-linkhead span, .app-gpmc .gpmc-settinghead span,
.app-gpmc .gpmc-delegationhead span, .app-gpmc .gpmc-ou-head span, .app-gpmc .gpmc-prec-head span,
.app-gpmc .gpmc-effective-head span, .app-gpmc .gpmc-editor-head span, .app-gpmc .gpmc-starterhead span,
.app-gpmc .gpmc-sitehead span {
  padding: 4px 0; font-size: 10.5px; font-weight: 400; color: var(--text-3);  border-right: 1px solid var(--stroke); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-gpmc .gpmc-thead span:last-child, .app-gpmc .gpmc-linkhead span:last-child,
.app-gpmc .gpmc-settinghead span:last-child, .app-gpmc .gpmc-delegationhead span:last-child,
.app-gpmc .gpmc-ou-head span:last-child, .app-gpmc .gpmc-prec-head span:last-child,
.app-gpmc .gpmc-effective-head span:last-child, .app-gpmc .gpmc-editor-head span:last-child,
.app-gpmc .gpmc-starterhead span:last-child, .app-gpmc .gpmc-sitehead span:last-child { border-right: 0; }

.app-gpmc .gpmc-tbody { flex: 1; min-height: 0; overflow: auto; }
.app-gpmc .gpmc-gpo-row {
  display: grid; grid-template-columns: minmax(176px, 1.65fr) 58px minmax(120px, 1.2fr) 142px;
  gap: 8px; align-items: center; width: 100%; min-height: 24px; padding: 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); text-align: left; font-size: 11.5px;
}
.app-gpmc .gpmc-gpo-row:hover { background: var(--hover); }
.app-gpmc .gpmc-gpo-row.sel { background: rgba(76, 194, 255, 0.17); color: #fff; }
.app-gpmc .gpmc-gpo-name {
  display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 11.5px;
}
.app-gpmc .gpmc-gpo-name svg { width: 14px; height: 14px; flex: none; }
.app-gpmc .gpmc-gpo-name > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-gpmc .gpmc-gpo-name small { display: block; margin-top: 1px; font-size: 9.5px; color: var(--text-3); }
.app-gpmc .gpmc-cell-clip { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.app-gpmc .gpmc-detail { min-height: 0; display: flex; flex-direction: column; background: rgba(20, 20, 20, 0.55); }
.app-gpmc .gpmc-detail-head {
  flex: none; display: flex; align-items: center; gap: 7px; padding: 6px 10px;
  border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.02);
}
.app-gpmc .gpmc-detail-head > svg { width: 16px; height: 16px; flex: none; }
.app-gpmc .gpmc-detail-head b { display: block; font-size: 12px; font-weight: 600; color: var(--text); }
.app-gpmc .gpmc-detail-head small { display: block; font-size: 10px; color: var(--text-3); }

.app-gpmc .gpmc-tabs { flex: none; display: flex; gap: 1px; padding: 4px 8px 0; border-bottom: 1px solid var(--stroke); }
.app-gpmc .gpmc-tab {
  padding: 5px 12px; border: 1px solid transparent; border-bottom: 0; border-radius: 4px 4px 0 0;
  font-size: 11.5px; color: var(--text-3);
}
.app-gpmc .gpmc-tab:hover { background: var(--hover); }
.app-gpmc .gpmc-tab.sel {
  background: rgba(255, 255, 255, 0.075); border-color: var(--stroke); color: #fff;
}
.app-gpmc .gpmc-tabbody { flex: 1; min-height: 0; overflow: auto; padding: 9px 12px 12px; }
.app-gpmc .gpmc-tabbar {
  display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 12px;
}
.app-gpmc .gpmc-tabbar b { font-weight: 600; color: var(--text); }
.app-gpmc .gpmc-tabbar .gpmc-btn, .app-gpmc .gpmc-tabbar .gpmc-check { margin-left: auto; }
.app-gpmc .gpmc-tabbar .gpmc-check + .gpmc-btn { margin-left: 4px; }
.app-gpmc .gpmc-btn {
  padding: 3px 8px; border: 1px solid var(--stroke-2); border-radius: 3px;
  font-size: 10.5px; color: var(--text-2); background: rgba(255, 255, 255, 0.045);
}
.app-gpmc .gpmc-btn:hover { background: rgba(255, 255, 255, 0.1); }
.app-gpmc .gpmc-check { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--text-3); }
.app-gpmc .gpmc-check input { width: 12px; height: 12px; accent-color: var(--accent-strong); }
.app-gpmc .gpmc-mini {
  justify-self: start; padding: 2px 7px; border: 1px solid var(--stroke); border-radius: 3px;
  font-size: 10px; color: var(--text-2);
}
.app-gpmc .gpmc-mini:hover { background: rgba(248, 113, 113, 0.14); border-color: rgba(248, 113, 113, 0.42); color: #fbcaca; }

.app-gpmc .gpmc-linkhead, .app-gpmc .gpmc-ou-head, .app-gpmc .gpmc-prec-head,
.app-gpmc .gpmc-effective-head, .app-gpmc .gpmc-editor-head,
.app-gpmc .gpmc-settinghead, .app-gpmc .gpmc-delegationhead,
.app-gpmc .gpmc-starterhead, .app-gpmc .gpmc-sitehead {
  display: grid; gap: 8px; align-items: center; padding: 0 2px;
  border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025);
}
.app-gpmc .gpmc-linkhead { grid-template-columns: minmax(180px, 1.6fr) 44px 60px 82px; }
.app-gpmc .gpmc-linkrow {
  display: grid; grid-template-columns: minmax(180px, 1.6fr) 44px 60px 82px;
  gap: 8px; align-items: center; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-linkname { display: flex; align-items: center; gap: 6px; min-width: 0; }
.app-gpmc .gpmc-linkname svg { width: 14px; height: 14px; flex: none; }
.app-gpmc .gpmc-linkname b { display: block; font-weight: 400; color: var(--text-2); }
.app-gpmc .gpmc-linkname small { display: block; font-size: 9.5px; color: var(--text-3); }

.app-gpmc .gpmc-note { margin: 8px 0 0; font-size: 10.5px; line-height: 1.5; color: var(--text-3); }
.app-gpmc .gpmc-subhead {
  margin: 12px 0 4px; padding-top: 8px; border-top: 1px solid var(--stroke);
  font-size: 11px; font-weight: 600; color: var(--text-2);
}
.app-gpmc .gpmc-empty { padding: 12px 4px; font-size: 11px; color: var(--text-3); }
.app-gpmc .gpmc-filterrow {
  display: flex; align-items: center; gap: 7px; padding: 5px 7px;
  border: 1px solid var(--stroke); border-radius: 3px; background: rgba(0, 0, 0, 0.16);
  font-size: 11px;
}
.app-gpmc .gpmc-filterrow svg { width: 14px; height: 14px; color: var(--text-3); }

.app-gpmc .gpmc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 16px; }
.app-gpmc .gpmc-field { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; font-size: 11px; line-height: 1.45; }
.app-gpmc .gpmc-field.is-wide { grid-column: 1 / -1; grid-template-columns: 86px minmax(0, 1fr); }
.app-gpmc .gpmc-field > span { color: var(--text-3); }
.app-gpmc .gpmc-field > div { color: var(--text-2); min-width: 0; }

.app-gpmc .gpmc-settinghead { grid-template-columns: 64px minmax(180px, 1.6fr) 112px; }
.app-gpmc .gpmc-settingrow {
  display: grid; grid-template-columns: 64px minmax(180px, 1.6fr) 112px;
  gap: 8px; align-items: start; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-scope { color: var(--text-3); }
.app-gpmc .gpmc-settingname { min-width: 0; color: var(--text-2); }
.app-gpmc .gpmc-settingname small { display: block; margin-top: 1px; font-size: 9.5px; color: var(--text-3); }
.app-gpmc .gpmc-state { color: var(--text-2); }

.app-gpmc .gpmc-delegationhead, .app-gpmc .gpmc-delegationrow {
  grid-template-columns: minmax(150px, 1.1fr) minmax(190px, 1.6fr) 64px;
}
.app-gpmc .gpmc-delegationrow {
  display: grid; gap: 8px; align-items: center; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-delegationrow > span:first-child { display: flex; align-items: center; gap: 6px; }
.app-gpmc .gpmc-delegationrow svg { width: 14px; height: 14px; color: var(--text-3); }

.app-gpmc .gpmc-ou-head { grid-template-columns: 44px minmax(170px, 1.6fr) 64px 140px 78px; }
.app-gpmc .gpmc-ou-row {
  display: grid; grid-template-columns: 44px minmax(170px, 1.6fr) 64px 140px 78px;
  gap: 8px; align-items: center; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-ou-row .gpmc-gpo-name { font-size: 11px; }

.app-gpmc .gpmc-prec-head { grid-template-columns: 28px minmax(160px, 1.6fr) minmax(100px, 1fr) 56px 132px; }
.app-gpmc .gpmc-prec-row {
  display: grid; grid-template-columns: 28px minmax(160px, 1.6fr) minmax(100px, 1fr) 56px 132px;
  gap: 8px; align-items: center; padding: 4px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-effective-head {
  grid-template-columns: minmax(140px, 1.4fr) minmax(140px, 1.4fr) minmax(84px, 0.85fr) minmax(120px, 1.2fr);
}
.app-gpmc .gpmc-effective-row {
  display: grid; grid-template-columns: minmax(140px, 1.4fr) minmax(140px, 1.4fr) minmax(84px, 0.85fr) minmax(120px, 1.2fr);
  gap: 8px; align-items: center; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-effective-row.conflict { background: rgba(251, 191, 36, 0.045); }
.app-gpmc .gpmc-badge {
  display: inline-block; margin-right: 5px; padding: 0 4px; border-radius: 7px;
  background: rgba(251, 191, 36, 0.18); color: #fbe3a3; font-size: 9px;
}
.app-gpmc .gpmc-losers { font-size: 9.5px; color: var(--text-3); }
.app-gpmc .gpmc-muted { color: var(--text-3); }

.app-gpmc .gpmc-ou-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
.app-gpmc .gpmc-ou-card {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px;
  border: 1px solid var(--stroke); border-radius: 4px; background: rgba(255, 255, 255, 0.025);
  text-align: left; font-size: 11.5px;
}
.app-gpmc .gpmc-ou-card:hover { background: var(--hover); }
.app-gpmc .gpmc-ou-card svg { width: 16px; height: 16px; flex: none; }
.app-gpmc .gpmc-ou-card > span:nth-child(2) { flex: 1; min-width: 0; }
.app-gpmc .gpmc-ou-card b { display: block; font-weight: 500; color: var(--text-2); }
.app-gpmc .gpmc-ou-card small { display: block; margin-top: 1px; color: var(--text-3); font-size: 9.5px; }

.app-gpmc .gpmc-starterhead, .app-gpmc .gpmc-starterrow { grid-template-columns: minmax(170px, 1.2fr) minmax(220px, 1.8fr) 56px; }
.app-gpmc .gpmc-starterrow, .app-gpmc .gpmc-siterow {
  display: grid; gap: 8px; align-items: center; padding: 6px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11px;
}
.app-gpmc .gpmc-sitehead, .app-gpmc .gpmc-siterow { grid-template-columns: 1.1fr 0.8fr 46px 1.8fr; }
.app-gpmc .gpmc-siterow > span:first-child { display: flex; align-items: center; gap: 6px; }
.app-gpmc .gpmc-siterow svg { width: 14px; height: 14px; }

.app-gpmc .gpmc-actions {
  min-height: 0; overflow: auto; padding: 8px;
  border-left: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.024);
}
.app-gpmc .gpmc-acthead { margin-bottom: 6px; font-size: 11.5px; font-weight: 600; color: var(--text); }
.app-gpmc .gpmc-actgroup {
  margin: 8px -2px 4px; padding: 3px 4px; border-bottom: 1px solid var(--stroke);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3);
}
.app-gpmc .gpmc-actgroup:first-of-type { margin-top: 0; }
.app-gpmc .gpmc-actions button {
  display: block; width: 100%; padding: 4px 6px; border-radius: 3px;
  text-align: left; font-size: 11px; color: var(--text-2);
}
.app-gpmc .gpmc-actions button:hover:not(:disabled) { background: var(--hover); }
.app-gpmc .gpmc-actions button:disabled { opacity: 0.35; cursor: default; }
.app-gpmc .gpmc-actsep { height: 1px; background: var(--stroke); margin: 3px 0; }
.app-gpmc .gpmc-actnote { margin-top: 10px; font-size: 9.5px; line-height: 1.45; color: var(--text-3); }

.app-gpmc .gpmc-status {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 3px 10px; border-top: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04); font-size: 10.5px; color: var(--text-3);
}
.app-gpmc .gpmc-status-last { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Dialogs live in the shared modal, so they carry .app-gpmc themselves. */
.app-gpmc.gpmc-dialog { width: 440px; max-width: 100%; }
.app-gpmc.gpmc-dialog h2 { margin: 0 0 5px; font-size: 16px; font-weight: 600; }
.app-gpmc .gpmc-dialog-sub { margin: 0 0 14px; font-size: 11.5px; line-height: 1.5; color: var(--text-3); }
.app-gpmc .gpmc-dialog-field { display: block; margin-bottom: 12px; font-size: 11px; color: var(--text-3); }
.app-gpmc .gpmc-dialog-field > span { display: block; margin-bottom: 4px; }
.app-gpmc .gpmc-dialog-field select {
  width: 100%; padding: 6px 7px; border: 1px solid var(--stroke-2); border-radius: 3px;
  background: #242424; color: var(--text-2); font-size: 11.5px;
}
.app-gpmc .gpmc-dialog-note { margin: 0 0 14px; font-size: 10.5px; color: var(--text-3); }
.app-gpmc .gpmc-dialog-links { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.app-gpmc .gpmc-dialog-link {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  width: 100%; padding: 7px 9px; border: 1px solid var(--stroke); border-radius: 3px; text-align: left;
}
.app-gpmc .gpmc-dialog-link:hover { background: var(--hover); }
.app-gpmc .gpmc-dialog-link b { display: block; font-weight: 500; font-size: 11.5px; }
.app-gpmc .gpmc-dialog-link small { display: block; margin-top: 1px; font-size: 9.5px; color: var(--text-3); }

/* Editor window */
.app-gpmc .gpmc-editor-shell .gpmc-panehead { min-height: 40px; }
.app-gpmc .gpmc-editor-table {
  flex: 1 1 auto; min-height: 96px; display: flex; flex-direction: column; overflow: hidden;
}
.app-gpmc .gpmc-editor-head { grid-template-columns: minmax(220px, 1.4fr) 110px 70px; flex: none; }
.app-gpmc .gpmc-editor-list { flex: 1; min-height: 0; overflow: auto; }
.app-gpmc .gpmc-editor-row {
  display: grid; grid-template-columns: minmax(220px, 1.4fr) 110px 70px;
  gap: 8px; align-items: start; width: 100%; padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035); text-align: left; font-size: 11px;
}
.app-gpmc .gpmc-editor-row:hover { background: var(--hover); }
.app-gpmc .gpmc-editor-row.sel { background: rgba(76, 194, 255, 0.16); }
.app-gpmc .gpmc-editor-row .gpmc-muted { font-size: 10px; }
.app-gpmc .gpmc-editor-form {
  flex: 0 0 auto; max-height: 49%; overflow: auto; padding: 10px 12px 12px;
  border-top: 1px solid var(--stroke); background: rgba(0, 0, 0, 0.12);
}
.app-gpmc .gpmc-editor-form.is-empty { max-height: none; }
.app-gpmc .gpmc-editor-formhead { display: flex; align-items: flex-start; gap: 7px; }
.app-gpmc .gpmc-editor-formhead > span svg { width: 16px; height: 16px; }
.app-gpmc .gpmc-editor-form h3 { margin: 0; font-size: 12px; font-weight: 600; color: var(--text); }
.app-gpmc .gpmc-editor-formhead small { display: block; margin-top: 1px; font-size: 9.5px; color: var(--text-3); }
.app-gpmc .gpmc-desc { margin: 6px 0 9px; font-size: 10.5px; line-height: 1.5; color: var(--text-3); }
.app-gpmc .gpmc-radio-row { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-bottom: 8px; }
.app-gpmc .gpmc-radio-row label { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-2); }
.app-gpmc .gpmc-radio-row input { accent-color: var(--accent-strong); }
.app-gpmc .gpmc-form-field { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; font-size: 10.5px; color: var(--text-3); }
.app-gpmc .gpmc-form-field > span { min-width: 94px; }
.app-gpmc .gpmc-form-field input {
  flex: 1; min-width: 0; padding: 4px 7px; border: 1px solid var(--stroke-2); border-radius: 3px;
  background: rgba(0, 0, 0, 0.24); color: var(--text-2); font-size: 11px;
}
.app-gpmc .gpmc-form-field input:disabled { opacity: 0.45; }
.app-gpmc .gpmc-form-field em { font-style: normal; color: var(--text-3); }
.app-gpmc .gpmc-form-hint { margin: 4px 0 8px; font-size: 9.5px; color: var(--text-3); }
.app-gpmc .gpmc-form-actions { display: flex; align-items: center; gap: 10px; }
.app-gpmc .gpmc-form-actions .gpmc-muted { font-size: 9.5px; }

.app-gpmc .gpmc-tlabel:focus-visible, .app-gpmc .gpmc-gpo-row:focus-visible,
.app-gpmc .gpmc-tab:focus-visible, .app-gpmc .gpmc-editor-row:focus-visible,
.app-gpmc .gpmc-tool:focus-visible, .app-gpmc .gpmc-btn:focus-visible,
.app-gpmc .gpmc-mini:focus-visible, .app-gpmc .gpmc-actions button:focus-visible,
.app-gpmc .gpmc-ou-card:focus-visible {
  outline: 1px solid var(--accent); outline-offset: -2px;
}
`;
