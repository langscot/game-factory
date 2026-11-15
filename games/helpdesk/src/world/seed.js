// The seeded world. One plain, serialisable object tree: people, org,
// machines, mail, tickets, files, directory services, events and session.
//
// Content (names, ticket prose, handbook rules) is authored here once; every
// app reads it through selectors. IDs are stable: a person keeps `p_dev`
// whether they are renamed, locked or disabled.

import { MAIL_DOMAIN, AGENCY_DOMAIN } from "../content/company.js";
import { POLICIES } from "../content/policies.js";
import { SOFTWARE } from "../content/software.js";

// ---------------------------------------------------------------------------
// Org
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  ["d_eng", "Engineering"],
  ["d_fin", "Finance"],
  ["d_mkt", "Marketing"],
  ["d_fac", "Facilities"],
  ["d_sec", "Security"],
  ["d_people", "People Ops"],
  ["d_sales", "Sales"],
  ["d_exec", "Executive"],
  ["d_support", "Support"],
  ["d_legal", "Legal"],
  ["d_it", "IT"],
];

const GROUPS = [
  ["g_all", "Domain Users", "Every enabled account in the domain."],
  ["g_finance", "Finance Team", "Finance department. Read/write on the Finance share."],
  ["g_executive", "Executive Team", "Executive department. Read on the Finance share."],
  ["g_engineering", "Engineering Team", "Engineering department. Read/write on the Engineering share."],
  ["g_marketing", "Marketing Team", "Marketing department."],
  ["g_it_admins", "IT Admins", "IT staff. Full control on the IT share."],
];

// [id, display name, logon, department, employment type, manager, remote, title, account state]
const PEOPLE = [
  ["p_hayes", "Morgan Hayes", "m.hayes", "d_it", "full-time", "p_marge", false, "IT Support Technician"],
  ["p_marge", "Marge Delacroix", "m.delacroix", "d_it", "full-time", null, false, "IT Operations Lead"],
  ["p_priya", "Priya Raman", "p.raman", "d_eng", "full-time", "p_marge", true, "Staff Engineer"],
  ["p_grace", "Grace Lin", "g.lin", "d_eng", "full-time", "p_marge", false, "Engineering Manager"],
  ["p_marcus", "Marcus Webb", "m.webb", "d_eng", "contractor", "p_grace", false, "Contract Developer"],
  ["p_dana", "Dana Okafor", "d.okafor", "d_fin", "full-time", "p_lena", true, "Finance Controller"],
  ["p_tom", "Tom Halvorsen", "t.halvorsen", "d_fin", "full-time", "p_dana", false, "Accounts Assistant"],
  ["p_hana", "Hana Suzuki", "h.suzuki", "d_fin", "contractor", "p_dana", false, "Audit Contractor"],
  ["p_alice", "Alice Nkemelu", "a.nkemelu", "d_mkt", "full-time", "p_lena", true, "Brand Lead"],
  ["p_ben", "Ben Sorensen", "b.sorensen", "d_mkt", "intern", "p_alice", false, "Marketing Intern"],
  ["p_sofia", "Sofia Ricci", "s.ricci", "d_fac", "full-time", "p_lena", false, "Facilities Coordinator"],
  ["p_kenji", "Kenji Watanabe", "k.watanabe", "d_sec", "full-time", "p_lena", false, "Security Analyst"],
  ["p_ruth", "Ruth Adeyemi", "r.adeyemi", "d_people", "full-time", "p_lena", true, "People Ops Partner"],
  ["p_omar", "Omar Haddad", "o.haddad", "d_sales", "contractor", "p_lena", true, "Account Executive"],
  ["p_lena", "Lena Fischer", "l.fischer", "d_exec", "full-time", null, true, "Chief Operating Officer"],
  ["p_dev", "Dev Patel", "d.patel", "d_support", "intern", "p_ruth", false, "Support Intern"],
  ["p_victor", "Victor Cruz", "v.cruz", "d_legal", "full-time", "p_lena", false, "Legal Counsel"],
];

const AGENCY_EMAILS = new Set(["p_marcus", "p_hana", "p_omar"]);

const DEPARTMENT_GROUP = {
  d_eng: "g_engineering",
  d_fin: "g_finance",
  d_exec: "g_executive",
  d_mkt: "g_marketing",
  d_it: "g_it_admins",
};

const emailFor = (logon, personId) => `${logon}@${AGENCY_EMAILS.has(personId) ? AGENCY_DOMAIN : MAIL_DOMAIN}`;

