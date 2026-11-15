// Human labels for ticket objectives, shared by the watcher's evidence trail
// and the prose the desk shows. Content, not state.

const personName = (state, personId) =>
  state.people.find((person) => person.id === personId)?.displayName || personId || "someone";

export function objectiveLabel(objective, state) {
  switch (objective.kind) {
    case "password.reset":
      return `Reset the password for ${personName(state, objective.personId)}`;
    case "account.unlock":
      return `Unlock ${personName(state, objective.personId)}'s account`;
    case "account.disable":
      return `Disable ${personName(state, objective.personId)}'s account`;
    case "group.add":
      return `Add ${personName(state, objective.personId)} to ${
        state.org.groups.find((group) => group.id === objective.groupId)?.name || objective.groupId
      }`;
    case "group.remove":
      return `Remove ${personName(state, objective.personId)} from ${
        state.org.groups.find((group) => group.id === objective.groupId)?.name || objective.groupId
      }`;
    case "share.grant":
      return `Grant ${objective.access || "read"} on ${
        state.files.shares.find((share) => share.id === objective.shareId)?.label || objective.shareId
      } to ${personName(state, objective.personId)}`;
    case "service.restart":
      return `Restart ${objective.serviceId} on ${objective.machineId || "the user's machine"}`;
    case "software.install":
      return `Install ${
        state.directoryServices.softwareCatalogue.find((software) => software.id === objective.appId)?.name ||
        objective.appId
      }`;
    case "software.remove":
      return `Remove ${objective.appId}`;
    case "escalate":
      return `Escalate to ${state.org.teams.find((team) => team.id === objective.teamId)?.name || objective.teamId}`;
    case "ticket.reply":
      return `Reply to the user: ${objective.template}`;
    default:
      return objective.kind;
  }
}
