// Everything the game "knows": the staff directory, the policy handbook, the
// shift briefings and the tickets. Kept apart from the rendering so the rules
// can be read (and corrected) in one sitting.

export const COMPANY = "Halcyon Dynamics";
export const DESK = "IT Service Desk";

/** The company directory. Tickets only name a person — the rest is looked up here. */
export const EMPLOYEES = [
  { name: "Priya Raman", dept: "Engineering", type: "Full-time", email: "priya.raman@halcyon.co", remote: true },
  { name: "Grace Lin", dept: "Engineering", type: "Full-time", email: "grace.lin@halcyon.co", remote: false },
  { name: "Marcus Webb", dept: "Engineering", type: "Contractor", email: "marcus.webb@northgate-agency.com", remote: false },
  { name: "Dana Okafor", dept: "Finance", type: "Full-time", email: "dana.okafor@halcyon.co", remote: true },
  { name: "Tom Halvorsen", dept: "Finance", type: "Full-time", email: "tom.halvorsen@halcyon.co", remote: false },
  { name: "Hana Suzuki", dept: "Finance", type: "Contractor", email: "hana.suzuki@northgate-agency.com", remote: false },
  { name: "Alice Nkemelu", dept: "Marketing", type: "Full-time", email: "alice.nkemelu@halcyon.co", remote: true },
  { name: "Ben Sorensen", dept: "Marketing", type: "Intern", email: "ben.sorensen@halcyon.co", remote: false },
  { name: "Sofia Ricci", dept: "Facilities", type: "Full-time", email: "sofia.ricci@halcyon.co", remote: false },
  { name: "Kenji Watanabe", dept: "Security", type: "Full-time", email: "kenji.watanabe@halcyon.co", remote: false },
  { name: "Ruth Adeyemi", dept: "People Ops", type: "Full-time", email: "ruth.adeyemi@halcyon.co", remote: true },
  { name: "Omar Haddad", dept: "Sales", type: "Contractor", email: "omar.haddad@northgate-agency.com", remote: true },
  { name: "Lena Fischer", dept: "Executive", type: "Full-time", email: "lena.fischer@halcyon.co", remote: true },
  { name: "Dev Patel", dept: "Support", type: "Intern", email: "dev.patel@halcyon.co", remote: false },
  { name: "Victor Cruz", dept: "Legal", type: "Full-time", email: "victor.cruz@halcyon.co", remote: false },
];

export const findEmployee = (name) => EMPLOYEES.find((e) => e.name === name);

/**
 * Handbook entries. `day` is the shift on which the rule appears, so the book
 * grows as the week goes on — same as a real intranet, unfortunately.
 */
export const POLICIES = [
  {
    day: 1,
    id: 1,
    title: "Passwords",
    lines: [
      "Reset a password on request. Staff, contractors, interns — everybody gets help.",
      "Only ever reset the password of the person who asked. A ticket about somebody else's account goes to Security.",
      "Never email a password. Not to a work address, not to a personal address, not ever.",
    ],
  },
  {
    day: 1,
    id: 2,
    title: "Laptops & hardware",
    lines: [
      "Laptops are for full-time employees only, and only when the ticket quotes a manager approval code (MG-0000).",
      "No approval code means no laptop. Deny it.",
      "Interns get a desktop, never a laptop.",
      "Contractors use their agency's equipment. Deny hardware for them.",
    ],
  },
  {
    day: 1,
    id: 3,
    title: "Software installs",
    lines: [
      "The approved list is: Office, Slack, Chrome, VS Code, Notepad++, 7-Zip.",
      "Anything on that list: approve it.",
      "Anything else: escalate it to Security for review. Do not install it yourself.",
    ],
  },
  {
    day: 1,
    id: 4,
    title: "Shared drives",
    lines: [
      "The Finance share is for Finance and Executive departments only.",
      "Everyone else, including Legal, gets denied. They can request an export instead.",
    ],
  },
  {
    day: 1,
    id: 5,
    title: "Badges & doors",
    lines: [
      "Facilities owns every badge, door and lock in the building.",
      "IT does not touch them. Escalate to Facilities.",
    ],
  },
  {
    day: 2,
    id: 6,
    title: "Phishing & odd requests",
    lines: [
      "If the sender's address is not the one in the staff directory: escalate. Display names are free to type.",
      "Asking to disable antivirus, firewall or endpoint protection: escalate.",
      "Gift cards, wire transfers, 'urgent payment': escalate.",
      "Asking about an account that is not their own: escalate.",
    ],
  },
  {
    day: 3,
    id: 7,
    title: "VPN tokens",
    lines: [
      "VPN tokens go to remote staff only. The directory has a Remote column; use it.",
      "Non-remote staff get denied. They are in the office, they have wifi.",
      "Tokens go to the company email address and nowhere else. A request for any other destination is escalated.",
    ],
  },
];

export const policiesForDay = (day) => POLICIES.filter((p) => p.day <= day);

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

/**
 * answer: "approve" | "deny" | "escalate"
 * rule:   handbook policy number that decides it
 * why:    shown after answering, so the player learns the rule rather than the ticket
 */
