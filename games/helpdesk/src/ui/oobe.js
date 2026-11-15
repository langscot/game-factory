// First-run setup. This is the shell's out-of-box experience: four screens of
// questions nobody reads, one progress bar nobody believes, then the desktop.
//
// It owns no game state. When the bar reaches the end it writes the account
// through prefs.js and hands the account back to the shell.

import { esc } from "./dom.js";
import {
  MIN_PASSWORD_LENGTH,
  RECOVERY_QUESTIONS,
  createAccount,
} from "../prefs.js";

const SETUP_LINES = [
  "Checking for updates",
  "Applying Halcyon policy",
  "Installing software you did not ask for",
  "Removing software you did ask for",
  "Joining the HALCYON domain",
  "Contacting management. Please wait.",
  "Finalising your experience",
];

const STEP_COUNT = 4;

// Prefilled from the personnel file. The player can change it; the paperwork
// will not.
const DEFAULT_NAME = "Morgan Hayes";
const DEFAULT_LOGON = "m.hayes";

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,23}$/i;

export function startOobe(container, { onComplete } = {}) {
  container.innerHTML = `
    <div class="oobe-shell">
      <div class="oobe-card" role="dialog" aria-modal="true" aria-labelledby="oobeTitle">
        <header class="oobe-head">
          <span class="oobe-brand"><span class="oobe-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Doors 11</span>
          <span class="oobe-count" data-count>Step 1 of ${STEP_COUNT}</span>
        </header>

        <div class="oobe-body">
          <section class="oobe-step" data-step="0">
            <h1 id="oobeTitle" tabindex="-1">Let's start with your region</h1>
            <p class="oobe-sub">Doors uses this to decide which laws apply and which websites are blocked.</p>
            <div class="oobe-field">
              <label for="oobeRegion">Country or region</label>
              <select id="oobeRegion">
                <option>United Kingdom</option>
                <option>Ireland</option>
                <option>Germany</option>
                <option>United States (Corporate)</option>
                <option>India</option>
                <option>Rest of World (latency not included)</option>
              </select>
            </div>
            <div class="oobe-field">
              <label for="oobeLanguage">Display language</label>
              <select id="oobeLanguage">
                <option>English (United Kingdom)</option>
                <option>English (United States)</option>
                <option>English (International Accounting)</option>
                <option>Deutsch (Sie werden es trotzdem auf Englisch tun)</option>
              </select>
            </div>
            <p class="oobe-note">You can change these later in Control Freak. You will not.</p>
          </section>

          <section class="oobe-step" data-step="1" hidden>
            <h1 tabindex="-1">How do you type?</h1>
            <p class="oobe-sub">Pick a keyboard layout. The laptop has one keyboard. This is mostly symbolic.</p>
            <div class="oobe-choices" role="radiogroup" aria-label="Keyboard layout">
              <label class="oobe-choice">
                <input type="radio" name="oobeKeyboard" value="United Kingdom" checked>
                <span><b>United Kingdom</b><small>Standard issue. The @ is hiding behind AltGr.</small></span>
              </label>
              <label class="oobe-choice">
                <input type="radio" name="oobeKeyboard" value="United States">
                <span><b>United States</b><small>Everything is where you expect. Deeply suspicious.</small></span>
              </label>
              <label class="oobe-choice">
                <input type="radio" name="oobeKeyboard" value="United Kingdom (International)">
                <span><b>United Kingdom (International)</b><small>The same keyboard, with more arguments about spelling.</small></span>
              </label>
            </div>
          </section>

          <section class="oobe-step" data-step="2" hidden>
            <h1 tabindex="-1">Who is using this PC?</h1>
            <p class="oobe-sub">Halcyon HR has already filled in your details. You may disagree. It will not change anything.</p>
            <div class="oobe-grid">
              <div class="oobe-field">
                <label for="oobeDisplayName">Your name</label>
                <input id="oobeDisplayName" value="${DEFAULT_NAME}" autocomplete="name" spellcheck="false">
              </div>
              <div class="oobe-field">
                <label for="oobeUsername">Username</label>
                <input id="oobeUsername" value="${DEFAULT_LOGON}" autocomplete="username" spellcheck="false" autocapitalize="none">
              </div>
            </div>
            <div class="oobe-grid">
              <div class="oobe-field">
                <label for="oobePassword">Password</label>
                <input id="oobePassword" type="password" autocomplete="new-password">
                <small>At least ${MIN_PASSWORD_LENGTH} characters. Mixed case is between you and the policy.</small>
              </div>
              <div class="oobe-field">
                <label for="oobeConfirm">Confirm password</label>
                <input id="oobeConfirm" type="password" autocomplete="new-password">
              </div>
            </div>
            <div class="oobe-field">
              <label for="oobeRecoveryQuestion">Recovery question</label>
              <select id="oobeRecoveryQuestion">
                ${RECOVERY_QUESTIONS.map((question) => `<option>${esc(question)}</option>`).join("")}
              </select>
            </div>
            <div class="oobe-field">
              <label for="oobeRecoveryAnswer">Answer</label>
              <input id="oobeRecoveryAnswer" autocomplete="off" spellcheck="false">
              <small>Used to reset your password without involving the service desk. The service desk is busy.</small>
            </div>
            <p class="oobe-error" data-error role="alert"></p>
            <p class="oobe-note">This account is a local administrator. Everyone on this laptop is a local administrator. That is the problem.</p>
          </section>

          <section class="oobe-step" data-step="3" hidden>
            <h1 tabindex="-1">Choose privacy settings for your device</h1>
            <p class="oobe-sub">We have selected the responsible defaults for you.</p>
            <div class="oobe-toggles">
              <label class="oobe-toggle">
                <input type="checkbox" data-privacy="telemetry" checked>
                <span><b>Diagnostic data</b><small>Sends device health to Halcyon. Also sends your typing rhythm, because that is a kind of health.</small></span>
              </label>
              <label class="oobe-toggle">
                <input type="checkbox" data-privacy="offers" checked>
                <span><b>Personalised tips and offers</b><small>Helpful suggestions about features you did not ask for, from partners you have not met.</small></span>
              </label>
              <label class="oobe-toggle">
                <input type="checkbox" data-privacy="location" checked>
                <span><b>Location services</b><small>For weather, maps, and knowing which office to blame.</small></span>
              </label>
              <label class="oobe-toggle">
                <input type="checkbox" data-privacy="ads" checked>
                <span><b>Advertising ID</b><small>A unique number shared with partners. It is definitely not you.</small></span>
              </label>
              <label class="oobe-toggle">
                <input type="checkbox" data-privacy="microphone" checked>
                <span><b>App microphone access</b><small>So apps can listen for the wake word. There is no wake word.</small></span>
              </label>
            </div>
            <p class="oobe-note">Some of these cannot be changed after setup. The rest are in Control Freak, behind a dialog asking whether you are sure.</p>
          </section>

          <section class="oobe-step oobe-finish" data-step="4" hidden>
            <h1 tabindex="-1">Setting up your device</h1>
            <p class="oobe-sub">This will only take a moment. That is what the last one said.</p>
            <div class="oobe-progress" role="progressbar" aria-label="Setting up your device" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <i data-bar></i>
            </div>
            <p class="oobe-status" data-status role="status">${SETUP_LINES[0]}</p>
            <p class="oobe-note">Please do not close the lid, unplug the laptop, or expect this to be quick.</p>
          </section>
        </div>

        <footer class="oobe-foot" data-foot>
          <button class="oobe-back" data-back type="button">Back</button>
          <button class="oobe-next" data-next type="button">Next</button>
        </footer>
        <p class="oobe-legal" data-legal>By continuing you accept the Halcyon Acceptable Use Policy, which is three hundred pages long and mostly about printers.</p>
      </div>
    </div>`;

  const steps = [...container.querySelectorAll(".oobe-step")];
  const backButton = container.querySelector("[data-back]");
  const nextButton = container.querySelector("[data-next]");
  const count = container.querySelector("[data-count]");
  const foot = container.querySelector("[data-foot]");
  const legal = container.querySelector("[data-legal]");
  const error = container.querySelector("[data-error]");
  const bar = container.querySelector("[data-bar]");
  const progress = container.querySelector(".oobe-progress");
  const status = container.querySelector("[data-status]");
  const scene = container.querySelector(".oobe-card");

  let step = 0;
  let completed = false;
  let draft = null;

  function showStep(next) {
    step = next;
    steps.forEach((node) => (node.hidden = Number(node.dataset.step) !== step));
    count.textContent = step >= 4 ? "Finalising" : `Step ${step + 1} of ${STEP_COUNT}`;
    backButton.hidden = step >= 3;
    nextButton.hidden = step >= 4;
    foot.hidden = step >= 4;
    legal.hidden = step >= 4;
    if (step === 2) nextButton.textContent = "Next";
    if (step === 3) nextButton.textContent = "Accept and continue";
    clearError();
    if (step < 4) steps[step].querySelector("h1")?.focus();
  }

  function clearError() {
    error.textContent = "";
  }

  function fail(message, field) {
    error.textContent = message;
    if (field) {
      field.focus();
      field.setAttribute("aria-invalid", "true");
      field.addEventListener(
        "input",
        () => {
          field.removeAttribute("aria-invalid");
          clearError();
        },
        { once: true },
      );
    }
  }

  function validateAccount() {
    const displayName = container.querySelector("#oobeDisplayName");
    const username = container.querySelector("#oobeUsername");
    const password = container.querySelector("#oobePassword");
    const confirm = container.querySelector("#oobeConfirm");
    const answer = container.querySelector("#oobeRecoveryAnswer");
    const logon = username.value.trim().toLowerCase();

    if (displayName.value.trim().length < 2) {
      fail("Enter a name. Any name. Halcyon will spell it wrong anyway.", displayName);
      return null;
    }
    if (!USERNAME.test(logon)) {
      fail("Usernames are 2–24 characters, letters, numbers, dots, dashes or underscores.", username);
      return null;
    }
    if (password.value.length < MIN_PASSWORD_LENGTH) {
      fail(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`, password);
      return null;
    }
    if (password.value !== confirm.value) {
      fail("The passwords do not match. Try again, slower.", confirm);
      return null;
    }
    if (answer.value.trim().length < 2) {
      fail("The recovery answer cannot be blank. That is the entire point of a recovery answer.", answer);
      return null;
    }

    return {
      displayName: displayName.value,
      username: logon,
      password: password.value,
      recoveryQuestion: container.querySelector("#oobeRecoveryQuestion").value,
      recoveryAnswer: answer.value,
      region: container.querySelector("#oobeRegion").value,
      language: container.querySelector("#oobeLanguage").value,
      keyboard: container.querySelector('input[name="oobeKeyboard"]:checked').value,
      privacy: Object.fromEntries(
        [...container.querySelectorAll("[data-privacy]")].map((input) => [input.dataset.privacy, input.checked]),
      ),
    };
  }

  function runSetup(details) {
    showStep(4);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reduce ? 60 : 420;
    let index = 0;

    const advance = () => {
      index += 1;
      const percent = Math.min(100, Math.round((index / SETUP_LINES.length) * 100));
      bar.style.width = `${percent}%`;
      progress.setAttribute("aria-valuenow", String(percent));
      if (index < SETUP_LINES.length) {
        status.textContent = `${SETUP_LINES[index]}…`;
        setTimeout(advance, interval + (index === SETUP_LINES.length - 1 ? 240 : 0));
        return;
      }
      status.textContent = "Welcome. Your device is ready and slightly worse than before.";
      setTimeout(finish, reduce ? 100 : 700);
    };

    setTimeout(advance, interval);

    function finish() {
      if (completed) return;
      completed = true;
      const account = createAccount(details);
      scene.classList.add("done");
      onComplete?.(account);
    }
  }

  function next() {
    if (step === 0) {
      showStep(1);
      return;
    }
    if (step === 1) {
      showStep(2);
      container.querySelector("#oobePassword").focus();
      return;
    }
    if (step === 2) {
      draft = validateAccount();
      if (!draft) return;
      showStep(3);
      return;
    }
    if (step === 3 && draft) {
      runSetup(draft);
    }
  }

  function back() {
    if (step === 0) return;
    showStep(step - 1);
  }

  nextButton.addEventListener("click", next);
  backButton.addEventListener("click", back);

  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && step < 4 && !event.target.closest("button, textarea, select")) {
      event.preventDefault();
      next();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && step > 0 && step < 4) {
      event.preventDefault();
      back();
    }
  });

  showStep(0);
}
