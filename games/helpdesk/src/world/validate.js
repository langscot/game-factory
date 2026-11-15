// Content references entities by id, never by name in prose. This validator runs
// at load time and fails loudly on a dangling reference, so a typo in the seed
// shows up as an error instead of a blank app.

export function findProblems(state) {
  const problems = [];
  const people = new Map(state.people.map((p) => [p.id, p]));
  const groups = new Map(state.org.groups.map((g) => [g.id, g]));
  const departments = new Set(state.org.departments.map((d) => d.id));
  const machines = new Map(state.machines.map((m) => [m.id, m]));
  const tickets = new Map(state.tickets.map((t) => [t.id, t]));
  const mail = new Map(state.mail.map((m) => [m.id, m]));
  const rules = new Set(state.handbook.policies.map((p) => p.id));
  const software = new Set(state.directoryServices.softwareCatalogue.map((s) => s.id));
  const drivers = new Set(state.directoryServices.drivers.map((d) => d.id));

  for (const person of state.people) {
    if (!departments.has(person.departmentId)) problems.push(`person ${person.id}: unknown department ${person.departmentId}`);
    if (person.managerId && !people.has(person.managerId)) problems.push(`person ${person.id}: unknown manager ${person.managerId}`);
    for (const groupId of person.groupIds) {
      if (!groups.has(groupId)) {
        problems.push(`person ${person.id}: unknown group ${groupId}`);
        continue;
      }
      if (!groups.get(groupId).memberIds.includes(person.id)) {
        problems.push(`person ${person.id}: group ${groupId} does not list them as a member`);
      }
    }
  }

  for (const group of state.org.groups) {
    for (const memberId of group.memberIds) {
      const member = people.get(memberId);
      if (!member) {
        problems.push(`group ${group.id}: unknown member ${memberId}`);
      } else if (!member.groupIds.includes(group.id)) {
        problems.push(`group ${group.id}: member ${memberId} does not list the group`);
      }
    }
  }

  for (const machine of state.machines) {
    if (!people.has(machine.ownerId)) problems.push(`machine ${machine.id}: unknown owner ${machine.ownerId}`);
    for (const softwareId of machine.software) {
      if (!software.has(softwareId)) problems.push(`machine ${machine.id}: unknown software ${softwareId}`);
    }
    for (const device of machine.devices) {
      if (!drivers.has(device.driverId)) problems.push(`machine ${machine.id}: device ${device.id} has unknown driver ${device.driverId}`);
    }
  }

  for (const ticket of state.tickets) {
    if (!people.has(ticket.personId)) problems.push(`ticket ${ticket.id}: unknown person ${ticket.personId}`);
    if (ticket.machineId && !machines.has(ticket.machineId)) problems.push(`ticket ${ticket.id}: unknown machine ${ticket.machineId}`);
    if (!rules.has(ticket.ruleId)) problems.push(`ticket ${ticket.id}: unknown policy ${ticket.ruleId}`);
    if (!mail.has(ticket.mailId)) problems.push(`ticket ${ticket.id}: unknown mail ${ticket.mailId}`);
    if (!ticket.objectives?.length) problems.push(`ticket ${ticket.id}: no objectives`);

    for (const objective of ticket.objectives || []) {
      switch (objective.kind) {
        case "password.reset":
        case "account.unlock":
        case "account.disable":
          if (objective.personId && !people.has(objective.personId)) {
            problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown person ${objective.personId}`);
          }
          break;
        case "group.add":
        case "group.remove":
          if (!groups.has(objective.groupId)) problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown group ${objective.groupId}`);
          break;
        case "share.grant":
          if (!state.files.shares.some((share) => share.id === objective.shareId)) {
            problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown share ${objective.shareId}`);
          }
          break;
        case "service.restart":
          if (objective.machineId && !machines.has(objective.machineId)) {
            problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown machine ${objective.machineId}`);
          }
          break;
        case "software.install":
        case "software.remove":
          if (!software.has(objective.appId)) problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown software ${objective.appId}`);
          break;
        case "escalate":
          if (!state.org.teams.some((team) => team.id === objective.teamId)) {
            problems.push(`ticket ${ticket.id}: objective ${objective.id} names unknown team ${objective.teamId}`);
          }
          break;
        case "ticket.reply":
          if (!["deny", "approve", "info"].includes(objective.template)) {
            problems.push(`ticket ${ticket.id}: objective ${objective.id} has unknown reply template ${objective.template}`);
          }
          break;
        default:
          problems.push(`ticket ${ticket.id}: objective ${objective.id} has unknown kind ${objective.kind}`);
      }
    }

    for (const shareId of ticket.guards?.shareIds || []) {
      if (!state.files.shares.some((share) => share.id === shareId)) {
        problems.push(`ticket ${ticket.id}: guard names unknown share ${shareId}`);
      }
    }
    for (const softwareId of ticket.guards?.softwareIds || []) {
      if (!software.has(softwareId)) problems.push(`ticket ${ticket.id}: guard names unknown software ${softwareId}`);
    }
  }

  for (const message of state.mail) {
    if (message.personId && !people.has(message.personId)) problems.push(`mail ${message.id}: unknown person ${message.personId}`);
    if (message.ticketId && !tickets.has(message.ticketId)) problems.push(`mail ${message.id}: unknown ticket ${message.ticketId}`);
  }

  for (const file of state.files.items) {
    if (file.ownerId && !people.has(file.ownerId)) problems.push(`file ${file.id}: unknown owner ${file.ownerId}`);
  }

  for (const share of state.files.shares) {
    for (const entry of share.acl) {
      if (entry.groupId && !groups.has(entry.groupId)) problems.push(`share ${share.id}: unknown group ${entry.groupId}`);
      if (entry.personId && !people.has(entry.personId)) problems.push(`share ${share.id}: unknown person ${entry.personId}`);
    }
  }

  if (!people.has(state.session.technicianId)) problems.push(`session: unknown technician ${state.session.technicianId}`);

  return problems;
}

export function assertValidWorld(store) {
  const problems = findProblems(store.state);
  if (problems.length) {
    throw new Error(`World seed has dangling references:\n  - ${problems.join("\n  - ")}`);
  }
  return true;
}
