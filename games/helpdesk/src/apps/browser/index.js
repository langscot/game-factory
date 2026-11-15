// Glorp: a tab strip, an address bar, a bookmarks bar and a content area that
// renders local site modules. There is no network here — a hostname is a lookup
// in src/content/sites, and an unknown one gets an in-world error page.
//
// The site contract lives at the top of src/content/sites/index.js. Adding a
// site is a new module in that folder and one line in its MODULES list; the
// chrome, tabs and history here need no changes.

import {
  DEFAULT_BOOKMARKS,
  HOME_HOST,
  SEARCH_HOST,
  siteForHost,
  siteList,
} from "../../content/sites/index.js";
import { css } from "./styles.js";

const APP_ID = "browser";
const HOME_URL = `http://${HOME_HOST}/`;
const MAX_TABS = 12;
const MAX_HISTORY = 50;
const MAX_BOOKMARKS = 16;
const instances = new WeakMap();

const HOME_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M4 11.2 12 4l8 7.2V20h-5.4v-5.6H9.4V20H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;

const ERROR_ICON = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="16" cy="16" r="14" fill="#fdecea" stroke="#e5b4ae" stroke-width="1.4"/>
  <path d="M16 8.6v9.2" stroke="#b3261e" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="16" cy="22.6" r="1.7" fill="#b3261e"/>
</svg>`;

const safeUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/** Intranet addresses are http; https in the address bar is the same page. */
function canonical(parsed) {
  return `http://${parsed.host}${parsed.pathname}${parsed.search}`;
}

function searchUrl(query) {
  return `http://${SEARCH_HOST}/?q=${encodeURIComponent(query)}`;
}

/**
 * Turn whatever was typed into an address. Three shapes are accepted:
 *   servicedesk.halcyon.co        a hostname, with an optional path
 *   http://servicedesk.halcyon.co a full address
 *   anything with a space, or one bare word, becomes an intranet search
 * Unsupported protocols stay verbatim so the error page can quote them.
 */
function addressFor(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return HOME_URL;

  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (scheme) {
    if (!/^https?$/i.test(scheme[1])) return raw;
    const parsed = safeUrl(raw);
    return parsed ? canonical(parsed) : raw;
  }

  if (!/\s/.test(raw) && raw.includes(".")) {
    const parsed = safeUrl(`http://${raw}`);
    return parsed ? canonical(parsed) : raw;
  }

  return searchUrl(raw);
}

/** What the address bar should show when a tab opens on it. */
function titleFor(url) {
  const page = pageFor(url);
  if (page.kind === "site") return page.site.title;
  if (page.kind === "host") return page.host;
  return "Cannot open page";
}

/** Resolve one address to a site mount or an error kind. */
function pageFor(url) {
  const raw = String(url ?? "");
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    return { kind: "protocol", scheme: scheme[1].toLowerCase() };
  }

  const parsed = safeUrl(raw);
  if (!parsed) return { kind: "malformed" };

  const site = siteForHost(parsed.hostname);
  if (!site) return { kind: "host", host: parsed.hostname };

  return { kind: "site", site, parsed };
}

const emptyTab = (id) => ({
  id,
  url: HOME_URL,
  title: "Start page",
  history: [HOME_URL],
  index: 0,
});

/** Restore one tab from session.ui, dropping anything malformed. */
function readTab(raw, position) {
  if (!raw || typeof raw !== "object") return null;

  const url = typeof raw.url === "string" && raw.url ? raw.url : HOME_URL;
  let history = (Array.isArray(raw.history) ? raw.history : [])
    .filter((item) => typeof item === "string" && item)
    .slice(-MAX_HISTORY);
  if (!history.length) history = [url];
  if (!history.includes(url)) history.push(url);

  const index = Math.max(
    0,
    Math.min(history.length - 1, Number.isInteger(raw.index) ? raw.index : history.length - 1),
  );

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `tab_${position}`,
    url: history[index],
    title: typeof raw.title === "string" && raw.title ? raw.title : titleFor(history[index]),
    history,
    index,
  };
}

