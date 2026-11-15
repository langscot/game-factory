// Scoped stylesheet for File Explorer. Every selector lives under
// .app-explorer; ctx.ui.styles() injects it once for the app.

export const css = `
.app-explorer { background: #202020; color: var(--text-2); }
.app-explorer .exp { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: 0; background: #202020; font-size: 12px; }

/* tabs */
.app-explorer .exp-tabs { display: flex; align-items: flex-end; gap: 2px; padding: 6px 8px 0; background: #191919; min-height: 35px; }
.app-explorer .tabs { display: flex; align-items: flex-end; gap: 2px; min-width: 0; overflow: hidden; }
.app-explorer .tab { display: flex; align-items: center; gap: 7px; height: 30px; max-width: 190px; min-width: 86px; padding: 0 7px 0 11px; border-radius: 6px 6px 0 0; color: var(--text-3); font-size: 11.5px; cursor: default; position: relative; }
.app-explorer .tab svg { width: 14px; height: 14px; flex: none; }
.app-explorer .tab .tab-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .tab:hover { background: rgba(255,255,255,.045); color: var(--text-2); }
.app-explorer .tab.on { background: #262626; color: var(--text); box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
.app-explorer .tab.on::after { content: ""; position: absolute; left: 10px; right: 10px; top: 0; height: 2px; border-radius: 2px; background: var(--accent); opacity: .8; }
.app-explorer .tab-x { display: grid; place-items: center; width: 18px; height: 18px; margin-left: auto; border-radius: 3px; color: var(--text-3); opacity: 0; }
.app-explorer .tab:hover .tab-x, .app-explorer .tab.on .tab-x { opacity: 1; }
.app-explorer .tab-x:hover { background: rgba(255,255,255,.12); color: #fff; }
.app-explorer .tab-x svg { width: 11px; height: 11px; }
.app-explorer .tab-new { width: 26px; height: 26px; margin-bottom: 2px; display: grid; place-items: center; border-radius: 4px; color: var(--text-2); }
.app-explorer .tab-new:hover { background: var(--hover); }
.app-explorer .tab-new svg { width: 13px; height: 13px; }

/* command bar */
.app-explorer .exp-cmd { display: flex; align-items: center; gap: 1px; height: 43px; padding: 0 10px; background: #262626; border-bottom: 1px solid rgba(255,255,255,.055); flex: none; }
.app-explorer .cmd { display: flex; align-items: center; gap: 6px; height: 31px; padding: 0 8px; border-radius: 4px; color: var(--text-2); white-space: nowrap; font-size: 11.5px; position: relative; }
.app-explorer .cmd svg { width: 16px; height: 16px; flex: none; }
.app-explorer .cmd > span:not(.plus-badge) { line-height: 1; }
.app-explorer .cmd:hover:not(:disabled) { background: rgba(255,255,255,.075); }
.app-explorer .cmd:active:not(:disabled) { background: rgba(255,255,255,.11); }
.app-explorer .cmd:disabled { color: rgba(255,255,255,.3); }
.app-explorer .cmd:disabled svg { opacity: .5; }
.app-explorer .cmd .plus-badge { position: absolute; left: 16px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: #3aa0e8; color: #fff; font-size: 9px; line-height: 10px; text-align: center; font-weight: 700; border: 1px solid #262626; }
.app-explorer .cmd-sep { width: 1px; height: 20px; background: rgba(255,255,255,.09); margin: 0 5px; }
.app-explorer .cmd-spacer { flex: 1; }
.app-explorer .cmd[data-cmd="more"] { font-size: 17px; letter-spacing: 1px; padding: 0 7px; }

/* body */
.app-explorer .exp-body { flex: 1; display: flex; min-height: 0; }
.app-explorer .exp-nav { width: 218px; flex: none; padding: 8px 7px; overflow: auto; border-right: 1px solid rgba(255,255,255,.06); background: #202020; }
.app-explorer .nav-item, .app-explorer .nav-parent { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 30px; padding: 0 8px 0 10px; border-radius: 4px; color: var(--text-2); text-align: left; font-size: 12px; position: relative; }
.app-explorer .nav-item svg, .app-explorer .nav-parent svg { width: 17px; height: 17px; flex: none; }
.app-explorer .nav-item span, .app-explorer .nav-parent span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .nav-item:hover, .app-explorer .nav-parent:hover { background: var(--hover); }
.app-explorer .nav-item.sel, .app-explorer .nav-parent.sel { background: rgba(76,194,255,.12); color: #fff; }
.app-explorer .nav-item.sel::before, .app-explorer .nav-parent.sel::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: var(--accent); }
.app-explorer .nav-group { margin-top: 5px; }
.app-explorer .nav-parent { padding-left: 6px; }
.app-explorer .nav-chev { display: grid; place-items: center; width: 14px; height: 14px; color: var(--text-3); transition: transform .12s ease; }
.app-explorer .nav-chev svg { width: 11px; height: 11px; }
.app-explorer .nav-chev.open { transform: rotate(90deg); }
.app-explorer .nav-children { padding-left: 13px; display: grid; gap: 0; }
.app-explorer .nav-children .nav-item { min-height: 28px; }
.app-explorer .nav-share { color: var(--text-2); }
.app-explorer .nav-foot { margin-top: 16px; padding: 10px 8px; border-top: 1px solid rgba(255,255,255,.06); color: var(--text-3); font-size: 10.5px; }
.app-explorer .nav-foot span { display: flex; align-items: center; gap: 6px; }
.app-explorer .nav-foot svg { width: 13px; height: 13px; }

/* main */
.app-explorer .exp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #272727; }
.app-explorer .exp-address { display: flex; align-items: center; gap: 7px; padding: 7px 10px; background: #262626; border-bottom: 1px solid rgba(255,255,255,.05); flex: none; }
.app-explorer .nav-btns { display: flex; align-items: center; gap: 1px; }
.app-explorer .nav-btn { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 4px; color: var(--text-2); }
.app-explorer .nav-btn svg { width: 14px; height: 14px; }
.app-explorer .nav-btn:hover:not(:disabled) { background: var(--hover); }
.app-explorer .nav-btn:disabled { color: rgba(255,255,255,.28); }
.app-explorer .crumbs { flex: 1; min-width: 0; height: 30px; display: flex; align-items: center; gap: 1px; padding: 0 8px; border: 1px solid rgba(255,255,255,.1); border-radius: 4px; background: rgba(0,0,0,.16); overflow: hidden; }
.app-explorer .crumbs:hover { border-color: rgba(255,255,255,.18); }
.app-explorer .crumb { max-width: 220px; padding: 4px 5px; border-radius: 3px; color: var(--text-2); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .crumb:hover { background: rgba(255,255,255,.08); color: #fff; }
.app-explorer .crumb.here { color: #fff; font-weight: 600; }
.app-explorer .crumb-sep { display: grid; place-items: center; color: var(--text-3); flex: none; }
.app-explorer .crumb-sep svg { width: 10px; height: 10px; }
.app-explorer .exp-search { flex: none; width: 190px; height: 30px; display: flex; align-items: center; gap: 6px; padding: 0 9px; border: 1px solid rgba(255,255,255,.1); border-radius: 4px; background: rgba(0,0,0,.16); }
.app-explorer .exp-search:focus-within { border-color: var(--accent); background: rgba(0,0,0,.26); }
.app-explorer .exp-search svg { width: 13px; height: 13px; color: var(--text-3); flex: none; }
.app-explorer .exp-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; font-size: 11.5px; color: var(--text); }
.app-explorer .exp-search input::placeholder { color: var(--text-3); }

/* file list */
.app-explorer .exp-content { flex: 1; min-height: 0; overflow: auto; padding: 3px 4px 8px; }
.app-explorer .exp-list { display: flex; flex-direction: column; min-width: 0; }
.app-explorer .exp-row { display: grid; grid-template-columns: minmax(170px, 1.6fr) 145px 150px 82px; align-items: center; gap: 8px; min-height: 28px; padding: 0 9px; border-radius: 3px; color: var(--text-2); text-align: left; cursor: default; outline: 0; position: relative; }
.app-explorer .exp-row.head { min-height: 26px; border-bottom: 1px solid rgba(255,255,255,.06); border-radius: 0; color: var(--text-3); font-size: 10.5px; margin-bottom: 2px; position: sticky; top: 0; z-index: 1; background: #272727; }
.app-explorer .exp-row.head:hover { background: #272727; }
.app-explorer .exp-row:not(.head):hover { background: rgba(255,255,255,.055); }
.app-explorer .exp-row.sel { background: rgba(76,194,255,.18); color: #fff; box-shadow: inset 0 0 0 1px rgba(120,210,255,.24); }
.app-explorer .exp-row.sel:hover { background: rgba(76,194,255,.23); }
.app-explorer .exp-row.renaming { background: rgba(255,255,255,.06); }
.app-explorer .exp-row .nm { display: flex; align-items: center; gap: 8px; min-width: 0; }
.app-explorer .exp-row .nm svg { width: 17px; height: 17px; flex: none; }
.app-explorer .exp-row .nm-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .exp-row .meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); font-size: 11.5px; }
.app-explorer .exp-row.sel .meta { color: rgba(255,255,255,.8); }
.app-explorer .exp-row .size { text-align: right; padding-right: 2px; }
.app-explorer .exp-rename { width: 100%; min-width: 0; height: 22px; padding: 0 4px; border: 1px solid var(--accent); border-radius: 2px; background: #1b1b1b; color: #fff; font: inherit; outline: 0; }

.app-explorer .exp-content.view-list .exp-row { grid-template-columns: minmax(190px, 2.2fr) 140px 135px; min-height: 24px; }
.app-explorer .exp-content.view-list .exp-row > :last-child { display: none; }
.app-explorer .exp-content.view-list .exp-row .nm svg { width: 15px; height: 15px; }

.app-explorer .exp-empty { display: grid; justify-items: center; align-content: center; gap: 8px; height: 100%; min-height: 240px; padding: 24px; text-align: center; color: var(--text-3); }
.app-explorer .exp-empty > svg { width: 44px; height: 44px; opacity: .55; }
.app-explorer .exp-empty h3 { margin: 0; color: var(--text-2); font-size: 14px; font-weight: 600; }
.app-explorer .exp-empty p { max-width: 42ch; margin: 0 0 6px; font-size: 11.5px; line-height: 1.6; }
.app-explorer .exp-empty.onedrive > svg { color: #5aa9ef; opacity: .9; }

/* large icons */
.app-explorer .exp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 4px; align-content: start; padding: 6px 4px; }
.app-explorer .tile { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 7px 9px; border-radius: 4px; text-align: center; cursor: default; outline: 0; min-width: 0; }
.app-explorer .tile:hover { background: rgba(255,255,255,.055); }
.app-explorer .tile.sel { background: rgba(76,194,255,.18); box-shadow: inset 0 0 0 1px rgba(120,210,255,.24); color: #fff; }
.app-explorer .tile-ico svg { width: 44px; height: 44px; }
.app-explorer .tile-name { width: 100%; font-size: 11.5px; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.app-explorer .tile-meta { width: 100%; color: var(--text-3); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* status */
.app-explorer .exp-status { flex: none; display: flex; align-items: center; gap: 12px; min-height: 28px; padding: 0 10px; border-top: 1px solid rgba(255,255,255,.06); background: #202020; color: var(--text-3); font-size: 10.5px; }
.app-explorer .status-selected { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .status-spacer { flex: 1; }
.app-explorer .status-views { display: flex; gap: 1px; }
.app-explorer .status-views button { width: 25px; height: 22px; display: grid; place-items: center; border-radius: 3px; color: var(--text-3); }
.app-explorer .status-views button:hover { background: var(--hover); color: var(--text-2); }
.app-explorer .status-views button.on { background: rgba(255,255,255,.09); color: #fff; }
.app-explorer .status-views svg { width: 13px; height: 13px; }

/* properties dialog (the wrapper keeps app CSS scoped even outside the app) */
.app-explorer.props-dialog { width: 100%; color: var(--text-2); }
.app-explorer.props-dialog h2 { margin: 0 0 12px; font-size: 17px; font-weight: 600; color: #fff; }
.app-explorer .props-tabs { display: flex; gap: 2px; border-bottom: 1px solid rgba(255,255,255,.1); margin-bottom: 14px; }
.app-explorer .props-tabs button { padding: 7px 12px 8px; border-radius: 4px 4px 0 0; color: var(--text-3); font-size: 12px; position: relative; }
.app-explorer .props-tabs button:hover { background: var(--hover); color: var(--text-2); }
.app-explorer .props-tabs button.sel { color: #fff; }
.app-explorer .props-tabs button.sel::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--accent); }
.app-explorer .props-head { display: flex; align-items: center; gap: 12px; margin: 2px 0 12px; font-size: 13px; color: #fff; }
.app-explorer .props-head svg { width: 32px; height: 32px; }
.app-explorer .props-row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.055); font-size: 12px; }
.app-explorer .props-row span { color: var(--text-3); flex: none; }
.app-explorer .props-row b { font-weight: 400; text-align: right; overflow-wrap: anywhere; }
.app-explorer .props-note { margin: 0 0 10px; color: var(--text-3); font-size: 11.5px; }
.app-explorer .props-table { border: 1px solid rgba(255,255,255,.1); border-radius: 4px; overflow: hidden; }
.app-explorer .props-tr { display: grid; grid-template-columns: 1fr 150px; gap: 10px; padding: 7px 10px; font-size: 11.5px; border-bottom: 1px solid rgba(255,255,255,.055); }
.app-explorer .props-tr:last-child { border-bottom: 0; }
.app-explorer .props-tr.head { color: var(--text-3); font-size: 10.5px; background: rgba(255,255,255,.04); }
.app-explorer .props-tr b { font-weight: 400; color: var(--text-2); }
.app-explorer .props-effective { display: flex; align-items: center; gap: 9px; margin-top: 12px; padding: 9px 10px; border-radius: 4px; background: rgba(76,194,255,.08); border: 1px solid rgba(76,194,255,.18); font-size: 11.5px; }
.app-explorer .props-effective svg { width: 17px; height: 17px; color: var(--accent); flex: none; }
.app-explorer .props-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
`;
