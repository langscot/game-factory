// Devices and Printers styling. Classic Control Panel light surfaces, scoped
// under the app id so nothing leaks into the desktop.

export const css = `
.app-printers { height: 100%; position: relative; color: #1b1b1b; }
.app-printers .cp {
  height: 100%; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto;
  background: #f3f3f3; font-size: 12.5px; position: relative;
}
.app-printers button { color: inherit; }
.app-printers .cp-address {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: #f7f7f7; border-bottom: 1px solid #dedede;
}
.app-printers .cp-nav { display: flex; gap: 1px; }
.app-printers .cp-nav button {
  width: 26px; height: 24px; display: grid; place-items: center;
  border-radius: 3px; color: #4f4f4f;
}
.app-printers .cp-nav button:disabled { opacity: 0.38; }
.app-printers .cp-nav svg { width: 14px; height: 14px; }
.app-printers .cp-crumbs {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px;
  color: #4c4c4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.app-printers .cp-crumbs b { color: #1b1b1b; font-weight: 600; }
.app-printers .cp-crumbs i { font-style: normal; color: #9a9a9a; }
.app-printers .crumb-icon { display: inline-flex; }
.app-printers .crumb-icon svg { width: 16px; height: 16px; }
.app-printers .cp-search {
  display: flex; align-items: center; gap: 5px; width: 190px; padding: 3px 7px;
  background: #fff; border: 1px solid #cdcdcd; border-radius: 3px;
}
.app-printers .cp-search svg { width: 13px; height: 13px; color: #767676; flex: none; }
.app-printers .cp-search input {
  width: 100%; border: 0; outline: 0; background: transparent;
  font: inherit; font-size: 12px; color: #1b1b1b;
}
.app-printers .cp-command {
  display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
  padding: 5px 8px; background: #f3f3f3; border-bottom: 1px solid #dedede;
}
.app-printers .cp-btn {
  display: flex; align-items: center; gap: 6px; padding: 5px 8px;
  border: 1px solid transparent; border-radius: 3px; font-size: 12px; color: #333;
}
.app-printers .cp-btn:hover:not(:disabled) { background: #e5f1fb; border-color: #cce4f7; }
.app-printers .cp-btn:disabled { opacity: 0.42; }
.app-printers .cp-btn svg { width: 15px; height: 15px; color: #3f6fa8; flex: none; }
.app-printers .cp-sep { width: 1px; height: 20px; background: #dcdcdc; margin: 0 4px; }
.app-printers .cp-main { overflow: auto; padding: 14px 18px 6px; }
.app-printers .cp-section h3 {
  margin: 0 0 8px; font-size: 12.5px; font-weight: 600; color: #5a5a5a;
}
.app-printers .cp-section h3 span { color: #8a8a8a; font-weight: 400; }
.app-printers .tile-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
  gap: 10px; margin-bottom: 16px;
}
.app-printers .tile {
  position: relative; display: flex; flex-direction: column; align-items: center;
  gap: 2px; min-height: 138px; padding: 12px 10px 9px; text-align: center;
  background: #fff; border: 1px solid #d9d9d9; border-radius: 4px;
}
.app-printers .tile:hover { background: #f4faff; border-color: #a9d3f5; }
.app-printers .tile.sel {
  background: #e5f3ff; border-color: #0078d7; box-shadow: inset 0 0 0 1px #0078d7;
}
.app-printers .tile[hidden] { display: none; }
.app-printers .tile-art { display: grid; place-items: center; height: 52px; }
.app-printers .tile-art svg { width: 48px; height: 48px; display: block; }
.app-printers .tile.device .tile-art svg { width: 44px; height: 44px; }
.app-printers .tile-name {
  max-width: 100%; font-size: 12px; font-weight: 600; line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.app-printers .tile-state { font-size: 11px; font-weight: 600; }
.app-printers .tile-detail {
  width: 100%; color: #777; font-size: 10.5px; line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.app-printers .tile-check {
  position: absolute; top: 6px; left: 6px; width: 19px; height: 19px;
  display: grid; place-items: center; border-radius: 50%;
  background: #107c10; color: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}
.app-printers .tile-check svg { width: 13px; height: 13px; }
.app-printers .ready { color: #107c10; }
.app-printers .error { color: #c42b1c; }
.app-printers .offline { color: #8a8886; }
.app-printers .warn { color: #9d5d00; }
.app-printers .cp-note { margin: 0 0 8px; color: #888; font-size: 10.5px; }
.app-printers .cp-statusbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 4px 10px; background: #f3f3f3; border-top: 1px solid #dcdcdc;
  color: #555; font-size: 11px;
}
.app-printers .cp-selection {
  display: flex; align-items: center; gap: 10px; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.app-printers .cp-selection b {
  color: #1b1b1b; font-weight: 600; overflow: hidden; text-overflow: ellipsis;
}
.app-printers .spooler.ok { color: #107c10; }
.app-printers .spooler.bad { color: #c42b1c; }

/* ---------- print queue window ---------- */
.app-printers .q-layer {
  position: absolute; inset: 0; z-index: 10; padding: 16px;
  background: rgba(18, 18, 18, 0.3); display: flex; align-items: center; justify-content: center;
}
.app-printers .qwin {
  width: min(780px, 100%); height: min(510px, 100%);
  display: flex; flex-direction: column; overflow: hidden;
  background: #fff; color: #1b1b1b; border: 1px solid #9a9a9a; border-radius: 6px;
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.45);
}
.app-printers .q-titlebar {
  flex: none; height: 34px; display: flex; align-items: center; gap: 7px;
  padding: 0 4px 0 10px; background: #f3f3f3; border-bottom: 1px solid #dcdcdc;
}
.app-printers .q-icon { display: inline-flex; }
.app-printers .q-icon svg { width: 16px; height: 16px; }
.app-printers .q-title {
  flex: 1; font-size: 12px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-printers .q-close {
  width: 36px; height: 28px; border-radius: 4px;
  font-size: 18px; line-height: 1; color: #444;
}
.app-printers .q-close:hover { background: #e81123; color: #fff; }
.app-printers .q-menubar {
  display: flex; gap: 2px; padding: 2px 6px;
  background: #f7f7f7; border-bottom: 1px solid #e3e3e3;
}
.app-printers .q-menubar button {
  padding: 3px 8px; border-radius: 3px; font-size: 11.5px; color: #333;
}
.app-printers .q-menubar button:hover { background: #e5f1fb; }
.app-printers .q-toolbar {
  flex: none; display: flex; align-items: center; gap: 2px;
  padding: 5px 8px; background: #fbfbfb; border-bottom: 1px solid #dedede;
}
.app-printers .q-toolbar button {
  width: 30px; height: 28px; display: grid; place-items: center;
  border-radius: 3px; color: #3f3f3f;
}
.app-printers .q-toolbar button:hover:not(:disabled) { background: #e5f1fb; color: #0067c0; }
.app-printers .q-toolbar button:disabled { opacity: 0.35; }
.app-printers .q-toolbar svg { width: 16px; height: 16px; }
.app-printers .q-sep { width: 1px; height: 20px; background: #dcdcdc; margin: 0 5px; }
.app-printers .q-banner {
  flex: none; display: flex; flex-direction: column; gap: 1px;
  padding: 6px 10px; font-size: 11.5px; border-bottom: 1px solid;
}
.app-printers .q-banner b { font-weight: 600; }
.app-printers .q-banner.error { background: #fde7e9; border-color: #f1b8bd; color: #a4262c; }
.app-printers .q-banner.offline { background: #f3f2f1; border-color: #dedede; color: #5f5f5f; }
.app-printers .q-banner.warn { background: #fff4ce; border-color: #f2d98c; color: #7a4d00; }
.app-printers .q-table { flex: 1; min-height: 0; overflow: auto; background: #fff; }
.app-printers .q-table table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11.5px; }
.app-printers .q-table th {
  position: sticky; top: 0; z-index: 1; padding: 5px 8px; text-align: left;
  background: #f7f7f7; border-bottom: 1px solid #dcdcdc; font-weight: 600; color: #555;
}
.app-printers .q-table th:nth-child(1) { width: 40%; }
.app-printers .q-table th:nth-child(2) { width: 18%; }
.app-printers .q-table th:nth-child(3) { width: 17%; }
.app-printers .q-table th:nth-child(4) { width: 8%; }
.app-printers .q-table th:nth-child(5) { width: 17%; }
.app-printers .q-table td {
  padding: 5px 8px; border-bottom: 1px solid #f0f0f0; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-printers .q-table td.doc svg { width: 14px; height: 14px; vertical-align: -2px; margin-right: 6px; }
.app-printers .q-table td.num, .app-printers .q-table th.num { text-align: right; }
.app-printers .q-table tr.job { outline-offset: -2px; }
.app-printers .q-table tr.job:hover { background: #f5faff; }
.app-printers .q-table tr.job.sel, .app-printers .q-table tr.job.sel:hover { background: #cce8ff; }
.app-printers .q-table tr.job:focus-visible { outline: 2px solid #0078d7; }
.app-printers .q-table tr.dead td { color: #9a9a9a; text-decoration: line-through; }
.app-printers .q-table tr.empty td {
  padding: 28px 12px; text-align: center; color: #888; font-style: italic;
}
.app-printers .pill {
  display: inline-block; padding: 0 6px; border-radius: 8px;
  font-size: 10px; line-height: 16px; border: 1px solid transparent;
}
.app-printers .pill.printing { background: #e5f1fb; border-color: #b3d9f5; color: #0067c0; }
.app-printers .pill.queued { background: #f3f2f1; border-color: #dedede; color: #555; }
.app-printers .pill.warn { background: #fff4ce; border-color: #f2d98c; color: #7a4d00; }
.app-printers .pill.error { background: #fde7e9; border-color: #f1b8bd; color: #a4262c; }
.app-printers .pill.done { background: #dff6dd; border-color: #a9d9a5; color: #107c10; }
.app-printers .pill.cancelled { background: #f3f2f1; border-color: #dedede; color: #8a8886; }
.app-printers .q-statusbar {
  flex: none; display: flex; justify-content: space-between; gap: 12px;
  padding: 4px 9px; background: #f3f3f3; border-top: 1px solid #dcdcdc;
  font-size: 10.5px; color: #666;
}

/* ---------- add a printer wizard + properties dialog ---------- */
.app-printers.printers-dialog {
  margin: -22px; border-radius: 8px; overflow: hidden;
  background: #f3f3f3; color: #1b1b1b; font-size: 12px;
}
.app-printers.printers-dialog h2 { margin: 0; color: #1b1b1b; font-size: 17px; font-weight: 600; }
.app-printers.printers-dialog p { color: #555; font-size: 11px; }
.app-printers .wiz { display: flex; flex-direction: column; min-height: 390px; }
.app-printers .wiz-head {
  display: flex; align-items: center; gap: 10px; padding: 15px 18px 12px;
  background: #f7f7f7; border-bottom: 1px solid #e1e1e1;
}
.app-printers .wiz-head .sub { margin-top: 2px; color: #666; font-size: 11px; }
.app-printers .wiz-icon { display: inline-flex; }
.app-printers .wiz-icon svg { width: 34px; height: 34px; }
.app-printers .wiz-body { flex: 1; padding: 14px 18px; }
.app-printers .wiz-search {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 10px;
  background: #eef6fd; border: 1px solid #cfe6fa; border-radius: 4px;
  color: #245a86; font-size: 11.5px;
}
.app-printers .wiz-search-done { display: inline-flex; color: #107c10; }
.app-printers .wiz-search-done svg { width: 15px; height: 15px; }
.app-printers .spinner {
  display: inline-block; flex: none; width: 14px; height: 14px;
  border: 2px solid #b9d8ef; border-top-color: #0078d7; border-radius: 50%;
  animation: printers-spin 0.8s linear infinite;
}
@keyframes printers-spin { to { transform: rotate(360deg); } }
.app-printers .wiz-list { display: grid; gap: 3px; max-height: 192px; overflow: auto; }
.app-printers .wiz-device {
  display: flex; align-items: center; gap: 9px; padding: 7px 8px;
  border: 1px solid transparent; border-radius: 4px; text-align: left;
}
.app-printers .wiz-device:hover { background: #eef6fd; }
.app-printers .wiz-device.sel { background: #cce8ff; border-color: #99c9ee; }
.app-printers .wiz-device-icon { display: inline-flex; }
.app-printers .wiz-device-icon svg { width: 24px; height: 24px; }
.app-printers .wiz-device-text { display: grid; gap: 1px; min-width: 0; }
.app-printers .wiz-device-text b { font-size: 12px; font-weight: 600; }
.app-printers .wiz-device-text small { color: #666; font-size: 10.5px; }
.app-printers .wiz-empty { padding: 18px 8px; color: #777; font-size: 11.5px; text-align: center; }
.app-printers .wiz-link {
  margin-top: 10px; padding: 2px; color: #0067c0; font-size: 11.5px;
  text-decoration: underline; text-underline-offset: 2px;
}
.app-printers .wiz-label { display: block; margin-bottom: 4px; font-size: 11.5px; font-weight: 600; }
.app-printers .wiz-input {
  width: 100%; padding: 6px 8px; background: #fff; color: #1b1b1b;
  border: 1px solid #a9a9a9; border-radius: 3px; font: inherit; font-size: 12px;
}
.app-printers .wiz-input:focus { outline: 2px solid #99c9ee; border-color: #0078d7; }
.app-printers .wiz-hint { margin: 6px 0; color: #666; font-size: 10.5px; line-height: 1.45; }
.app-printers .wiz-hint code { padding: 0 3px; background: #e8e8e8; border-radius: 2px; }
.app-printers .wiz-error {
  display: grid; gap: 2px; margin-top: 10px; padding: 8px 10px;
  background: #fde7e9; border: 1px solid #f1b8bd; border-left: 3px solid #c42b1c;
  border-radius: 3px; color: #8a1a20; font-size: 11px;
}
.app-printers .wiz-error b { font-weight: 600; }
.app-printers .wiz-foot, .app-printers .props-foot {
  display: flex; justify-content: flex-end; gap: 7px; padding: 10px 18px;
  background: #f7f7f7; border-top: 1px solid #e1e1e1;
}
.app-printers .pbtn {
  min-width: 74px; padding: 5px 13px; font: inherit; font-size: 12px;
  background: #fdfdfd; border: 1px solid #adadad; border-radius: 3px; color: #1b1b1b;
}
.app-printers .pbtn:hover:not(:disabled) { background: #e5f1fb; border-color: #7eb4e2; }
.app-printers .pbtn.primary { background: #0078d7; border-color: #0067c0; color: #fff; }
.app-printers .pbtn.primary:hover:not(:disabled) { background: #006cc1; }
.app-printers .pbtn:disabled { opacity: 0.45; }
.app-printers .wiz-working {
  display: flex; flex: 1; gap: 12px; padding: 28px 18px; color: #333;
}
.app-printers .wiz-working b { display: block; margin-bottom: 3px; }
.app-printers .wiz-working span { display: block; color: #666; font-size: 11px; line-height: 1.5; }
.app-printers .wiz-progress {
  height: 4px; margin: 0 18px 20px; background: #dcdcdc; border-radius: 2px; overflow: hidden;
}
.app-printers .wiz-progress i {
  display: block; height: 100%; width: 35%; background: #0078d7;
  border-radius: 2px; animation: printers-progress 1s ease-in-out infinite;
}
@keyframes printers-progress {
  0% { margin-left: 0; width: 20%; }
  50% { margin-left: 45%; width: 45%; }
  100% { margin-left: 80%; width: 20%; }
}
.app-printers .props { display: flex; flex-direction: column; min-height: 430px; }
.app-printers .props-head {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px 10px;
  background: #f7f7f7; border-bottom: 1px solid #e1e1e1;
}
.app-printers .props-icon { display: inline-flex; }
.app-printers .props-icon svg { width: 30px; height: 30px; }
.app-printers .props-head h2 { font-size: 16px; }
.app-printers .props-head .sub { margin-top: 2px; color: #666; font-size: 10.5px; }
.app-printers .props-tabs {
  display: flex; gap: 1px; padding: 6px 10px 0;
  background: #f3f3f3; border-bottom: 1px solid #d0d0d0;
}
.app-printers .props-tabs button {
  position: relative; top: 1px; padding: 5px 14px; font-size: 11.5px;
  color: #444; border: 1px solid transparent; border-bottom: 0;
  border-radius: 3px 3px 0 0;
}
.app-printers .props-tabs button:hover { background: #e9f3fb; }
.app-printers .props-tabs button.sel {
  background: #fff; border-color: #d0d0d0; color: #1b1b1b; font-weight: 600;
}
.app-printers .props-body { flex: 1; padding: 14px 18px; background: #fff; }
.app-printers .prop-general { display: grid; grid-template-columns: 74px 1fr; gap: 12px; }
.app-printers .prop-preview {
  height: 74px; display: grid; place-items: center;
  background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px;
}
.app-printers .prop-preview svg { width: 52px; height: 52px; }
.app-printers .prop-fields { display: grid; gap: 7px; }
.app-printers .props-body label { display: grid; gap: 3px; color: #555; font-size: 11px; }
.app-printers .props-body input:not([type="checkbox"]):not([type="radio"]),
.app-printers .props-body select {
  width: 100%; padding: 4px 6px; background: #fff; color: #1b1b1b;
  border: 1px solid #b5b5b5; border-radius: 3px; font: inherit; font-size: 11.5px;
}
.app-printers .props-body input:focus, .app-printers .props-body select:focus {
  outline: 2px solid #99c9ee; border-color: #0078d7;
}
.app-printers .prop-line { display: flex; gap: 8px; color: #666; font-size: 11px; line-height: 1.4; }
.app-printers .prop-line span { min-width: 50px; }
.app-printers .prop-line b { color: #222; font-weight: 400; }
.app-printers .prop-line b.error { color: #c42b1c; }
.app-printers .prop-line b.offline { color: #8a8886; }
.app-printers .prop-line b.warn { color: #9d5d00; }
.app-printers .prop-line b.ready { color: #107c10; }
.app-printers .prop-features { margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; }
.app-printers .prop-features h4 { margin: 0 0 4px; color: #555; font-size: 11px; }
.app-printers .prop-features ul { margin: 0; padding-left: 16px; color: #444; font-size: 11px; line-height: 1.6; }
.app-printers .prop-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.app-printers .prop-actions .pbtn { min-width: 0; padding: 4px 9px; font-size: 11px; }
.app-printers .prop-check {
  display: flex !important; align-items: center; gap: 6px; margin: 5px 0;
  color: #222 !important; font-size: 11.5px !important;
}
.app-printers .prop-check input { accent-color: #0078d7; }
.app-printers .prop-share { display: grid; gap: 4px; margin: 8px 0 0 22px; }
.app-printers .prop-share.off { opacity: 0.55; }
.app-printers .prop-hint { margin: 0 0 8px; color: #666; font-size: 10.5px; line-height: 1.45; }
.app-printers .prop-info {
  display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 8px;
  background: #fff4ce; border: 1px solid #f2d98c; border-radius: 3px;
  color: #7a4d00; font-size: 10.5px;
}
.app-printers .prop-info svg { width: 14px; height: 14px; flex: none; }
.app-printers .prop-ports { display: grid; gap: 3px; margin-top: 6px; }
.app-printers .prop-radio {
  display: flex !important; align-items: flex-start; gap: 7px; padding: 4px 5px;
  border-radius: 3px; color: #222 !important; font-size: 11px !important;
}
.app-printers .prop-radio:hover { background: #f2f8fd; }
.app-printers .prop-radio input { margin-top: 2px; accent-color: #0078d7; }
.app-printers .prop-radio span { display: grid; gap: 1px; }
.app-printers .prop-radio b { font-weight: 400; }
.app-printers .prop-radio small { color: #666; font-size: 10px; }
.app-printers .prop-fieldset {
  display: grid; gap: 2px; margin: 8px 0; padding: 5px 9px 7px;
  border: 1px solid #e0e0e0; border-radius: 4px;
}
.app-printers .prop-fieldset legend { padding: 0 4px; color: #555; font-size: 10.5px; }
.app-printers .prop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
`;
