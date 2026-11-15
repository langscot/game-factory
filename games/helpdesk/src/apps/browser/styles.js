// Browser chrome and the shared page primitives every intranet site can use.
// Everything is scoped under .app-browser: no global selectors, no <style> tags
// in the pages themselves. Sites add their own rules through platform.style()
// and scope those under their `.site-<id>` wrapper.

export const css = `
.app-browser { background: #eceff3; color: #1d2633; }
.app-browser .bw {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  background: #eceff3; color: #1d2633; font-family: var(--font); font-size: 12px;
}

/* ---------- tab strip ---------- */
.app-browser .bw-tabstrip {
  display: flex; align-items: flex-end; gap: 2px; flex: none;
  min-height: 37px; padding: 6px 8px 0;
  background: #d8dee8; border-bottom: 1px solid #a9b4c4;
}
.app-browser .bw-tablist {
  display: flex; align-items: flex-end; gap: 3px;
  flex: 1; min-width: 0; overflow: hidden;
}
.app-browser .bw-tab {
  display: flex; align-items: center; flex: 0 1 200px; min-width: 74px;
  height: 30px; border-radius: 7px 7px 0 0; background: #c3ccda;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.app-browser .bw-tab:hover { background: #cdd6e2; }
.app-browser .bw-tab.is-active { background: #f4f6fa; box-shadow: inset 0 1px 0 #fff; }
.app-browser .bw-tabmain {
  display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0;
  height: 100%; padding: 0 4px 0 9px; text-align: left;
  color: #33414f; font-size: 11.5px;
}
.app-browser .bw-tab.is-active .bw-tabmain { color: #101820; font-weight: 600; }
.app-browser .bw-favicon { display: grid; place-items: center; width: 14px; height: 14px; flex: none; }
.app-browser .bw-favicon svg { width: 14px; height: 14px; }
.app-browser .bw-tabtitle { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.app-browser .bw-tabclose {
  display: grid; place-items: center; width: 20px; height: 20px; flex: none;
  margin-right: 5px; border-radius: 4px; color: #4a5768;
  font-size: 14px; line-height: 1;
}
.app-browser .bw-tabclose:hover { background: rgba(0, 0, 0, 0.12); color: #000; }
.app-browser .bw-newtab {
  display: grid; place-items: center; width: 28px; height: 26px; flex: none;
  margin-bottom: 2px; border-radius: 5px; color: #33414f; font-size: 17px; line-height: 1;
}
.app-browser .bw-newtab:hover { background: rgba(0, 0, 0, 0.1); }

/* ---------- toolbar ---------- */
.app-browser .bw-toolbar {
  display: flex; align-items: center; gap: 6px; flex: none;
  padding: 5px 8px; background: #f4f6fa; border-bottom: 1px solid #cfd7e3;
}
.app-browser .bw-navbtns { display: flex; gap: 2px; }
.app-browser .bw-tool {
  display: grid; place-items: center; width: 27px; height: 27px;
  border-radius: 5px; color: #22303d;
}
.app-browser .bw-tool svg { width: 16px; height: 16px; }
.app-browser .bw-tool:hover:not(:disabled) { background: rgba(0, 0, 0, 0.08); }
.app-browser .bw-tool:disabled { color: #a7b0bc; cursor: default; }
.app-browser .bw-addressbar {
  display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;
  height: 27px; padding: 0 4px 0 8px; background: #fff;
  border: 1px solid #b9c3d1; border-radius: 3px;
}
.app-browser .bw-addressbar:focus-within {
  border-color: #2f7ad6; box-shadow: 0 0 0 1px rgba(47, 122, 214, 0.35);
}
.app-browser .bw-addressicon { display: grid; place-items: center; width: 14px; height: 14px; flex: none; opacity: 0.55; }
.app-browser .bw-addressicon svg { width: 14px; height: 14px; }
.app-browser .bw-address {
  flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  color: #1b2430; font: 12px var(--font);
}
.app-browser .bw-star {
  display: grid; place-items: center; width: 22px; height: 22px; flex: none;
  border-radius: 4px; color: #8a6d1e; font-size: 14px; line-height: 1;
}
.app-browser .bw-star:hover:not(:disabled) { background: rgba(0, 0, 0, 0.07); }
.app-browser .bw-star:disabled { color: #b8c0cb; cursor: default; }
.app-browser .bw-go {
  height: 27px; padding: 0 12px; border: 1px solid #a9b6c6; border-radius: 3px;
  background: linear-gradient(#fff, #e8edf4); color: #22303d; font-size: 12px;
}
.app-browser .bw-go:hover { background: linear-gradient(#fff, #dde6f1); }

/* ---------- bookmarks ---------- */
.app-browser .bw-bookmarkbar {
  display: flex; align-items: center; gap: 2px; flex: none;
  min-height: 26px; padding: 2px 8px; overflow: hidden;
  background: #eef1f6; border-bottom: 1px solid #d5dce6;
}
.app-browser .bw-bmlabel { margin-right: 4px; color: #7d8897; font-size: 10.5px; }
.app-browser .bw-bookmark {
  display: flex; align-items: center; gap: 5px; height: 21px; padding: 0 7px;
  border-radius: 3px; color: #26313f; font-size: 11.5px;
}
.app-browser .bw-bookmark:hover { background: rgba(0, 0, 0, 0.08); }
.app-browser .bw-bookmark .bw-favicon { opacity: 0.65; }
.app-browser .bw-bmempty { color: #7d8897; font-size: 11px; }

/* ---------- content ---------- */
.app-browser .bw-content { flex: 1; min-height: 0; overflow: auto; background: #fff; color: #1d2633; }
.app-browser .bw-content::-webkit-scrollbar { width: 12px; height: 12px; }
.app-browser .bw-content::-webkit-scrollbar-thumb {
  background: rgba(20, 32, 45, 0.24); border-radius: 8px;
  border: 3px solid transparent; background-clip: content-box;
}
.app-browser .bw-content::-webkit-scrollbar-thumb:hover { background: rgba(20, 32, 45, 0.36); background-clip: content-box; }
.app-browser .bw-page {
  min-height: 100%; padding: 22px 26px 30px;
  font-family: Verdana, "Segoe UI", Tahoma, sans-serif;
  font-size: 12.5px; line-height: 1.55;
}
.app-browser .bw-page h1 { margin: 0 0 6px; color: #14202d; font-size: 22px; font-weight: 600; }
.app-browser .bw-page h2 { margin: 0 0 8px; color: #1b2a3a; font-size: 14px; font-weight: 700; }
.app-browser .bw-page p { margin: 0 0 10px; }
.app-browser .bw-muted { color: #63707f; }
.app-browser .bw-btn {
  height: 28px; padding: 0 12px; border: 1px solid #a9b6c6; border-radius: 3px;
  background: linear-gradient(#fff, #e8edf4); color: #22303d;
  font-family: var(--font); font-size: 12px;
}
.app-browser .bw-btn:hover { filter: brightness(1.03); }
.app-browser .bw-btn.primary {
  border-color: #1b5fa8; background: linear-gradient(#2f8ae0, #1b5fa8);
  color: #fff; font-weight: 600;
}

/* ---------- start page ---------- */
.app-browser .bw-start { max-width: 760px; margin: 0 auto; }
.app-browser .bw-start-head {
  display: flex; align-items: center; gap: 12px;
  padding-bottom: 14px; border-bottom: 2px solid #dbe2ec;
}
.app-browser .bw-mark {
  display: grid; place-items: center; width: 38px; height: 38px; flex: none;
  border-radius: 6px; background: #1b5fa8; color: #fff;
  font: 700 20px Georgia, "Segoe UI", serif;
}
.app-browser .bw-start-title h1 { margin: 0; font: 700 18px Georgia, "Segoe UI", serif; color: #14202d; }
.app-browser .bw-start-title p { margin: 2px 0 0; color: #63707f; font-size: 11px; }
.app-browser .bw-start-tag {
  margin-left: auto; padding: 1px 8px; border: 1px solid #b9cbe2; border-radius: 10px;
  color: #1b5fa8; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
}
.app-browser .bw-search { display: flex; gap: 6px; margin: 18px 0 4px; }
.app-browser .bw-search input {
  flex: 1; min-width: 0; height: 30px; padding: 0 10px;
  border: 1px solid #b9c3d1; border-radius: 3px; background: #fff; color: #1b2430;
  font: 12.5px Verdana, "Segoe UI", sans-serif;
}
.app-browser .bw-search input:focus {
  outline: none; border-color: #2f7ad6; box-shadow: 0 0 0 1px rgba(47, 122, 214, 0.35);
}
.app-browser .bw-block { margin-top: 22px; }
.app-browser .bw-tiles {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px; margin: 10px 0 0; padding: 0; list-style: none;
}
.app-browser .bw-tile {
  display: block; width: 100%; padding: 10px 12px; text-align: left;
  border: 1px solid #dbe2ec; border-radius: 4px; background: #f7f9fc;
}
.app-browser .bw-tile:hover { border-color: #9fc0e0; background: #eff5fb; }
.app-browser .bw-tile-title { display: block; color: #1b5fa8; font-size: 12.5px; font-weight: 700; }
.app-browser .bw-tile-host { display: block; margin-top: 2px; color: #73808f; font-size: 11px; }
.app-browser .bw-links { margin: 8px 0 0; padding: 0; list-style: none; }
.app-browser .bw-link {
  display: flex; align-items: baseline; gap: 10px; width: 100%;
  padding: 7px 8px; border-radius: 3px; text-align: left;
}
.app-browser .bw-link:hover { background: #eff5fb; }
.app-browser .bw-link-title { color: #1b5fa8; font-size: 12.5px; font-weight: 600; text-decoration: underline; }
.app-browser .bw-link-host { color: #73808f; font-size: 11px; }
.app-browser .bw-link-desc { margin-left: auto; color: #63707f; font-size: 11px; text-align: right; }
.app-browser .bw-start-foot {
  display: flex; justify-content: space-between; gap: 16px;
  margin-top: 26px; padding-top: 10px; border-top: 1px solid #e3e8f0;
  color: #8a95a3; font-size: 10.5px;
}

/* ---------- intranet search ---------- */
.app-browser .bw-searchhead {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #dbe2ec;
}
.app-browser .bw-wordmark { color: #1b5fa8; font: 700 15px Georgia, "Segoe UI", serif; }
.app-browser .bw-wordmark span {
  margin-left: 6px; color: #63707f;
  font: 400 11px Verdana, "Segoe UI", sans-serif;
}
.app-browser .bw-searchhead .bw-search { flex: 1; min-width: 220px; max-width: 420px; margin: 0; }
.app-browser .bw-results { margin: 12px 0 0; padding: 0; list-style: none; }
.app-browser .bw-result { padding: 10px 0; border-top: 1px solid #e6ebf2; }
.app-browser .bw-result-title {
  color: #1b5fa8; font-family: Verdana, "Segoe UI", sans-serif;
  font-size: 13px; font-weight: 700; text-decoration: underline;
}
.app-browser .bw-result-host { margin: 2px 0 3px; color: #2f6f3f; font-size: 11px; }
.app-browser .bw-result-desc { margin: 0; color: #4c5968; font-size: 12px; }
.app-browser .bw-empty {
  margin-top: 14px; padding: 18px; border: 1px dashed #c9d3e0;
  border-radius: 4px; background: #f8fafc;
}
.app-browser .bw-empty p:last-child { margin-bottom: 0; }
.app-browser .bw-hint {
  margin-top: 20px; padding-top: 10px; border-top: 1px solid #e6ebf2;
  color: #8a95a3; font-size: 11px;
}

/* ---------- error page ---------- */
.app-browser .bw-error { display: flex; align-items: center; justify-content: center; }
.app-browser .bw-error-body { max-width: 560px; padding: 10px 0; }
.app-browser .bw-error-icon { display: block; width: 42px; height: 42px; }
.app-browser .bw-error-icon svg { width: 42px; height: 42px; }
.app-browser .bw-error h1 { margin: 12px 0 8px; font: 600 20px var(--font); }
.app-browser .bw-error-detail {
  padding: 6px 9px; border: 1px solid #f0dfae; border-radius: 3px;
  background: #fff8e6; color: #8a5a00;
  font-family: Consolas, "Cascadia Mono", monospace; font-size: 11px;
}
.app-browser .bw-error-url {
  color: #63707f; font-family: Consolas, "Cascadia Mono", monospace;
  font-size: 11px; overflow-wrap: anywhere;
}
.app-browser .bw-error-actions { display: flex; gap: 8px; margin-top: 14px; }

/* ---------- status bar ---------- */
.app-browser .bw-statusbar {
  display: flex; justify-content: space-between; gap: 12px; flex: none;
  min-height: 22px; padding: 3px 10px; background: #eef1f6;
  border-top: 1px solid #d5dce6; color: #6b7684; font-size: 10.5px;
}
`;