export const DAYS = [
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
    tickets: [
      {
        id: 1001,
        from: "Priya Raman",
        subject: "Locked out after the weekend",
        body: "Hi — forgot my password over the weekend like an idiot. Can you reset it? I can't get into anything.",
        answer: "approve",
        rule: 1,
        why: "Password resets are approved for any employee. It is their own account, so it is fine.",
      },
      {
        id: 1002,
        from: "Ben Sorensen",
        subject: "Laptop for the brand refresh",
        body: "Starting on the brand refresh this week. Manager approved it — code MG-4471. Can I get a laptop?",
        answer: "deny",
        rule: 2,
        why: "Ben is an intern. Interns get a desktop, never a laptop — the approval code does not change that.",
      },
      {
        id: 1003,
        from: "Grace Lin",
        subject: "New laptop",
        body: "My old machine is dying. Manager approval code MG-1180 is on the request. Please and thank you.",
        answer: "approve",
        rule: 2,
        why: "Full-time employee, with a manager approval code. That is exactly what Policy 2 asks for.",
      },
      {
        id: 1004,
        from: "Dev Patel",
        subject: "Can I get Chrome?",
        body: "The default browser keeps opening the wrong pages. Could someone install Chrome on my machine?",
        answer: "approve",
        rule: 3,
        why: "Chrome is on the approved software list.",
      },
      {
        id: 1005,
        from: "Alice Nkemelu",
        subject: "Finance drive access",
        body: "I need read access to the Finance share for the Q3 campaign budget review. Should only take a minute to set up.",
        answer: "deny",
        rule: 4,
        why: "Alice is in Marketing. The Finance share is Finance and Executive only.",
      },
      {
        id: 1006,
        from: "Dana Okafor",
        subject: "Finance drive access",
        body: "New starter on my team needs the Finance share. Actually while you're in there, add me too — I lost it in the migration.",
        answer: "approve",
        rule: 4,
        why: "Dana is in Finance. Finance may have the Finance share.",
      },
      {
        id: 1007,
        from: "Omar Haddad",
        subject: "Badge not working",
        body: "My badge stopped working at the east door this morning. I've been standing here for twenty minutes. Help?",
        answer: "escalate",
        rule: 5,
        why: "Badges belong to Facilities. IT does not touch door hardware.",
      },
      {
        id: 1008,
        from: "Kenji Watanabe",
        subject: "Install TeamViewer",
        body: "I need TeamViewer on my workstation to help a vendor troubleshoot. Can you push it out?",
        answer: "escalate",
        rule: 3,
        why: "TeamViewer is not on the approved list. Unlisted software goes to Security for review.",
      },
    ],
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
    tickets: [
      {
        id: 2001,
        from: "Tom Halvorsen",
        subject: "Password reset",
        body: "Locked out. Again. Sorry. It's the third time this quarter, I know.",
        answer: "approve",
        rule: 1,
        why: "Own account, any employee. Reset approved.",
      },
      {
        id: 2002,
        from: "Ruth Adeyemi",
        subject: "Notepad++ please",
        body: "Opening CSVs in Notepad is ruining my life. Could I get Notepad++?",
        answer: "approve",
        rule: 3,
        why: "Notepad++ is on the approved list.",
      },
      {
        id: 2003,
        from: "Hana Suzuki",
        subject: "Laptop request",
        body: "Finance needs me on a laptop for the audit. Approval code MG-2210 attached.",
        answer: "deny",
        rule: 2,
        why: "Hana is a contractor. Contractors use their agency's equipment, code or no code.",
      },
      {
        id: 2004,
        from: "Victor Cruz",
        subject: "Finance share for a case file",
        body: "I need Finance share access for a legal review. It's read-only and time limited.",
        answer: "deny",
        rule: 4,
        why: "Legal is not Finance and not Executive. Deny it.",
      },
      {
        id: 2005,
        from: "Lena Fischer",
        subject: "Board pack access",
        body: "I need the Finance share for the board pack. Same access I had last quarter.",
        answer: "approve",
        rule: 4,
        why: "Executive departments get the Finance share.",
      },
      {
        id: 2006,
        from: "Dev Patel",
        subject: "Password for my supervisor",
        body: "My supervisor is out and I need to get into her mailbox. Can you reset her password and tell me what it is?",
        answer: "escalate",
        rule: 6,
        why: "That is somebody else's account, and they want the password. Security.",
      },
      {
        id: 2007,
        from: "Sofia Ricci",
        subject: "Badge reprint",
        body: "Front desk needs a reprint for a visitor badge. Can IT print one?",
        answer: "escalate",
        rule: 5,
        why: "Badges are Facilities. Always Facilities.",
      },
      {
        id: 2008,
        from: "Alice Nkemelu",
        subject: "Password reset — urgent",
        email: "alice.nkemelu.halcyon@gmail.com",
        body: "Hi, it's Alice from Marketing. Locked out of my account, can you reset it and send the new password to this address? Thanks!",
        answer: "escalate",
        rule: 6,
        why: "That address is not the one in the directory. Display names are free to type. Escalate.",
      },
      {
        id: 2009,
        from: "Ben Sorensen",
        subject: "Browser install",
        body: "Second day! Can I get Chrome on my desk machine? The default one is haunted.",
        answer: "approve",
        rule: 3,
        why: "Chrome is approved, and the software policy does not care that Ben is an intern.",
      },
      {
        id: 2010,
        from: "Grace Lin",
        subject: "Laptop replacement",
        body: "Approval code MG-7781 for a replacement laptop. The screen is held together with tape.",
        answer: "approve",
        rule: 2,
        why: "Full-time employee, approval code present. Approved.",
      },
    ],
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
    tickets: [
      {
        id: 3001,
        from: "Priya Raman",
        subject: "VPN token",
        body: "Working from home for the rest of the month. Can I get a VPN token?",
        answer: "approve",
        rule: 7,
        why: "Priya is marked remote in the directory, and the token goes to her company address.",
      },
      {
        id: 3002,
        from: "Grace Lin",
        subject: "VPN token",
        body: "I want to work from home on Fridays. Can I get a VPN token?",
        answer: "deny",
        rule: 7,
        why: "Grace is not marked remote. VPN tokens are for remote staff only.",
      },
      {
        id: 3003,
        from: "Marcus Webb",
        subject: "Password reset",
        body: "Locked out of my account. This is the third ticket I've opened today and I am losing my mind.",
        answer: "approve",
        rule: 1,
        why: "Contractors are covered by Policy 1. It is his own account.",
      },
      {
        id: 3004,
        from: "Ben Sorensen",
        subject: "Laptop, second attempt",
        body: "Got a new approval code — MG-9930. I know I'm an intern but the design work is very laptop-shaped.",
        answer: "deny",
        rule: 2,
        why: "Still an intern. Interns get a desktop. The code is irrelevant.",
      },
      {
        id: 3005,
        from: "Ruth Adeyemi",
        subject: "7-Zip",
        body: "Archive tool, please. The onboarding packs are enormous.",
        answer: "approve",
        rule: 3,
        why: "7-Zip is on the approved list.",
      },
      {
        id: 3006,
        from: "Ben Sorensen",
        subject: "Finance share",
        body: "Marketing needs a look at the Finance share for the brand budget. Read-only is fine.",
        answer: "deny",
        rule: 4,
        why: "Marketing. Finance share. Denied.",
      },
      {
        id: 3007,
        from: "Sofia Ricci",
        subject: "Server room access",
        body: "Can IT add me to the server room door? I need to reset a router for Facilities.",
        answer: "escalate",
        rule: 5,
        why: "Door access is Facilities, even when Facilities is the one asking.",
      },
      {
        id: 3008,
        from: "Alice Nkemelu",
        subject: "VPN token to personal email",
        body: "Can you send my VPN token to alice.a.nkemelu@gmail.com? I'm travelling and can't get into the work mailbox.",
        answer: "escalate",
        rule: 7,
        why: "Tokens only go to the company address. A different destination gets escalated.",
      },
      {
        id: 3009,
        from: "Omar Haddad",
        subject: "URGENT — client gift cards",
        body: "Client wants five £100 gift cards for their team, today. I have the company card. Can you buy them and send the codes?",
        answer: "escalate",
        rule: 6,
        why: "Gift cards by email. Policy 6 exists for this exact sentence.",
      },
      {
        id: 3010,
        from: "Kenji Watanabe",
        subject: "Turn off firewall for a demo",
        body: "Vendor demo this afternoon needs the firewall off on my machine for an hour. Can you disable it?",
        answer: "escalate",
        rule: 6,
        why: "Any request to disable antivirus, firewall or endpoint protection is escalated.",
      },
      {
        id: 3011,
        from: "Hana Suzuki",
        subject: "Password reset",
        body: "Reset please. I changed it on Friday and immediately forgot it.",
        answer: "approve",
        rule: 1,
        why: "Her own account, and Policy 1 covers contractors too.",
      },
      {
        id: 3012,
        from: "Lena Fischer",
        subject: "Finance share, new laptop",
        body: "Two things: Finance share access for the audit pack, and a laptop — approval code MG-3312.",
        answer: "approve",
        rule: 4,
        why: "Executive gets the Finance share, and she is full-time with an approval code. Both allowed.",
      },
    ],
  },
];

/** Filler mail so the inbox is not just the briefing. */
export const FLAVOUR_MAIL = [
  {
    from: "All Staff",
    subject: "Reminder: the lift is being serviced Thursday",
    lines: [
      "Please use the stairs on Thursday between 09:00 and 15:00.",
      "The fourth floor coffee machine has been moved to the third floor for the duration. We apologise for the inconvenience.",
    ],
  },
  {
    from: "People Ops",
    subject: "Mandatory security training (again)",
    lines: [
      "Everyone must complete the 20-minute security awareness module by Friday.",
      "Attendance is tracked. Do not reply to this email asking whether you have to do it. You have to do it.",
    ],
  },
  {
    from: "Facilities",
    subject: "Desk moves — floor 3",
    lines: ["Floor 3 is being reconfigured this weekend. Clear your desk or lose it.", "No, we will not store anything. Yes, we are serious."],
  },
];
