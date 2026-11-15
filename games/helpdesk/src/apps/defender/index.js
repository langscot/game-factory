// Windows Security — a faithful shell of the Windows 10/11 app (the former
// Windows Defender Security Center). It reads the technician's machine for
// names and shows the real page names, status tiles and controls. Scan results,
// firewall profiles and protection history are mock state kept in
// session.ui.defender; nothing here touches the real machine.

const APP_ID = "defender";

// A quick scan should be long enough to watch and short enough to replay.
const SCAN_SECONDS = 7;

const NAV = [
  { id: "home", title: "Home", icon: "home" },
  { id: "virus", title: "Virus & threat protection", icon: "virus" },
  { id: "account", title: "Account protection", icon: "account" },
  { id: "firewall", title: "Firewall & network protection", icon: "firewall" },
  { id: "apps", title: "App & browser control", icon: "appbrowser" },
  { id: "device", title: "Device security", icon: "device" },
];

const SCAN_OPTIONS = [
  {
    id: "quick",
    title: "Quick scan",
    note: "Checks the folders where threats are most likely to hide.",
  },
  {
    id: "full",
    title: "Full scan",
    note: "Scans every file and running program on this device.",
  },
  {
    id: "custom",
    title: "Custom scan",
    note: "Choose the folders and drives you want to check.",
  },
  {
    id: "offline",
    title: "Microsoft Defender Offline scan",
    note: "Restarts the device and scans before Windows starts.",
    disabled: true,
  },
];

// The detection is chosen from the world seed, so every save reports the same
// believable finding at the same location.
const DETECTIONS = [
  {
    id: "wacatac",
    name: "Trojan:Win32/Wacatac.B!ml",
    category: "Trojan",
    severity: "High",
    file: "Q4-invoice-8841.exe",
    folder: "Downloads",
    detail: "This program is dangerous and executes commands from an attacker.",
  },
  {
    id: "coinminer",
    name: "PUA:Win32/CoinMiner",
    category: "Potentially unwanted app",
    severity: "Medium",
    file: "svchost-update.tmp",
    folder: "Temp",
    detail: "Potentially unwanted software that uses this device to mine cryptocurrency.",
  },
  {
    id: "autorun",
    name: "Worm:Win32/Autorun.A",
    category: "Worm",
    severity: "High",
    file: "usb-backup.exe",
    folder: "Downloads",
    detail: "This program spreads to removable drives and other computers.",
  },
];

const DEFAULTS = {
  page: "home",
  threats: [],
  history: [],
  firewall: { domain: true, private: true, public: true },
  firewallNotify: true,
  account: { dynamicLock: true },
  appControl: { checkApps: true, edgeSmartScreen: true, pua: true, storeSmartScreen: true },
  virusSettings: { realTime: true, cloud: true, sampleSubmission: true, tamper: true },
  device: { memoryIntegrity: true },
  lastScan: null,
  lastScanDay: null,
  lastScanType: null,
};

// The rail and page glyphs are drawn here rather than added to the shared icon
// set: only the coloured app icon belongs in icons.js.
const GLYPHS = {
  home: `<path d="M3.6 11.2 12 3.8l8.4 7.4"/><path d="M5.8 10.1v9.3h12.4v-9.3"/><path d="M9.9 19.4v-5.2h4.2v5.2"/>`,
  virus: `<path d="M12 3.2 19 5.8v5.1c0 4.3-2.7 7.5-7 10.1-4.3-2.6-7-5.8-7-10.1V5.8z"/><path d="M12 8.4v4.2"/><circle cx="12" cy="15.7" r=".9" fill="currentColor" stroke="none"/>`,
  account: `<circle cx="12" cy="8.2" r="3.4"/><path d="M4.8 20c0-3.6 3.2-5.7 7.2-5.7s7.2 2.1 7.2 5.7"/>`,
  firewall: `<rect x="4" y="4.8" width="16" height="14.4" rx="1.4"/><path d="M4 9.6h16M4 14.4h16M8 4.8v4.8M14.4 4.8v4.8M10.9 9.6v4.8M17.1 9.6v4.8M6.4 14.4v4.8M12.6 14.4v4.8"/>`,
  appbrowser: `<rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2.2"/><path d="M3.4 8.4h17.2"/><circle cx="6.3" cy="6.4" r=".65" fill="currentColor" stroke="none"/><circle cx="8.5" cy="6.4" r=".65" fill="currentColor" stroke="none"/>`,
  device: `<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.6"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9.4 3.4v2.8M14.6 3.4v2.8M9.4 17.8v2.8M14.6 17.8v2.8M3.4 9.4h2.8M3.4 14.6h2.8M17.8 9.4h2.8M17.8 14.6h2.8"/>`,
  tick: `<path d="M5 12.6l4.4 4.4L19 6.8"/>`,
  alert: `<path d="M12 3.8 21 20H3z"/><path d="M12 9.4v4.4"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>`,
  danger: `<path d="M12 3.2 19 5.8v5.1c0 4.3-2.7 7.5-7 10.1-4.3-2.6-7-5.8-7-10.1V5.8z"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>`,
  chevron: `<path d="M9 6l6 6-6 6"/>`,
  hello: `<circle cx="12" cy="8.6" r="3.1"/><path d="M5.6 20c0-3.3 2.9-5.4 6.4-5.4s6.4 2.1 6.4 5.4"/><path d="M9.4 11.4c.7.8 1.5 1.2 2.6 1.2s1.9-.4 2.6-1.2"/>`,
  network: `<circle cx="12" cy="5.7" r="2.1"/><circle cx="5.5" cy="18.2" r="2.1"/><circle cx="18.5" cy="18.2" r="2.1"/><path d="M12 7.8v4.4M12 12.2l-5.3 4M12 12.2l5.3 4"/>`,
  shield: `<path d="M12 3.2 19 5.8v5.1c0 4.3-2.7 7.5-7 10.1-4.3-2.6-7-5.8-7-10.1V5.8z"/><path d="M8.7 11.9l2.2 2.2 4.4-4.7"/>`,
  map: `<circle cx="12" cy="12" r="8.4"/><path d="M12 6.8v5.2l3.2 1.9"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>`,
  help: `<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 1.9-2.5 3.6"/><circle cx="12" cy="17.1" r=".9" fill="currentColor" stroke="none"/>`,
  trash: `<path d="M5.4 7.4h13.2M9.6 7.4V5.2h4.8v2.2M7 7.4l.9 12.1h8.2L17 7.4"/><path d="M10.2 10.4v6M13.8 10.4v6"/>`,
};

