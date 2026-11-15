// Presentation-only facts for the Software Bazaar shell. The catalogue itself
// lives in the world (content/software.js); this file only adds the publisher,
// colour and blurb a real bazaar card shows, plus the policy defaults
// and the OS deployments the client always lists.

export const APP_META = {
  sw_office: {
    publisher: "Microsoft Corporation",
    category: "Productivity",
    color: "#d83b01",
    initials: "O",
    description: "Word, Excel, PowerPoint and Lookout. The reason the fan spins up at 09:02.",
  },
  sw_slack: {
    publisher: "Slack Technologies, LLC",
    category: "Collaboration",
    color: "#611f69",
    initials: "S",
    description: "Channels, direct messages and the occasional passive-aggressive emoji.",
  },
  sw_chrome: {
    publisher: "Google LLC",
    category: "Web browser",
    color: "#1a73e8",
    initials: "C",
    description: "The approved browser. The forty-seven open tabs are your own time.",
  },
  sw_vscode: {
    publisher: "Microsoft Corporation",
    category: "Development",
    color: "#007acc",
    initials: "VS",
    description: "An editor for people who enjoy configuring an editor before working.",
  },
  sw_notepadpp: {
    publisher: "Notepad++ Team",
    category: "Utilities",
    color: "#5f8f3f",
    initials: "N+",
    description: "A text editor that has been on every corporate PC since roughly 2006.",
  },
  sw_7zip: {
    publisher: "Igor Pavlov",
    category: "Utilities",
    color: "#6f5bd6",
    initials: "7z",
    description: "Opens .zip and .7z files, and nothing at all the moment you actually need it.",
  },
  sw_teamviewer: {
    publisher: "TeamViewer Germany GmbH",
    category: "Remote access",
    color: "#0e8ee9",
    initials: "TV",
    description: "Remote control software. Not deployed to this device and not approved for self-service.",
  },
};

// The Options tab writes these into session.ui, not the store: they are a
// render-only preference until a policy action exists.
export const DEFAULT_OPTIONS = {
  autoInstall: true,
  outsideHours: true,
  notifyNew: true,
  workingStart: "08:00",
  workingEnd: "18:00",
  restart: "prompt",
};

export const HOURS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

// Software Bazaar's Operating Systems tab lists task sequences. The world has
// no OS deployment model, so this is fixed shell content with no actions.
export const OS_DEPLOYMENTS = [
  {
    id: "os_win11_24h2",
    name: "Doors 11 Enterprise 24H2",
    type: "Operating system upgrade",
    version: "10.0.26100.1742",
    sizeMb: 5120,
    status: "Available",
    description:
      "In-place upgrade for the standard Halcyon desktop image. Drivers, line-of-business apps and the helpdesk shortcut are carried over.",
  },
  {
    id: "os_driverpack",
    name: "Halcyon standard driver pack",
    type: "Driver package",
    version: "7.4.2",
    sizeMb: 186,
    status: "Required",
    description:
      "Chipset, network and storage drivers approved for this hardware model. Applied automatically during maintenance windows.",
  },
];

export const formatSize = (sizeMb) => {
  if (sizeMb >= 1024) {
    const gb = sizeMb / 1024;
    return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
  }
  return `${sizeMb} MB`;
};

export const updateClassName = (update) =>
  /cumulative/i.test(update.title) ? "Security Update" : "Critical Update";