// [person id, hostname, hardware tier, software ids, rdp enabled, devices note]
const MACHINES = [
  ["p_hayes", "DESKTOP-8H2K9L", 2, ["sw_office", "sw_chrome", "sw_notepadpp"], false],
  ["p_marge", "DESKTOP-MD77Q1", 3, ["sw_office", "sw_chrome", "sw_slack"], false],
  ["p_priya", "LT-PR24", 2, ["sw_office", "sw_chrome", "sw_vscode", "sw_slack"], true],
  ["p_grace", "LT-GL11", 3, ["sw_office", "sw_chrome", "sw_vscode"], true],
  ["p_marcus", "DESKTOP-NG04", 1, ["sw_chrome", "sw_vscode"], false],
  ["p_dana", "LT-DO90", 2, ["sw_office", "sw_chrome"], true],
  ["p_tom", "DESKTOP-TH02", 1, ["sw_office", "sw_chrome"], false],
  ["p_hana", "DESKTOP-HS18", 1, ["sw_office", "sw_chrome"], false],
  ["p_alice", "LT-AN31", 2, ["sw_office", "sw_chrome", "sw_slack"], true],
  ["p_ben", "DESKTOP-BS07", 1, ["sw_office"], false],
  ["p_sofia", "DESKTOP-SR12", 1, ["sw_office", "sw_chrome"], false],
  ["p_kenji", "LT-KW55", 3, ["sw_office", "sw_chrome", "sw_slack"], false],
  ["p_ruth", "LT-RA08", 2, ["sw_office", "sw_chrome"], true],
  ["p_omar", "LT-OH21", 1, ["sw_chrome"], true],
  ["p_lena", "LT-LF01", 3, ["sw_office", "sw_chrome", "sw_slack"], true],
  ["p_dev", "DESKTOP-DP03", 1, ["sw_office"], false],
  ["p_victor", "DESKTOP-VC19", 2, ["sw_office", "sw_chrome"], false],
];

const SERVICE_CATALOGUE = [
  ["spooler", "Spooler", "Print Spooler", "automatic"],
  ["bits", "BIT", "Background Intelligent Transfer Service", "manual"],
  ["wuauserv", "Patchy Update", "Patchy Update", "manual"],
  ["lanmanworkstation", "Workstation", "Workstation", "automatic"],
  ["rdp", "TermService", "Remote Deskhop Services", "automatic"],
];

const DEVICE_CATALOGUE = [
  ["net_0", "Intel Ethernet Connection I219-LM", "network", "e1d_lm"],
  ["wifi_0", "Intel Wi-Fi 6 AX201", "network", "ax201"],
  ["display_0", "Intel UHD Graphics 630", "display", "uhd630"],
  ["audio_0", "Realtek High Definition Audio", "audio", "realtek_hda"],
  ["usb_0", "USB Composite Device", "usb", "usbcc"],
];

const DRIVERS = [
  ["e1d_lm", "Intel Ethernet I219-LM", "12.19.2.5", "Intel", true],
  ["ax201", "Intel Wi-Fi 6 AX201", "22.230.0.3", "Intel", true],
  ["uhd630", "Intel UHD Graphics 630", "31.0.101.2130", "Intel", true],
  ["realtek_hda", "Realtek Audio", "6.0.9231.1", "Realtek", true],
  ["usbcc", "USB Composite Device", "10.0.22621.1", "Nadir", true],
];

// [share id, label, unc path, acl entries]
const SHARES = [
  [
    "share_finance",
    "Finance",
    "\\\\HALCYON\\Finance",
    [
      ["g_finance", "modify"],
      ["g_executive", "read"],
    ],
  ],
  [
    "share_eng",
    "Engineering",
    "\\\\HALCYON\\Engineering",
    [
      ["g_engineering", "modify"],
      ["g_it_admins", "modify"],
    ],
  ],
  ["share_it", "IT", "\\\\HALCYON\\IT", [["g_it_admins", "modify"]]],
];

// ---------------------------------------------------------------------------
// Ticket prose. [id, day, person, subject, body, answer, rule, why, sender override]
// ---------------------------------------------------------------------------