const glyph = (name, cls = "") =>
  `<svg class="def-glyph${cls ? ` ${cls}` : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name] || GLYPHS.shield}</svg>`;

const instances = new WeakMap();

function readState(ctx) {
  const saved = ctx.world.session.ui(APP_ID) || {};
  return {
    ...DEFAULTS,
    ...saved,
    firewall: { ...DEFAULTS.firewall, ...(saved.firewall || {}) },
    account: { ...DEFAULTS.account, ...(saved.account || {}) },
    appControl: { ...DEFAULTS.appControl, ...(saved.appControl || {}) },
    virusSettings: { ...DEFAULTS.virusSettings, ...(saved.virusSettings || {}) },
    device: { ...DEFAULTS.device, ...(saved.device || {}) },
    threats: Array.isArray(saved.threats) ? saved.threats : [],
    history: Array.isArray(saved.history) ? saved.history : [],
  };
}

const virusTone = (st) =>
  st.threats.length ? "bad" : st.virusSettings.realTime ? "good" : "warn";
const firewallTone = (st) =>
  st.firewall.domain && st.firewall.private && st.firewall.public ? "good" : "warn";
const appTone = (st) => (Object.values(st.appControl).every(Boolean) ? "good" : "warn");
const deviceTone = (st) => (st.device.memoryIntegrity ? "good" : "warn");

function overallTone(st) {
  const tones = [virusTone(st), "good", firewallTone(st), appTone(st), deviceTone(st)];
  if (tones.includes("bad")) return "bad";
  if (tones.includes("warn")) return "warn";
  return "good";
}

function detectionFor(ctx) {
  const person = ctx.session.technician();
  const machine = person ? ctx.world.machines.byOwner(person.id) : null;
  const seed = Math.abs(Number(ctx.session.seed()) || 0);
  const index = (seed + (person?.logonName?.length || 0)) % DETECTIONS.length;
  const { folder, ...template } = DETECTIONS[index] || DETECTIONS[0];
  const base = folder === "Temp" ? "AppData\\Local\\Temp" : folder;
  return {
    ...template,
    path: `C:\\Users\\${person?.logonName || "user"}\\${base}\\${template.file}`,
    machine: machine?.hostname || "this device",
    detectedAt: ctx.clock.timeText(),
    detectedDay: ctx.session.day(),
  };
}

