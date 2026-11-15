// Services console chrome. Everything is scoped under .app-services, including
// the Properties and progress dialogs (their markup carries the same class).
export const CSS = `
.app-services .svc-console {
  height: 100%; display: flex; flex-direction: column; min-height: 0;
  color: var(--text-2); background: rgba(0, 0, 0, 0.08);
}

.app-services .svc-menubar { flex: none; display: flex; gap: 1px; padding: 2px 4px; border-bottom: 1px solid var(--stroke); }
.app-services .svc-menubar button { padding: 4px 9px; border-radius: 3px; font-size: 12px; color: var(--text-2); }
.app-services .svc-menubar button:hover { background: var(--hover); }

.app-services .svc-toolbar { flex: none; display: flex; align-items: center; gap: 2px; padding: 4px 6px; border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.018); }
.app-services .svc-toolbar button { width: 28px; height: 26px; display: grid; place-items: center; border-radius: 3px; color: var(--text-2); }
.app-services .svc-toolbar button:hover:not(:disabled) { background: var(--hover); }
.app-services .svc-toolbar button:disabled { opacity: 0.3; }
.app-services .svc-toolbar svg { width: 15px; height: 15px; }
.app-services .svc-toolbar .sep { width: 1px; height: 18px; background: var(--stroke); margin: 0 4px; }

.app-services .svc-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 174px minmax(0, 1fr) 192px; }
.app-services .svc-body.is-standard { grid-template-columns: 174px minmax(0, 1fr); }

.app-services .svc-tree { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.024); }
.app-services .svc-tree-head { flex: none; padding: 6px 10px; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-3); border-bottom: 1px solid var(--stroke); }
.app-services .svc-tree-body { flex: 1; min-height: 0; overflow: auto; padding: 6px 4px; }
.app-services .svc-tree-node { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left; padding: 5px 8px; border-radius: 3px; font-size: 12px; color: var(--text-2); }
.app-services .svc-tree-node.sel { background: rgba(76, 194, 255, 0.16); color: #fff; }
.app-services .svc-tree-node svg { width: 15px; height: 15px; flex: none; }
.app-services .svc-tree-leaf { padding: 4px 8px 4px 30px; font-size: 11.5px; color: var(--text-3); }

.app-services .svc-views { flex: none; display: flex; gap: 2px; padding: 4px 4px 0; border-top: 1px solid var(--stroke); }
.app-services .svc-views button { padding: 4px 9px; font-size: 11px; color: var(--text-3); border: 1px solid transparent; border-bottom: 0; border-radius: 3px 3px 0 0; }
.app-services .svc-views button:hover { background: var(--hover); }
.app-services .svc-views button.sel { background: rgba(255, 255, 255, 0.075); border-color: var(--stroke); color: #fff; }

.app-services .svc-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.app-services .svc-list-title { flex: none; padding: 6px 10px; font-size: 12px; color: var(--text-2); border-bottom: 1px solid var(--stroke); }
.app-services .svc-grid { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.app-services .svc-columns,
.app-services .svc-row {
  display: grid;
  grid-template-columns: 140px minmax(160px, 1fr) 80px 96px 180px;
  gap: 8px; align-items: center;
}
.app-services .svc-columns { flex: none; padding: 0 6px; border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03); }
.app-services .svc-columns button { display: flex; align-items: center; gap: 4px; width: 100%; padding: 6px 4px; font-size: 11.5px; color: var(--text-2); text-align: left; border-right: 1px solid var(--stroke); }
.app-services .svc-columns button:last-child { border-right: 0; }
.app-services .svc-columns button:hover { background: var(--hover); }
.app-services .svc-columns .arrow { color: var(--accent); font-size: 9px; }
.app-services .svc-rows { flex: 1; min-height: 0; overflow: auto; }
.app-services .svc-row { width: 100%; padding: 5px 10px; min-height: 26px; border-bottom: 1px solid rgba(255, 255, 255, 0.035); text-align: left; font-size: 12px; color: var(--text-2); }
.app-services .svc-row:hover { background: var(--hover); }
.app-services .svc-row.sel { background: rgba(76, 194, 255, 0.17); color: #fff; }
.app-services .svc-row:focus-visible { outline: 1px solid var(--accent); outline-offset: -2px; }
.app-services .svc-cell { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-services .svc-status { display: flex; align-items: center; gap: 6px; }
.app-services .svc-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: #94a3b8; }
.app-services .svc-dot.running { background: #4ade80; }
.app-services .svc-dot.paused { background: #fbbf24; }
.app-services .svc-empty { padding: 18px; font-size: 12px; color: var(--text-3); }

.app-services .svc-actions { min-height: 0; overflow: auto; border-left: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.024); padding: 8px; }
.app-services .svc-actions-head { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--text); }
.app-services .svc-group { border: 1px solid var(--stroke); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
.app-services .svc-group-title { padding: 5px 8px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); background: rgba(255, 255, 255, 0.035); border-bottom: 1px solid var(--stroke); }
.app-services .svc-action { display: block; width: 100%; padding: 5px 10px; text-align: left; font-size: 12px; color: var(--text-2); }
.app-services .svc-action:hover:not(:disabled) { background: var(--hover); }
.app-services .svc-action:disabled { color: rgba(255, 255, 255, 0.3); }
.app-services .svc-sep { height: 1px; background: var(--stroke); }
.app-services .svc-activity { font-size: 10.5px; line-height: 1.45; color: var(--text-3); }
.app-services .svc-activity div { padding: 3px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.045); }
.app-services .svc-activity div:last-child { border-bottom: 0; }
.app-services .svc-activity b { display: block; font-weight: 400; color: var(--text-2); }

.app-services .svc-statusbar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 10px; border-top: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.04); font-size: 11px; color: var(--text-3); }
.app-services .svc-statusbar .last { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Properties and progress dialogs live in the shared modal, so they carry
   .app-services themselves and these selectors still apply. */
.app-services .svc-props { width: 470px; max-width: 100%; }
.app-services .svc-dialog { width: 430px; max-width: 100%; }
.app-services .svc-dialog h2,
.app-services .svc-props h2 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.app-services .svc-sub { margin: 0 0 14px; font-size: 11.5px; color: var(--text-3); }
.app-services .svc-tabs { display: flex; gap: 1px; margin: 12px 0 14px; border-bottom: 1px solid var(--stroke); }
.app-services .svc-tab { padding: 6px 12px; font-size: 11.5px; color: var(--text-3); border: 1px solid transparent; border-bottom: 0; border-radius: 4px 4px 0 0; }
.app-services .svc-tab:hover { background: var(--hover); }
.app-services .svc-tab.sel { background: rgba(255, 255, 255, 0.075); border-color: var(--stroke); color: #fff; }
.app-services .svc-props-body { min-height: 218px; }
.app-services .svc-field { display: grid; grid-template-columns: 108px minmax(0, 1fr); gap: 10px; align-items: start; margin-bottom: 9px; font-size: 11.5px; }
.app-services .svc-field > span { color: var(--text-3); }
.app-services .svc-field > div { color: var(--text-2); line-height: 1.45; }
.app-services .svc-field.is-wide { grid-template-columns: 1fr; gap: 4px; }
.app-services .svc-field input { width: 100%; padding: 5px 7px; background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke); border-radius: 3px; color: var(--text-2); font: inherit; font-size: 11px; }
.app-services .svc-status-value { display: flex; align-items: center; gap: 6px; }
.app-services .svc-dep-note { margin: 0 0 6px; font-size: 11px; line-height: 1.45; color: var(--text-3); }
.app-services .svc-dep-box { margin-bottom: 12px; border: 1px solid var(--stroke); border-radius: 3px; background: rgba(0, 0, 0, 0.18); }
.app-services .svc-dep-list { min-height: 60px; max-height: 86px; overflow: auto; padding: 6px 8px; font-size: 11.5px; }
.app-services .svc-dep-list div { padding: 2px 0; }
.app-services .svc-dep-list .muted { color: var(--text-3); }
.app-services .svc-progress-line { font-size: 12px; color: var(--text-2); line-height: 1.5; margin: 0 0 14px; }
.app-services .svc-progress-bar { height: 12px; padding: 2px; border: 1px solid var(--stroke); border-radius: 3px; background: rgba(0, 0, 0, 0.25); overflow: hidden; }
.app-services .svc-progress-bar i { display: block; height: 100%; width: 0; border-radius: 1px; background: var(--accent); animation-name: services-progress; animation-timing-function: linear; animation-fill-mode: forwards; }
.app-services .svc-progress-hint { margin: 8px 0 0; font-size: 10.5px; color: var(--text-3); }

@keyframes services-progress {
  from { width: 4%; }
  to { width: 100%; }
}
`;