const TICKETS = [
  [
    1001,
    1,
    "p_priya",
    "Locked out after the weekend",
    "Hi — forgot my password over the weekend like an idiot. Can you reset it? I can't get into anything.",
    1,
    "Password resets are approved for any employee. It is their own account, so it is fine.",
    [["password.reset"]],
  ],
  [
    1002,
    1,
    "p_ben",
    "Laptop for the brand refresh",
    "Starting on the brand refresh this week. Manager approved it — code MG-4471. Can I get a laptop?",
    2,
    "Ben is an intern. Interns get a desktop, never a laptop — the approval code does not change that.",
    [["ticket.reply", { template: "deny" }]],
  ],
  [
    1003,
    1,
    "p_grace",
    "New laptop",
    "My old machine is dying. Manager approval code MG-1180 is on the request. Please and thank you.",
    2,
    "Full-time employee, with a manager approval code. That is exactly what Policy 2 asks for.",
    [["ticket.reply", { template: "approve" }]],
  ],
  [
    1004,
    1,
    "p_dev",
    "Can I get Chrome?",
    "The default browser keeps opening the wrong pages. Could someone install Chrome on my machine?",
    3,
    "Chrome is on the approved software list.",
    [["software.install", { appId: "sw_chrome" }]],
  ],
  [
    1005,
    1,
    "p_alice",
    "Finance drive access",
    "I need read access to the Finance share for the Q3 campaign budget review. Should only take a minute to set up.",
    4,
    "Alice is in Marketing. The Finance share is Finance and Executive only.",
    [["ticket.reply", { template: "deny" }]],
    undefined,
    { shareIds: ["share_finance"] },
  ],
  [
    1006,
    1,
    "p_dana",
    "Finance drive access",
    "New starter on my team needs the Finance share. Actually while you're in there, add me too — I lost it in the migration.",
    4,
    "Dana is in Finance. Finance may have the Finance share.",
    [["group.add", { groupId: "g_finance" }]],
  ],
  [
    1007,
    1,
    "p_omar",
    "Badge not working",
    "My badge stopped working at the east door this morning. I've been standing here for twenty minutes. Help?",
    5,
    "Badges belong to Facilities. IT does not touch door hardware.",
    [["escalate", { teamId: "facilities" }]],
  ],
  [
    1008,
    1,
    "p_kenji",
    "Install TeamViewer",
    "I need TeamViewer on my workstation to help a vendor troubleshoot. Can you push it out?",
    3,
    "TeamViewer is not on the approved list. Unlisted software goes to Security for review.",
    [["escalate", { teamId: "security" }]],
    undefined,
    { softwareIds: ["sw_teamviewer"] },
  ],
  [
    2001,
    2,
    "p_tom",
    "Password reset",
    "Locked out. Again. Sorry. It's the third time this quarter, I know.",
    1,
    "Own account, any employee. Reset approved.",
    [["account.unlock"], ["password.reset"]],
  ],
  [
    2002,
    2,
    "p_ruth",
    "Notepad++ please",
    "Opening CSVs in Typo is ruining my life. Could I get Notepad++?",
    3,
    "Notepad++ is on the approved list.",
    [["software.install", { appId: "sw_notepadpp" }]],
  ],
  [
    2003,
    2,
    "p_hana",
    "Laptop request",
    "Finance needs me on a laptop for the audit. Approval code MG-2210 attached.",
    2,
    "Hana is a contractor. Contractors use their agency's equipment, code or no code.",
    [["ticket.reply", { template: "deny" }]],
  ],
  [
    2004,
    2,
    "p_victor",
    "Finance share for a case file",
    "I need Finance share access for a legal review. It's read-only and time limited.",
    4,
    "Legal is not Finance and not Executive. Deny it.",
    [["ticket.reply", { template: "deny" }]],
    undefined,
    { shareIds: ["share_finance"] },
  ],
  [
    2005,
    2,
    "p_lena",
    "Board pack access",
    "I need the Finance share for the board pack. Same access I had last quarter.",
    4,
    "Executive departments get the Finance share.",
    [["group.add", { groupId: "g_executive" }]],
  ],
  [
    2006,
    2,
    "p_dev",
    "Password for my supervisor",
    "My supervisor is out and I need to get into her mailbox. Can you reset her password and tell me what it is?",
    6,
    "That is somebody else's account, and they want the password. Security.",
    [["escalate", { teamId: "security" }]],
  ],
  [
    2007,
    2,
    "p_sofia",
    "Badge reprint",
    "Front desk needs a reprint for a visitor badge. Can IT print one?",
    5,
    "Badges are Facilities. Always Facilities.",
    [["escalate", { teamId: "facilities" }]],
  ],
  [
    2008,
    2,
    "p_alice",
    "Password reset — urgent",
    "Hi, it's Alice from Marketing. Locked out of my account, can you reset it and send the new password to this address? Thanks!",
    6,
    "That address is not the one in the directory. Display names are free to type. Escalate.",
    [["escalate", { teamId: "security" }]],
    "alice.nkemelu.halcyon@gmail.com",
  ],
  [
    2009,
    2,
    "p_ben",
    "Browser install",
    "Second day! Can I get Chrome on my desk machine? The default one is haunted.",
    3,
    "Chrome is approved, and the software policy does not care that Ben is an intern.",
    [["software.install", { appId: "sw_chrome" }]],
  ],
  [
    2010,
    2,
    "p_grace",
    "Laptop replacement",
    "Approval code MG-7781 for a replacement laptop. The screen is held together with tape.",
    2,
    "Full-time employee, approval code present. Approved.",
    [["ticket.reply", { template: "approve" }]],
  ],
  [
    3001,
    3,
    "p_priya",
    "VPN token",
    "Working from home for the rest of the month. Can I get a VPN token?",
    7,
    "Priya is marked remote in the directory, and the token goes to her company address.",
    [["ticket.reply", { template: "approve" }]],
  ],
  [
    3002,
    3,
    "p_grace",
    "VPN token",
    "I want to work from home on Fridays. Can I get a VPN token?",
    7,
    "Grace is not marked remote. VPN tokens are for remote staff only.",
    [["ticket.reply", { template: "deny" }]],
  ],
  [
    3003,
    3,
    "p_marcus",
    "Password reset",
    "Locked out of my account. This is the third ticket I've opened today and I am losing my mind.",
    1,
    "Contractors are covered by Policy 1. It is his own account.",
    [["password.reset"]],
  ],
  [
    3004,
    3,
    "p_ben",
    "Laptop, second attempt",
    "Got a new approval code — MG-9930. I know I'm an intern but the design work is very laptop-shaped.",
    2,
    "Still an intern. Interns get a desktop. The code is irrelevant.",
    [["ticket.reply", { template: "deny" }]],
  ],
  [
    3005,
    3,
    "p_ruth",
    "7-Zip",
    "Archive tool, please. The onboarding packs are enormous.",
    3,
    "7-Zip is on the approved list.",
    [["software.install", { appId: "sw_7zip" }]],
  ],
  [
    3006,
    3,
    "p_ben",
    "Finance share",
    "Marketing needs a look at the Finance share for the brand budget. Read-only is fine.",
    4,
    "Marketing. Finance share. Denied.",
    [["ticket.reply", { template: "deny" }]],
    undefined,
    { shareIds: ["share_finance"] },
  ],
  [
    3007,
    3,
    "p_sofia",
    "Server room access",
    "Can IT add me to the server room door? I need to reset a router for Facilities.",
    5,
    "Door access is Facilities, even when Facilities is the one asking.",
    [["escalate", { teamId: "facilities" }]],
  ],
  [
    3008,
    3,
    "p_alice",
    "VPN token to personal email",
    "Can you send my VPN token to alice.a.nkemelu@gmail.com? I'm travelling and can't get into the work mailbox.",
    7,
    "Tokens only go to the company address. A different destination gets escalated.",
    [["escalate", { teamId: "security" }]],
  ],
  [
    3009,
    3,
    "p_omar",
    "URGENT — client gift cards",
    "Client wants five £100 gift cards for their team, today. I have the company card. Can you buy them and send the codes?",
    6,
    "Gift cards by email. Policy 6 exists for this exact sentence.",
    [["escalate", { teamId: "security" }]],
  ],
  [
    3010,
    3,
    "p_kenji",
    "Turn off firewall for a demo",
    "Vendor demo this afternoon needs the firewall off on my machine for an hour. Can you disable it?",
    6,
    "Any request to disable antivirus, firewall or endpoint protection is escalated.",
    [["escalate", { teamId: "security" }]],
  ],
  [
    3011,
    3,
    "p_hana",
    "Password reset",
    "Reset please. I changed it on Friday and immediately forgot it.",
    1,
    "Her own account, and Policy 1 covers contractors too.",
    [["password.reset"]],
  ],
  [
    3012,
    3,
    "p_lena",
    "Finance share, new laptop",
    "Two things: Finance share access for the audit pack, and a laptop — approval code MG-3312.",
    4,
    "Executive gets the Finance share, and she is full-time with an approval code. Both allowed.",
    [["group.add", { groupId: "g_executive" }], ["ticket.reply", { template: "approve" }]],
  ],
];