export default {
  id: "defender",
  title: "Windows Security",
  icon: "defender",
  size: [960, 620],
  desktop: true,
  pinned: true,
  order: 10,
  position: [150, 26],

  mount(container, ctx) {
    ctx.ui.styles(APP_ID, css);

    const hostname = () => {
      const person = ctx.session.technician();
      const machine = person ? ctx.world.machines.byOwner(person.id) : null;
      return machine?.hostname || "this device";
    };

    const local = {
      scanning: false,
      progress: 0,
      scanType: "quick",
      optionsOpen: false,
      scanDone: false,
      scanFound: false,
      files: [],
      stopTick: null,
    };

    const save = (patch) => ctx.actions.setUi(APP_ID, patch);

    const statusMark = (tone) =>
      `<span class="def-mark ${tone}" aria-hidden="true">${glyph(
        tone === "good" ? "tick" : tone === "warn" ? "alert" : "danger",
      )}</span>`;

    const statusBox = (tone, label, sub) => `
      <div class="def-status ${tone}">
        ${statusMark(tone)}
        <div><b>${ctx.ui.esc(label)}</b><span>${ctx.ui.esc(sub)}</span></div>
      </div>`;

    const toggle = (group, key, on, label) => `
      <button type="button" class="def-toggle${on ? " on" : ""}" role="switch"
        aria-checked="${on}" aria-label="${ctx.ui.esc(label)}"
        data-group="${group}" data-key="${key}"></button>`;

    const setting = (title, note, control) => `
      <div class="def-setting">
        <div><b>${ctx.ui.esc(title)}</b><span>${ctx.ui.esc(note)}</span></div>
        ${control}
      </div>`;

    const infoButton = (label, title, text, cls = "def-btn") => `
      <button type="button" class="${cls}" data-info-title="${ctx.ui.esc(title)}"
        data-info="${ctx.ui.esc(text)}">${ctx.ui.esc(label)}</button>`;

    const lastScanText = (st) =>
      st.lastScan
        ? `${st.lastScanType || "Quick scan"} · day ${st.lastScanDay ?? ctx.session.day()}, ${st.lastScan}`
        : "Not run yet";

    // -----------------------------------------------------------------------
    // pages
    // -----------------------------------------------------------------------

    function homePage(st) {
      const tone = overallTone(st);
      const tiles = [
        {
          page: "virus",
          icon: "virus",
          title: "Virus & threat protection",
          note: st.threats.length
            ? `${st.threats.length} threat${st.threats.length === 1 ? "" : "s"} found`
            : st.virusSettings.realTime
              ? "No actions needed"
              : "Real-time protection is off",
          tone: virusTone(st),
        },
        {
          page: "account",
          icon: "account",
          title: "Account protection",
          note: "No actions needed",
          tone: "good",
        },
        {
          page: "firewall",
          icon: "firewall",
          title: "Firewall & network protection",
          note: firewallTone(st) === "good" ? "No actions needed" : "Firewall is off",
          tone: firewallTone(st),
        },
        {
          page: "apps",
          icon: "appbrowser",
          title: "App & browser control",
          note: appTone(st) === "good" ? "No actions needed" : "Some protections are off",
          tone: appTone(st),
        },
        {
          page: "device",
          icon: "device",
          title: "Device security",
          note: st.device.memoryIntegrity ? "No actions needed" : "Memory integrity is off",
          tone: deviceTone(st),
        },
      ];

      return `
        <div class="def-hero ${tone}">
          ${statusMark(tone)}
          <div class="def-hero-text">
            <h1>${tone === "good" ? "You're protected" : tone === "bad" ? "Threats found" : "Actions recommended"}</h1>
            <p>${
              tone === "good"
                ? `Windows Security is protecting ${ctx.ui.esc(hostname())}.`
                : tone === "bad"
                  ? `${st.threats.length} threat${st.threats.length === 1 ? "" : "s"} need${st.threats.length === 1 ? "s" : ""} your attention.`
                  : "Some security features are turned off."
            }</p>
          </div>
          <span class="def-hero-device">${ctx.ui.esc(hostname())}</span>
        </div>
        <div class="def-section-head">
          <h2>Security at a glance</h2>
          <span>Last scan: ${ctx.ui.esc(lastScanText(st))}</span>
        </div>
        <div class="def-tiles">
          ${tiles
            .map(
              (tile) => `
            <button type="button" class="def-tile ${tile.tone}" data-goto="${tile.page}"
              aria-label="${ctx.ui.esc(tile.title)}. ${ctx.ui.esc(tile.note)}. Open details.">
              <span class="def-tile-ico">${glyph(tile.icon)}</span>
              <span class="def-tile-text"><b>${ctx.ui.esc(tile.title)}</b><span>${ctx.ui.esc(tile.note)}</span></span>
              ${statusMark(tile.tone)}
              <span class="def-chev">${glyph("chevron")}</span>
            </button>`,
            )
            .join("")}
        </div>
        <div class="def-note">Windows Security is managed by Halcyon Dynamics. Settings that change here only affect this simulated device.</div>`;
    }

    function currentThreats(st) {
      if (!st.threats.length) {
        return `
          <div class="def-empty-row">
            ${statusMark("good")}
            <div><b>No current threats</b><span>Windows Security is monitoring this device.</span></div>
          </div>`;
      }
      return st.threats
        .map(
          (threat) => `
        <div class="def-threat">
          <div class="def-threat-head">
            ${statusMark("bad")}
            <div><b>${ctx.ui.esc(threat.name)}</b><span class="def-sev">${ctx.ui.esc(threat.severity)} · ${ctx.ui.esc(threat.category || "Threat")}</span></div>
          </div>
          <div class="def-threat-meta">${ctx.ui.esc(threat.path)}</div>
          <p>${ctx.ui.esc(threat.detail)}</p>
          <div class="def-actions">
            <button type="button" class="def-btn primary" data-threat="quarantine">Quarantine</button>
            <button type="button" class="def-btn" data-threat="remove">Remove</button>
          </div>
          <div class="def-small def-muted">Detected on day ${threat.detectedDay ?? ctx.session.day()} at ${ctx.ui.esc(threat.detectedAt || "")} on ${ctx.ui.esc(threat.machine || hostname())}.</div>
        </div>`,
        )
        .join("");
    }

    function scanOptions() {
      return `
        <div class="def-scanopts" role="group" aria-label="Scan options">
          ${SCAN_OPTIONS.map(
            (option) => `
            <button type="button" class="def-scanopt${local.scanType === option.id ? " sel" : ""}"
              data-scanopt="${option.id}" ${option.disabled ? "disabled" : ""}>
              <span class="radio" aria-hidden="true"></span>
              <span><b>${ctx.ui.esc(option.title)}</b><span>${ctx.ui.esc(option.note)}</span></span>
            </button>`,
          ).join("")}
        </div>`;
    }

    function scanPanel(st) {
      if (local.scanning) {
        const pct = Math.round(local.progress * 100);
        const file = local.files[Math.min(local.files.length - 1, Math.floor(local.progress * local.files.length))] || "";
        return `
          <div class="def-scan-live">
            <div class="def-scan-top"><span>Scanning…</span><span data-scan-pct>${pct}%</span></div>
            <div class="def-progress" role="progressbar" aria-label="Scan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
              <i data-scan-bar style="width:${pct}%"></i>
            </div>
            <div class="def-scan-file" data-scan-file>Scanning ${ctx.ui.esc(file)}</div>
          </div>
          <div class="def-actions"><button type="button" class="def-btn" data-scan-cancel>Cancel scan</button></div>`;
      }
      if (local.scanDone) {
        return `
          <div class="def-result ${local.scanFound ? "bad" : "good"}">
            ${statusMark(local.scanFound ? "bad" : "good")}
            <div><b>${local.scanFound ? "Scan complete — threats found" : "Scan complete — no threats found"}</b>
            <span>${local.scanFound ? "Review the findings in Current threats." : "Windows Security did not find anything this time."}</span></div>
          </div>`;
      }
      return "";
    }

    function virusPage(st) {
      const tone = virusTone(st);
      const label =
        tone === "bad" ? "Threats found" : tone === "warn" ? "Actions recommended" : "No actions needed";
      const sub =
        tone === "bad"
          ? `${st.threats.length} threat${st.threats.length === 1 ? "" : "s"} need${st.threats.length === 1 ? "s" : ""} your attention.`
          : tone === "warn"
            ? "Real-time protection is turned off."
            : "Windows Security is monitoring this device.";
      const scanLabel =
        local.scanning
          ? "Scanning…"
          : SCAN_OPTIONS.find((option) => option.id === local.scanType)?.title || "Quick scan";

      const history = st.history.length
        ? `<div class="def-history">${st.history
            .map(
              (entry) => `
            <button type="button" class="def-history-row" data-history="${ctx.ui.esc(entry.key)}">
              <span class="def-history-ico${entry.action === "Removed" ? " removed" : ""}">${glyph(
                entry.action === "Removed" ? "trash" : "shield",
              )}</span>
              <span class="def-history-main">
                <b>${ctx.ui.esc(entry.name)}</b>
                <span>${ctx.ui.esc(entry.action)} · ${ctx.ui.esc(entry.severity)} · day ${entry.actionDay ?? ctx.session.day()}, ${ctx.ui.esc(entry.actionAt || "")}</span>
              </span>
              <span class="def-chev">${glyph("chevron")}</span>
            </button>`,
            )
            .join("")}</div>`
        : `<div class="def-empty-row">${statusMark("good")}<div><b>No recent actions</b><span>Quarantined and removed items will appear here.</span></div></div>`;

      return `
        <div class="def-title">
          <h1>Virus &amp; threat protection</h1>
          <p>Protect this device against malware, unwanted software and other threats.</p>
        </div>
        ${statusBox(tone, label, sub)}
        <section class="def-card">
          <div class="def-card-head"><h2>Current threats</h2></div>
          ${currentThreats(st)}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Quick scan</h2><span class="def-muted def-small">Last scan: ${ctx.ui.esc(lastScanText(st))}</span></div>
          <p class="def-copy">Run a scan to check the folders where threats are most likely to hide.</p>
          <div class="def-actions">
            <button type="button" class="def-btn primary" data-scan-start ${local.scanning ? "disabled" : ""}>${ctx.ui.esc(scanLabel)}</button>
            <button type="button" class="def-btn ghost" data-scan-options aria-expanded="${local.optionsOpen}">Scan options</button>
          </div>
          ${scanPanel(st)}
          ${local.optionsOpen ? scanOptions() : ""}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Virus &amp; threat protection settings</h2></div>
          <p class="def-copy">These protections are managed for this device by your organisation.</p>
          ${setting("Real-time protection", "Locates and stops malware from running.", toggle("virus", "realTime", st.virusSettings.realTime, "Real-time protection"))}
          ${setting("Cloud-delivered protection", "Sends suspicious files to Microsoft for a faster verdict.", toggle("virus", "cloud", st.virusSettings.cloud, "Cloud-delivered protection"))}
          ${setting("Automatic sample submission", "Sends samples to Microsoft to help improve protection.", toggle("virus", "sampleSubmission", st.virusSettings.sampleSubmission, "Automatic sample submission"))}
          ${setting("Tamper protection", "Stops malware from changing security settings.", toggle("virus", "tamper", st.virusSettings.tamper, "Tamper protection"))}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Protection history</h2>${st.history.length ? `<span class="def-muted def-small">${st.history.length} item${st.history.length === 1 ? "" : "s"}</span>` : ""}</div>
          ${history}
        </section>`;
    }

    function accountPage(st) {
      const person = ctx.session.technician();
      return `
        <div class="def-title">
          <h1>Account protection</h1>
          <p>Keep your account safe with Windows Hello and Dynamic lock.</p>
        </div>
        ${statusBox("good", "No actions needed", "Windows Hello and Dynamic lock are protecting your account.")}
        <section class="def-card">
          <div class="def-card-head"><h2>Windows Hello</h2></div>
          <div class="def-media">
            <span class="def-media-ico">${glyph("hello")}</span>
            <div class="def-media-text">
              <b>Face, fingerprint, PIN or security key</b>
              <span>Sign in to this device without a password. Windows Hello is set up for ${ctx.ui.esc(person?.displayName || "this account")}.</span>
            </div>
          </div>
          <div class="def-actions">
            ${infoButton("Manage sign-in options", "Windows Hello", "Sign-in options are managed by your organisation.\n\nThis device is using Windows Hello. Face, fingerprint, PIN and security keys can all be used to sign in.")}
          </div>
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Dynamic lock</h2></div>
          <p class="def-copy">Windows can lock this device automatically when you step away.</p>
          ${setting("Allow Windows to lock this device automatically when you're away", "Uses a paired phone to notice when you leave.", toggle("account", "dynamicLock", st.account.dynamicLock, "Dynamic lock"))}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Your account</h2></div>
          ${setting("Signed in as", person?.displayName ? `${person.displayName} (${person.logonName})` : "The signed-in technician", `<span class="def-tag">${ctx.ui.esc(person?.email || "HALCYON domain")}</span>`)}
        </section>`;
    }

    function firewallPage(st) {
      const tone = firewallTone(st);
      const label = tone === "good" ? "No actions needed" : "Actions recommended";
      const sub =
        tone === "good"
          ? "Windows Defender Firewall is on for all networks."
          : "Windows Defender Firewall is off for one or more networks.";

      const profiles = [
        {
          key: "domain",
          title: "Domain network",
          note: "Connected to a domain network",
        },
        { key: "private", title: "Private network", note: "Connected to a private network" },
        { key: "public", title: "Public network", note: "Connected to a public network" },
      ];

      return `
        <div class="def-title">
          <h1>Firewall &amp; network protection</h1>
          <p>Manage the firewall for the networks this device connects to.</p>
        </div>
        ${statusBox(tone, label, sub)}
        ${profiles
          .map((profile) => {
            const on = st.firewall[profile.key];
            return `
            <div class="def-fw${on ? "" : " off"}">
              <div class="def-fw-head">
                <span class="def-fw-ico">${glyph("network")}</span>
                <div class="def-fw-title"><h2>${ctx.ui.esc(profile.title)}</h2><span>${ctx.ui.esc(profile.note)}</span></div>
                ${toggle("firewall", profile.key, on, `${profile.title} firewall`)}
              </div>
              <div class="def-fw-status ${on ? "good" : "bad"}">
                ${glyph(on ? "shield" : "alert")}<span>${on ? "Windows Defender Firewall is on" : "Windows Defender Firewall is off"}</span>
              </div>
            </div>`;
          })
          .join("")}
        <section class="def-card" style="margin-top:12px">
          <div class="def-card-head"><h2>Firewall notification settings</h2></div>
          ${setting("Notify me when Windows Defender Firewall blocks a new app", "A notification appears when a program is blocked.", toggle("firewallNotify", "notify", st.firewallNotify, "Firewall notifications"))}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Firewall &amp; network protection settings</h2></div>
          <p class="def-copy">Control which apps can communicate through the firewall and fine-tune the rules.</p>
          <div class="def-actions">
            ${infoButton("Allow an app through firewall", "Allowed apps", "Allowed apps are managed by your organisation.\n\nIn this mock console the list is read-only.")}
            ${infoButton("Advanced settings", "Advanced firewall settings", "Advanced settings are managed by your organisation.\n\nThe full Windows Defender Firewall console is not part of this app.")}
          </div>
        </section>`;
    }

    function appsPage(st) {
      const tone = appTone(st);
      const label = tone === "good" ? "No actions needed" : "Actions recommended";
      const sub =
        tone === "good"
          ? "Reputation-based protection and exploit protection are on."
          : "One or more reputation-based protections are off.";
      return `
        <div class="def-title">
          <h1>App &amp; browser control</h1>
          <p>Protect this device from malicious apps, downloads and websites.</p>
        </div>
        ${statusBox(tone, label, sub)}
        <section class="def-card">
          <div class="def-card-head"><h2>Reputation-based protection</h2></div>
          <p class="def-copy">Check apps and files, and use SmartScreen to protect this device from malicious sites and downloads.</p>
          ${setting("Check apps and files", "Warns you before running unrecognised or dangerous apps.", toggle("app", "checkApps", st.appControl.checkApps, "Check apps and files"))}
          ${setting("SmartScreen for Microsoft Edge", "Blocks malicious websites and downloads in Edge.", toggle("app", "edgeSmartScreen", st.appControl.edgeSmartScreen, "SmartScreen for Microsoft Edge"))}
          ${setting("Potentially unwanted app blocking", "Blocks apps that may display ads or slow down this device.", toggle("app", "pua", st.appControl.pua, "Potentially unwanted app blocking"))}
          ${setting("SmartScreen for Microsoft Store apps", "Checks Store apps before they run.", toggle("app", "storeSmartScreen", st.appControl.storeSmartScreen, "SmartScreen for Microsoft Store apps"))}
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Exploit protection</h2></div>
          <p class="def-copy">Exploit protection helps protect this device against attacks that use memory corruption and other techniques.</p>
          ${setting("System settings", "12 system-wide mitigations are applied.", `<span class="def-ok">${glyph("tick")}On</span>`)}
          ${setting("Program settings", "No custom program settings.", `<span class="def-muted def-small">Managed</span>`)}
          <div class="def-actions">
            ${infoButton("Exploit protection settings", "Exploit protection", "Exploit protection settings are managed by your organisation.\n\nSystem mitigations are applied to this device.")}
          </div>
        </section>`;
    }

    function devicePage(st) {
      const tone = deviceTone(st);
      const label = tone === "good" ? "No actions needed" : "Actions recommended";
      const sub =
        tone === "good"
          ? "Core isolation and the security processor are working normally."
          : "Memory integrity is turned off.";
      return `
        <div class="def-title">
          <h1>Device security</h1>
          <p>See the hardware-backed security features built into this device.</p>
        </div>
        ${statusBox(tone, label, sub)}
        <section class="def-card">
          <div class="def-card-head"><h2>Core isolation</h2></div>
          <p class="def-copy">Core isolation protects the most important parts of Windows from malicious code.</p>
          ${setting("Memory integrity", "Prevents malicious code from interfering with high-security processes.", toggle("device", "memoryIntegrity", st.device.memoryIntegrity, "Memory integrity"))}
          <div class="def-actions">
            ${infoButton("Core isolation details", "Core isolation", "Memory integrity uses hardware virtualisation to isolate important Windows processes.\n\nChanging this setting requires a restart in the real app.")}
          </div>
        </section>
        <section class="def-card">
          <div class="def-card-head"><h2>Security processor</h2></div>
          <p class="def-copy">The security processor provides hardware-backed protection for this device.</p>
          ${setting("Security processor (TPM)", "Ready", `<span class="def-ok">${glyph("tick")}Ready</span>`)}
          ${setting("Secure boot", "On", `<span class="def-ok">${glyph("tick")}On</span>`)}
          <div class="def-actions">
            ${infoButton("Security processor details", "Security processor", "The security processor is ready.\n\nTPM 2.0 is enabled and secure boot is protecting the startup process.")}
          </div>
        </section>`;
    }

    function pageHtml(st) {
      if (st.page === "virus") return virusPage(st);
      if (st.page === "account") return accountPage(st);
      if (st.page === "firewall") return firewallPage(st);
      if (st.page === "apps") return appsPage(st);
      if (st.page === "device") return devicePage(st);
      return homePage(st);
    }

    // -----------------------------------------------------------------------
    // scan
    // -----------------------------------------------------------------------

    function scanFileList() {
      const person = ctx.session.technician();
      const machine = person ? ctx.world.machines.byOwner(person.id) : null;
      const files = [
        "C:\\Windows\\System32\\ntdll.dll",
        "C:\\Windows\\System32\\kernel32.dll",
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        "C:\\ProgramData\\Microsoft\\Windows Defender\\Scans\\mpcache.bin",
      ];
      if (machine) {
        for (const software of ctx.world.machines.installedSoftware(machine.id)) {
          files.push(`C:\\Program Files\\${software.name}\\${software.process}`);
        }
      }
      files.push(`C:\\Users\\${person?.logonName || "user"}\\Downloads`);
      files.push(`C:\\Users\\${person?.logonName || "user"}\\AppData\\Local\\Temp`);
      return files;
    }

    function updateScanDom() {
      const pct = Math.round(local.progress * 100);
      const bar = root.querySelector("[data-scan-bar]");
      if (bar) bar.style.width = `${pct}%`;
      const number = root.querySelector("[data-scan-pct]");
      if (number) number.textContent = `${pct}%`;
      const progressbar = root.querySelector('[role="progressbar"]');
      if (progressbar) progressbar.setAttribute("aria-valuenow", String(pct));
      const file = root.querySelector("[data-scan-file]");
      if (file && local.files.length) {
        const index = Math.min(local.files.length - 1, Math.floor(local.progress * local.files.length));
        file.textContent = `Scanning ${local.files[index]}`;
      }
    }

    function startScan() {
      if (local.scanning) return;
      local.scanning = true;
      local.scanDone = false;
      local.scanFound = false;
      local.progress = 0;
      local.files = scanFileList();
      paint({ focus: "[data-scan-cancel]" });

      const stop = ctx.clock.onTick((dt) => {
        if (!local.scanning) return;
        local.progress = Math.min(1, local.progress + dt / SCAN_SECONDS);
        if (local.progress >= 1) {
          stop();
          completeScan();
          return;
        }
        updateScanDom();
      });
      local.stopTick = stop;
    }

    function completeScan() {
      local.scanning = false;
      local.stopTick = null;
      const st = readState(ctx);
      let found = null;
      if (!st.threats.length) {
        const candidate = detectionFor(ctx);
        const seen = st.history.some((entry) => entry.id === candidate.id);
        if (!seen) found = candidate;
      }
      const patch = {
        lastScan: ctx.clock.timeText(),
        lastScanDay: ctx.session.day(),
        lastScanType: SCAN_OPTIONS.find((option) => option.id === local.scanType)?.title || "Quick scan",
      };
      if (found) patch.threats = [found];
      save(patch);
      local.scanDone = true;
      local.scanFound = Boolean(found || st.threats.length);
      paint();
      if (found) {
        ctx.ui.toast("Windows Security", `${found.name} found. Review it in Current threats.`, "defender");
      } else if (!st.threats.length) {
        ctx.ui.toast("Windows Security", "Scan complete. No threats found.", "defender");
      }
    }

    function cancelScan() {
      local.stopTick?.();
      local.stopTick = null;
      local.scanning = false;
      local.scanDone = false;
      local.scanFound = false;
      paint({ focus: "[data-scan-start]" });
    }

    async function resolveThreat(action) {
      const st = readState(ctx);
      const threat = st.threats[0];
      if (!threat) return;
      if (action === "remove") {
        const confirmed = await ctx.ui.confirm(
          "Remove threat",
          `Remove ${threat.name} from this device?\n\nThis cannot be undone.`,
          { ok: "Remove", cancel: "Cancel" },
        );
        if (!confirmed) return;
      }
      const current = readState(ctx);
      const record = {
        ...threat,
        key: `${threat.id}-${ctx.session.day()}-${ctx.clock.timeText().replace(":", "")}`,
        action: action === "remove" ? "Removed" : "Quarantined",
        actionAt: ctx.clock.timeText(),
        actionDay: ctx.session.day(),
        by: ctx.session.technician()?.displayName || "You",
      };
      save({
        threats: current.threats.filter((item) => item.id !== threat.id),
        history: [record, ...current.history].slice(0, 25),
      });
      local.scanDone = false;
      local.scanFound = false;
      ctx.ui.toast(
        "Windows Security",
        action === "remove" ? "Threat removed from this device." : "Threat moved to quarantine.",
        "defender",
      );
      paint({ focus: `[data-history="${record.key}"]` });
    }

    // -----------------------------------------------------------------------
    // shell + painting
    // -----------------------------------------------------------------------

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="def">
        <aside class="def-rail">
          <div class="def-brand">
            ${ctx.ui.icon("defender")}
            <div><b>Windows Security</b><span>${ctx.ui.esc(hostname())}</span></div>
          </div>
          <nav class="def-nav" aria-label="Windows Security pages">
            ${NAV.map(
              (page) => `
              <button type="button" class="def-nav-btn" data-page="${page.id}">
                ${glyph(page.icon)}<span>${ctx.ui.esc(page.title)}</span>
              </button>`,
            ).join("")}
          </nav>
          <div class="def-rail-foot">
            <button type="button" class="def-nav-btn" data-rail-info="settings">${glyph("gear")}<span>Settings</span></button>
            <button type="button" class="def-nav-btn" data-rail-info="help">${glyph("help")}<span>Help</span></button>
          </div>
        </aside>
        <main class="def-main" data-def-main></main>
      </div>`);
    container.append(root);

    const body = root.querySelector("[data-def-main]");

    const go = (page) => {
      if (readState(ctx).page === page) return;
      save({ page });
      paint({ focus: `[data-page="${page}"]` });
    };

    for (const button of root.querySelectorAll(".def-nav-btn[data-page]")) {
      button.addEventListener("click", () => go(button.dataset.page));
    }

    for (const button of root.querySelectorAll("[data-rail-info]")) {
      button.addEventListener("click", () => {
        if (button.dataset.railInfo === "settings") {
          ctx.ui.alert(
            "Settings",
            "Windows Security settings are managed by your organisation.\n\nThis is a mock console: nothing here changes the real device.",
          );
        } else {
          ctx.ui.alert(
            "Help",
            "Windows Security protects this device from viruses, malware and other threats.\n\nUse the pages on the left to check protection status.",
          );
        }
      });
    }

    function wirePage(st) {
      body.querySelectorAll("[data-goto]").forEach((button) => {
        button.addEventListener("click", () => go(button.dataset.goto));
      });

      body.querySelectorAll("[data-info]").forEach((button) => {
        button.addEventListener("click", () =>
          ctx.ui.alert(button.dataset.infoTitle || "Windows Security", button.dataset.info || ""),
        );
      });

      body.querySelector("[data-scan-start]")?.addEventListener("click", startScan);
      body.querySelector("[data-scan-cancel]")?.addEventListener("click", cancelScan);

      body.querySelector("[data-scan-options]")?.addEventListener("click", () => {
        local.optionsOpen = !local.optionsOpen;
        paint({ focus: "[data-scan-options]" });
      });

      body.querySelectorAll("[data-scanopt]").forEach((button) => {
        button.addEventListener("click", () => {
          if (button.disabled) return;
          local.scanType = button.dataset.scanopt;
          local.scanDone = false;
          local.scanFound = false;
          paint({ focus: `[data-scanopt="${local.scanType}"]` });
        });
      });

      body.querySelectorAll("[data-threat]").forEach((button) => {
        button.addEventListener("click", () => resolveThreat(button.dataset.threat));
      });

      body.querySelectorAll("[data-history]").forEach((button) => {
        button.addEventListener("click", () => {
          const entry = readState(ctx).history.find((item) => item.key === button.dataset.history);
          if (!entry) return;
          ctx.ui.alert(
            "Protection history",
            [
              entry.name,
              `${entry.action} on day ${entry.actionDay} at ${entry.actionAt} by ${entry.by}.`,
              `Severity: ${entry.severity}`,
              `Location: ${entry.path}`,
            ].join("\n"),
          );
        });
      });

      const fields = {
        virus: "virusSettings",
        app: "appControl",
        account: "account",
        device: "device",
        firewall: "firewall",
      };

      body.querySelectorAll("button[data-group][data-key]").forEach((button) => {
        button.addEventListener("click", () => {
          const { group, key } = button.dataset;
          const current = readState(ctx);
          if (group === "firewallNotify") {
            save({ firewallNotify: !current.firewallNotify });
          } else {
            const field = fields[group];
            if (!field) return;
            save({ [field]: { ...current[field], [key]: !current[field][key] } });
          }
          paint({ focus: `[data-group="${group}"][data-key="${key}"]` });
        });
      });
    }

    function paint({ focus } = {}) {
      const st = readState(ctx);
      root.querySelectorAll(".def-nav-btn[data-page]").forEach((button) => {
        const active = button.dataset.page === st.page;
        button.classList.toggle("on", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      body.innerHTML = `<div class="def-page def-page-${st.page}">${pageHtml(st)}</div>`;
      wirePage(st);
      if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
    }

    ctx.onDispose(() => local.stopTick?.());
    instances.set(container, { local });
    paint();
  },

  unmount(container) {
    instances.get(container)?.local?.stopTick?.();
    instances.delete(container);
  },
};

const css = `
.app-defender { height: 100%; }
.app-defender .def {
  --d-panel: #272727;
  --d-card: #2c2c2c;
  --d-line: #3b3b3b;
  --d-text: #f3f3f3;
  --d-muted: #b3b3b3;
  --d-accent: #60cdff;
  --d-blue: #0067c0;
  --d-green: #6ccb5f;
  --d-amber: #ffd166;
  --d-red: #ff7b7b;
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #1f1f1f;
  color: var(--d-text);
  font-size: 13px;
}
.app-defender .def * { box-sizing: border-box; }
.app-defender .def button { font: inherit; color: inherit; }
.app-defender .def button:focus-visible { outline: 2px solid var(--d-accent); outline-offset: 2px; }
.app-defender .def-rail {
  width: 256px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 8px;
  background: #1f1f1f;
  border-right: 1px solid #343434;
}
.app-defender .def-brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 14px; }
.app-defender .def-brand > svg { width: 30px; height: 30px; flex: none; }
.app-defender .def-brand b { display: block; font-size: 14.5px; font-weight: 600; }
.app-defender .def-brand span { display: block; margin-top: 1px; font-size: 11px; color: var(--d-muted); }
.app-defender .def-nav { display: flex; flex-direction: column; gap: 1px; }
.app-defender .def-nav-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 5px;
  text-align: left;
  font-size: 12.8px;
  color: #d7d7d7;
}
.app-defender .def-nav-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.app-defender .def-nav-btn.on { background: rgba(255, 255, 255, 0.09); color: #fff; }
.app-defender .def-nav-btn.on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 2px;
  background: var(--d-accent);
}
.app-defender .def-nav-btn .def-glyph { width: 17px; height: 17px; flex: none; }
.app-defender .def-rail-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 8px;
  border-top: 1px solid #343434;
}
.app-defender .def-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 22px 28px 30px;
  background: var(--d-panel);
}
.app-defender .def-page { max-width: 760px; }
.app-defender .def-glyph { width: 18px; height: 18px; }
.app-defender .def-title { margin-bottom: 14px; }
.app-defender .def-title h1 { margin: 0 0 4px; font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
.app-defender .def-title p { margin: 0; font-size: 12.5px; color: var(--d-muted); }
.app-defender .def-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 22px;
  border: 1px solid rgba(108, 203, 95, 0.24);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(108, 203, 95, 0.13), rgba(108, 203, 95, 0.03));
}
.app-defender .def-hero.warn {
  border-color: rgba(255, 209, 102, 0.3);
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.13), rgba(255, 209, 102, 0.03));
}
.app-defender .def-hero.bad {
  border-color: rgba(255, 123, 123, 0.3);
  background: linear-gradient(135deg, rgba(255, 123, 123, 0.13), rgba(255, 123, 123, 0.03));
}
.app-defender .def-hero .def-mark { width: 48px; height: 48px; }
.app-defender .def-hero .def-mark .def-glyph { width: 26px; height: 26px; }
.app-defender .def-hero-text { flex: 1; min-width: 0; }
.app-defender .def-hero-text h1 { margin: 0 0 3px; font-size: 20px; font-weight: 600; }
.app-defender .def-hero-text p { margin: 0; font-size: 12px; color: var(--d-muted); }
.app-defender .def-hero-device {
  flex: none;
  padding: 4px 8px;
  border: 1px solid var(--d-line);
  border-radius: 4px;
  font-size: 10.5px;
  color: var(--d-muted);
}
.app-defender .def-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.app-defender .def-section-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.app-defender .def-section-head span { font-size: 11px; color: var(--d-muted); }
.app-defender .def-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
.app-defender .def-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 82px;
  padding: 14px;
  border: 1px solid var(--d-line);
  border-radius: 6px;
  background: var(--d-card);
  text-align: left;
}
.app-defender .def-tile:hover { background: #333; border-color: #484848; }
.app-defender .def-tile-ico {
  width: 34px;
  height: 34px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgba(96, 205, 255, 0.1);
  color: var(--d-accent);
}
.app-defender .def-tile-ico .def-glyph { width: 19px; height: 19px; }
.app-defender .def-tile-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.app-defender .def-tile-text b { font-size: 13px; font-weight: 600; }
.app-defender .def-tile-text span { font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-chev { width: 16px; height: 16px; flex: none; color: #8b8b8b; }
.app-defender .def-chev.def-glyph, .app-defender .def-chev .def-glyph { width: 16px; height: 16px; }
.app-defender .def-mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
}
.app-defender .def-mark .def-glyph { width: 15px; height: 15px; }
.app-defender .def-mark.good { color: var(--d-green); background: rgba(108, 203, 95, 0.16); }
.app-defender .def-mark.warn { color: var(--d-amber); background: rgba(255, 209, 102, 0.16); }
.app-defender .def-mark.bad { color: var(--d-red); background: rgba(255, 123, 123, 0.16); }
.app-defender .def-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--d-line);
  border-radius: 7px;
  background: var(--d-card);
}
.app-defender .def-status b { display: block; font-size: 13px; }
.app-defender .def-status div span { display: block; margin-top: 1px; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-card {
  margin-bottom: 12px;
  padding: 16px 18px;
  border: 1px solid var(--d-line);
  border-radius: 7px;
  background: var(--d-card);
}
.app-defender .def-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.app-defender .def-card-head h2 { margin: 0; font-size: 14px; font-weight: 600; }
.app-defender .def-copy { margin: 0 0 12px; font-size: 12px; line-height: 1.55; color: var(--d-muted); }
.app-defender .def-muted { color: var(--d-muted); }
.app-defender .def-small { font-size: 11px; }
.app-defender .def-setting { display: flex; align-items: center; gap: 16px; padding: 11px 0; border-top: 1px solid var(--d-line); }
.app-defender .def-setting:first-of-type { border-top: 0; }
.app-defender .def-setting > div { flex: 1; min-width: 0; }
.app-defender .def-setting b { display: block; margin-bottom: 2px; font-size: 12.5px; font-weight: 600; }
.app-defender .def-setting div span { display: block; font-size: 11.5px; line-height: 1.45; color: var(--d-muted); }
.app-defender .def-toggle {
  position: relative;
  width: 40px;
  height: 20px;
  flex: none;
  border-radius: 999px;
  background: #606060;
  transition: background 0.15s ease;
}
.app-defender .def-toggle::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.15s ease;
}
.app-defender .def-toggle.on { background: var(--d-accent); }
.app-defender .def-toggle.on::after { left: 23px; }
.app-defender .def-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  background: #333;
  font-size: 12px;
}
.app-defender .def-btn:hover { background: #3d3d3d; }
.app-defender .def-btn.primary { border-color: var(--d-blue); background: var(--d-blue); color: #fff; }
.app-defender .def-btn.primary:hover { background: #1177d0; }
.app-defender .def-btn.ghost { padding-left: 8px; padding-right: 8px; border-color: transparent; background: transparent; color: var(--d-accent); }
.app-defender .def-btn.ghost:hover { background: rgba(96, 205, 255, 0.1); }
.app-defender .def-btn:disabled { opacity: 0.5; cursor: default; }
.app-defender .def-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.app-defender .def-empty-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
.app-defender .def-empty-row b { display: block; font-size: 12.5px; }
.app-defender .def-empty-row div span { display: block; margin-top: 2px; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-threat { padding: 12px 14px; border-left: 3px solid var(--d-red); border-radius: 5px; background: rgba(255, 123, 123, 0.06); }
.app-defender .def-threat + .def-threat { margin-top: 10px; }
.app-defender .def-threat-head { display: flex; align-items: flex-start; gap: 10px; }
.app-defender .def-threat-head b { display: block; font-size: 13px; }
.app-defender .def-sev { display: inline-block; margin-top: 2px; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--d-red); }
.app-defender .def-threat-meta { margin-top: 8px; font-family: Consolas, "Courier New", monospace; font-size: 10.5px; color: #cfcfcf; word-break: break-all; }
.app-defender .def-threat p { margin: 7px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--d-muted); }
.app-defender .def-scan-live { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--d-line); border-radius: 6px; background: #252525; }
.app-defender .def-scan-top { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-progress { height: 6px; overflow: hidden; border-radius: 3px; background: #454545; }
.app-defender .def-progress i { display: block; height: 100%; width: 0; background: var(--d-accent); transition: width 0.12s linear; }
.app-defender .def-scan-file { margin-top: 8px; overflow: hidden; font-size: 11px; color: #8f8f8f; white-space: nowrap; text-overflow: ellipsis; }
.app-defender .def-result { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border: 1px solid var(--d-line); border-radius: 6px; background: #282828; }
.app-defender .def-result.good { border-color: rgba(108, 203, 95, 0.3); }
.app-defender .def-result.bad { border-color: rgba(255, 123, 123, 0.3); }
.app-defender .def-result b { display: block; font-size: 12.5px; }
.app-defender .def-result div span { display: block; margin-top: 1px; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-scanopts { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--d-line); }
.app-defender .def-scanopt { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 8px 6px; border-radius: 5px; text-align: left; }
.app-defender .def-scanopt:hover { background: rgba(255, 255, 255, 0.05); }
.app-defender .def-scanopt:disabled { opacity: 0.45; }
.app-defender .def-scanopt .radio { width: 14px; height: 14px; flex: none; margin-top: 2px; border: 1px solid #8a8a8a; border-radius: 50%; }
.app-defender .def-scanopt .radio::after { content: ""; display: block; width: 6px; height: 6px; margin: 3px; border-radius: 50%; background: transparent; }
.app-defender .def-scanopt.sel .radio { border-color: var(--d-accent); }
.app-defender .def-scanopt.sel .radio::after { background: var(--d-accent); }
.app-defender .def-scanopt b { display: block; font-size: 12.5px; }
.app-defender .def-scanopt span span { display: block; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-history { display: flex; flex-direction: column; }
.app-defender .def-history-row { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 4px; border-top: 1px solid var(--d-line); text-align: left; }
.app-defender .def-history-row:first-child { border-top: 0; }
.app-defender .def-history-row:hover { background: rgba(255, 255, 255, 0.04); }
.app-defender .def-history-ico { display: grid; place-items: center; width: 22px; height: 22px; flex: none; color: var(--d-green); }
.app-defender .def-history-ico .def-glyph { width: 17px; height: 17px; }
.app-defender .def-history-ico.removed { color: var(--d-red); }
.app-defender .def-history-main { flex: 1; min-width: 0; }
.app-defender .def-history-main b { display: block; overflow: hidden; font-size: 12px; white-space: nowrap; text-overflow: ellipsis; }
.app-defender .def-history-main span { display: block; margin-top: 1px; font-size: 11px; color: var(--d-muted); }
.app-defender .def-fw { margin-bottom: 10px; padding: 14px 16px; border: 1px solid var(--d-line); border-radius: 7px; background: var(--d-card); }
.app-defender .def-fw.off { border-color: rgba(255, 123, 123, 0.35); }
.app-defender .def-fw-head { display: flex; align-items: center; gap: 12px; }
.app-defender .def-fw-ico { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 6px; background: rgba(96, 205, 255, 0.1); color: var(--d-accent); }
.app-defender .def-fw-ico .def-glyph { width: 19px; height: 19px; }
.app-defender .def-fw-title { flex: 1; min-width: 0; }
.app-defender .def-fw-title h2 { margin: 0; font-size: 13px; font-weight: 600; }
.app-defender .def-fw-title span { display: block; margin-top: 2px; font-size: 11.5px; color: var(--d-muted); }
.app-defender .def-fw-status { display: flex; align-items: center; gap: 6px; margin-top: 9px; padding-left: 46px; font-size: 11.5px; }
.app-defender .def-fw-status.good { color: var(--d-green); }
.app-defender .def-fw-status.bad { color: var(--d-red); }
.app-defender .def-fw-status .def-glyph { width: 14px; height: 14px; }
.app-defender .def-media { display: flex; align-items: center; gap: 14px; }
.app-defender .def-media-ico { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: 8px; background: rgba(96, 205, 255, 0.1); color: var(--d-accent); }
.app-defender .def-media-ico .def-glyph { width: 22px; height: 22px; }
.app-defender .def-media-text b { display: block; margin-bottom: 2px; font-size: 12.5px; }
.app-defender .def-media-text span { display: block; font-size: 11.5px; line-height: 1.5; color: var(--d-muted); }
.app-defender .def-ok { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--d-green); }
.app-defender .def-ok .def-glyph { width: 14px; height: 14px; }
.app-defender .def-tag { padding: 3px 7px; border: 1px solid var(--d-line); border-radius: 4px; font-size: 10.5px; color: var(--d-muted); }
.app-defender .def-note { margin-top: 16px; padding: 10px 12px; border: 1px solid var(--d-line); border-radius: 6px; background: #252525; font-size: 11px; line-height: 1.5; color: var(--d-muted); }
`;