/** Read the saved browser session, or a fresh one with a single start tab. */
function readState(ctx) {
  const saved = ctx.world.session.ui(APP_ID) || {};
  const tabs = [];
  const seen = new Set();
  for (const [position, raw] of (Array.isArray(saved.tabs) ? saved.tabs : []).entries()) {
    if (tabs.length >= MAX_TABS) break;
    const tab = readTab(raw, position + 1);
    if (!tab || seen.has(tab.id)) continue;
    seen.add(tab.id);
    tabs.push(tab);
  }
  if (!tabs.length) tabs.push(emptyTab("tab_1"));

  const active = tabs.some((tab) => tab.id === saved.active) ? saved.active : tabs[0].id;
  const bookmarks = Array.isArray(saved.bookmarks)
    ? saved.bookmarks.filter((host) => typeof host === "string" && siteForHost(host)).slice(0, MAX_BOOKMARKS)
    : [...DEFAULT_BOOKMARKS];

  let nextId = tabs.length + 1;
  for (const tab of tabs) {
    const number = Number(String(tab.id).replace(/^tab_/, ""));
    if (Number.isInteger(number)) nextId = Math.max(nextId, number + 1);
  }
  if (Number.isInteger(saved.nextId)) nextId = Math.max(nextId, saved.nextId);

  // A launcher can send the browser straight to a page. Day start passes a URL
  // on the app options; an app that is already running (Mail's issue links)
  // leaves a launchUrl in the browser's UI state and fires ui:changed instead.
  // Only intranet sites are accepted; anything else leaves the restored tab alone.
  const launch =
    typeof ctx.options?.url === "string" && ctx.options.url.trim()
      ? ctx.options.url
      : saved.launchUrl;
  applyLaunch(tabs, active, launch);

  return { tabs, active, bookmarks, nextId };
}

/** Point the active tab at a launch request, if it resolves to an intranet site. */
function applyLaunch(tabs, active, value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return false;
  const target = addressFor(raw);
  if (pageFor(target).kind !== "site") return false;
  const tab = tabs.find((entry) => entry.id === active) || tabs[0];
  tab.url = target;
  tab.title = titleFor(target);
  tab.history = [target];
  tab.index = 0;
  return true;
}

