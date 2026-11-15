// The handbook. Policy numbers are referenced by ticket data and by the
// scoring event, so they live here rather than in the Handbook app.
//
// `day` is the shift on which the rule appears, so the book grows as the week
// goes on — same as a real intranet, unfortunately.

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
    lines: ["Facilities owns every badge, door and lock in the building.", "IT does not touch them. Escalate to Facilities."],
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
