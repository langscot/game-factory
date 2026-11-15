// mstsc in a window: a light classic dialog, the five option tabs, the blue
// connection bar and a remote desktop of its own. Every selector is scoped.

export const css = `
.app-rdp .rdp-root {
  position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: #f0f0f0; color: #1b1b1b; font: 12px/1.4 "Segoe UI", Tahoma, sans-serif;
}
.app-rdp input, .app-rdp select, .app-rdp button { font: inherit; }
.app-rdp input, .app-rdp select { user-select: text; }
.app-rdp input[type="checkbox"] { accent-color: #0067c0; width: 13px; height: 13px; }
.app-rdp :focus-visible { outline: 1px solid #0067c0; outline-offset: 1px; }

/* ---------- connection dialog ---------- */
.app-rdp .rdp-dialog { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.app-rdp .rdp-head { display: flex; gap: 14px; padding: 16px 18px 10px; }
.app-rdp .rdp-logo { flex: 0 0 auto; }
.app-rdp .rdp-logo svg { width: 46px; height: 46px; }
.app-rdp .rdp-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.app-rdp .rdp-field { display: flex; align-items: center; gap: 10px; }
.app-rdp .rdp-field label { flex: 0 0 84px; text-align: right; color: #333; }
.app-rdp .rdp-field input {
  flex: 1; min-width: 0; height: 24px; padding: 2px 6px;
  border: 1px solid #8a8a8a; background: #fff; color: #111; border-radius: 2px;
}
.app-rdp .rdp-field input::placeholder { color: #9a9a9a; }
.app-rdp .rdp-field input:focus { border-color: #0067c0; outline: 0; box-shadow: inset 0 0 0 1px #0067c0; }
.app-rdp .rdp-recent { display: flex; gap: 6px; align-items: baseline; padding-left: 94px; font-size: 11px; color: #666; }
.app-rdp .rdp-chips { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.app-rdp .rdp-chip {
  padding: 1px 7px; border: 1px solid #c4c4c4; border-radius: 9px;
  background: #fbfbfb; color: #0a4f96; font-size: 11px;
}
.app-rdp .rdp-chip:hover { background: #eaf4fd; border-color: #7eb4e2; }
.app-rdp .rdp-muted { color: #888; }
.app-rdp .rdp-recents {
  flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  margin: 0 18px 2px; border: 1px solid #c6c6c6; background: #fff;
}
.app-rdp .rdp-recents-head {
  padding: 5px 10px; font-size: 11.5px; font-weight: 600; color: #0a3560;
  background: #f7f7f7; border-bottom: 1px solid #e3e3e3;
}
.app-rdp .rdp-recent-list { flex: 1; min-height: 0; overflow: auto; }
.app-rdp .rdp-recent-row {
  width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px 10px;
  border-bottom: 1px solid #efefef; text-align: left;
}
.app-rdp .rdp-recent-row:hover { background: #eef6fd; }
.app-rdp .rdp-recent-ico svg { width: 20px; height: 20px; }
.app-rdp .rdp-recent-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.app-rdp .rdp-recent-text b { font-size: 12px; font-weight: 600; color: #1b1b1b; }
.app-rdp .rdp-recent-text span {
  color: #666; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-rdp .rdp-recent-go { color: #7a7a7a; font-size: 15px; }
.app-rdp .rdp-recents-note { margin: 0; padding: 7px 10px; border-top: 1px solid #efefef; color: #888; font-size: 10.5px; }

.app-rdp .rdp-options { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 4px 18px 0; }
.app-rdp .rdp-tabs { display: flex; gap: 2px; padding-left: 4px; }
.app-rdp .rdp-tab {
  padding: 4px 10px 5px; border: 1px solid transparent; border-bottom: 0;
  border-radius: 3px 3px 0 0; color: #333; font-size: 11.5px;
}
.app-rdp .rdp-tab:hover { background: #f7f7f7; }
.app-rdp .rdp-tab.sel {
  background: #fff; border-color: #c6c6c6; margin-bottom: -1px; padding-bottom: 6px; font-weight: 600;
}
.app-rdp .rdp-pane { flex: 1; min-height: 0; overflow: auto; background: #fff; border: 1px solid #c6c6c6; padding: 10px 12px; }
.app-rdp .rdp-group { border: 1px solid #e2e2e2; background: #fcfcfc; border-radius: 2px; padding: 8px 10px; margin-bottom: 9px; }
.app-rdp .rdp-group h4 { margin: 0 0 6px; font-size: 11.5px; font-weight: 600; color: #0a3560; }
.app-rdp .rdp-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
.app-rdp .rdp-row > label { flex: 0 0 152px; color: #333; }
.app-rdp .rdp-row select, .app-rdp .rdp-row input:not([type="range"]):not([type="checkbox"]) {
  flex: 1; min-width: 0; max-width: 290px; height: 23px; padding: 1px 4px;
  border: 1px solid #8a8a8a; background: #fff; color: #111; border-radius: 2px;
}
.app-rdp .rdp-row input:disabled { background: #f0f0f0; color: #999; }
.app-rdp .rdp-row input[type="range"] { flex: 1; max-width: 210px; height: 18px; }
.app-rdp .rdp-out { flex: 0 0 88px; color: #444; font-variant-numeric: tabular-nums; }
.app-rdp .rdp-check { display: flex; align-items: center; gap: 6px; margin: 5px 0; color: #222; cursor: pointer; }
.app-rdp .rdp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
.app-rdp .rdp-note { margin: 4px 0 0; color: #666; font-size: 11px; line-height: 1.4; }
.app-rdp .rdp-actions-inline { display: flex; gap: 7px; }

.app-rdp .rdp-last {
  margin: 2px 18px 0; padding: 5px 0 0; border-top: 1px solid #dcdcdc;
  font-size: 11px; color: #666;
}
.app-rdp .rdp-last b { color: #333; font-weight: 600; }
.app-rdp .rdp-actions { display: flex; align-items: center; gap: 8px; margin-top: auto; padding: 10px 18px 12px; border-top: 1px solid #dcdcdc; }
.app-rdp .rdp-spacer { flex: 1; }
.app-rdp .rdp-link { display: flex; align-items: center; gap: 4px; color: #0067c0; padding: 3px 2px; font-size: 12px; }
.app-rdp .rdp-link:hover { text-decoration: underline; }
.app-rdp .rdp-link svg { width: 11px; height: 11px; transition: transform .15s ease; }
.app-rdp .rdp-link.open svg { transform: rotate(180deg); }
.app-rdp .rdp-btn {
  min-width: 76px; height: 24px; padding: 0 12px; border: 1px solid #adadad; border-radius: 2px;
  background: linear-gradient(#fdfdfd, #e9e9e9); color: #1b1b1b; font-size: 12px;
}
.app-rdp .rdp-btn:hover { background: linear-gradient(#f6fbff, #e3f1fb); border-color: #7eb4e2; }
.app-rdp .rdp-btn:active { background: #ddecf8; }
.app-rdp .rdp-btn.primary { background: #0067c0; border-color: #005ba6; color: #fff; }
.app-rdp .rdp-btn.primary:hover { background: #0a74d2; }
.app-rdp .rdp-btn:disabled { opacity: .5; cursor: default; }
.app-rdp .rdp-btn:disabled:hover { background: linear-gradient(#fdfdfd, #e9e9e9); border-color: #adadad; }

/* ---------- message boxes, credential prompt, handshake ---------- */
.app-rdp .rdp-overlay {
  position: absolute; inset: 0; z-index: 20; display: grid; place-items: center;
  background: rgba(18, 30, 44, .3); padding: 14px;
}
.app-rdp .rdp-dlg {
  width: 380px; max-width: 100%; max-height: 100%; display: flex; flex-direction: column;
  background: #f0f0f0; color: #1b1b1b; border: 1px solid #6b6b6b;
  box-shadow: 0 16px 44px rgba(0, 0, 0, .42);
}
.app-rdp .rdp-dlg-title {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 4px 5px 4px 9px; font-size: 11.5px;
  background: linear-gradient(#fdfdfd, #ededed); border-bottom: 1px solid #d3d3d3;
}
.app-rdp .rdp-dlg-x { width: 20px; height: 18px; display: grid; place-items: center; color: #555; font-size: 10px; }
.app-rdp .rdp-dlg-x:hover { background: #e81123; color: #fff; }
.app-rdp .rdp-dlg-body { display: flex; gap: 12px; padding: 16px 14px 4px; font-size: 12px; line-height: 1.5; }
.app-rdp .rdp-glyph { flex: 0 0 34px; }
.app-rdp .rdp-glyph svg { width: 34px; height: 34px; }
.app-rdp .rdp-dlg-copy { flex: 1; min-width: 0; padding-top: 2px; }
.app-rdp .rdp-dlg-copy p { margin: 0; }
.app-rdp .rdp-dlg-head { display: block; margin-bottom: 6px; font-size: 12.5px; }
.app-rdp .rdp-dlg-actions { display: flex; justify-content: flex-end; gap: 7px; padding: 12px 14px; }
.app-rdp .rdp-box { width: 404px; }
.app-rdp .rdp-connect { width: 344px; }
.app-rdp .rdp-connect-body { flex-direction: column; gap: 4px; padding-bottom: 2px; }
.app-rdp .rdp-connect-status { margin: 0; font-weight: 600; min-height: 18px; }
.app-rdp .rdp-progress { height: 14px; border: 1px solid #9a9a9a; background: #fff; padding: 2px; margin: 6px 0 4px; }
.app-rdp .rdp-progress i {
  display: block; height: 100%; width: 0; transition: width .35s ease;
  background: repeating-linear-gradient(90deg, #0f6cbd 0 9px, #3f9bdd 9px 11px);
}

.app-rdp .rdp-security { width: 384px; }
.app-rdp .rdp-sec-head {
  display: flex; align-items: center; gap: 9px; padding: 11px 14px;
  background: #f7f9fb; border-bottom: 1px solid #dde3ea;
}
.app-rdp .rdp-sec-head svg { width: 28px; height: 28px; }
.app-rdp .rdp-sec-head div { display: flex; flex-direction: column; line-height: 1.25; }
.app-rdp .rdp-sec-head span { font-size: 11px; color: #5a6875; }
.app-rdp .rdp-sec-body { padding: 12px 14px 0; font-size: 12px; }
.app-rdp .rdp-sec-body > p { margin: 0 0 10px; }
.app-rdp .rdp-sec-body .rdp-field { flex-direction: column; align-items: stretch; gap: 3px; margin-bottom: 8px; }
.app-rdp .rdp-sec-body .rdp-field label { flex: none; width: auto; text-align: left; font-size: 11.5px; }
.app-rdp .rdp-sec-body .rdp-field input { flex: none; height: 24px; }
.app-rdp .rdp-sec-err { margin: 6px 0 0; color: #c42b1c; font-size: 11.5px; }

/* ---------- remote session ---------- */
.app-rdp .rdp-session { height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #0a1020; }
.app-rdp .rdp-bar {
  position: relative; z-index: 6; flex: 0 0 26px; height: 26px; display: flex; align-items: center; gap: 4px;
  padding: 0 4px; color: #fff; background: linear-gradient(#2e6fb5, #1c4c85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .45); transition: transform .2s ease;
}
.app-rdp .rdp-session.unpinned .rdp-bar { transform: translateY(calc(-100% + 5px)); }
.app-rdp .rdp-session.unpinned .rdp-bar:hover,
.app-rdp .rdp-session.unpinned .rdp-bar:focus-within { transform: none; }
.app-rdp .rp-pin { width: 24px; height: 22px; display: grid; place-items: center; color: #e4effc; border-radius: 2px; }
.app-rdp .rp-pin svg { width: 13px; height: 13px; }
.app-rdp .rp-pin:hover { background: rgba(255, 255, 255, .18); }
.app-rdp .rp-pin[aria-pressed="false"] { color: #a9c9ec; }
.app-rdp .rp-bar-title {
  flex: 1; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: .01em;
  text-shadow: 0 1px 1px rgba(0, 0, 0, .35);
}
.app-rdp .rp-bar-actions { display: flex; gap: 2px; }
.app-rdp .rp-bar-actions button { width: 26px; height: 22px; display: grid; place-items: center; color: #fff; border-radius: 2px; }
.app-rdp .rp-bar-actions button:hover { background: rgba(255, 255, 255, .2); }
.app-rdp .rp-bar-actions .rp-bar-close:hover { background: #c42b1c; }

.app-rdp .rdp-canvas { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #0d1b2e; }
.app-rdp .rdp-desktop {
  position: absolute; inset: 0; overflow: hidden;
  background: radial-gradient(circle at 74% 16%, #2d7ec0 0, #125a94 42%, #0a3866 100%);
}
.app-rdp .rdp-session.restored .rdp-canvas { background: linear-gradient(#0e1d31, #091321); }
.app-rdp .rdp-session.restored .rdp-desktop {
  inset: 20px 24px 48px; border: 1px solid rgba(255, 255, 255, .35); border-radius: 5px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, .55);
}
.app-rdp .rdp-desktop::before {
  content: ""; position: absolute; right: -14%; top: -30%; width: 70%; height: 90%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, .16), transparent 70%);
  transform: rotate(18deg);
}
.app-rdp .rp-mono {
  position: absolute; right: 5%; bottom: -8%; font-size: 180px; font-weight: 700; line-height: 1;
  letter-spacing: -.06em; color: rgba(255, 255, 255, .07); pointer-events: none; user-select: none;
}

.app-rdp .rp-icons { position: absolute; top: 12px; left: 10px; display: flex; flex-direction: column; gap: 5px; }
.app-rdp .rp-icon {
  width: 72px; padding: 6px 2px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  border: 1px solid transparent; border-radius: 3px; color: #fff; font-size: 10.5px; line-height: 1.25;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .65); text-align: center;
}
.app-rdp .rp-icon svg { width: 30px; height: 30px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35)); }
.app-rdp .rp-icon:hover { background: rgba(255, 255, 255, .12); border-color: rgba(255, 255, 255, .24); }

.app-rdp .rp-window {
  position: absolute; left: 96px; top: 16px; width: min(368px, calc(100% - 120px));
  max-height: calc(100% - 62px); display: flex; flex-direction: column; overflow: hidden;
  background: #f7f8fa; color: #1b1b1b; border: 1px solid #b9c2cc; border-radius: 6px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, .42);
}
.app-rdp .rp-titlebar {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 4px 4px 4px 8px; background: #eef1f5; border-bottom: 1px solid #d6dce4; font-size: 11px;
}
.app-rdp .rp-title { display: flex; align-items: center; gap: 6px; }
.app-rdp .rp-title svg { width: 14px; height: 14px; }
.app-rdp .rp-captions { display: flex; align-items: center; gap: 1px; }
.app-rdp .rp-captions i { font-style: normal; width: 18px; height: 16px; display: grid; place-items: center; color: #5a6875; font-size: 9px; }
.app-rdp .rp-captions button { width: 20px; height: 16px; display: grid; place-items: center; color: #5a6875; font-size: 9px; }
.app-rdp .rp-captions button:hover { background: #e81123; color: #fff; }
.app-rdp .rp-body { overflow: auto; padding: 8px 10px 6px; font-size: 11px; line-height: 1.45; user-select: text; }
.app-rdp .rp-sec { margin-bottom: 8px; }
.app-rdp .rp-sec h5 { margin: 0 0 3px; font-size: 11px; font-weight: 600; color: #0a5aa8; }
.app-rdp .rp-sec p { margin: 0; }
.app-rdp .rp-rows { margin: 0; }
.app-rdp .rp-rows div { display: flex; gap: 8px; }
.app-rdp .rp-rows dt { flex: 0 0 118px; color: #5a6875; }
.app-rdp .rp-rows dd { flex: 1; min-width: 0; margin: 0; }
.app-rdp .rp-ok { color: #107c10; }
.app-rdp .rp-soft { display: flex; flex-wrap: wrap; gap: 3px 5px; }
.app-rdp .rp-soft span { padding: 1px 5px; background: #e8eef5; border-radius: 2px; }
.app-rdp .rp-foot { margin: 4px 0 0; color: #8a95a1; font-size: 10px; }

.app-rdp .rp-dialog {
  position: absolute; left: 50%; top: 32%; transform: translate(-50%, -50%); z-index: 5; width: 262px;
  background: #f7f8fa; color: #1b1b1b; border: 1px solid #b9c2cc; border-radius: 6px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, .45); overflow: hidden; font-size: 11.5px;
}
.app-rdp .rp-dialog-title { display: flex; align-items: center; justify-content: space-between; padding: 5px 5px 5px 9px; background: #eef1f5; border-bottom: 1px solid #d6dce4; }
.app-rdp .rp-dialog-title button { width: 20px; height: 16px; display: grid; place-items: center; font-size: 9px; color: #5a6875; }
.app-rdp .rp-dialog-title button:hover { background: #e81123; color: #fff; }
.app-rdp .rp-dialog-body { padding: 14px 12px; }
.app-rdp .rp-dialog-foot { display: flex; justify-content: flex-end; padding: 0 12px 11px; }
.app-rdp .rp-dialog-ok { min-width: 64px; height: 22px; border: 1px solid #adadad; border-radius: 2px; background: linear-gradient(#fdfdfd, #e9e9e9); font-size: 11.5px; }

.app-rdp .rp-start {
  position: absolute; left: 50%; bottom: 42px; transform: translateX(-50%); z-index: 4; width: 300px;
  padding: 10px 12px 8px; color: #fff; background: rgba(32, 36, 44, .96);
  border: 1px solid rgba(255, 255, 255, .12); border-radius: 8px; box-shadow: 0 16px 44px rgba(0, 0, 0, .45);
}
.app-rdp .rp-start-title { margin-bottom: 7px; font-size: 11px; font-weight: 600; }
.app-rdp .rp-start-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.app-rdp .rp-start-foot { display: flex; align-items: center; gap: 4px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, .12); font-size: 11px; }
.app-rdp .rp-start-foot span { flex: 1; min-width: 0; color: #cfd8e3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-rdp .rp-start-foot button { padding: 3px 7px; border-radius: 3px; color: #dce9f8; }
.app-rdp .rp-start-foot button:hover { background: rgba(255, 255, 255, .14); }

.app-rdp .rp-taskbar {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; height: 36px;
  display: flex; align-items: center; gap: 8px; padding: 0 10px;
  background: rgba(24, 34, 48, .82); border-top: 1px solid rgba(255, 255, 255, .08);
  backdrop-filter: blur(10px);
}
.app-rdp .rp-startbtn { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 4px; }
.app-rdp .rp-startbtn:hover { background: rgba(255, 255, 255, .12); }
.app-rdp .rp-startbtn svg { width: 16px; height: 16px; }
.app-rdp .rp-search {
  width: 110px; height: 22px; display: flex; align-items: center; padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, .16); border-radius: 11px;
  background: rgba(255, 255, 255, .12); color: #cfd8e3; font-size: 10.5px;
}
.app-rdp .rp-apps { display: flex; align-items: center; gap: 4px; }
.app-rdp .rp-tile {
  position: relative; width: 24px; height: 24px; display: grid; place-items: center;
  border-radius: 4px; background: var(--tile, #5b6b7c); color: #fff; font-size: 11px; font-weight: 600;
}
.app-rdp .rp-tile:hover { filter: brightness(1.15); }
.app-rdp .rp-tile.running::after {
  content: ""; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
  width: 10px; height: 2px; border-radius: 2px; background: #4cc2ff;
}
.app-rdp .rp-tray { margin-left: auto; display: flex; align-items: center; gap: 9px; color: #e7eef7; font-size: 11px; }
.app-rdp .rp-net svg { width: 13px; height: 13px; }
.app-rdp .rp-clock { font-variant-numeric: tabular-nums; }
`;