export default {
  id: APP_ID,
  title: "Glorp",
  icon: "browser",
  size: [880, 600],
  desktop: true,
  pinned: true,
  order: 1,
  position: [140, 34],

  mount(container, ctx) {
    ctx.ui.styles(APP_ID, css);

    const saved = readState(ctx);
    const tabs = saved.tabs;
    let active = saved.active;
    let bookmarks = saved.bookmarks;
    let nextId = saved.nextId;
    let alive = true;
    let mounted = null;

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="bw">
        <div class="bw-tabstrip">
          <div class="bw-tablist" role="tablist" aria-label="Glorp tabs" data-tablist></div>
          <button class="bw-newtab" data-newtab title="New tab" aria-label="New tab">+</button>
        </div>

        <div class="bw-toolbar">
          <div class="bw-navbtns">
            <button class="bw-tool" data-back title="Back" aria-label="Back" disabled>${ctx.ui.icon("$arrowLeft")}</button>
            <button class="bw-tool" data-forward title="Forward" aria-label="Forward" disabled>${ctx.ui.icon("$arrowRight")}</button>
            <button class="bw-tool" data-reload title="Reload" aria-label="Reload">${ctx.ui.icon("$refresh")}</button>
            <button class="bw-tool" data-home title="Home" aria-label="Home">${HOME_ICON}</button>
          </div>
          <div class="bw-addressbar">
            <span class="bw-addressicon" aria-hidden="true">${ctx.ui.icon("browser")}</span>
            <input class="bw-address" data-address type="text" spellcheck="false" autocomplete="off" aria-label="Address bar">
            <button class="bw-star" data-star title="Bookmark this page" aria-label="Bookmark this page" aria-pressed="false">☆</button>
          </div>
          <button class="bw-go" data-go>Go</button>
        </div>

        <div class="bw-bookmarkbar" data-bookmarks aria-label="Bookmarks"></div>
        <div class="bw-content" data-content></div>
        <div class="bw-statusbar">
          <span data-status>Done</span>
          <span class="bw-status-right">Halcyon Dynamics intranet</span>
        </div>
      </div>`);
    container.append(root);

    const tabsEl = root.querySelector("[data-tablist]");
    const bookmarksEl = root.querySelector("[data-bookmarks]");
    const contentEl = root.querySelector("[data-content]");
    const address = root.querySelector("[data-address]");
    const star = root.querySelector("[data-star]");
    const status = root.querySelector("[data-status]");
    const back = root.querySelector("[data-back]");
    const forward = root.querySelector("[data-forward]");

    const current = () => tabs.find((tab) => tab.id === active) || tabs[0];

    function snapshot() {
      return {
        tabs: tabs.map(({ id, url, title, history, index }) => ({
          id,
          url,
          title,
          history: history.slice(-MAX_HISTORY),
          index: Math.min(index, history.length - 1),
        })),
        active,
        bookmarks: [...bookmarks],
        nextId,
        // Consumed requests are cleared on the next save, whether the browser
        // was opened by the request or was already running.
        launchUrl: null,
      };
    }

    function persist() {
      if (!alive) return;
      ctx.actions.setUi(APP_ID, snapshot());
    }

    // ---------------------------------------------------------------- chrome

    function renderTabs() {
      tabsEl.innerHTML = tabs
        .map(
          (tab) => `
          <div class="bw-tab${tab.id === active ? " is-active" : ""}">
            <button class="bw-tabmain" role="tab" aria-selected="${tab.id === active}"
              data-tab="${ctx.ui.esc(tab.id)}" title="${ctx.ui.esc(tab.title)}">
              <span class="bw-favicon" aria-hidden="true">${ctx.ui.icon("browser")}</span>
              <span class="bw-tabtitle">${ctx.ui.esc(tab.title)}</span>
            </button>
            <button class="bw-tabclose" data-close="${ctx.ui.esc(tab.id)}"
              title="Close tab" aria-label="Close ${ctx.ui.esc(tab.title)}">×</button>
          </div>`,
        )
        .join("");

      for (const button of tabsEl.querySelectorAll("[data-tab]")) {
        button.addEventListener("click", () => activateTab(button.dataset.tab));
      }
      for (const button of tabsEl.querySelectorAll("[data-close]")) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          closeTab(button.dataset.close);
        });
      }
    }

    function renderBookmarks() {
      const entries = bookmarks.map((host) => ({
        host,
        title: siteForHost(host)?.title || host,
      }));

      if (!entries.length) {
        bookmarksEl.innerHTML = `<span class="bw-bmempty">No bookmarks. Use the star in the address bar.</span>`;
        return;
      }

      bookmarksEl.innerHTML =
        `<span class="bw-bmlabel">Bookmarks</span>` +
        entries
          .map(
            (entry) => `
            <button class="bw-bookmark" data-bookmark="${ctx.ui.esc(entry.host)}"
              title="http://${ctx.ui.esc(entry.host)}/">
              <span class="bw-favicon" aria-hidden="true">${ctx.ui.icon("browser")}</span>${ctx.ui.esc(entry.title)}
            </button>`,
          )
          .join("");

      for (const button of bookmarksEl.querySelectorAll("[data-bookmark]")) {
        button.addEventListener("click", () => navigate(button.dataset.bookmark));
      }
    }

    function renderChrome() {
      const tab = current();
      const page = pageFor(tab.url);
      address.value = tab.url;
      back.disabled = tab.index <= 0;
      forward.disabled = tab.index >= tab.history.length - 1;

      const host = page.kind === "site" ? page.parsed.hostname : null;
      const bookmarked = Boolean(host && bookmarks.includes(host));
      star.disabled = !host;
      star.textContent = bookmarked ? "★" : "☆";
      star.title = bookmarked ? "Remove bookmark" : "Bookmark this page";
      star.setAttribute("aria-pressed", String(bookmarked));

      ctx.window.setTitle(`${tab.title} — Glorp`);
    }

    // --------------------------------------------------------------- content

    function unmountSite() {
      if (!mounted) return;
      const { site, platform } = mounted;
      mounted = null;
      try {
        site.unmount?.(contentEl, platform);
      } catch (error) {
        console.error(`Site ${site.id} failed to unmount`, error);
      }
    }

    function renderError({ title, message, detail, url }) {
      status.textContent = "Cannot open page";
      contentEl.innerHTML = `
        <div class="bw-page bw-error">
          <div class="bw-error-body">
            <span class="bw-error-icon" aria-hidden="true">${ERROR_ICON}</span>
            <h1>${ctx.ui.esc(title)}</h1>
            <p>${message}</p>
            <p class="bw-error-detail">${ctx.ui.esc(detail)}</p>
            <p class="bw-error-url">${ctx.ui.esc(url)}</p>
            <div class="bw-error-actions">
              <button class="bw-btn primary" data-retry>Try again</button>
              <button class="bw-btn" data-start>Start page</button>
            </div>
          </div>
        </div>`;

      contentEl.querySelector("[data-retry]").addEventListener("click", () => reload());
      contentEl.querySelector("[data-start]").addEventListener("click", () => navigate(HOME_URL));
    }

    function renderContent() {
      unmountSite();
      contentEl.innerHTML = "";
      contentEl.scrollTop = 0;

      const tab = current();
      const page = pageFor(tab.url);

      if (page.kind === "host") {
        renderError({
          title: "This page can't be reached",
          message: `The server at <b>${ctx.ui.esc(page.host)}</b> could not be found. Check the address for typos, then try again.`,
          detail: "Intranet name resolution failed — error 11001.",
          url: tab.url,
        });
        return;
      }

      if (page.kind === "protocol") {
        renderError({
          title: "This address can't be opened",
          message: `The ${ctx.ui.esc(page.scheme)}:// protocol is not available on this computer. Halcyon Dynamics intranet sites use http://.`,
          detail: "The address was not opened.",
          url: tab.url,
        });
        return;
      }

      if (page.kind === "malformed") {
        renderError({
          title: "This page can't be reached",
          message: "The address is not a valid Halcyon Dynamics intranet address. Check it and try again.",
          detail: "Intranet name resolution failed — error 11001.",
          url: tab.url,
        });
        return;
      }

      const site = page.site;
      const surface = document.createElement("div");
      surface.className = `bw-page site-${site.id}`;
      contentEl.append(surface);

      const platform = {
        ctx,
        url: tab.url,
        host: page.parsed.hostname,
        path: page.parsed.pathname,
        sites: siteList(),
        bookmarks: bookmarks.map((host) => ({ host, title: siteForHost(host)?.title || host })),
        navigate: (addressValue) => navigate(addressValue),
        setTitle: (title) => {
          if (!alive || typeof title !== "string" || !title) return;
          tab.title = title;
          persist();
          renderTabs();
          renderChrome();
        },
        style: (siteCss) => ctx.ui.styles(`browser-site-${site.id}`, siteCss),
      };

      mounted = { site, platform };
      status.textContent = `Done · ${page.parsed.hostname}`;
      try {
        site.mount(surface, platform);
      } catch (error) {
        console.error(`Site ${site.id} failed to mount`, error);
        unmountSite();
        contentEl.innerHTML = "";
        renderError({
          title: "This page could not be displayed",
          message: "The intranet site returned a page this browser could not render.",
          detail: "Intranet error 500.",
          url: tab.url,
        });
      }
    }

    /** Repaint everything and save. `content: false` keeps the page mounted. */
    function paint({ content = true } = {}) {
      if (!alive) return;
      if (content) renderContent();
      renderTabs();
      renderBookmarks();
      renderChrome();
      persist();
    }

    // ------------------------------------------------------------- navigation

    function navigate(input) {
      const tab = current();
      const url = addressFor(input);

      if (url === tab.url) {
        reload();
        return;
      }

      tab.history = tab.history.slice(0, tab.index + 1);
      tab.history.push(url);
      if (tab.history.length > MAX_HISTORY) tab.history.splice(0, tab.history.length - MAX_HISTORY);
      tab.index = tab.history.length - 1;
      tab.url = url;
      tab.title = titleFor(url);
      paint();
    }

    function step(delta) {
      const tab = current();
      const index = tab.index + delta;
      if (index < 0 || index >= tab.history.length) return;
      tab.index = index;
      tab.url = tab.history[index];
      tab.title = titleFor(tab.url);
      paint();
    }

    function reload() {
      paint();
    }

    function activateTab(id) {
      if (!id || !tabs.some((tab) => tab.id === id) || id === active) return;
      active = id;
      paint();
    }

    function createTab() {
      if (tabs.length >= MAX_TABS) {
        ctx.ui.toast("Glorp", "That is as many tabs as Glorp will hold. Close one first. Or keep them all and let the fan deal with it.", APP_ID);
        return;
      }
      const tab = emptyTab(`tab_${nextId++}`);
      tabs.push(tab);
      active = tab.id;
      paint();
      address.focus();
      address.select();
    }

    function closeTab(id) {
      const position = tabs.findIndex((tab) => tab.id === id);
      if (position < 0) return;

      const wasActive = tabs[position].id === active;
      tabs.splice(position, 1);
      if (!tabs.length) {
        const tab = emptyTab(`tab_${nextId++}`);
        tabs.push(tab);
        active = tab.id;
      } else if (wasActive) {
        active = tabs[Math.min(position, tabs.length - 1)].id;
      }
      paint({ content: wasActive || !tabs.length });
    }

    function toggleBookmark() {
      const page = pageFor(current().url);
      if (page.kind !== "site") return;
      const host = page.parsed.hostname;

      if (bookmarks.includes(host)) {
        bookmarks = bookmarks.filter((entry) => entry !== host);
      } else if (bookmarks.length >= MAX_BOOKMARKS) {
        ctx.ui.toast("Glorp", "The bookmarks bar is full. Remove one before adding another.", APP_ID);
        return;
      } else {
        bookmarks = [...bookmarks, host];
      }
      paint({ content: false });
    }

    // ----------------------------------------------------------------- wiring

    root.querySelector("[data-back]").addEventListener("click", () => step(-1));
    root.querySelector("[data-forward]").addEventListener("click", () => step(1));
    root.querySelector("[data-reload]").addEventListener("click", () => reload());
    root.querySelector("[data-home]").addEventListener("click", () => navigate(HOME_URL));
    root.querySelector("[data-go]").addEventListener("click", () => navigate(address.value));
    root.querySelector("[data-newtab]").addEventListener("click", () => createTab());
    star.addEventListener("click", () => toggleBookmark());

    address.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigate(address.value);
        address.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        address.value = current().url;
        address.blur();
      }
    });
    address.addEventListener("focus", () => address.select());

    // Alt+Left / Alt+Right, the shortcuts every browser of this vintage had.
    root.addEventListener("keydown", (event) => {
      if (!event.altKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });

    // A launch request can arrive while the window is already open. The
    // request lives in the browser's UI state so it survives a closed window,
    // and this listener consumes it when Mail (or anything else) sets it.
    // It is registered after the first paint so the site's own setUi during
    // mount cannot re-consume the request that opened the window.
    paint();

    const offLaunch = ctx.events.on("ui:changed", () => {
      if (!alive) return;
      const request = ctx.world.session.ui(APP_ID).launchUrl;
      if (typeof request !== "string" || !request.trim()) return;
      const target = addressFor(request);
      if (pageFor(target).kind !== "site") {
        ctx.actions.setUi(APP_ID, { launchUrl: null });
        return;
      }
      // Clear first: navigating renders the site, and its mount writes UI
      // state of its own.
      ctx.actions.setUi(APP_ID, { launchUrl: null });
      navigate(target);
    });

    instances.set(container, {
      stop: () => {
        alive = false;
        offLaunch?.();
        unmountSite();
      },
    });
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
    container.innerHTML = "";
  },
};
