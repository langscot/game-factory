// The only place the world is written. Every action validates its inputs,
// mutates the store once, and emits an audit event. Apps call these; they never
// poke the store or set trust themselves.

import { seedWorld } from "./seed.js";
import { TRUST_HIT } from "./session.js";

const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "user";

const ACCESS_RANK = { none: 0, read: 1, modify: 2 };

export function createActions({ store, selectors, events, clock, session }) {
  const state = () => store.state;
  const person = (id) => state().people.find((p) => p.id === id);
  const machine = (id) => state().machines.find((m) => m.id === id);
  const now = () => clock.stamp();

  // -------------------------------------------------------------------------
  // shift + ui
  // -------------------------------------------------------------------------

  function startShift() {
    return session.startShift();
  }

  function endShift(reason = "manual") {
    return session.endShift(reason);
  }

  function nextDay() {
    return session.nextDay();
  }

  function setUi(appId, patch) {
    if (!appId) return fail("missing-app-id");
    store.commit((draft) => {
      draft.session.ui[appId] = { ...(draft.session.ui[appId] || {}), ...patch };
    });
    events.bump("ui:changed");
    return ok();
  }

  function resetWorld({ seed } = {}) {
    const next = seedWorld({ seed: seed ?? state().meta.seed });
    store.replace(next);
    events.reset();
    clock.reseed(next.session.seed);
    events.emit("world:reset", {
      category: "System",
      code: 6006,
      message: "World reloaded from seed. No users, messages or events were duplicated.",
      data: { seed: next.session.seed },
    });
    return ok({ seed: next.session.seed });
  }

  // -------------------------------------------------------------------------
  // accounts / people
  // -------------------------------------------------------------------------

  function addPerson({
    displayName,
    logonName,
    departmentId = "d_support",
    employmentType = "full-time",
    remote = false,
    title = "Staff",
    managerId = null,
  }) {
    if (!displayName || !logonName) return fail("name-and-logon-required");
    if (state().people.some((p) => p.logonName.toLowerCase() === String(logonName).toLowerCase())) {
      return fail("logon-already-exists");
    }
    if (!selectors.org.department(departmentId)) return fail("unknown-department");

    const base = `p_${slug(logonName.split("@")[0])}`;
    let id = base;
    let n = 2;
    while (person(id)) id = `${base}-${n++}`;

    const departmentGroup = { d_eng: "g_engineering", d_fin: "g_finance", d_mkt: "g_marketing", d_it: "g_it_admins" }[departmentId];
    const record = {
      id,
      displayName: String(displayName),
      logonName: String(logonName),
      departmentId,
      employmentType,
      managerId,
      remote: Boolean(remote),
      title,
      email: `${String(logonName).toLowerCase()}@halcyon.co`,
      phone: "+44 20 7946 0000",
      account: { state: "enabled", password: "reset-required", lastLogon: null },
      groupIds: ["g_all", ...(departmentGroup ? [departmentGroup] : [])],
      createdAt: now(),
    };

    store.commit((draft) => {
      draft.people.push(record);
      for (const group of draft.org.groups) {
        if (record.groupIds.includes(group.id) && !group.memberIds.includes(id)) group.memberIds.push(id);
      }
    });

    events.emit("account:created", {
      category: "Security",
      code: 4720,
      message: `User account HALCYON\\${record.logonName} created for ${record.displayName}.`,
      subjectId: id,
      data: { departmentId, employmentType },
    });
    return ok({ person: selectors.people.get(id) });
  }

  function setAccountEnabled(personId, enabled, { ticketId = null, role = "helpdesk" } = {}) {
    const target = person(personId);
    if (!target) return fail("unknown-person");
    const nextState = enabled ? "enabled" : "disabled";
    if (target.account.state === nextState) return fail("already-in-state", { state: nextState });

    store.commit((draft) => {
      const record = draft.people.find((p) => p.id === personId);
      record.account.state = nextState;
    });

    events.emit(enabled ? "account:enabled" : "account:disabled", {
      category: "Security",
      code: enabled ? 4722 : 4725,
      level: enabled ? "info" : "warning",
      message: `User account HALCYON\\${target.logonName} ${enabled ? "enabled" : "disabled"}.`,
      subjectId: personId,
      ticketId,
      data: { role, personId },
    });
    return ok({ person: selectors.people.get(personId) });
  }

  function resetPassword(personId, { ticketId = null, role = "helpdesk" } = {}) {
    const target = person(personId);
    if (!target) return fail("unknown-person");
    const wasLocked = target.account.state === "locked";

    store.commit((draft) => {
      const record = draft.people.find((p) => p.id === personId);
      record.account.password = "reset-required";
      if (record.account.state === "locked") record.account.state = "enabled";
    });

    events.emit("account:password-reset", {
      category: "Security",
      code: 4724,
      message: `An attempt was made to reset an account's password for HALCYON\\${target.logonName}.`,
      subjectId: personId,
      ticketId,
      data: { unlocked: wasLocked, role, personId },
    });
    return ok({ unlocked: wasLocked, person: selectors.people.get(personId) });
  }

  function setAccountLocked(personId, locked, { role = "helpdesk" } = {}) {
    const target = person(personId);
    if (!target) return fail("unknown-person");
    store.commit((draft) => {
      const record = draft.people.find((p) => p.id === personId);
      record.account.state = locked ? "locked" : "enabled";
    });
    events.emit(locked ? "account:locked" : "account:unlocked", {
      category: "Security",
      code: locked ? 4740 : 4767,
      level: locked ? "warning" : "info",
      message: `User account HALCYON\\${target.logonName} was ${locked ? "locked out" : "unlocked"}.`,
      subjectId: personId,
      data: { role, personId },
    });
    return ok({ person: selectors.people.get(personId) });
  }

  // -------------------------------------------------------------------------
  // groups + shares
  // -------------------------------------------------------------------------

  function addToGroup(personId, groupId, { ticketId = null, role = "helpdesk" } = {}) {
    const target = person(personId);
    const groupRecord = state().org.groups.find((g) => g.id === groupId);
    if (!target) return fail("unknown-person");
    if (!groupRecord) return fail("unknown-group");
    if (target.groupIds.includes(groupId)) return fail("already-member");

    store.commit((draft) => {
      draft.people.find((p) => p.id === personId).groupIds.push(groupId);
      draft.org.groups.find((g) => g.id === groupId).memberIds.push(personId);
    });

    events.emit("group:member-added", {
      category: "Security",
      code: 4728,
      message: `Member ${target.logonName} added to security-enabled global group ${groupRecord.name}.`,
      subjectId: personId,
      ticketId,
      data: { groupId, personId, role },
    });
    return ok({ person: selectors.people.get(personId) });
  }

  function removeFromGroup(personId, groupId, { ticketId = null, role = "helpdesk" } = {}) {
    const target = person(personId);
    const groupRecord = state().org.groups.find((g) => g.id === groupId);
    if (!target || !groupRecord) return fail("unknown-member-or-group");
    if (!target.groupIds.includes(groupId)) return fail("not-a-member");

    store.commit((draft) => {
      const record = draft.people.find((p) => p.id === personId);
      record.groupIds = record.groupIds.filter((id) => id !== groupId);
      const groupDraft = draft.org.groups.find((g) => g.id === groupId);
      groupDraft.memberIds = groupDraft.memberIds.filter((id) => id !== personId);
    });

    events.emit("group:member-removed", {
      category: "Security",
      code: 4729,
      level: "warning",
      message: `Member ${target.logonName} removed from group ${groupRecord.name}.`,
      subjectId: personId,
      ticketId,
      data: { groupId, personId, role },
    });
    return ok({ person: selectors.people.get(personId) });
  }

  function setShareAccess(shareId, groupId, access, { ticketId = null, role = "helpdesk" } = {}) {
    const share = state().files.shares.find((s) => s.id === shareId);
    if (!share) return fail("unknown-share");
    if (!state().org.groups.some((g) => g.id === groupId)) return fail("unknown-group");
    if (!(access in ACCESS_RANK)) return fail("unknown-access-level");
    const affectedPersonIds = state()
      .people.filter((p) => p.groupIds.includes(groupId))
      .map((p) => p.id);

    store.commit((draft) => {
      const target = draft.files.shares.find((s) => s.id === shareId);
      const entry = target.acl.find((a) => a.groupId === groupId);
      if (access === "none") {
        target.acl = target.acl.filter((a) => a.groupId !== groupId);
      } else if (entry) {
        entry.access = access;
      } else {
        target.acl.push({ groupId, access });
      }
    });

    events.emit("share:permissions-changed", {
      category: "Security",
      code: 4670,
      level: access === "none" ? "warning" : "info",
      message: `Permissions on ${share.path} changed: ${groupId} is now ${access}.`,
      subjectId: null,
      ticketId,
      data: { shareId, groupId, access, affectedPersonIds, role },
    });
    return ok({ share: selectors.files.share(shareId) });
  }

  // -------------------------------------------------------------------------
  // machines: services, software, network
  // -------------------------------------------------------------------------

  function restartService(machineId, serviceKey, { ticketId = null, role = "helpdesk" } = {}) {
    const target = machine(machineId);
    if (!target) return fail("unknown-machine");
    const isSpooler = String(serviceKey) === "spooler" || String(serviceKey) === "svc_spooler" || String(serviceKey) === "Spooler";
    const serviceRecord = target.services.find(
      (s) => s.id === serviceKey || s.name === serviceKey || s.id === `svc_${serviceKey}`,
    );
    if (!serviceRecord) return fail("unknown-service");

    let cleared = [];
    store.commit((draft) => {
      const targetDraft = draft.machines.find((m) => m.id === machineId);
      const serviceDraft = targetDraft.services.find((s) => s.id === serviceRecord.id);
      serviceDraft.status = "running";
      if (isSpooler) {
        cleared = targetDraft.printers.flatMap((printer) =>
          printer.queue.map((job) => ({ jobId: job.id, document: job.document })),
        );
        for (const printer of targetDraft.printers) printer.queue = [];
      }
    });

    events.emit("service:restarted", {
      category: "System",
      code: 7036,
      message: `${serviceRecord.displayName} on ${target.hostname} entered the running state.${
        cleared.length ? ` Cleared ${cleared.length} stuck print job${cleared.length === 1 ? "" : "s"}.` : ""
      }`,
      subjectId: target.ownerId,
      ticketId,
      data: { machineId, service: serviceRecord.name, cleared, role },
    });
    return ok({ cleared, delay: clock.delayFor("restartService"), service: selectors.machines.service(machineId, serviceKey) });
  }

  function installSoftware(machineId, softwareId, { ticketId = null, role = "helpdesk" } = {}) {
    const target = machine(machineId);
    const software = state().directoryServices.softwareCatalogue.find((s) => s.id === softwareId);
    if (!target) return fail("unknown-machine");
    if (!software) return fail("unknown-software");
    if (target.software.includes(softwareId)) return fail("already-installed");

    store.commit((draft) => {
      draft.machines.find((m) => m.id === machineId).software.push(softwareId);
    });

    events.emit("software:installed", {
      category: "Application",
      code: 11707,
      message: `${software.name} ${software.version} installed on ${target.hostname}.`,
      subjectId: target.ownerId,
      ticketId,
      data: { machineId, softwareId, associations: software.associations, role },
    });
    return ok({ software, delay: clock.delayFor("installSoftware") });
  }

  function removeSoftware(machineId, softwareId) {
    const target = machine(machineId);
    if (!target) return fail("unknown-machine");
    if (!target.software.includes(softwareId)) return fail("not-installed");
    store.commit((draft) => {
      const record = draft.machines.find((m) => m.id === machineId);
      record.software = record.software.filter((id) => id !== softwareId);
    });
    events.emit("software:removed", {
      category: "Application",
      code: 11724,
      level: "warning",
      message: `${softwareId} removed from ${target.hostname}.`,
      subjectId: target.ownerId,
      data: { machineId, softwareId },
    });
    return ok();
  }

  function setNetworkState(machineId, connected) {
    const target = machine(machineId);
    if (!target) return fail("unknown-machine");
    store.commit((draft) => {
      draft.machines.find((m) => m.id === machineId).network.connected = Boolean(connected);
    });
    events.emit(connected ? "network:connected" : "network:disconnected", {
      category: "System",
      code: connected ? 27 : 22,
      level: connected ? "info" : "warning",
      message: `Network adapter on ${target.hostname} ${connected ? "connected" : "disconnected"}.`,
      subjectId: target.ownerId,
      data: { machineId, connected: Boolean(connected) },
    });
    return ok({ machine: selectors.machines.get(machineId) });
  }

  function setDeviceStatus(machineId, deviceId, status) {
    const target = machine(machineId);
    if (!target) return fail("unknown-machine");
    const device = target.devices.find((d) => d.id === deviceId);
    if (!device) return fail("unknown-device");
    store.commit((draft) => {
      draft.machines.find((m) => m.id === machineId).devices.find((d) => d.id === deviceId).status = status;
    });
    events.emit("device:status-changed", {
      category: "System",
      code: 20001,
      level: status === "ok" ? "info" : "warning",
      message: `Device ${device.name} on ${target.hostname} is now ${status}.`,
      subjectId: target.ownerId,
      data: { machineId, deviceId, status },
    });
    return ok();
  }

  // -------------------------------------------------------------------------
  // files
  // -------------------------------------------------------------------------

  function saveFile({ path, name, contents = "", ownerId = null, kind = "text" }) {
    if (!path || !name) return fail("path-and-name-required");
    const base = String(path).replace(/\\/g, "/").replace(/\/+$/, "");
    const existing = state().files.items.find((f) => f.path === base && f.name === name);
    const size = `${Math.max(1, Math.ceil(String(contents).length / 1024))} KB`;
    const stamp = now();

    let fileId = existing?.id;
    store.commit((draft) => {
      const current = draft.files.items.find((f) => f.path === base && f.name === name);
      if (current) {
        current.contents = contents;
        current.version += 1;
        current.modified = stamp;
        current.size = size;
      } else {
        const nextNumber = draft.files.items.reduce((max, f) => Math.max(max, Number(f.id.slice(2)) || 0), 0) + 1;
        fileId = `f_${String(nextNumber).padStart(3, "0")}`;
        draft.files.items.push({
          id: fileId,
          path: base,
          name,
          kind,
          size,
          modified: stamp,
          contents,
          ownerId: ownerId || draft.session.technicianId,
          version: 1,
        });
      }
    });

    events.emit("file:saved", {
      category: "Application",
      code: 2004,
      message: `${name} saved to ${base} (version ${existing ? existing.version + 1 : 1}).`,
      subjectId: ownerId,
      data: { path: base, name, fileId, created: !existing },
    });
    return ok({ file: selectors.files.byName(base, name) });
  }

  function importRegistry(machineId, fileIdOrName) {
    const target = machine(machineId);
    if (!target) return fail("unknown-machine");
    const file =
      state().files.items.find((f) => f.id === fileIdOrName) ||
      state().files.items.find((f) => f.name === fileIdOrName && f.kind === "registry");
    if (!file) return fail("unknown-registry-file");

    const entries = [];
    let section = null;
    for (const raw of String(file.contents || "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith(";")) continue;
      const sectionMatch = line.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        section = sectionMatch[1];
        continue;
      }
      const valueMatch = line.match(/^"([^"]+)"=(.*)$/);
      if (!valueMatch || !section) continue;
      const path = section
        .replace(/^HKEY_LOCAL_MACHINE/i, "HKLM")
        .replace(/^HKEY_CURRENT_USER/i, "HKCU")
        .replace(/^HKEY_CLASSES_ROOT/i, "HKCR");
      entries.push({ path, name: valueMatch[1], type: "dword", value: parseRegValue(valueMatch[2]) });
    }
    if (!entries.length) return fail("no-registry-values");

    store.commit((draft) => {
      for (const entry of entries) {
        const existing = draft.directoryServices.registry.find((r) => r.path === entry.path && r.name === entry.name);
        if (existing) {
          existing.value = entry.value;
          existing.type = entry.type;
        } else {
          draft.directoryServices.registry.push(entry);
        }
        if (entry.path.startsWith("HKLM\\SOFTWARE\\Policies\\Halcyon")) {
          draft.directoryServices.policies[entry.name] = entry.value;
        }
      }
    });

    events.emit("registry:imported", {
      category: "Security",
      code: 4657,
      level: "warning",
      message: `${entries.length} registry value${entries.length === 1 ? "" : "s"} imported on ${target.hostname} from ${file.name}.`,
      subjectId: target.ownerId,
      data: { machineId, file: file.name, entries },
    });
    return ok({ entries, policies: selectors.directoryServices.policies() });
  }

  // -------------------------------------------------------------------------
  // mail
  // -------------------------------------------------------------------------

  function sendMail({ fromPersonId, toPersonId = null, subject, lines = [], ticketId = null }) {
    const sender = person(fromPersonId);
    if (!sender) return fail("unknown-sender");
    if (!selectors.mail.canSendFrom(fromPersonId)) return fail("no-network");
    if (toPersonId) {
      if (!person(toPersonId)) return fail("unknown-recipient");
      if (!selectors.mail.canDeliverTo(toPersonId)) return fail("recipient-disabled");
    }

    const nextNumber = state().mail.reduce((max, m) => Math.max(max, Number(m.id.split("_").pop()) || 0), 0) + 1;
    const record = {
      id: `mail_${String(nextNumber).padStart(4, "0")}`,
      folder: "sent",
      from: sender.displayName,
      fromAddress: sender.email,
      replyTo: sender.email,
      returnPath: sender.email,
      toPersonId,
      subject: String(subject || "(no subject)"),
      lines: lines.map(String),
      personId: fromPersonId,
      ticketId,
      read: true,
      receivedAt: now(),
      day: null,
      briefing: false,
    };

    store.commit((draft) => {
      draft.mail.push(record);
    });

    events.emit("mail:sent", {
      category: "Application",
      code: 2005,
      message: `Mail sent from ${sender.logonName}${toPersonId ? ` to ${person(toPersonId).logonName}` : ""}: "${record.subject}".`,
      subjectId: fromPersonId,
      ticketId,
      data: { mailId: record.id, toPersonId },
    });
    return ok({ mail: record });
  }

  function markMailRead(mailId) {
    const message = state().mail.find((m) => m.id === mailId);
    if (!message) return fail("unknown-mail");
    if (message.read) return ok({ changed: false });
    store.commit((draft) => {
      draft.mail.find((m) => m.id === mailId).read = true;
    });
    events.bump("mail:changed");
    return ok({ changed: true });
  }

  // -------------------------------------------------------------------------
  // tickets
  // -------------------------------------------------------------------------

  function replyToTicket(ticketId, { template = "info", text = "" } = {}) {
    const ticket = state().tickets.find((t) => t.id === Number(ticketId));
    if (!ticket) return fail("unknown-ticket");
    if (ticket.status === "resolved") return fail("ticket-resolved");
    if (!["deny", "approve", "info"].includes(template)) return fail("unknown-reply-template");

    const message = state().mail.find((m) => m.id === ticket.mailId);
    const bodyByTemplate = {
      deny: "Thanks for the request. I'm afraid this one is a no under the current policy. If your manager wants to challenge it, ask them to open a ticket.",
      approve: "Approved. I've actioned what you asked for — reply on this ticket if it is not working.",
      info: "I've had a look at this. Reply on this ticket with a bit more detail and I'll pick it up.",
    };
    const lines = text.trim() ? String(text).split(/\r?\n/) : [bodyByTemplate[template]];
    const sent = sendMail({
      fromPersonId: state().session.technicianId,
      toPersonId: ticket.personId,
      subject: `Re: ${message?.subject || `Ticket #${ticket.id}`}`,
      lines,
      ticketId: ticket.id,
    });
    if (!sent.ok) return fail(sent.reason);

    store.commit((draft) => {
      draft.tickets.find((t) => t.id === ticket.id).replies.push({
        template,
        text: lines.join("\n"),
        at: now(),
        mailId: sent.mail.id,
      });
    });

    events.emit("ticket:replied", {
      category: "Application",
      code: 2001,
      message: `Reply sent on ticket #${ticket.id} (${template}).`,
      subjectId: ticket.personId,
      ticketId: ticket.id,
      data: { template, text: lines.join("\n"), mailId: sent.mail.id },
    });
    return ok({ reply: selectors.tickets.get(ticket.id)?.replies?.slice(-1)[0] });
  }

  function escalateTicket(ticketId, teamId, note = "") {
    const ticket = state().tickets.find((t) => t.id === Number(ticketId));
    if (!ticket) return fail("unknown-ticket");
    if (ticket.status === "resolved") return fail("ticket-resolved");
    const team = state().org.teams.find((entry) => entry.id === teamId);
    if (!team) return fail("unknown-team");
    if (ticket.escalations.some((entry) => entry.teamId === teamId)) return fail("already-escalated");

    store.commit((draft) => {
      draft.tickets.find((t) => t.id === ticket.id).escalations.push({
        teamId,
        note: String(note || ""),
        at: now(),
        byId: state().session.technicianId,
      });
    });

    events.emit("ticket:escalated", {
      category: "Application",
      code: 2002,
      message: `Ticket #${ticket.id} escalated to ${team.name}.`,
      subjectId: ticket.personId,
      ticketId: ticket.id,
      data: { teamId, note: String(note || "") },
    });
    return ok({ team, ticket: selectors.tickets.get(ticket.id) });
  }

  function closeTicket(ticketId, { category, note } = {}) {
    const ticket = state().tickets.find((t) => t.id === Number(ticketId));
    if (!ticket) return fail("unknown-ticket");
    if (ticket.status === "resolved") return fail("already-closed");
    if (!["resolved", "returned", "escalated", "duplicate", "unable"].includes(category)) {
      return fail("unknown-category");
    }
    const text = String(note || "").trim();
    if (text.length < 10) return fail("note-too-short", { minimum: 10 });

    const complete = ticket.objectives.length > 0 && ticket.objectives.every((objective) => objective.status === "met");
    if (category === "resolved" && !complete) return fail("objectives-incomplete");
    if (category === "escalated" && ticket.escalations.length === 0) return fail("escalation-required");

    const wrongClosure = complete && !["resolved", "escalated"].includes(category);
    const scoredCorrect = complete && !wrongClosure && ticket.wrongActions.length === 0;
    const outcome = complete ? (scoredCorrect ? "correct" : "incorrect") : "deferred";
    const trustDelta = outcome === "incorrect" ? -TRUST_HIT : 0;
    const day = state().session.day;
    const at = now();
    const wrongRecord = wrongClosure
      ? {
          id: `wc_${ticket.id}_${ticket.wrongClosures.length + 1}`,
          reason: "wrong-closure",
          detail: `Closed as "${category}" although every objective was met.`,
          category,
          actorId: state().session.technicianId,
          at,
          day,
        }
      : null;

    store.commit((draft) => {
      const record = draft.tickets.find((t) => t.id === ticket.id);
      record.status = "resolved";
      record.readyToClose = true;
      record.outcome = outcome;
      record.resolvedDay = day;
      record.resolvedAt = at;
      record.trustDelta = trustDelta;
      record.closure = {
        category,
        note: text,
        byId: state().session.technicianId,
        at,
        day,
        evidenceSnapshot: record.evidence.map((entry) => ({ ...entry })),
      };
      if (wrongRecord) record.wrongClosures.push(wrongRecord);
    });

    const scored = session.recordResolved({ correct: outcome === "correct", trustDelta });
    const rule = state().handbook.policies.find((policy) => policy.id === ticket.ruleId);

    events.emit("ticket:resolved", {
      category: "Application",
      code: 2000,
      level: outcome === "correct" ? "info" : "warning",
      message: `Ticket #${ticket.id} closed as ${category} (${outcome}). Policy ${ticket.ruleId}${rule ? ` — ${rule.title}` : ""}.`,
      subjectId: ticket.personId,
      ticketId: ticket.id,
      data: {
        category,
        note: text,
        outcome,
        correct: outcome === "correct",
        ruleId: ticket.ruleId,
        trustDelta,
        trust: scored.trust,
        wrongActions: ticket.wrongActions.length,
        wrongClosure: Boolean(wrongRecord),
        evidence: ticket.evidence.length,
        personId: ticket.personId,
        machineId: ticket.machineId,
      },
    });

    return ok({
      ticket: selectors.tickets.get(ticket.id),
      outcome,
      correct: outcome === "correct",
      trust: scored.trust,
      trustDelta,
    });
  }

  return {
    // shift + ui
    startShift,
    endShift,
    nextDay,
    setUi,
    resetWorld,
    // accounts
    addPerson,
    setAccountEnabled,
    resetPassword,
    setAccountLocked,
    // groups + shares
    addToGroup,
    removeFromGroup,
    setShareAccess,
    // machines
    restartService,
    installSoftware,
    removeSoftware,
    setNetworkState,
    setDeviceStatus,
    // files
    saveFile,
    importRegistry,
    // mail
    sendMail,
    markMailRead,
    // tickets
    replyToTicket,
    escalateTicket,
    closeTicket,
  };
}

function parseRegValue(raw) {
  const value = raw.trim();
  if (value.startsWith("dword:")) {
    const number = Number.parseInt(value.slice(6), 16);
    return Number.isNaN(number) ? value : String(number);
  }
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}
