// Every selector is scoped under .app-taskmanager: the platform injects this
// once through ctx.ui.styles(). No global selectors, no external files.

export const css = `
.app-taskmanager .tm {
  --tm-cols: minmax(190px, 1fr) 76px 62px 86px 70px 82px;
  --tm-detail-cols: minmax(170px, 1fr) 58px 82px 118px 58px 82px 66px 80px;
  --tm-service-cols: minmax(150px, 1fr) 62px minmax(190px, 2fr) 84px 84px;
  --tm-start-cols: minmax(190px, 1.5fr) minmax(140px, 1fr) 78px 128px 54px;
  --tm-line: rgba(255, 255, 255, 0.085);
  --tm-panel: #26272a;
  --tm-app: #1f2023;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--tm-app);
  color: var(--text-2);
}

.app-taskmanager .tm button:focus-visible,
.app-taskmanager .tm input:focus-visible,
.app-taskmanager .tm [tabindex]:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

/* ---------- header ---------- */

.app-taskmanager .tm-top {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  flex: none;
  padding: 0 8px 0 4px;
  background: var(--tm-panel);
  border-bottom: 1px solid var(--tm-line);
}

.app-taskmanager .tm-tabs {
  display: flex;
  align-items: stretch;
  height: 100%;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.app-taskmanager .tm-tabs::-webkit-scrollbar { display: none; }

.app-taskmanager .tm-tab {
  height: 100%;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}
.app-taskmanager .tm-tab:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-2); }
.app-taskmanager .tm-tab.sel {
  color: #fff;
  border-bottom-color: var(--accent);
  background: rgba(255, 255, 255, 0.035);
}

.app-taskmanager .tm-tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.app-taskmanager .tm-run {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--stroke-2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.055);
  font-size: 12px;
  color: var(--text);
  white-space: nowrap;
}
.app-taskmanager .tm-run:hover { background: rgba(255, 255, 255, 0.1); }
.app-taskmanager .tm-run svg { width: 14px; height: 14px; }

.app-taskmanager .tm-iconbtn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  color: var(--text-2);
}
.app-taskmanager .tm-iconbtn:hover { background: rgba(255, 255, 255, 0.08); }
.app-taskmanager .tm-iconbtn:disabled { opacity: 0.35; cursor: default; background: none; }
.app-taskmanager .tm-iconbtn svg { width: 16px; height: 16px; }

/* ---------- pages ---------- */

.app-taskmanager .tm-view { flex: 1; min-height: 0; display: flex; }
.app-taskmanager .tm-page { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }

.app-taskmanager .tm-subbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 10px;
}

.app-taskmanager .tm-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 150px;
  max-width: 300px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--stroke-2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
}
.app-taskmanager .tm-search:focus-within { border-color: var(--accent); }
.app-taskmanager .tm-search svg { width: 13px; height: 13px; color: var(--text-3); flex: none; }
.app-taskmanager .tm-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-size: 12px;
}
.app-taskmanager .tm-search input::placeholder { color: var(--text-3); }

.app-taskmanager .tm-end {
  margin-left: auto;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--stroke-2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.055);
  font-size: 12px;
  color: var(--text);
}
.app-taskmanager .tm-end:not(:disabled):hover { background: rgba(196, 43, 28, 0.4); border-color: #c42b1c; }
.app-taskmanager .tm-end:disabled { opacity: 0.4; cursor: default; }

/* ---------- tables ---------- */

.app-taskmanager .tm-scroll { flex: 1; min-height: 0; overflow: auto; }
.app-taskmanager .tm-table { min-width: 720px; padding-bottom: 8px; }

.app-taskmanager .tm-head-row {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: var(--tm-cols);
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 12px;
  background: var(--tm-panel);
  border-bottom: 1px solid var(--tm-line);
  font-size: 10.5px;
  letter-spacing: 0.055em;
  text-transform: uppercase;
  color: var(--text-3);
}

.app-taskmanager .tm-details { min-width: 780px; }
.app-taskmanager .tm-details .tm-head-row,
.app-taskmanager .tm-details .tm-row { grid-template-columns: var(--tm-detail-cols); }

.app-taskmanager .tm-services { min-width: 680px; }
.app-taskmanager .tm-services .tm-head-row,
.app-taskmanager .tm-services .tm-row { grid-template-columns: var(--tm-service-cols); }

.app-taskmanager .tm-section {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 12px 5px;
  font-size: 11px;
  color: var(--text-3);
}
.app-taskmanager .tm-section.count {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.app-taskmanager .tm-row {
  display: grid;
  grid-template-columns: var(--tm-cols);
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  text-align: left;
  color: var(--text-2);
  cursor: default;
}
.app-taskmanager .tm-row:hover { background: rgba(255, 255, 255, 0.055); }
.app-taskmanager .tm-row.sel {
  background: rgba(76, 194, 255, 0.16);
  box-shadow: inset 2px 0 0 var(--accent);
}
.app-taskmanager .tm-row.tm-group { font-weight: 600; color: var(--text); }
.app-taskmanager .tm-row.tm-child { color: var(--text-2); }

.app-taskmanager .tm-name {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.app-taskmanager .tm-name .tm-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-taskmanager .tm-name > svg { width: 15px; height: 15px; flex: none; }
.app-taskmanager .tm-name.tm-indent { padding-left: 44px; }

.app-taskmanager .tm-chev {
  flex: none;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  transition: transform 0.12s ease;
}
.app-taskmanager .tm-chev svg { width: 11px; height: 11px; }
.app-taskmanager .tm-chev.closed { transform: rotate(-90deg); }
.app-taskmanager .tm-chev.blank { visibility: hidden; }

.app-taskmanager .tm-cell {
  overflow: hidden;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
}

.app-taskmanager .tm-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}
.app-taskmanager .tm-status i {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: #4ade80;
}
.app-taskmanager .tm-status.susp i { background: #fbbf24; }
.app-taskmanager .tm-status.stop i { background: #f87171; }

.app-taskmanager .tm-empty {
  padding: 40px 20px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3);
}

.app-taskmanager .tm-footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 30px;
  padding: 0 12px;
  background: var(--tm-panel);
  border-top: 1px solid var(--tm-line);
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
}
.app-taskmanager .tm-footer b { font-weight: 400; color: var(--text-2); font-variant-numeric: tabular-nums; }
.app-taskmanager .tm-footer .spacer { margin-left: auto; }

/* ---------- performance ---------- */

.app-taskmanager .tm-perf { flex-direction: row; }

.app-taskmanager .tm-perf-nav {
  width: 208px;
  flex: none;
  padding: 6px;
  overflow: auto;
  background: #242528;
  border-right: 1px solid var(--tm-line);
}

.app-taskmanager .tm-perf-item {
  display: grid;
  grid-template-columns: 17px 1fr 58px;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 2px;
  padding: 8px 8px;
  border-left: 3px solid transparent;
  border-radius: 4px;
  text-align: left;
  color: var(--text-2);
}
.app-taskmanager .tm-perf-item:hover { background: rgba(255, 255, 255, 0.05); }
.app-taskmanager .tm-perf-item.sel {
  background: rgba(76, 194, 255, 0.13);
  border-left-color: var(--accent);
  color: #fff;
}
.app-taskmanager .tm-perf-item .ico { color: var(--text-2); }
.app-taskmanager .tm-perf-item .ico svg { width: 16px; height: 16px; }
.app-taskmanager .tm-perf-item .meta { min-width: 0; }
.app-taskmanager .tm-perf-item .meta b {
  display: block;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-taskmanager .tm-perf-item .meta small {
  display: block;
  font-size: 10.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.app-taskmanager .tm-spark {
  display: block;
  width: 58px;
  height: 22px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.14);
}

.app-taskmanager .tm-perf-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: auto;
}
.app-taskmanager .tm-perf-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.app-taskmanager .tm-perf-head h2 { margin: 0; font-size: 22px; font-weight: 600; color: #fff; }
.app-taskmanager .tm-perf-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--text-3); }
.app-taskmanager .tm-perf-big { text-align: right; flex: none; }
.app-taskmanager .tm-perf-big b {
  display: block;
  font-size: 26px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.app-taskmanager .tm-perf-big span {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}

.app-taskmanager .tm-chart {
  display: block;
  width: 100%;
  height: 190px;
  border: 1px solid var(--tm-line);
  border-radius: 4px;
  background: #1a1b1e;
}

.app-taskmanager .tm-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.app-taskmanager .tm-stat {
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid var(--tm-line);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.045);
}
.app-taskmanager .tm-stat span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-3);
}
.app-taskmanager .tm-stat b {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

/* ---------- startup ---------- */

.app-taskmanager .tm-start-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px 4px;
}
.app-taskmanager .tm-start-head h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); }
.app-taskmanager .tm-start-head .boot { font-size: 11.5px; color: var(--text-3); font-variant-numeric: tabular-nums; }

.app-taskmanager .tm-startup { min-width: 660px; }
.app-taskmanager .tm-startup .tm-head-row,
.app-taskmanager .tm-startup .tm-row { grid-template-columns: var(--tm-start-cols); }
.app-taskmanager .tm-startup .tm-row { height: 46px; }

.app-taskmanager .tm-start-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.app-taskmanager .tm-apptile {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 5px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.app-taskmanager .tm-start-name .words { min-width: 0; }
.app-taskmanager .tm-start-name b {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.app-taskmanager .tm-start-name small {
  display: block;
  color: var(--text-3);
  font-size: 10.5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.app-taskmanager .tm-impact {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-3);
}
.app-taskmanager .tm-impact i {
  display: inline-block;
  width: 3px;
  height: 9px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.16);
}
.app-taskmanager .tm-impact i.on { background: var(--text-3); }
.app-taskmanager .tm-impact.high i.on { background: #f87171; }
.app-taskmanager .tm-impact.medium i.on { background: #fbbf24; }
.app-taskmanager .tm-impact.low i.on { background: #4ade80; }

.app-taskmanager .tm-switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  vertical-align: middle;
}
.app-taskmanager .tm-switch input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.app-taskmanager .tm-switch .track {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.18);
  transition: background 0.15s ease;
}
.app-taskmanager .tm-switch .track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}
.app-taskmanager .tm-switch input:checked + .track { background: var(--accent-strong); }
.app-taskmanager .tm-switch input:checked + .track::after { transform: translateX(16px); }
.app-taskmanager .tm-switch input:focus-visible + .track { outline: 1px solid var(--accent); outline-offset: 2px; }
.app-taskmanager .tm-switch input:disabled { cursor: default; }

.app-taskmanager .tm-note {
  padding: 10px 16px;
  font-size: 11px;
  color: var(--text-3);
}

@media (max-width: 760px) {
  .app-taskmanager .tm-perf-nav { width: 168px; }
  .app-taskmanager .tm-perf-item { grid-template-columns: 17px 1fr; }
  .app-taskmanager .tm-spark { display: none; }
  .app-taskmanager .tm-tools .tm-run span { display: none; }
}
`;
