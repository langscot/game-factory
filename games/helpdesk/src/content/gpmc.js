// Authored content for the Group Policy Management Console. The console is a
// mock: the domain, OUs, GPOs and setting definitions below are static, while
// the links and setting values the technician changes live in
// ctx.world.session.ui("gpmc"). Nothing here reads a real directory.

export const DOMAIN = {
  id: "domain",
  name: "halcyon.co",
  forest: "halcyon.co",
  company: "Halcyon Dynamics",
  controller: "HALCYON-DC01",
};

// Kept in sync with the seeded departments by name only; GPMC does not write
// back to org.departments, so the ids are local to this console.
const DEPARTMENTS = [
  ["ou_eng", "Engineering"],
  ["ou_fin", "Finance"],
  ["ou_mkt", "Marketing"],
  ["ou_fac", "Facilities"],
  ["ou_sec", "Security"],
  ["ou_people", "People Ops"],
  ["ou_sales", "Sales"],
  ["ou_exec", "Executive"],
  ["ou_support", "Support"],
  ["ou_legal", "Legal"],
  ["ou_it", "IT"],
];

export const LINK_TARGETS = [
  { id: "domain", name: "halcyon.co", path: "halcyon.co", kind: "domain" },
  { id: "ou_dc", name: "Domain Controllers", path: "halcyon.co/Domain Controllers", kind: "ou" },
  ...DEPARTMENTS.map(([id, name]) => ({ id, name, path: `halcyon.co/Departments/${name}`, kind: "ou" })),
];

export const GPOS = [
  {
    id: "gpo_default",
    name: "Default Domain Policy",
    security: "Authenticated Users",
    status: "Enabled",
    owner: "Domain Admins",
    created: "12/11/2023 09:14",
    modified: "15/11/2026 08:02",
    revision: 12,
    description: "The domain-wide baseline. Account policy, screen locking and the settings every machine inherits.",
  },
  {
    id: "gpo_dc",
    name: "Default Domain Controllers Policy",
    security: "Authenticated Users",
    status: "Enabled",
    owner: "Domain Admins",
    created: "12/11/2023 09:16",
    modified: "04/11/2026 17:31",
    revision: 9,
    description: "Baseline for the domain controllers OU. Tighter screen lock than the staff baseline.",
  },
  {
    id: "gpo_usb",
    name: "Block removable storage",
    security: "Authenticated Users",
    status: "Enabled",
    owner: "Marge Delacroix",
    created: "22/02/2026 11:05",
    modified: "13/11/2026 15:48",
    revision: 3,
    description: "Denies all removable storage classes. Requested after the unlabelled USB sticks turned up in Finance.",
  },
  {
    id: "gpo_printers",
    name: "Printer lockdown",
    security: "Authenticated Users",
    status: "Enabled",
    owner: "Morgan Hayes",
    created: "07/03/2026 10:20",
    modified: "10/11/2026 12:09",
    revision: 4,
    description: "Restricts point-and-print driver installation and keeps the print spooler on the approved queue.",
  },
  {
    id: "gpo_finance",
    name: "Finance workstation baseline",
    security: "Finance Team",
    status: "Enabled",
    owner: "Dana Okafor",
    created: "18/04/2026 14:42",
    modified: "14/11/2026 16:22",
    revision: 6,
    description: "Finance-only hardening. Shorter screen lock and the mapped drives the audit team expects.",
  },
  {
    id: "gpo_drives",
    name: "Mapped drives",
    security: "Authenticated Users",
    status: "Enabled",
    owner: "Morgan Hayes",
    created: "29/05/2026 09:03",
    modified: "02/11/2026 09:55",
    revision: 2,
    description: "Logon drive mappings for the shared software and project shares.",
  },
  {
    id: "gpo_legacy",
    name: "Legacy logon scripts",
    security: "Domain Computers",
    status: "All settings disabled",
    owner: "Domain Admins",
    created: "12/11/2023 09:30",
    modified: "19/09/2025 11:12",
    revision: 1,
    description: "Old logon scripts. Disabled since the migration, kept so nobody has to explain why it vanished.",
  },
];

