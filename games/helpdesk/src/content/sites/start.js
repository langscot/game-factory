// The browser's start page: bookmarks, a search box and the list of intranet
// sites this computer knows. It is a site like any other, which keeps the
// browser chrome free of page markup.

import { COMPANY } from "../company.js";

export default {
  id: "start",
  title: "Start page",
  host: "start.halcyon.co",
  description: "Bookmarks and the intranet directory",

  mount(content, platform) {
    const { ctx } = platform;
    const esc = ctx.ui.esc;
    const technician = ctx.world.session.technician();
    const bookmarks = platform.bookmarks;
    const pages = platform.sites.filter((site) => site.id !== "start");

    content.innerHTML = `
      <div class="bw-start">
        <header class="bw-start-head">
          <span class="bw-mark" aria-hidden="true">H</span>
          <div class="bw-start-title">
            <h1>${esc(COMPANY)}</h1>
            <p>Intranet home${technician ? ` · ${esc(technician.displayName)}` : ""}</p>
          </div>
          <span class="bw-start-tag">Internal</span>
        </header>

        <form class="bw-search" data-search role="search">
          <input data-query type="text" placeholder="Search the Halcyon intranet"
            aria-label="Search the Halcyon intranet" autocomplete="off" spellcheck="false">
          <button class="bw-btn primary" type="submit">Search</button>
        </form>

        <section class="bw-block">
          <h2>Bookmarks</h2>
          ${
            bookmarks.length
              ? `<ul class="bw-tiles">${bookmarks
                  .map(
                    (bookmark) => `
                <li>
                  <button class="bw-tile" data-go="${esc(bookmark.host)}">
                    <span class="bw-tile-title">${esc(bookmark.title)}</span>
                    <span class="bw-tile-host">${esc(bookmark.host)}</span>
                  </button>
                </li>`,
                  )
                  .join("")}</ul>`
              : `<p class="bw-muted">No bookmarks yet. Open a page and use the star in the address bar.</p>`
          }
        </section>

        <section class="bw-block">
          <h2>Sites on this computer</h2>
          <ul class="bw-links">
            ${pages
              .map(
                (site) => `
              <li>
                <button class="bw-link" data-go="${esc(site.host)}">
                  <span class="bw-link-title">${esc(site.title)}</span>
                  <span class="bw-link-host">${esc(site.host)}</span>
                  <span class="bw-link-desc">${esc(site.description || "")}</span>
                </button>
              </li>`,
              )
              .join("")}
          </ul>
        </section>

        <footer class="bw-start-foot">
          <span>${esc(COMPANY)} · Internal use only</span>
          <span>Intranet services are monitored.</span>
        </footer>
      </div>`;

    content.querySelector("[data-search]").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = content.querySelector("[data-query]");
      const query = input.value.trim();
      if (!query) {
        input.focus();
        return;
      }
      platform.navigate(`search.halcyon.co/?q=${encodeURIComponent(query)}`);
    });

    for (const button of content.querySelectorAll("[data-go]")) {
      button.addEventListener("click", () => platform.navigate(button.dataset.go));
    }
  },
};
