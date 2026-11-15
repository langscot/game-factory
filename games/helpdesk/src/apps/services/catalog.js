// The columns services.msc shows that the world store does not carry yet:
// description, logon account, binary path and the dependency graph. Status and
// startup type stay on the service rows in the world; this table is display
// metadata only, so the app never needs a second source of truth for state.
//
// Keyed by the short service name, which is exactly what the Name column shows
// (Spooler, BIT, Patchy Update, Workstation, TermService).

const FALLBACK = {
  description: "Doors service hosted by the local service host.",
  logonAs: "Local System",
  imagePath: "C:\\Windows\\System32\\svchost.exe -k netsvcs -p",
  dependsOn: [],
};

export const SERVICE_META = {
  Spooler: {
    description: "Loads files to memory for later printing",
    logonAs: "Local System",
    imagePath: "C:\\Windows\\System32\\spoolsv.exe",
    dependsOn: ["Workstation"],
  },
  BIT: {
    description: "Transfers files in the background using idle network bandwidth",
    logonAs: "Local System",
    imagePath: "C:\\Windows\\System32\\svchost.exe -k netsvcs -p",
    dependsOn: ["Workstation"],
  },
  "Patchy Update": {
    description: "Enables the detection, download and installation of updates for Doors and other programs, usually at the worst moment",
    logonAs: "Local System",
    imagePath: "C:\\Windows\\System32\\svchost.exe -k netsvcs -p",
    dependsOn: ["BIT", "Workstation"],
  },
  Workstation: {
    description: "Creates and maintains client network connections to remote servers",
    logonAs: "NT AUTHORITY\\LocalService",
    imagePath: "C:\\Windows\\System32\\svchost.exe -k NetworkService -p",
    dependsOn: [],
  },
  TermService: {
    description: "Allows users to connect interactively to a remote computer",
    logonAs: "NT AUTHORITY\\NetworkService",
    imagePath: "C:\\Windows\\System32\\svchost.exe -k NetworkService",
    dependsOn: ["Workstation"],
  },
};

export function metaFor(service) {
  const known = SERVICE_META[service?.name];
  return known ? { ...FALLBACK, ...known } : { ...FALLBACK, description: service?.displayName || FALLBACK.description };
}

export function startupTypeLabel(startType) {
  return { automatic: "Automatic", manual: "Manual", disabled: "Disabled" }[startType] || "Manual";
}

export function statusLabel(status) {
  return { running: "Running", stopped: "Stopped", paused: "Paused" }[status] || "Stopped";
}

/** Services in `list` that name `service` in their dependsOn table. */
export function dependentsOf(list, service) {
  return list.filter((other) => metaFor(other).dependsOn.includes(service.name));
}