export const SETTINGS = [
  {
    id: "screen_lock",
    scope: "user",
    path: ["Policies", "Administrative Templates", "Control Panel", "Personalization"],
    name: "Screen lock timeout",
    kind: "number",
    unit: "seconds",
    min: 0,
    max: 86400,
    step: 30,
    description:
      "Screen saver timeout. Locks the workstation after this many seconds of inactivity and requires the user to sign back in.",
  },
  {
    id: "password_length",
    scope: "computer",
    path: ["Policies", "Windows Settings", "Security Settings", "Account Policies", "Password Policy"],
    name: "Minimum password length",
    kind: "number",
    unit: "characters",
    min: 0,
    max: 14,
    step: 1,
    description: "The least number of characters a domain account password may contain.",
  },
  {
    id: "usb_deny",
    scope: "computer",
    path: ["Policies", "Administrative Templates", "System", "Removable Storage Access"],
    name: "All Removable Storage classes: Deny all access",
    kind: "boolean",
    description:
      "Denies read, write and execute access to every removable storage class on the machine, including USB drives.",
  },
  {
    id: "drive_map",
    scope: "user",
    path: ["Policies", "Administrative Templates", "Windows Components", "File Explorer"],
    name: "Map network drives at logon",
    kind: "text",
    placeholder: "H: \\\\halcyon\\finance",
    description: "Drive mappings applied when the user signs in. Use drive letter, colon and UNC path.",
  },
  {
    id: "printer_restrictions",
    scope: "computer",
    path: ["Policies", "Administrative Templates", "Printers"],
    name: "Point and Print Restrictions",
    kind: "boolean",
    description: "Only allow point-and-print to approved print servers and warn when a driver is installed.",
  },
];

export const SETTING_BY_ID = Object.fromEntries(SETTINGS.map((setting) => [setting.id, setting]));

// A GPO starts with these settings. Values use the same { state, value } shape
// the editor writes back into session.ui("gpmc").
export const INITIAL_SETTINGS = {
  gpo_default: {
    screen_lock: { state: "enabled", value: 900 },
    password_length: { state: "enabled", value: 12 },
  },
  gpo_dc: {
    screen_lock: { state: "enabled", value: 600 },
    password_length: { state: "enabled", value: 14 },
  },
  gpo_usb: {
    usb_deny: { state: "enabled", value: true },
  },
  gpo_printers: {
    printer_restrictions: { state: "enabled", value: true },
  },
  gpo_finance: {
    screen_lock: { state: "enabled", value: 600 },
    drive_map: { state: "enabled", value: "H: \\\\halcyon\\finance" },
  },
  gpo_drives: {
    drive_map: { state: "enabled", value: "S: \\\\halcyon\\software" },
  },
  gpo_legacy: {},
};

export const INITIAL_LINKS = {
  gpo_default: [{ targetId: "domain", order: 1, enforced: false }],
  gpo_dc: [{ targetId: "ou_dc", order: 1, enforced: false }],
  gpo_usb: [],
  gpo_printers: [{ targetId: "domain", order: 2, enforced: false }],
  gpo_finance: [{ targetId: "ou_fin", order: 1, enforced: false }],
  gpo_drives: [{ targetId: "ou_eng", order: 1, enforced: false }],
  gpo_legacy: [],
};

export const DELEGATION = [
  { name: "Authenticated Users", allowed: "Read", inherited: "Yes" },
  { name: "Domain Admins", allowed: "Edit settings, delete, modify security", inherited: "No" },
  { name: "Enterprise Admins", allowed: "Edit settings, delete, modify security", inherited: "Yes" },
  { name: "SYSTEM", allowed: "Edit settings, delete, modify security", inherited: "No" },
];

export const STARTER_GPOS = [
  { name: "Workstation baseline", comment: "Screen lock, updates and approved software.", version: "2.4" },
  { name: "Kiosk lockdown", comment: "Assigned access, no shell, no removable storage.", version: "1.1" },
];

export const SITES = [
  { name: "Halcyon HQ", location: "Bristol", links: 0, description: "The only site with a domain controller." },
  { name: "Warehouse", location: "Avonmouth", links: 0, description: "No site link configured. Traffic uses HQ." },
];