const DAYS = [
  {
    n: 1,
    seconds: 200,
    memo: {
      from: "Marge Delacroix",
      role: "IT Operations Lead",
      subject: "Welcome to the desk",
      lines: [
        "Morning. Terminal 04 is yours now. The queue is already full, so read this once and get on with it.",
        "Everything you need is in the Policy Handbook on the desktop. If a ticket is not covered by a rule, escalate it — do not improvise.",
        "The shift ends when the queue is empty or the clock runs out, whichever comes first. The clock is in the taskbar.",
        "Your trust score is in the corner. Keep it above zero and we will get along fine.",
      ],
    },
  },
  {
    n: 2,
    seconds: 190,
    memo: {
      from: "Marge Delacroix",
      role: "IT Operations Lead",
      subject: "Read Policy 6 before you start",
      lines: [
        "We had three phishing tickets yesterday. Somebody in Sales clicked a link and now we all get to attend a webinar about it.",
        "Policy 6 is new in the handbook this morning: odd requests, outside addresses, anything about somebody else's account. Read it before you touch the queue.",
        "You did fine yesterday. The queue does not care.",
        "One more thing — check the sender address on everything. The display name is free to type.",
      ],
    },
  },
  {
    n: 3,
    seconds: 210,
    memo: {
      from: "Marge Delacroix",
      role: "IT Operations Lead",
      subject: "VPN tokens, and people pretending to be you",
      lines: [
        "Policy 7 is in the handbook: VPN tokens for remote staff only, and only to the company address.",
        "We have had two impersonation attempts this week. Check the sender address. Then check it again.",
        "Last shift before your review. Finish the queue and we will talk about whether you keep the chair.",
      ],
    },
  },
];

