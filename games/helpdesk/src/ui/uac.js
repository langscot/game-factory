// The UAC-style credential gate. It is deliberately desktop-level: elevation
// is an OS decision, not an app one, and the app must not open until the
// administrator password has been accepted.

import { esc } from "./dom.js";
import { showDialog, hideDialog } from "./dialog.js";
import { getAccount, verifyPassword } from "../prefs.js";
import { icon } from "../icons.js";

/**
 * Ask for the administrator password before allowing an app to run elevated.
 * Resolves true only after a correct password; No, Escape or a wrong password
 * all leave the app closed.
 */
export function requestAdminPassword(app) {
  const account = getAccount();

  return new Promise((resolve) => {
    let settled = false;
    let attempts = 0;

    const settle = (allowed) => {
      if (settled) return;
      settled = true;
      hideDialog();
      resolve(allowed);
    };

    if (!account) {
      showDialog({
        onDismiss: () => settle(false),
        html: `
          <div class="uac">
            <div class="uac-band"><span class="uac-shield">${icon("$shield")}</span><b>User Account Control</b></div>
            <div class="uac-body">
              <h2>This device has no administrator account.</h2>
              <p>Nobody can approve this change. That is either a security improvement or an unfinished setup, depending on who you ask.</p>
              <div class="uac-actions"><button class="btn primary" data-close>Close</button></div>
            </div>
          </div>`,
        wire: (card) => card.querySelector("[data-close]").addEventListener("click", () => settle(false)),
      });
      return;
    }

    showDialog({
      onDismiss: () => settle(false),
      html: `
        <div class="uac">
          <div class="uac-band"><span class="uac-shield">${icon("$shield")}</span><b>User Account Control</b></div>
          <div class="uac-body">
            <h2>Do you want to allow this app to make changes to your device?</h2>
            <div class="uac-app">
              <span class="uac-app-icon">${icon(app.icon || "settings")}</span>
              <div>
                <b>${esc(app.title)}</b>
                <small>Publisher: Halcyon Dynamics IT (self-signed)</small>
                <small>File origin: C:\\Program Files\\Halcyon\\Workstation\\Apps</small>
              </div>
            </div>
            <p>This app will run with administrative rights. It can change things. That is usually how it gets here.</p>
            <form class="uac-form" novalidate>
              <label for="uacPassword">Administrator password
                <small>${esc(account.displayName)} · ${esc(account.username)} · HALCYON</small>
              </label>
              <input id="uacPassword" type="password" autocomplete="current-password" spellcheck="false">
              <p class="uac-error" role="alert"></p>
              <div class="uac-actions">
                <button class="btn" type="button" data-no>No</button>
                <button class="btn primary" type="submit">Yes</button>
              </div>
            </form>
          </div>
        </div>`,
      wire: (card) => {
        const form = card.querySelector(".uac-form");
        const input = card.querySelector("#uacPassword");
        const error = card.querySelector(".uac-error");

        card.querySelector("[data-no]").addEventListener("click", () => settle(false));

        input.focus();
        input.addEventListener("input", () => {
          error.textContent = "";
        });

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!input.value) {
            error.textContent = "Enter the administrator password.";
            input.focus();
            return;
          }
          if (!verifyPassword(input.value, account)) {
            attempts += 1;
            error.textContent =
              attempts >= 3
                ? "Incorrect. The hint was not a hint. Try the password you set up the device with."
                : "The password is incorrect. The app has not been allowed to make changes.";
            input.select();
            return;
          }
          settle(true);
        });
      },
    });
  });
}
