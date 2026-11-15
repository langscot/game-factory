// Software Bazaar styles. Every selector is scoped under .app-softwarecenter;
// the only global rule is the uniquely named pulse keyframe.

export const css = `
.app-softwarecenter .sc { display: flex; flex-direction: column; height: 100%; background: #1c1c1e; }
.app-softwarecenter .sc button { font: inherit; }
.app-softwarecenter .sc input,
.app-softwarecenter .sc select { font: inherit; color: inherit; }

/* ---------- header and tabs ---------- */
.app-softwarecenter .sc-head { flex: none; background: linear-gradient(180deg, rgba(0, 103, 192, 0.24), rgba(0, 103, 192, 0)); border-bottom: 1px solid var(--stroke); }
.app-softwarecenter .sc-head-row { display: flex; align-items: center; gap: 12px; padding: 13px 20px 9px; }
.app-softwarecenter .sc-logo { width: 40px; height: 40px; flex: none; border-radius: 9px; display: grid; place-items: center; background: linear-gradient(145deg, #0b5cab, #2f8fe0); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18); }
.app-softwarecenter .sc-logo svg { width: 26px; height: 26px; }
.app-softwarecenter .sc-title { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.app-softwarecenter .sc-sub { margin-top: 1px; font-size: 11px; color: var(--text-3); }
.app-softwarecenter .sc-device { margin-left: auto; text-align: right; font-size: 11px; line-height: 1.5; color: var(--text-2); }
.app-softwarecenter .sc-device small { display: block; font-size: 10.5px; color: var(--text-3); }
.app-softwarecenter .sc-tabs { display: flex; gap: 4px; padding: 0 14px; overflow-x: auto; scrollbar-width: none; }
.app-softwarecenter .sc-tabs::-webkit-scrollbar { display: none; }
.app-softwarecenter .sc-tab { padding: 8px 12px 9px; font-size: 12px; color: var(--text-3); white-space: nowrap; border-bottom: 2px solid transparent; }
.app-softwarecenter .sc-tab:hover { color: var(--text-2); background: var(--hover); }
.app-softwarecenter .sc-tab.sel { color: #fff; border-bottom-color: var(--accent); }
.app-softwarecenter .sc-tab:focus-visible { outline: 1px solid var(--accent); outline-offset: -2px; }

/* ---------- shared page bits ---------- */
.app-softwarecenter .sc-main { flex: 1; min-height: 0; overflow: auto; }
.app-softwarecenter .sc-main-apps { overflow: hidden; }
.app-softwarecenter .sc-page { max-width: 1080px; padding: 16px 20px 24px; }
.app-softwarecenter .sc-h { margin: 0; font-size: 16px; font-weight: 600; }
.app-softwarecenter .sc-hint { margin-top: 3px; font-size: 11.5px; color: var(--text-3); }
.app-softwarecenter .sc-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.app-softwarecenter .sc-section-title { margin: 20px 0 8px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); }
.app-softwarecenter .sc-note { margin: 14px 0 0; font-size: 11px; line-height: 1.6; color: var(--text-3); }
.app-softwarecenter .sc-empty { padding: 18px; border: 1px dashed var(--stroke-2); border-radius: 8px; text-align: center; font-size: 12px; color: var(--text-3); }

/* ---------- application cards ---------- */
.app-softwarecenter .sc-apps { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 292px); align-items: stretch; height: 100%; min-height: 0; }
.app-softwarecenter .sc-apps-main { min-width: 0; overflow: auto; padding: 16px 18px 26px; }
.app-softwarecenter .sc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.app-softwarecenter .sc-card { display: flex; flex-direction: column; gap: 10px; padding: 12px; text-align: left; border: 1px solid var(--stroke); border-radius: 8px; background: rgba(255, 255, 255, 0.045); cursor: pointer; }
.app-softwarecenter .sc-card:hover { background: rgba(255, 255, 255, 0.075); border-color: var(--stroke-2); }
.app-softwarecenter .sc-card.sel { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); background: rgba(76, 194, 255, 0.08); }
.app-softwarecenter .sc-card.muted { opacity: 0.84; }
.app-softwarecenter .sc-card:focus-visible { outline: 1px solid var(--accent); outline-offset: 1px; }
.app-softwarecenter .sc-card-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.app-softwarecenter .sc-appicon { width: 38px; height: 38px; flex: none; border-radius: 8px; display: grid; place-items: center; font-size: 14px; font-weight: 700; letter-spacing: -0.02em; color: #fff; background: var(--tile, #44546a); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16); }
.app-softwarecenter .sc-card-name { min-width: 0; }
.app-softwarecenter .sc-card-name b { display: block; overflow: hidden; font-size: 12.5px; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
.app-softwarecenter .sc-card-name span { display: block; margin-top: 2px; overflow: hidden; font-size: 10.5px; color: var(--text-3); white-space: nowrap; text-overflow: ellipsis; }
.app-softwarecenter .sc-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--text-3); }
.app-softwarecenter .sc-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
.app-softwarecenter .sc-pill { display: inline-block; padding: 2px 7px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; border-radius: 99px; white-space: nowrap; }
.app-softwarecenter .sc-pill.installed { color: #8fe3a2; background: rgba(52, 199, 89, 0.13); border-color: rgba(52, 199, 89, 0.32); }
.app-softwarecenter .sc-pill.available { color: #9fd4ff; background: rgba(76, 194, 255, 0.11); border-color: rgba(76, 194, 255, 0.3); }
.app-softwarecenter .sc-pill.blocked { color: #ffc46b; background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.32); }
.app-softwarecenter .sc-pill.busy { color: #ffe08a; background: rgba(251, 191, 36, 0.12); border-color: rgba(251, 191, 36, 0.4); }
.app-softwarecenter .sc-pill.neutral { color: var(--text-3); background: rgba(255, 255, 255, 0.06); border-color: var(--stroke-2); }
.app-softwarecenter .sc-pill.failed { color: #ff9b9b; background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.32); }

.app-softwarecenter .sc-btn { padding: 4px 10px; font-size: 11.5px; border: 1px solid transparent; border-radius: 4px; white-space: nowrap; }
.app-softwarecenter .sc-btn:disabled { opacity: 0.55; cursor: default; }
.app-softwarecenter .sc-btn.primary { color: #fff; background: var(--accent-strong); }
.app-softwarecenter .sc-btn.primary:not(:disabled):hover { background: #0b7bd6; }
.app-softwarecenter .sc-btn.ghost { color: var(--text-2); background: rgba(255, 255, 255, 0.06); border-color: var(--stroke-2); }
.app-softwarecenter .sc-btn.ghost:not(:disabled):hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.app-softwarecenter .sc-filters { display: flex; gap: 2px; flex: none; padding: 2px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); }
.app-softwarecenter .sc-filter { padding: 4px 9px; font-size: 11px; color: var(--text-3); border-radius: 4px; }
.app-softwarecenter .sc-filter:hover { color: var(--text-2); }
.app-softwarecenter .sc-filter.sel { color: #fff; background: rgba(255, 255, 255, 0.15); }

/* ---------- details pane ---------- */
.app-softwarecenter .sc-detail { min-height: 100%; max-height: 100%; overflow: auto; padding: 18px; border-left: 1px solid var(--stroke); background: rgba(0, 0, 0, 0.18); }
.app-softwarecenter .sc-detail-icon { width: 56px; height: 56px; border-radius: 10px; display: grid; place-items: center; font-size: 20px; font-weight: 700; color: #fff; background: var(--tile, #44546a); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18); }
.app-softwarecenter .sc-detail h2 { margin: 12px 0 2px; font-size: 15px; font-weight: 600; line-height: 1.3; }
.app-softwarecenter .sc-detail-pub { font-size: 11px; color: var(--text-3); }
.app-softwarecenter .sc-detail-status { margin-top: 10px; }
.app-softwarecenter .sc-detail .sc-actions { display: flex; gap: 8px; margin: 12px 0 14px; }
.app-softwarecenter .sc-detail .sc-actions .sc-btn { flex: 1; padding: 7px 10px; font-size: 12px; }
.app-softwarecenter .sc-kv { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 11.5px; color: var(--text-2); border-bottom: 1px dashed rgba(255, 255, 255, 0.06); }
.app-softwarecenter .sc-kv b { font-weight: 400; color: var(--text-3); text-align: right; }
.app-softwarecenter .sc-desc { margin: 12px 0 0; font-size: 11.5px; line-height: 1.6; color: var(--text-2); }
.app-softwarecenter .sc-detail-note { margin-top: 12px; padding: 8px 9px; font-size: 10.5px; line-height: 1.5; color: var(--text-3); background: rgba(251, 191, 36, 0.06); border: 1px solid rgba(251, 191, 36, 0.22); border-radius: 5px; }
.app-softwarecenter .sc-detail-progress { margin-top: 10px; }
.app-softwarecenter .sc-detail-progress .sc-bar { width: 100%; }

/* ---------- updates, status, OS tables ---------- */
.app-softwarecenter .sc-table-wrap { overflow: hidden; border: 1px solid var(--stroke); border-radius: 8px; background: rgba(255, 255, 255, 0.025); }
.app-softwarecenter .sc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.app-softwarecenter .sc-table th { padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); border-bottom: 1px solid var(--stroke-2); }
.app-softwarecenter .sc-table td { padding: 9px 10px; color: var(--text-2); vertical-align: middle; border-bottom: 1px solid var(--stroke); }
.app-softwarecenter .sc-table tr:last-child td { border-bottom: 0; }
.app-softwarecenter .sc-table tr:hover td { background: rgba(255, 255, 255, 0.025); }
.app-softwarecenter .sc-table .nm { color: var(--text); }
.app-softwarecenter .sc-table .sub { display: block; margin-top: 2px; font-size: 10.5px; color: var(--text-3); }
.app-softwarecenter .sc-table .num { text-align: right; white-space: nowrap; }
.app-softwarecenter .sc-os { display: flex; align-items: flex-start; gap: 12px; margin-top: 10px; padding: 14px; border: 1px solid var(--stroke); border-radius: 8px; background: rgba(255, 255, 255, 0.04); }
.app-softwarecenter .sc-os-icon { width: 42px; height: 42px; flex: none; border-radius: 8px; display: grid; place-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; color: #fff; background: linear-gradient(145deg, #1b5fa8, #4cc2ff); }
.app-softwarecenter .sc-os-body { flex: 1; min-width: 0; }
.app-softwarecenter .sc-os-body h3 { margin: 0; font-size: 12.5px; font-weight: 600; }
.app-softwarecenter .sc-os-body p { margin: 4px 0 0; font-size: 11px; line-height: 1.55; color: var(--text-3); }
.app-softwarecenter .sc-os-side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: none; }

/* ---------- options ---------- */
.app-softwarecenter .sc-opt { max-width: 660px; }
.app-softwarecenter .sc-block { margin-top: 12px; padding: 14px 16px; border: 1px solid var(--stroke); border-radius: 8px; background: rgba(255, 255, 255, 0.04); }
.app-softwarecenter .sc-block h3 { margin: 0 0 5px; font-size: 12.5px; font-weight: 600; }
.app-softwarecenter .sc-check { display: flex; align-items: flex-start; gap: 9px; padding: 6px 0; font-size: 12.5px; color: var(--text-2); cursor: pointer; }
.app-softwarecenter .sc-check input { margin: 2px 0 0; accent-color: #2f8fe0; }
.app-softwarecenter .sc-hours { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 0 2px; font-size: 12.5px; color: var(--text-2); }
.app-softwarecenter .sc-hours select { padding: 4px 6px; font-size: 12px; color: var(--text); background: #2a2a2c; border: 1px solid var(--stroke-2); border-radius: 4px; }
.app-softwarecenter .sc-about { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--stroke); font-size: 11px; line-height: 1.7; color: var(--text-3); }
.app-softwarecenter .sc-row { display: flex; gap: 8px; margin-top: 14px; }

/* ---------- footer ---------- */
.app-softwarecenter .sc-foot { flex: none; display: flex; align-items: center; gap: 9px; padding: 6px 16px; font-size: 11px; color: var(--text-3); background: rgba(0, 0, 0, 0.22); border-top: 1px solid var(--stroke); }
.app-softwarecenter .sc-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; background: #4ade80; }
.app-softwarecenter .sc-dot.busy { background: #fbbf24; animation: sc-pulse 1.1s ease-in-out infinite; }
.app-softwarecenter .sc-foot .grow { flex: 1; }
.app-softwarecenter .sc-bar { width: 140px; height: 5px; flex: none; overflow: hidden; border-radius: 3px; background: rgba(255, 255, 255, 0.14); }
.app-softwarecenter .sc-bar i { display: block; height: 100%; background: linear-gradient(90deg, #2f8fe0, #4cc2ff); transition: width 0.12s linear; }
@keyframes sc-pulse { 50% { opacity: 0.3; } }
`;