const FLAVOUR_MAIL = [
  {
    from: "All Staff",
    fromAddress: "all-staff@halcyon.co",
    subject: "Reminder: the lift is being serviced Thursday",
    lines: [
      "Please use the stairs on Thursday between 09:00 and 15:00.",
      "The fourth floor coffee machine has been moved to the third floor for the duration. We apologise for the inconvenience.",
    ],
  },
  {
    from: "People Ops",
    fromAddress: "people-ops@halcyon.co",
    subject: "Mandatory security training (again)",
    lines: [
      "Everyone must complete the 20-minute security awareness module by Friday.",
      "Attendance is tracked. Do not reply to this email asking whether you have to do it. You have to do it.",
    ],
  },
  {
    from: "Facilities",
    fromAddress: "facilities@halcyon.co",
    subject: "Desk moves — floor 3",
    lines: ["Floor 3 is being reconfigured this weekend. Clear your desk or lose it.", "No, we will not store anything. Yes, we are serious."],
  },
];

const NOTES = {
  "notes.txt": `DESK NOTES — terminal 04
------------------------------

1. A ticket arrives. Read it. All of it.
2. Look the person up in the Staff Directory: department, employment
   type, and whether they are remote.
3. Find the rule in the Policy Handbook. It is always there.
4. Approve, deny, or escalate. Never improvise.

House rules, condensed:
  - Password resets: anyone. Their own account only. Never by email.
  - Laptops: full-time staff with an MG-#### code. No interns.
    No contractors (their agency supplies the hardware).
  - Software: Office, Slack, Chrome, VS Code, Notepad++, 7-Zip.
    Anything else goes to Security, not to you.
  - Finance share: Finance and Executive only.
  - Badges, doors, locks: Facilities. Always Facilities.
  - Odd request, wrong sender, someone else's account: escalate.

A wrong call costs 12 trust. Zero trust and Security walks you out.
The queue does not care how you feel about it.

— Marge`,

  "handover.txt": `From: night shift
To: whoever is on at 08:00

Printer on 3 is fine, leave it alone.
The kettle trips the socket on the left, use the right one.
Ticket 0995 is a duplicate, do not reply to it, it replies back.

The ticket system keeps reopening ticket 0770 every morning at 09:00
with no content. Nobody knows why. Do not escalate it, Security has
enough on its plate.

Coffee is in the drawer. Do not take the good mug.`,

  "vpn-tokens.txt": `VPN TOKENS — do not email, do not print, do not photograph
------------------------------------------------------------------

priya.raman        8841 2210  -- remote
dana.okafor        8841 2214  -- remote
alice.nkemelu      8841 2226  -- remote
ruth.adeyemi       8841 2233  -- remote
lena.fischer       8841 2240  -- remote

spare              8841 0000  -- do not hand out, do not ask why
spare              8841 0001  -- see above
spare              8841 0002  -- see above

If someone asks for a token by email, read Policy 7 again, then
escalate. Yes, even if they are nice about it.`,

  "shopping-list.txt": `- milk
- birthday card for Kenji
- new mouse (mine double-clicks)
- those biscuits from the place on the corner
- do NOT forget the biscuits`,
};

const FIX_PRINTERS_REG = `Doors Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Halcyon\\Printing]
"AllowPrintSpoolerRemoteCalls"=dword:00000001
"PointAndPrintRestrictions"=dword:00000000
`;

