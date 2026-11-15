// Intranet search. A results page over the local site registry: no index, no
// crawler, no network. It exists so the start page's search box goes somewhere
// believable, which is how a corporate intranet actually behaved.

export default {
  id: "search",
  title: "Intranet Search",
  host: "search.halcyon.co",
  description: "Search Halcyon Dynamics intranet pages",

  mount(content, platform) {
    const esc = platform.ctx.ui.esc;
    const query = new URL(platform.url).searchParams.get("q")?.trim() || "";
    const needle = query.toLowerCase();
    const pages = platform.sites.filter((site) => site.id !== "search");
    const hits = needle
      ? pages.filter((site) => `${site.title} ${site.host} ${site.description || ""}`.toLowerCase().includes(needle))
      : pages;

    const heading = query ? `Results for “${esc(query)}”` : "All intranet pages";
    const summary = query
      ? `${hits.length} page${hits.length === 1 ? "" : "s"} found.`
      : `${pages.length} pages are indexed on this computer.`;

    const results = hits
      .map(
        (site) => `
        <li class="bw-result">
          <button class="bw-result-title" data-go="${esc(site.host)}">${esc(site.title)}</button>
          <div class="bw-result-host">${esc(site.host)}</div>
          <p class="bw-result-desc">${esc(site.description || "")}</p>
        </li>`,
      )
      .join("");

    content.innerHTML = `
      <div class="bw-searchpage">
        <header class="bw-searchhead">
          <div class="bw-wordmark">Halcyon Dynamics <span>Intranet Search</span></div>
          <form class="bw-search" data-search role="search">
            <input data-query type="text" value="${esc(query)}" placeholder="Search the intranet"
              aria-label="Search the Halcyon intranet" autocomplete="off" spellcheck="false">
            <button class="bw-btn primary" type="submit">Search</button>
          </form>
        </header>

        <h1>${heading}</h1>
        <p class="bw-muted">${summary}</p>
        ${
          hits.length
            ? `<ul class="bw-results">${results}</ul>`
            : `<div class="bw-empty">
                <p>Your search did not match any documents.</p>
                <p class="bw-muted">Check the spelling, or try a site name such as “Service Desk”.</p>
              </div>`
        }

        <p class="bw-hint">Search covers Halcyon Dynamics intranet pages only. Public web addresses are not available on this computer.</p>
      </div>`;

    content.querySelector("[data-search]").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = content.querySelector("[data-query]");
      const next = input.value.trim();
      if (!next) {
        input.focus();
        return;
      }
      platform.navigate(`${platform.host}/?q=${encodeURIComponent(next)}`);
    });

    for (const button of content.querySelectorAll("[data-go]")) {
      button.addEventListener("click", () => platform.navigate(button.dataset.go));
    }
  },
};
