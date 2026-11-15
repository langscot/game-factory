// Read-only projections over the store. Apps never touch the store directly:
// they ask these selectors. Everything returned is a copy, so a stray sort or
// mutation inside an app cannot corrupt the world.

import { objectiveLabel } from "./objective-label.js";

const copy = (value) => (value === null || value === undefined ? value : structuredClone(value));

export function createSelectors(store) {
  const state = () => store.state;

  // -------------------------------------------------------------------------
  // org
  // -------------------------------------------------------------------------

  const departments = () => copy(state().org.departments);
  const department = (departmentId) => copy(state().org.departments.find((d) => d.id === departmentId));
  const departmentName = (departmentId) => department(departmentId)?.name || "Unknown";

  const groups = () => copy(state().org.groups);
  const group = (groupId) => copy(state().org.groups.find((g) => g.id === groupId));
  const teams = () => copy(state().org.teams);
  const team = (teamId) => copy(state().org.teams.find((t) => t.id === teamId));
  const members = (groupId) => {
    const record = state().org.groups.find((g) => g.id === groupId);
    if (!record) return [];
    return copy(state().people.filter((p) => record.memberIds.includes(p.id)));
  };

  // -------------------------------------------------------------------------
  // people
  // -------------------------------------------------------------------------

  const allPeople = () => [...state().people].sort((a, b) => a.displayName.localeCompare(b.displayName));

  const people = {
    all: () => copy(allPeople()),
    get: (personId) => copy(state().people.find((p) => p.id === personId)),
    byLogon: (logonName) =>
      copy(state().people.find((p) => p.logonName.toLowerCase() === String(logonName || "").toLowerCase())),
    byDepartment: (departmentId) => copy(allPeople().filter((p) => p.departmentId === departmentId)),
    manager: (personId) => {
      const person = state().people.find((p) => p.id === personId);
      return copy(state().people.find((p) => p.id === person?.managerId));
    },
    departmentName: (personId) => {
      const person = state().people.find((p) => p.id === personId);
      return person ? departmentName(person.departmentId) : "Unknown";
    },
    groupsOf: (personId) => {
      const person = state().people.find((p) => p.id === personId);
      if (!person) return [];
      return copy(state().org.groups.filter((g) => person.groupIds.includes(g.id)));
    },
    /** Outlook's global address list: everyone with a live mailbox. */
    gal: () =>
      copy(
        allPeople()
          .filter((p) => p.account.state !== "disabled")
          .map((p) => ({
            id: p.id,
            displayName: p.displayName,
            email: p.email,
            department: departmentName(p.departmentId),
            title: p.title,
          })),
      ),
    search: (query) => {
      const term = String(query || "").trim().toLowerCase();
      if (!term) return copy(allPeople());
      return copy(
        allPeople().filter((p) =>
          [p.displayName, p.logonName, p.email, p.title, p.employmentType, departmentName(p.departmentId)]
            .join(" ")
            .toLowerCase()
            .includes(term),
        ),
      );
    },
    canSignIn: (personId) => state().people.find((p) => p.id === personId)?.account.state === "enabled",
    canOpenTicket: (personId) => {
      const person = state().people.find((p) => p.id === personId);
      return Boolean(person) && person.account.state !== "disabled";
    },
    isLocked: (personId) => state().people.find((p) => p.id === personId)?.account.state === "locked",
  };

  // -------------------------------------------------------------------------
  // machines
  // -------------------------------------------------------------------------

  const findMachine = (machineId) => state().machines.find((m) => m.id === machineId);
  const serviceMatches = (service, key) => service.id === key || service.name === key || service.id === `svc_${key}`;

  const machines = {
    all: () => copy(state().machines),
    get: (machineId) => copy(findMachine(machineId)),
    byOwner: (personId) => copy(state().machines.find((m) => m.ownerId === personId)),
    hostname: (machineId) => findMachine(machineId)?.hostname || "unknown",
    services: (machineId) => copy(findMachine(machineId)?.services || []),
    service: (machineId, key) => copy(findMachine(machineId)?.services.find((s) => serviceMatches(s, key))),
    devices: (machineId) => copy(findMachine(machineId)?.devices || []),
    printers: (machineId) => copy(findMachine(machineId)?.printers || []),
    printerQueue: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return [];
      return copy(
        machine.printers.flatMap((printer) =>
          printer.queue.map((job) => ({ ...job, printerId: printer.id, printerName: printer.name })),
        ),
      );
    },
    installedSoftware: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return [];
      const catalogue = state().directoryServices.softwareCatalogue;
      return copy(catalogue.filter((s) => machine.software.includes(s.id)));
    },
    /** Which program opens which extension, derived from installed software. */
    fileAssociations: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return {};
      const catalogue = state().directoryServices.softwareCatalogue;
      const map = {};
      for (const software of catalogue.filter((s) => machine.software.includes(s.id))) {
        for (const ext of software.associations) map[ext] = { softwareId: software.id, name: software.name };
      }
      return map;
    },
    processes: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return [];
      const catalogue = state().directoryServices.softwareCatalogue;
      const software = catalogue.filter((s) => machine.software.includes(s.id));
      const runningServices = machine.services.filter((s) => s.status === "running");
      return copy([
        { name: "Windows Explorer", kind: "system" },
        { name: "Desktop Window Manager", kind: "system" },
        { name: "Antimalware Service Executable", kind: "system" },
        ...runningServices.map((s) => ({ name: `svchost.exe (${s.displayName})`, kind: "service" })),
        ...software.map((s) => ({ name: s.process, kind: "software", softwareId: s.id })),
      ]);
    },
    /** What Start shows under "installed": the platform maps ids to real apps. */
    startMenuEntries: (machineId) => machines.installedSoftware(machineId),
    network: (machineId) => copy(findMachine(machineId)?.network),
    ipconfig: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return "No machine.";
      if (!machine.network.connected) {
        return "Windows IP Configuration\n\n   Media disconnected\n   No adapters reported.";
      }
      return `Windows IP Configuration\n\nEthernet adapter Ethernet:\n   IPv4 Address. . . . . . . . . . . : 10.14.7.${40 + machine.hardwareTier}\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 10.14.7.1`;
    },
    canSignIn: (machineId) => {
      const machine = findMachine(machineId);
      if (!machine) return false;
      return people.canSignIn(machine.ownerId);
    },
    canSendMail: (machineId) => Boolean(findMachine(machineId)?.network.connected),
  };

  // -------------------------------------------------------------------------
  // mail
  // -------------------------------------------------------------------------

  const mail = {
    all: () => copy(state().mail),
    get: (mailId) => copy(state().mail.find((m) => m.id === mailId)),
    folder: (folder) => copy(state().mail.filter((m) => m.folder === folder)),
    /** Inbox for a day: the briefing, the flavour mail, anything else in the inbox. */
    inbox: (day) =>
      copy(
        state()
          .mail.filter((m) => m.folder === "inbox" && (m.day === null || m.day === day))
          .sort((a, b) => Number(b.briefing) - Number(a.briefing) || a.id.localeCompare(b.id)),
      ),
    support: () => copy(state().mail.filter((m) => m.folder === "support")),
    forTicket: (ticketId) => copy(state().mail.find((m) => m.ticketId === ticketId)),
    unread: (day) => state().mail.filter((m) => m.folder === "inbox" && !m.read && (m.day === null || m.day === day)).length,
    canDeliverTo: (personId) => people.canOpenTicket(personId),
    canSendFrom: (personId) => {
      const machine = state().machines.find((m) => m.ownerId === personId);
      return Boolean(machine?.network.connected);
    },
  };

  // -------------------------------------------------------------------------
  // tickets
  // -------------------------------------------------------------------------

  const ticketMail = (ticket) => state().mail.find((m) => m.id === ticket?.mailId);

  const tickets = {
    all: () => copy(state().tickets),
    get: (ticketId) => copy(state().tickets.find((t) => t.id === Number(ticketId))),
    /** Everything on today's desk: today's tickets plus anything rolled over. */
    forDay: (day) =>
      copy(
        state()
          .tickets.filter((t) => t.day <= day && (t.status === "open" || t.resolvedDay === day))
          .sort((a, b) => a.day - b.day || a.id - b.id),
      ),
    openForDay: (day) =>
      copy(state().tickets.filter((t) => t.day <= day && t.status === "open").sort((a, b) => a.day - b.day || a.id - b.id)),
    byPerson: (personId) => copy(state().tickets.filter((t) => t.personId === personId)),
    forRule: (ruleId) => copy(state().tickets.filter((t) => t.ruleId === ruleId)),
    resolvedOn: (day) => copy(state().tickets.filter((t) => t.resolvedDay === day)),
    /** The fields the desk displays, with the mail joined in. */
    view: (ticketId) => {
      const ticket = state().tickets.find((t) => t.id === Number(ticketId));
      if (!ticket) return null;
      const message = ticketMail(ticket);
      const person = state().people.find((p) => p.id === ticket.personId);
      return copy({
        ...ticket,
        subject: message?.subject || "(no subject)",
        body: message?.lines?.[0] || "",
        from: person?.displayName || message?.from || "Unknown",
        fromAddress: message?.fromAddress || person?.email || "unknown@halcyon.co",
      });
    },
    /** Human label for an objective, using live entity names. */
    objectiveLabel: (objective) => objectiveLabel(objective, state()),
    summary: (day) => {
      const due = state().tickets.filter((t) => t.day <= day);
      const answered = due.filter((t) => t.resolvedDay === day);
      return {
        total: due.length,
        answered: answered.length,
        correct: answered.filter((t) => t.correct).length,
        open: due.filter((t) => t.status === "open").length,
      };
    },
  };

  // -------------------------------------------------------------------------
  // files
  // -------------------------------------------------------------------------

  const norm = (path) => String(path || "").replace(/\\/g, "/").replace(/\/+$/, "");

  const files = {
    list: (path) => {
      const base = norm(path);
      const folders = new Map();
      for (const item of state().files.items) {
        if (item.path === base) continue;
        if (!item.path.startsWith(`${base}/`)) continue;
        const rest = item.path.slice(base.length + 1);
        const name = rest.split("/")[0];
        if (!folders.has(name)) {
          folders.set(name, {
            id: `dir:${base}/${name}`,
            name,
            kind: "folder",
            path: `${base}/${name}`,
            size: "",
            modified: "",
          });
        }
      }
      const children = state().files.items.filter((item) => item.path === base);
      return copy([
        ...[...folders.values()].sort((a, b) => a.name.localeCompare(b.name)),
        ...children.sort((a, b) => a.name.localeCompare(b.name)),
      ]);
    },
    folder: (path) => copy({ path: norm(path), name: norm(path).split("/").pop() }),
    get: (fileId) => copy(state().files.items.find((f) => f.id === fileId)),
    byName: (path, name) => copy(state().files.items.find((f) => f.path === norm(path) && f.name === name)),
    read: (fileIdOrPath) => {
      const file =
        state().files.items.find((f) => f.id === fileIdOrPath) ||
        state().files.items.find((f) => `${f.path}/${f.name}` === norm(fileIdOrPath));
      return file ? file.contents ?? "" : null;
    },
    associations: (machineId) => machines.fileAssociations(machineId),
    shares: () => copy(state().files.shares),
    share: (shareId) => copy(state().files.shares.find((s) => s.id === shareId)),
    /** Effective access, derived from group membership and the share ACL. */
    shareAccess: (shareId, personId) => {
      const share = state().files.shares.find((s) => s.id === shareId);
      const person = state().people.find((p) => p.id === personId);
      if (!share || !person) return "none";
      let best = "none";
      const rank = { none: 0, read: 1, modify: 2 };
      for (const entry of share.acl) {
        const applies = entry.personId ? entry.personId === personId : person.groupIds.includes(entry.groupId);
        if (applies && rank[entry.access] > rank[best]) best = entry.access;
      }
      return best;
    },
    sharesFor: (personId) =>
      copy(
        state().files.shares
          .map((share) => ({ ...share, access: files.shareAccess(share.id, personId) }))
          .filter((share) => share.access !== "none"),
      ),
    recycleBin: () => copy(state().files.recycleBin),
    items: () => copy(state().files.items),
    tree: () =>
      copy([...new Set(state().files.items.map((f) => f.path))].sort()),
  };

  // -------------------------------------------------------------------------
  // directory services
  // -------------------------------------------------------------------------

  const directoryServices = {
    softwareCatalogue: () => copy(state().directoryServices.softwareCatalogue),
    software: (softwareId) => copy(state().directoryServices.softwareCatalogue.find((s) => s.id === softwareId)),
    approvedSoftware: () => copy(state().directoryServices.softwareCatalogue.filter((s) => s.approved)),
    drivers: () => copy(state().directoryServices.drivers),
    driver: (driverId) => copy(state().directoryServices.drivers.find((d) => d.id === driverId)),
    updates: () => copy(state().directoryServices.updates),
    gpos: () => copy(state().directoryServices.gpos),
    gpo: (gpoId) => copy(state().directoryServices.gpos.find((g) => g.id === gpoId)),
    registry: () => copy(state().directoryServices.registry),
    policies: () => copy(state().directoryServices.policies),
    policy: (key) => copy(state().directoryServices.policies[key]),
  };

  // -------------------------------------------------------------------------
  // audit log, handbook, session
  // -------------------------------------------------------------------------

  const audit = {
    all: () => copy(state().events),
    recent: (limit = 20) => copy(state().events.slice(-limit).reverse()),
    byCode: (code) => copy(state().events.filter((e) => e.code === code)),
    byType: (type) => copy(state().events.filter((e) => e.type === type)),
    forTicket: (ticketId) => copy(state().events.filter((e) => e.ticketId === ticketId)),
    count: () => state().events.length,
  };

  const handbook = {
    policies: (day = 99) => copy(state().handbook.policies.filter((p) => p.day <= day)),
    policy: (ruleId) => copy(state().handbook.policies.find((p) => p.id === Number(ruleId))),
  };

  const session = {
    current: () => ({
      ...copy(state().session),
      technician: people.get(state().session.technicianId),
    }),
    /** The numbers the desk and the tray read: day, clock, trust, queue. */
    overview: () => {
      const current = state().session;
      const due = state().tickets.filter((ticket) => ticket.day <= current.day);
      const answered = due.filter((ticket) => ticket.resolvedDay === current.day);
      return {
        day: current.day,
        maxDay: current.maxDay,
        trust: current.trust,
        total: due.length,
        answered: answered.length,
        correct: answered.filter((ticket) => ticket.correct).length,
        missed: due.filter((ticket) => ticket.status === "open").length,
        remaining: Math.max(0, Math.round(current.shift.remaining)),
        shiftSeconds: current.shift.total,
        state: current.shift.state,
      };
    },
    day: () => state().session.day,
    maxDay: () => state().session.maxDay,
    trust: () => state().session.trust,
    week: () => copy(state().session.week),
    history: () => copy(state().session.history),
    shift: () => copy(state().session.shift),
    isRunning: () => state().session.shift.state === "running",
    technician: () => people.get(state().session.technicianId),
    hardwareTier: () => state().session.hardwareTier,
    seed: () => state().session.seed,
    resolvedToday: () => copy(state().session.resolvedToday),
    /** Per-app UI state, so selection survives a redraw and lives in the store. */
    ui: (appId) => copy(state().session.ui?.[appId] || {}),
  };

  return {
    meta: () => copy(state().meta),
    org: { departments, department, departmentName, groups, group, members, teams, team },
    people,
    machines,
    mail,
    tickets,
    files,
    directoryServices,
    audit,
    handbook,
    session,
  };
}