// [path, name, kind, size, modified, contents]
const FILES = [
  ["C:/Users/m.hayes/Desktop", "notes.txt", "text", "2 KB", "15/11/2026 08:41", NOTES["notes.txt"]],
  ["C:/Users/m.hayes/Desktop", "handover.txt", "text", "1 KB", "14/11/2026 23:58", NOTES["handover.txt"]],
  ["C:/Users/m.hayes/Documents", "vpn-tokens.txt", "text", "1 KB", "09/11/2026 17:02", NOTES["vpn-tokens.txt"]],
  ["C:/Users/m.hayes/Documents", "shopping-list.txt", "text", "1 KB", "12/11/2026 12:19", NOTES["shopping-list.txt"]],
  ["C:/Users/m.hayes/Documents", "IT-Structure-2026.pptx", "office", "4.2 MB", "02/11/2026 10:14", null],
  ["C:/Users/m.hayes/Documents", "Q3-budget.xlsx", "office", "812 KB", "30/10/2026 16:45", null],
  ["C:/Users/m.hayes/Documents/Archive", "old-vpn-tokens.txt", "text", "1 KB", "04/01/2025 09:12", "These have expired. Probably."],
  ["C:/Users/m.hayes/Downloads", "printer-driver-v3.exe", "exe", "18.4 MB", "14/11/2026 09:02", null],
  ["C:/Users/m.hayes/Downloads", "teamviewer-setup.exe", "exe", "41.9 MB", "13/11/2026 11:20", null],
  ["C:/Users/m.hayes/Downloads", "totally_not_a_virus.exe", "exe", "96 KB", "13/11/2026 11:24", null],
  ["C:/Users/m.hayes/Downloads", "payslip-november.pdf", "pdf", "214 KB", "28/10/2026 07:00", null],
  ["C:/Users/m.hayes/Downloads", "fix-printers.reg", "registry", "1 KB", "14/11/2026 10:31", FIX_PRINTERS_REG],
  ["C:/Users/m.hayes/Pictures", "christmas-party-2019.jpg", "image", "3.1 MB", "18/12/2019 22:41", null],
  ["C:/Users/m.hayes/Pictures", "whiteboard.png", "image", "640 KB", "04/11/2026 15:33", null],
];

