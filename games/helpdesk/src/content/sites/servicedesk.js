// Placeholder for servicedesk.halcyon.co. The real Service Desk site is a
// separate issue (#54); this page exists so the host resolves and the browser
// has somewhere real to land. It reads the signed-in technician, which is all
// the wiring this stage needs.

import { COMPANY, DESK, MAIL_DOMAIN } from "../company.js";

export default {
  id: "servicedesk",
  title: "Service Desk",
  host: "servicedesk.halcyon.co",
  description: "Tickets, requests and the IT knowledge base",

  mount(content, platform) {
    const { ctx } = platform;
    const esc = ctx.ui.esc;
    const technician = ctx.world.session.technician();

    // A site ships its own look through platform.style(); the browser injects it
    // once and every selector stays under the site's class.
    platform.style(`
      .site-servicedesk .bw-masthead {
        display: flex; align-items: flex-end; justify-content: space-between;
        gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #1b5fa8;
      }
      .site-servicedesk .bw-masthead h1 { margin: 0; font: 700 24px Georgia, "Segoe UI", serif; color: #14202d; }
      .site-servicedesk .bw-kicker {
        margin: 0 0 3px; font-size: 10.5px; letter-spacing: 0.1em;
        text-transform: uppercase; color: #63707f;
      }
      .site-servicedesk .bw-crumb { margin: 10px 0 18px; font-size: 11px; color: #7b8794; }
      .site-servicedesk .bw-panel {
        max-width: 720px; padding: 16px 18px; border: 1px solid #dbe2ec;
        border-radius: 4px; background: #f9fbfd;
      }
      .site-servicedesk .bw-panel h2 { margin-top: 0; }
      .site-servicedesk .bw-facts {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 12px; margin: 16px 0 0; padding: 12px 0 0; border-top: 1px solid #e3e8f0;
      }
      .site-servicedesk .bw-facts dt {
        font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #7b8794;
      }
      .site-servicedesk .bw-facts dd { margin: 2px 0 0; color: #22303d; font-size: 12px; }
      .site-servicedesk .bw-dot {
        display: inline-block; width: 7px; height: 7px; margin-right: 5px;
        border-radius: 50%; background: #2f9e44;
      }
      .site-servicedesk .bw-foot {
        margin-top: 22px; padding-top: 10px; border-top: 1px solid #e3e8f0;
        color: #8a95a3; font-size: 10.5px;
      }
    `);

    content.innerHTML = `
      <header class="bw-masthead">
        <div>
          <p class="bw-kicker">${esc(COMPANY)} · Internal</p>
          <h1>${esc(DESK)}</h1>
        </div>
        <span class="bw-badge">Intranet</span>
      </header>

      <p class="bw-crumb">Intranet / Information Technology / Service Desk</p>

      <section class="bw-panel">
        <h2>The Service Desk is moving to the intranet</h2>
        <p>
          Ticket lookups, request forms and the knowledge base are being rebuilt as an
          intranet site. This page will show the queue once the migration is finished.
        </p>
        <p>Until then, tickets stay on the Ticket Desk on this desktop.</p>

        <dl class="bw-facts">
          <div>
            <dt>Signed in as</dt>
            <dd>${esc(technician?.displayName || "Unknown user")}${
              technician ? ` (HALCYON\\${esc(technician.logonName)})` : ""
            }</dd>
          </div>
          <div>
            <dt>Service status</dt>
            <dd><span class="bw-dot"></span>Available</dd>
          </div>
          <div>
            <dt>Queue</dt>
            <dd>Not published to the intranet yet</dd>
          </div>
        </dl>
      </section>

      <p class="bw-foot">${esc(COMPANY)} IT · Ext. 4400 · service.desk@${esc(MAIL_DOMAIN)}</p>`;

  },
};
