// The mock registry behind Registry Editor. It is authored content: the app
// copies this into session.ui("regedit") on first open, and every later edit
// lives there. Nothing here reads the machine Windows is actually running on.
//
// Paths use the long hive names because that is what regedit shows and what a
// .reg file contains. Values are [name, type, data]; DWORD data is decimal text
// so the dialog can convert it to hex without losing information.

const K = (...parts) => parts.join("\\");

export const HIVES = [
  "HKEY_CLASSES_ROOT",
  "HKEY_CURRENT_USER",
  "HKEY_LOCAL_MACHINE",
  "HKEY_USERS",
  "HKEY_CURRENT_CONFIG",
];

export const EXPORT_FOLDER = "C:/Users/m.hayes/Desktop";

export const FAVORITES = [
  {
    label: "Halcyon policies",
    path: K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Policies", "Halcyon"),
  },
  {
    label: "Startup programs",
    path: K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Microsoft", "Windows", "CurrentVersion", "Run"),
  },
  {
    label: "Text file association",
    path: K("HKEY_CLASSES_ROOT", ".txt"),
  },
];

const ENTRIES = [
  ["HKEY_CLASSES_ROOT", []],
  [
    K("HKEY_CLASSES_ROOT", ".txt"),
    [
      ["(Default)", "REG_SZ", "txtfile"],
      ["Content Type", "REG_SZ", "text/plain"],
      ["PerceivedType", "REG_SZ", "text"],
    ],
  ],
  [
    K("HKEY_CLASSES_ROOT", ".pdf"),
    [
      ["(Default)", "REG_SZ", "AcroExch.Document.DC"],
      ["Content Type", "REG_SZ", "application/pdf"],
    ],
  ],
  [K("HKEY_CLASSES_ROOT", ".docx"), [["(Default)", "REG_SZ", "Word.Document.12"]]],
  [K("HKEY_CLASSES_ROOT", ".reg"), [["(Default)", "REG_SZ", "regfile"]]],
  [K("HKEY_CLASSES_ROOT", "txtfile"), [["(Default)", "REG_SZ", "Text Document"]]],
  [
    K("HKEY_CLASSES_ROOT", "txtfile", "shell", "open", "command"),
    [["(Default)", "REG_EXPAND_SZ", "%SystemRoot%\\system32\\NOTEPAD.EXE %1"]],
  ],
  [
    K("HKEY_CLASSES_ROOT", "regfile", "shell", "open", "command"),
    [["(Default)", "REG_SZ", "regedit.exe \"%1\""]],
  ],

  ["HKEY_CURRENT_USER", []],
  [
    K("HKEY_CURRENT_USER", "Software", "Halcyon", "Preferences"),
    [
      ["DisplayName", "REG_SZ", "Morgan Hayes"],
      ["DefaultBrowser", "REG_SZ", "Google Chrome"],
      ["StartupSound", "REG_DWORD", "1"],
    ],
  ],
  [
    K("HKEY_CURRENT_USER", "Software", "Microsoft", "Windows", "CurrentVersion", "Run"),
    [
      [
        "Teams",
        "REG_SZ",
        "\"C:\\Users\\m.hayes\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe\" --process-start-args \"--system-initiated\"",
      ],
      ["OneDrive", "REG_SZ", "\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background"],
      ["HalcyonAgent", "REG_SZ", "\"C:\\Program Files\\Halcyon\\Agent\\hagent.exe\" /session"],
    ],
  ],
  [
    K("HKEY_CURRENT_USER", "Software", "Policies", "Halcyon", "User"),
    [
      ["AllowPersonalDevices", "REG_DWORD", "0"],
      ["ProxyServer", "REG_SZ", "proxy.halcyon.co:8080"],
      ["ProxyBypass", "REG_SZ", "*.halcyon.co;10.*"],
    ],
  ],
  [
    K("HKEY_CURRENT_USER", "Control Panel", "Desktop"),
    [
      ["Wallpaper", "REG_SZ", "C:\\Windows\\Web\\Wallpaper\\Halcyon\\brand-1920.jpg"],
      ["ScreenSaveTimeOut", "REG_SZ", "900"],
    ],
  ],

  ["HKEY_LOCAL_MACHINE", []],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Halcyon", "Client"),
    [
      ["Version", "REG_SZ", "4.8.2"],
      ["UpdateChannel", "REG_SZ", "stable"],
      ["SupportUrl", "REG_SZ", "https://support.halcyon.co"],
      ["TelemetryEnabled", "REG_DWORD", "1"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Policies", "Halcyon"),
    [
      ["PolicyOwner", "REG_SZ", "IT Operations"],
      ["EnforcedBy", "REG_SZ", "HALCYON\\Domain Admins"],
      ["LastReviewed", "REG_SZ", "2026-11-01"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Policies", "Halcyon", "Endpoint"),
    [
      ["BlockUsbStorage", "REG_DWORD", "1"],
      ["TamperProtection", "REG_DWORD", "1"],
      ["AllowedPeripherals", "REG_SZ", "Keyboard;Mouse;YubiKey"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Policies", "Halcyon", "Printing"),
    [
      ["AllowPrintSpoolerRemoteCalls", "REG_DWORD", "0"],
      ["PointAndPrintRestrictions", "REG_DWORD", "1"],
      ["ApprovedPrintServers", "REG_SZ", "print01.halcyon.co;print02.halcyon.co"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Microsoft", "Windows", "CurrentVersion", "Run"),
    [
      ["HalcyonAgent", "REG_SZ", "\"C:\\Program Files\\Halcyon\\Agent\\hagent.exe\" /background"],
      ["SecurityHealth", "REG_EXPAND_SZ", "%windir%\\system32\\SecurityHealthSystray.exe"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SOFTWARE", "Microsoft", "Windows NT", "CurrentVersion"),
    [
      ["ProductName", "REG_SZ", "Windows 11 Pro"],
      ["CurrentBuild", "REG_SZ", "22621"],
      ["RegisteredOwner", "REG_SZ", "Halcyon Dynamics"],
      ["RegisteredOrganization", "REG_SZ", "Halcyon Dynamics Ltd"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SYSTEM", "CurrentControlSet", "Services", "Spooler"),
    [
      ["DisplayName", "REG_SZ", "Print Spooler"],
      ["ImagePath", "REG_EXPAND_SZ", "%SystemRoot%\\System32\\spoolsv.exe"],
      ["ObjectName", "REG_SZ", "LocalSystem"],
      ["Start", "REG_DWORD", "2"],
    ],
  ],
  [
    K("HKEY_LOCAL_MACHINE", "SYSTEM", "CurrentControlSet", "Services", "TermService"),
    [
      ["DisplayName", "REG_SZ", "Remote Desktop Services"],
      ["Start", "REG_DWORD", "2"],
    ],
  ],

  ["HKEY_USERS", []],
  [
    K("HKEY_USERS", ".DEFAULT", "Control Panel", "Colors"),
    [["Background", "REG_SZ", "0 0 0"]],
  ],
  [
    K("HKEY_USERS", "S-1-5-21-3091872314-2271640168-2418921740-1105", "Software", "Policies", "Halcyon"),
    [
      ["AllowPersonalDevices", "REG_DWORD", "0"],
      ["HomeDrive", "REG_SZ", "H:"],
      ["RoamingProfile", "REG_DWORD", "1"],
    ],
  ],
  [
    K("HKEY_USERS", "S-1-5-21-3091872314-2271640168-2418921740-1105", "Environment"),
    [
      ["TEMP", "REG_EXPAND_SZ", "%USERPROFILE%\\AppData\\Local\\Temp"],
      ["Path", "REG_EXPAND_SZ", "%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps"],
    ],
  ],

  ["HKEY_CURRENT_CONFIG", []],
  [
    K("HKEY_CURRENT_CONFIG", "System", "CurrentControlSet", "Control", "Print", "Printers"),
    [
      ["DefaultPrinter", "REG_SZ", "HP LaserJet M404dn"],
      ["PrintProcessor", "REG_SZ", "winprint"],
    ],
  ],
  [
    K("HKEY_CURRENT_CONFIG", "Software", "Fonts"),
    [["LogPixels", "REG_DWORD", "96"]],
  ],
];

/**
 * A fresh copy of the seeded registry. Implicit parent keys are created here so
 * the tree can never be handed a key whose parent is missing.
 */
export function createRegistrySeed() {
  const keys = [];
  const byPath = new Map();
  const ensure = (path) => {
    const parts = path.split("\\");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}\\${part}` : part;
      const lower = current.toLowerCase();
      if (!byPath.has(lower)) {
        const record = { path: current, values: [] };
        byPath.set(lower, record);
        keys.push(record);
      }
    }
    return byPath.get(path.toLowerCase());
  };

  for (const [path, values] of ENTRIES) {
    const record = ensure(path);
    record.values = values.map(([name, type, data]) => ({ name, type, data }));
  }
  return keys;
}