const RECYCLE_BIN = [
  ["final_FINAL_v7.docx", "Word document", "412 KB", "12/11/2026 16:20"],
  ["old vpn tokens (do not open)", "Text document", "1 KB", "09/11/2026 17:04"],
  ["someone's holiday photos", "Folder", "3.9 GB", "02/11/2026 09:40"],
  ["ticket 0770, again", "Text document", "0 KB", "15/11/2026 09:00"],
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const CLAIMED = { state: "enabled", password: "set", lastLogon: "15/11/2026 08:12" };

const PERSON_OBJECTIVE_KINDS = new Set([
  "password.reset",
  "account.unlock",
  "account.disable",
  "group.add",
  "group.remove",
  "share.grant",
]);
const MACHINE_OBJECTIVE_KINDS = new Set(["service.restart", "software.install", "software.remove"]);

const personRecord = ([id, displayName, logonName, departmentId, employmentType, managerId, remote, title]) => ({
  id,
  displayName,
  logonName,
  departmentId,
  employmentType,
  managerId,
  remote,
  title,
  email: emailFor(logonName, id),
  phone: `+44 20 7946 ${String(1000 + id.length * 37).slice(0, 4)}`,
  account: { ...CLAIMED },
  groupIds: ["g_all", ...(DEPARTMENT_GROUP[departmentId] ? [DEPARTMENT_GROUP[departmentId]] : [])],
  createdAt: "01/09/2024",
});

const machineRecord = ([ownerId, hostname, tier, software]) => ({
  id: `m_${ownerId.slice(2)}`,
  hostname,
  ownerId,
  hardwareTier: tier,
  os: `Doors 11 Pro 22H2`,
  software: [...software],
  services: SERVICE_CATALOGUE.map(([id, name, displayName, startType]) => ({
    id: `svc_${id}`,
    name,
    displayName,
    startType,
    status: id === "bits" ? "stopped" : "running",
  })),
  devices: DEVICE_CATALOGUE.map(([id, name, kind, driverId]) => ({
    id: `dev_${id}`,
    name,
    kind,
    driverId,
    status: "ok",
  })),
  printers: [],
  rdpEnabled: false,
  network: { connected: true, adapterId: "dev_net_0" },
});

export function seedWorld({ seed = 20261115 } = {}) {
  const people = PEOPLE.map(personRecord);

  // Tom has been locked out since Friday; the Directory shows it and the
  // password-reset action is what unlocks him.
  const tom = people.find((p) => p.id === "p_tom");
  tom.account.state = "locked";
  tom.account.password = "expired";

  // Dana and Lena lost their share groups "in the migration": that is what the
  // group-membership tickets are about, and it means share access really is
  // derived from the group table rather than pre-granted.
  const dana = people.find((p) => p.id === "p_dana");
  dana.groupIds = dana.groupIds.filter((id) => id !== "g_finance");
  const lena = people.find((p) => p.id === "p_lena");
  lena.groupIds = lena.groupIds.filter((id) => id !== "g_executive");

  const groups = GROUPS.map(([id, name, description]) => ({
    id,
    name,
    description,
    memberIds: people.filter((p) => p.groupIds.includes(id)).map((p) => p.id),
  }));

  const machines = MACHINES.map(machineRecord);

  // One floor printer with a stuck job, so restarting the spooler does
  // something the player can see.
  const terminal = machines.find((m) => m.ownerId === "p_hayes");
  terminal.printers.push({
    id: "prn_03",
    name: "HP LaserJet M404 — Floor 3",
    shareName: "\\\\PRINT01\\HP-Floor3",
    driver: "HP Universal Printing PCL 6",
    queue: [
      {
        id: "job_4471",
        document: "Q3-board-pack.docx",
        ownerId: "p_lena",
        status: "stuck",
        submittedAt: "08:57",
      },
      {
        id: "job_4472",
        document: "onboarding-pack.zip",
        ownerId: "p_ruth",
        status: "paused",
        submittedAt: "09:01",
      },
    ],
  });

  for (const machine of machines) {
    const person = people.find((p) => p.id === machine.ownerId);
    machine.rdpEnabled = person?.remote && machine.hardwareTier >= 2;
  }

  const files = FILES.map(([path, name, kind, size, modified, contents], index) => ({
    id: `f_${String(index + 1).padStart(3, "0")}`,
    path,
    name,
    kind,
    size,
    modified,
    contents,
    ownerId: "p_hayes",
    version: 1,
  }));

  const mail = [];
  DAYS.forEach((day, index) => {
    mail.push({
      id: `mail_brief_${day.n}`,
      folder: "inbox",
      from: day.memo.from,
      fromAddress: "m.delacroix@halcyon.co",
      replyTo: "m.delacroix@halcyon.co",
      returnPath: "bounce@halcyon.co",
      subject: day.memo.subject,
      lines: day.memo.lines,
      personId: "p_marge",
      ticketId: null,
      read: index === 0,
      receivedAt: `0${8}:5${index}`,
      day: day.n,
      briefing: true,
    });
  });

  FLAVOUR_MAIL.forEach((item, index) => {
    mail.push({
      id: `mail_flavour_${index + 1}`,
      folder: "inbox",
      from: item.from,
      fromAddress: item.fromAddress,
      replyTo: item.fromAddress,
      returnPath: "bounce@halcyon.co",
      subject: item.subject,
      lines: item.lines,
      personId: null,
      ticketId: null,
      read: false,
      receivedAt: `0${9 + index}:0${index}`,
      day: null,
      briefing: false,
    });
  });

  const tickets = TICKETS.map(([id, day, personId, subject, body, ruleId, why, objectiveSpecs, senderOverride, guards = {}]) => {
    const person = people.find((p) => p.id === personId);
    const machine = machines.find((m) => m.ownerId === personId);
    const mailId = `mail_t${id}`;
    const fromAddress = senderOverride || person?.email || "unknown@halcyon.co";
    mail.push({
      id: mailId,
      folder: "support",
      from: person?.displayName || "Unknown",
      fromAddress,
      replyTo: fromAddress,
      returnPath: "bounce@halcyon.co",
      subject,
      lines: [body],
      personId,
      ticketId: id,
      read: false,
      receivedAt: "09:00",
      day,
      briefing: false,
    });
    return {
      id,
      day,
      personId,
      machineId: machine?.id || null,
      mailId,
      ruleId,
      why,
      status: "open",
      readyToClose: false,
      resolvedDay: null,
      resolvedAt: null,
      outcome: null,
      trustDelta: 0,
      closure: null,
      wrongClosures: [],
      objectives: objectiveSpecs.map(([kind, extra = {}], index) => ({
        id: `obj_${id}_${index + 1}`,
        kind,
        ...(PERSON_OBJECTIVE_KINDS.has(kind) ? { personId } : {}),
        ...(MACHINE_OBJECTIVE_KINDS.has(kind) && machine ? { machineId: machine.id } : {}),
        ...extra,
        maxRole: extra.maxRole || "helpdesk",
        status: "pending",
        baseline: null,
        evidenceId: null,
      })),
      evidence: [],
      wrongActions: [],
      replies: [],
      escalations: [],
      guards,
    };
  });

  const events = [
    { id: "ev_0001", seq: 1, type: "system:boot", category: "System", level: "info", code: 6005, message: "Event log service started. Terminal 04 booted.", day: 1, at: "08:56", subjectId: null, ticketId: null, data: {} },
    { id: "ev_0002", seq: 2, type: "service:started", category: "System", level: "info", code: 7036, message: "Print Spooler entered the running state.", day: 1, at: "08:56", subjectId: "p_hayes", ticketId: null, data: { service: "spooler" } },
    { id: "ev_0003", seq: 3, type: "gpo:applied", category: "System", level: "info", code: 1503, message: "Group Policing applied for HALCYON\\m.hayes. 0 errors.", day: 1, at: "08:58", subjectId: "p_hayes", ticketId: null, data: { gpo: "gpo_printers" } },
  ];

  const store = {
    meta: { version: 1, seed, createdAt: "15/11/2026 08:45" },
    session: {
      day: 1,
      maxDay: DAYS.length,
      technicianId: "p_hayes",
      hardwareTier: 1,
      seed,
      trust: 100,
      shift: { state: "briefing", remaining: DAYS[0].seconds, total: DAYS[0].seconds, startedAt: null, endedAt: null },
      days: DAYS.map((d) => ({ n: d.n, seconds: d.seconds })),
      resolvedToday: [],
      week: { correct: 0, answered: 0 },
      history: [],
      economy: { bonus: 0, lifetimeBonus: 0, purchases: ["hardware:1"], lastPayslip: null },
      ui: {},
    },
    people,
    org: {
      company: "Halcyon Dynamics",
      departments: DEPARTMENTS.map(([id, name]) => ({ id, name, ouId: "ou_staff" })),
      ous: [
        { id: "ou_staff", name: "Halcyon Staff", path: "HALCYON/Halcyon Staff" },
        { id: "ou_contractors", name: "Contractors", path: "HALCYON/Contractors" },
        { id: "ou_it", name: "IT", path: "HALCYON/Halcyon Staff/IT" },
      ],
      groups,
      teams: [
        { id: "facilities", name: "Facilities", description: "Badges, doors, locks and anything physical." },
        { id: "security", name: "Security", description: "Phishing, policy exceptions, unapproved software." },
        { id: "network", name: "Network", description: "Switches, VPN concentrators, the internet." },
        { id: "hardware", name: "Hardware", description: "Laptops, docks and the pile of dead monitors." },
      ],
    },
    machines,
    mail,
    tickets,
    files: {
      drives: [{ id: "drv_c", letter: "C:", label: "Doors" }],
      shares: SHARES.map(([id, label, path, acl]) => ({
        id,
        label,
        path,
        acl: acl.map(([groupId, access]) => ({ groupId, access })),
        ownerId: "p_marge",
      })),
      items: files,
      recycleBin: RECYCLE_BIN.map(([name, kind, size, deletedAt], index) => ({
        id: `rb_${index + 1}`,
        name,
        kind,
        size,
        deletedAt,
        ownerId: "p_hayes",
      })),
    },
    directoryServices: {
      softwareCatalogue: SOFTWARE,
      drivers: DRIVERS.map(([id, name, version, vendor, signed]) => ({ id, name, version, vendor, signed })),
      updates: [
        { id: "kb_5041580", title: "2026-11 Cumulative Update for Doors 11", status: "available", sizeMb: 612, requiresRestart: true },
        { id: "kb_5040443", title: "Servicing Stack Update", status: "installed", sizeMb: 24, requiresRestart: false },
      ],
      gpos: [
        { id: "gpo_default", name: "Default Domain Policy", enabled: true, settings: { PasswordMinLength: "12", LockoutThreshold: "5" } },
        { id: "gpo_printers", name: "Printer lockdown", enabled: true, settings: { AllowPrintSpoolerRemoteCalls: "0", PointAndPrintRestrictions: "1" } },
        { id: "gpo_usb", name: "Block removable storage", enabled: true, settings: { BlockUsbStorage: "1" } },
      ],
      registry: [
        { path: "HKLM\\SOFTWARE\\Policies\\Halcyon\\Endpoint", name: "BlockUsbStorage", type: "dword", value: "1" },
        { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Spooler", name: "Start", type: "dword", value: "2" },
      ],
      policies: {
        AllowPrintSpoolerRemoteCalls: "0",
        PointAndPrintRestrictions: "1",
        BlockUsbStorage: "1",
      },
    },
    events,
    handbook: { policies: POLICIES },
  };

  return store;
}
