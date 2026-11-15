// Scoped styles for the Outlook shell. Every selector is under `.app-mail`;
// colours come from the shell's tokens so the app follows the desktop theme.

export const css = `
.app-mail .olk {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #1b1b1b;
  color: #e7e7e7;
  font-size: 12px;
  container: olk / inline-size;
}
.app-mail .ico { display: inline-grid; place-items: center; flex: none; }
.app-mail .ico svg { width: 100%; height: 100%; }

/* ---------- ribbon ---------- */
.app-mail .ribbon {
  flex: none;
  background: #1d1d1d;
  border-bottom: 1px solid #333;
}
.app-mail .ribbon-tabs {
  height: 32px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 6px;
  background: #181818;
}
.app-mail .tab {
  height: 30px;
  padding: 0 12px;
  border-radius: 4px 4px 0 0;
  color: #cfcfcf;
  font-size: 12px;
  white-space: nowrap;
}
.app-mail .tab:hover { background: #2a2a2a; }
.app-mail .tab.sel { background: #242424; color: #fff; box-shadow: inset 0 2px 0 #4cc2ff; }
.app-mail .tab.file {
  margin-right: 6px;
  padding: 0 15px;
  border-radius: 3px 3px 0 0;
  background: #0f6cbd;
  color: #fff;
}
.app-mail .tab.file:hover { background: #1a7dd1; }
.app-mail .tab.file.sel { background: #0b5b9f; box-shadow: none; }
.app-mail .tellme {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  min-width: 190px;
  max-width: 300px;
  padding: 0 9px;
  margin-bottom: 4px;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
  background: #202020;
  color: #9a9a9a;
  font-size: 11px;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
}
.app-mail .tellme:hover { border-color: #4a4a4a; color: #c9c9c9; }
.app-mail .tellme .ico { width: 12px; height: 12px; flex: none; }

.app-mail .ribbon-body {
  min-height: 92px;
  display: flex;
  align-items: stretch;
  padding: 5px 6px 3px;
  background: #242424;
  overflow-x: auto;
  overflow-y: hidden;
}
.app-mail .rb-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-right: 1px solid #383838;
}
.app-mail .rb-group:last-child { border-right: 0; }
.app-mail .rb-items { display: flex; align-items: flex-start; gap: 2px; }
.app-mail .rb-stack { display: flex; flex-direction: column; gap: 1px; padding-top: 2px; }
.app-mail .rb {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 3px;
  color: #e2e2e2;
  white-space: nowrap;
}
.app-mail .rb .ico { display: grid; place-items: center; color: #a8c8e8; flex: none; }
.app-mail .rb .ico svg { width: 100%; height: 100%; }
.app-mail .rb.big {
  flex-direction: column;
  gap: 3px;
  min-width: 56px;
  padding: 3px 6px 1px;
  font-size: 10.5px;
  text-align: center;
}
.app-mail .rb.big .ico { width: 26px; height: 26px; color: #8fc7ff; }
.app-mail .rb.small { height: 21px; padding: 0 6px 0 3px; font-size: 11px; }
.app-mail .rb.small .ico { width: 16px; height: 16px; }
.app-mail .rb:hover { background: #333; outline: 1px solid #444; }
.app-mail .rb:active { background: #3c3c3c; }
.app-mail .rb-group-label {
  margin-top: 2px;
  font-size: 10px;
  color: #898989;
  letter-spacing: 0.01em;
}

/* ---------- main three panes ---------- */
.app-mail .olk-main { flex: 1; min-height: 0; display: flex; }

.app-mail .folder-pane {
  width: 204px;
  flex: none;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #1b1b1b;
  border-right: 1px solid #333;
}
.app-mail .fp-account {
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border-bottom: 1px solid #303030;
  min-width: 0;
}
.app-mail .fp-avatar {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #2f6fd0, #1b3d7a);
  color: #dcecff;
  font-size: 11px;
  font-weight: 600;
}
.app-mail .fp-account b { display: block; font-size: 12px; font-weight: 600; color: #fff; }
.app-mail .fp-account small { display: block; font-size: 10.5px; color: #8f8f8f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-mail .fp-scroll { flex: 1; min-height: 0; overflow: auto; padding: 5px 5px 10px; }
.app-mail .fp-section {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 8px 4px;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #858585;
}
.app-mail .fp-section .ico { width: 10px; height: 10px; }
.app-mail .fp-section .ico svg { transform: rotate(90deg); }
.app-mail .folder-item {
  width: 100%;
  height: 27px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-radius: 3px;
  color: #d6d6d6;
  font-size: 12.5px;
  text-align: left;
}
.app-mail .folder-item:hover { background: #2b2b2b; }
.app-mail .folder-item.sel { background: #0f548c; color: #fff; }
.app-mail .folder-item .ico { width: 15px; height: 15px; flex: none; color: #9db6d0; }
.app-mail .folder-item.sel .ico { color: #dcecff; }
.app-mail .fi-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-mail .folder-item.unread .fi-name { font-weight: 600; color: #fff; }
.app-mail .fi-count { font-size: 10.5px; color: #8f8f8f; font-variant-numeric: tabular-nums; }
.app-mail .folder-item.unread .fi-count { color: #7fc4ff; font-weight: 600; }
.app-mail .fp-divider { height: 1px; margin: 7px 8px 3px; background: #303030; }
.app-mail .fp-foot {
  flex: none;
  padding: 8px 11px;
  border-top: 1px solid #303030;
  font-size: 10px;
  color: #7f7f7f;
}

.app-mail .list-pane {
  width: 356px;
  flex: none;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #202020;
  border-right: 1px solid #333;
}
.app-mail .lp-head { flex: none; padding: 7px 9px 6px; border-bottom: 1px solid #333; }
.app-mail .lp-title { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; min-width: 0; }
.app-mail .lp-title b { font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; }
.app-mail .lp-title span { font-size: 10.5px; color: #8f8f8f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-mail .searchbox {
  height: 27px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 7px;
  border-radius: 3px;
  border: 1px solid #3d3d3d;
  background: #292929;
}
.app-mail .searchbox:focus-within { border-color: #4cc2ff; }
.app-mail .searchbox .ico { width: 13px; height: 13px; flex: none; color: #9a9a9a; }
.app-mail .searchbox input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: none;
  color: #eee;
  font-size: 12px;
}
.app-mail .searchbox input::placeholder { color: #858585; }
.app-mail .lp-cols {
  flex: none;
  display: grid;
  grid-template-columns: 1.1fr 1.9fr 56px 44px;
  gap: 7px;
  padding: 5px 9px;
  border-bottom: 1px solid #333;
  font-size: 10.5px;
  color: #8f8f8f;
}
.app-mail .lp-cols span:last-child, .app-mail .lp-cols span:nth-child(3) { text-align: right; }
.app-mail .list-rows { flex: 1; min-height: 0; overflow: auto; }
.app-mail .row {
  width: 100%;
  display: grid;
  grid-template-columns: 1.1fr 1.9fr 56px 44px;
  gap: 7px;
  align-items: center;
  padding: 5px 9px;
  border-bottom: 1px solid #292929;
  color: #cfcfcf;
  font-size: 11.5px;
  text-align: left;
}
.app-mail .row:hover { background: #2a2a2a; }
.app-mail .row.sel { background: #0f548c; color: #fff; }
.app-mail .row.unread { color: #fff; font-weight: 600; }
.app-mail .row .from { display: flex; align-items: center; gap: 5px; min-width: 0; }
.app-mail .row .from span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-mail .row .dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: #4cc2ff;
  visibility: hidden;
}
.app-mail .row.unread .dot { visibility: visible; }
.app-mail .subj-cell { min-width: 0; display: block; }
.app-mail .subj {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-mail .preview {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #8e8e8e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}
.app-mail .row.sel .preview { color: #cfe4ff; }
.app-mail .no-preview .preview { display: none; }
.app-mail .row .when, .app-mail .row .size {
  font-size: 10px;
  color: #999;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
}
.app-mail .row.sel .when, .app-mail .row.sel .size { color: #cfe4ff; }
.app-mail .lp-empty {
  padding: 24px 16px;
  color: #8f8f8f;
  font-size: 11.5px;
  text-align: center;
  line-height: 1.6;
}

.app-mail .read-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #1c1c1c;
}
.app-mail .rp { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.app-mail .rp-toolbar {
  flex: none;
  height: 35px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 7px;
  background: #202020;
  border-bottom: 1px solid #333;
}
.app-mail .rp-tool {
  height: 26px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border-radius: 3px;
  font-size: 11px;
  color: #d6d6d6;
  flex: none;
  white-space: nowrap;
}
.app-mail .rp-tool.compact { padding: 0 6px; }
.app-mail .rp-tool:hover { background: #333; }
.app-mail .rp-tool .ico { width: 14px; height: 14px; color: #8fc7ff; }
.app-mail .rp-toolbar .spacer { flex: 1; }
.app-mail .rp-scroll { flex: 1; min-height: 0; overflow: auto; padding: 14px 20px 26px; }
.app-mail .rp-empty {
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 30px;
  text-align: center;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.6;
}
.app-mail .rp-empty .ico { width: 54px; height: 54px; color: #4f6a86; margin: 0 auto; }
.app-mail .rp-empty b { color: #d5d5d5; font-weight: 600; font-size: 13px; }
.app-mail .rp-subject {
  margin: 0 0 12px;
  font-size: 19px;
  line-height: 1.28;
  font-weight: 600;
  color: #fff;
  overflow-wrap: anywhere;
}
.app-mail .rp-from {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid #2f2f2f;
}
.app-mail .rp-avatar {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #0f548c;
  color: #dcecff;
  font-size: 11px;
  font-weight: 600;
}
.app-mail .rp-who { flex: 1; min-width: 0; }
.app-mail .rp-name { font-weight: 600; color: #fff; font-size: 12.5px; overflow-wrap: anywhere; }
.app-mail .rp-addr { font-size: 11px; color: #9a9a9a; overflow-wrap: anywhere; }
.app-mail .rp-when { flex: none; font-size: 10.5px; color: #8f8f8f; white-space: nowrap; }
.app-mail .rp-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.app-mail .pill {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 9px;
  border: 1px solid #414141;
  color: #bdbdbd;
}
.app-mail .pill.warn { border-color: #8a6d2f; background: rgba(251, 191, 36, 0.08); color: #f0c977; }
.app-mail .rp-body p {
  margin: 0 0 11px;
  font-size: 13px;
  line-height: 1.65;
  color: #d9d9d9;
  overflow-wrap: anywhere;
}
.app-mail .rp-body p:last-child { margin-bottom: 0; }
.app-mail .rp-note {
  margin-top: 15px;
  padding: 10px 12px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: #f1e2b4;
  font-size: 12px;
  line-height: 1.5;
}
.app-mail .rp-attach { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.app-mail .rp-ticket { margin-top: 16px; }
.app-mail .rp-hint {
  margin-top: 18px;
  font-size: 10.5px;
  color: #858585;
}

/* ---------- attachment chips ---------- */
.app-mail .chip {
  display: flex;
  align-items: center;
  gap: 5px;
  max-width: 260px;
  height: 24px;
  padding: 0 4px 0 7px;
  border-radius: 3px;
  border: 1px solid #464646;
  background: #303030;
  font-size: 11px;
  color: #ddd;
}
.app-mail .chip .ico { width: 13px; height: 13px; flex: none; color: #d6b45a; }
.app-mail .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-mail .chip small { color: #9a9a9a; font-size: 10px; }
.app-mail .chip button {
  width: 17px;
  height: 17px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 2px;
  color: #a9a9a9;
}
.app-mail .chip button .ico { width: 9px; height: 9px; color: inherit; }
.app-mail .chip button:hover { background: #4a4a4a; color: #fff; }
.app-mail .rp-attach .chip { padding-right: 7px; }

/* ---------- status bar ---------- */
.app-mail .statusbar {
  flex: none;
  height: 23px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border-top: 1px solid #333;
  background: #1b1b1b;
  font-size: 10.5px;
  color: #939393;
  white-space: nowrap;
}
.app-mail .statusbar .conn { display: flex; align-items: center; gap: 6px; }
.app-mail .statusbar .dot { width: 7px; height: 7px; border-radius: 50%; background: #6ccb5f; flex: none; }
.app-mail .statusbar .conn.off .dot { background: #d9a441; }
.app-mail .statusbar .grow { flex: 1; }
.app-mail .statusbar .clock { font-variant-numeric: tabular-nums; }

/* ---------- compose ---------- */
.app-mail .cmp {
  position: absolute;
  inset: 9px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #4c4c4c;
  background: #242424;
  box-shadow: 0 26px 70px -14px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 0, 0, 0.5);
}
.app-mail .cmp-bar {
  flex: none;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 0 10px;
  background: #2e2e2e;
  border-bottom: 1px solid #3e3e3e;
  font-size: 11.5px;
  color: #ddd;
}
.app-mail .cmp-bar > .ico { width: 15px; height: 15px; color: #4cc2ff; flex: none; }
.app-mail .cmp-bar b {
  flex: 1;
  min-width: 0;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-mail .cmp-caps button {
  width: 40px;
  height: 30px;
  display: grid;
  place-items: center;
  color: #bdbdbd;
}
.app-mail .cmp-caps button .ico { width: 11px; height: 11px; }
.app-mail .cmp-caps button:hover { background: #c42b1c; color: #fff; }
.app-mail .cmp-ribbon {
  flex: none;
  display: flex;
  gap: 4px;
  padding: 5px 8px;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}
.app-mail .cmp-btn {
  height: 26px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border-radius: 3px;
  border: 1px solid #474747;
  background: #333;
  font-size: 11.5px;
  color: #e2e2e2;
}
.app-mail .cmp-btn .ico { width: 14px; height: 14px; color: #9dc9f2; }
.app-mail .cmp-btn:hover { background: #3c3c3c; }
.app-mail .cmp-btn.primary { background: #0f6cbd; border-color: #1a7dd1; color: #fff; }
.app-mail .cmp-btn.primary .ico { color: #fff; }
.app-mail .cmp-btn.primary:hover { background: #1a7dd1; }
.app-mail .cmp-fields {
  flex: none;
  padding: 1px 10px;
  background: #242424;
  border-bottom: 1px solid #3a3a3a;
}
.app-mail .cmp-field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 29px;
  border-bottom: 1px solid #333;
}
.app-mail .cmp-field:last-child { border-bottom: 0; }
.app-mail .cmp-field label {
  width: 48px;
  flex: none;
  text-align: right;
  font-size: 11.5px;
  color: #a8a8a8;
}
.app-mail .cmp-field input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: none;
  color: #eee;
  font-size: 12px;
  user-select: text;
}
.app-mail .cmp-field:focus-within { border-bottom-color: #4cc2ff; }
.app-mail .cmp-body {
  flex: 1;
  min-height: 0;
  resize: none;
  border: 0;
  outline: 0;
  padding: 12px 14px;
  background: #242424;
  color: #eaeaea;
  font: 13px/1.65 var(--font);
  user-select: text;
}
.app-mail .cmp-attach { flex: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px; }
.app-mail .cmp-attach:not(:empty) { padding: 8px 12px; border-top: 1px solid #333; }
.app-mail .cmp-status {
  flex: none;
  min-height: 21px;
  padding: 0 12px 7px;
  font-size: 11px;
  color: #ff9a9a;
}
.app-mail .cmp-status:empty { min-height: 8px; padding-bottom: 4px; }

/* ---------- backstage (File) ---------- */
.app-mail .bs {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  background: #1b1b1b;
}
.app-mail .bs-side {
  width: 214px;
  flex: none;
  display: flex;
  flex-direction: column;
  padding: 10px 0 12px;
  background: #0f548c;
}
.app-mail .bs-back {
  width: 34px;
  height: 34px;
  margin: 0 0 12px 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.34);
  color: #fff;
}
.app-mail .bs-back .ico { width: 15px; height: 15px; transform: rotate(180deg); }
.app-mail .bs-back:hover { background: rgba(255, 255, 255, 0.12); }
.app-mail .bs-logo {
  padding: 0 20px 20px;
  font-size: 21px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
}
.app-mail .bs-nav { display: flex; flex-direction: column; }
.app-mail .bs-nav button {
  width: 100%;
  padding: 9px 20px;
  text-align: left;
  color: #d8eaff;
  font-size: 12.5px;
}
.app-mail .bs-nav button:hover { background: rgba(255, 255, 255, 0.09); }
.app-mail .bs-nav button.sel { background: rgba(255, 255, 255, 0.16); color: #fff; box-shadow: inset 3px 0 0 #fff; }
.app-mail .bs-nav .bs-sep { height: 1px; margin: 8px 20px; background: rgba(255, 255, 255, 0.2); }
.app-mail .bs-main { flex: 1; min-width: 0; overflow: auto; padding: 24px 28px 40px; }
.app-mail .bs-main h2 { margin: 0 0 4px; font-size: 25px; font-weight: 600; color: #fff; }
.app-mail .bs-main .bs-sub { margin-bottom: 20px; color: #9a9a9a; font-size: 12px; }
.app-mail .bs-card {
  max-width: 660px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 6px;
  border: 1px solid #383838;
  background: #252525;
}
.app-mail .bs-card h3 { margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #fff; }
.app-mail .bs-card p { margin: 0; font-size: 11.5px; line-height: 1.55; color: #9a9a9a; }
.app-mail .bs-acct { display: flex; align-items: center; gap: 12px; }
.app-mail .bs-avatar {
  width: 46px;
  height: 46px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #0f548c;
  color: #dcecff;
  font-size: 15px;
  font-weight: 600;
}
.app-mail .bs-acct b { display: block; font-size: 13px; color: #fff; }
.app-mail .bs-acct span { display: block; font-size: 11px; color: #9a9a9a; }
.app-mail .bs-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 5px 0;
  border-bottom: 1px solid #303030;
  font-size: 11.5px;
  color: #a9a9a9;
}
.app-mail .bs-row:last-child { border-bottom: 0; }
.app-mail .bs-row b { max-width: 62%; text-align: right; font-weight: 500; color: #e6e6e6; overflow-wrap: anywhere; }
.app-mail .bs-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.app-mail .bs-actions .btn { font-size: 11.5px; }

/* ---------- scrollbars and text behaviour ---------- */
.app-mail .rp-scroll, .app-mail .cmp-body, .app-mail .rp-subject, .app-mail .rp-body p, .app-mail .bs-row b {
  user-select: text;
}
.app-mail ::-webkit-scrollbar { width: 10px; height: 10px; }
.app-mail ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
.app-mail ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); background-clip: content-box; }

/* ---------- narrow windows ---------- */
.app-mail .olk-main.hide-folders .folder-pane { display: none; }
.app-mail .olk-main.hide-read .read-pane { display: none; }
.app-mail .olk-main.hide-read .list-pane { flex: 1; width: auto; }
.app-mail .no-preview .preview { display: none; }

@container olk (max-width: 780px) {
  .app-mail .folder-pane { width: 176px; }
  .app-mail .list-pane { width: 308px; }
  .app-mail .rp-scroll { padding: 14px 16px 22px; }
  .app-mail .rp-tool .rpl { display: none; }
  .app-mail .rp-tool { padding: 0 6px; }
}
@container olk (max-width: 660px) {
  .app-mail .folder-pane { display: none; }
}
@container olk (max-width: 540px) {
  .app-mail .read-pane { display: none; }
  .app-mail .list-pane { flex: 1; width: auto; }
  .app-mail .ribbon-body { min-height: 86px; }
}
`;
