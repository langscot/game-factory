// Ticket watchers. Each open ticket has a set of objectives, and every action
// event is evaluated against every open ticket:
//
//   * objective predicates are state-based, so doing the right thing twice is
//     still correct and an already-desired state counts as met;
//   * a wrong target / over-permission / broader role is recorded as evidence
//     against the ticket, but never closes it;
//   * when every objective is met the ticket resolves from evidence — there is
//     no "approve" button anywhere in the game.

import { TRUST_HIT } from "./session.js";
import { objectiveLabel } from "./objective-label.js";

const ACTION_TYPES = new Set([
  "account:password-reset",
  "account:enabled",
  "account:disabled",
  "account:locked",
  "account:unlocked",
  "group:member-added",
  "group:member-removed",
  "share:permissions-changed",
  "service:restarted",
  "software:installed",
  "software:removed",
  "ticket:replied",
  "ticket:escalated",
]);

const FAMILY = {
  "account:password-reset": "account",
  "account:enabled": "account",
  "account:disabled": "account",
  "account:locked": "account",
  "account:unlocked": "account",
  "group:member-added": "group",
  "group:member-removed": "group",
  "share:permissions-changed": "share",
  "service:restarted": "service",
  "software:installed": "software",
  "software:removed": "software",
  "ticket:replied": "reply",
  "ticket:escalated": "escalate",
};

const ROLE_RANK = { "self-service": 0, helpdesk: 1, "domain-admin": 2 };

const KIND_FAMILY = {
  "password.reset": "account",
  "account.unlock": "account",
  "account.disable": "account",
  "group.add": "group",
  "group.remove": "group",
  "share.grant": "share",
  "service.restart": "service",
  "software.install": "software",
  "software.remove": "software",
  "ticket.reply": "reply",
  escalate: "escalate",
};

const ACTION_LABEL = {
  "account:password-reset": "Password reset",
  "account:enabled": "Account enabled",
  "account:disabled": "Account disabled",
  "account:locked": "Account locked",
  "account:unlocked": "Account unlocked",
  "group:member-added": "Added to group",
  "group:member-removed": "Removed from group",
  "share:permissions-changed": "Share permission changed",
  "service:restarted": "Service restarted",
  "software:installed": "Software installed",
  "software:removed": "Software removed",
  "ticket:replied": "Reply sent",
  "ticket:escalated": "Escalated",
};

const SHARE_RANK = { none: 0, read: 1, modify: 2 };

const personName = (state, personId) => state.people.find((p) => p.id === personId)?.displayName || personId || "someone";

function effectiveAccess(state, shareId, personId) {
  const share = state.files.shares.find((s) => s.id === shareId);
  const person = state.people.find((p) => p.id === personId);
  if (!share || !person) return "none";
  let best = "none";
  for (const entry of share.acl) {
    const applies = entry.personId ? entry.personId === personId : person.groupIds.includes(entry.groupId);
    if (applies && SHARE_RANK[entry.access] > SHARE_RANK[best]) best = entry.access;
  }
  return best;
}

function objectiveMet(objective, ticket, state) {
  switch (objective.kind) {
    case "password.reset": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return person?.account.password === "reset-required";
    }
    case "account.unlock": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return person?.account.state === "enabled";
    }
    case "account.disable": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return person?.account.state === "disabled";
    }
    case "group.add": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return Boolean(person?.groupIds.includes(objective.groupId));
    }
    case "group.remove": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return Boolean(person) && !person.groupIds.includes(objective.groupId);
    }
    case "share.grant": {
      const access = effectiveAccess(state, objective.shareId, objective.personId || ticket.personId);
      return SHARE_RANK[access] >= SHARE_RANK[objective.access || "read"];
    }
    case "service.restart": {
      const machine = state.machines.find((m) => m.id === objective.machineId || m.id === ticket.machineId);
      const service = machine?.services.find(
        (s) => s.id === objective.serviceId || s.name === objective.serviceId || s.id === `svc_${objective.serviceId}`,
      );
      return service?.status === "running";
    }
    case "software.install": {
      const machine = state.machines.find((m) => m.id === objective.machineId || m.id === ticket.machineId);
      return Boolean(machine?.software.includes(objective.appId));
    }
    case "software.remove": {
      const machine = state.machines.find((m) => m.id === objective.machineId || m.id === ticket.machineId);
      return Boolean(machine) && !machine.software.includes(objective.appId);
    }
    case "escalate":
      return ticket.escalations.some((entry) => entry.teamId === objective.teamId);
    case "ticket.reply":
      return ticket.replies.some((entry) => entry.template === objective.template);
    default:
      return false;
  }
}

function describeObjective(objective, ticket, state) {
  switch (objective.kind) {
    case "password.reset": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return { accountState: person?.account.state, password: person?.account.password };
    }
    case "account.unlock":
    case "account.disable": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return { accountState: person?.account.state };
    }
    case "group.add":
    case "group.remove": {
      const person = state.people.find((p) => p.id === objective.personId || p.id === ticket.personId);
      return { groups: person?.groupIds?.slice() || [] };
    }
    case "share.grant":
      return { access: effectiveAccess(state, objective.shareId, objective.personId || ticket.personId) };
    case "service.restart": {
      const machine = state.machines.find((m) => m.id === objective.machineId || m.id === ticket.machineId);
      const service = machine?.services.find((s) => s.id === objective.serviceId || s.id === `svc_${objective.serviceId}`);
      return { service: objective.serviceId, status: service?.status };
    }
    case "software.install":
    case "software.remove": {
      const machine = state.machines.find((m) => m.id === objective.machineId || m.id === ticket.machineId);
      return { software: machine?.software?.slice() || [] };
    }
    case "escalate":
      return { escalatedTo: ticket.escalations.map((entry) => entry.teamId) };
    case "ticket.reply":
      return { replies: ticket.replies.map((entry) => entry.template) };
    default:
      return {};
  }
}

function matchesTarget(objective, ticket, state, event) {
  switch (objective.kind) {
    case "password.reset":
      return event.type === "account:password-reset" && event.subjectId === (objective.personId || ticket.personId);
    case "account.unlock":
      return (
        (event.type === "account:enabled" || event.type === "account:password-reset" || event.type === "account:unlocked") &&
        event.subjectId === (objective.personId || ticket.personId)
      );
    case "account.disable":
      return event.type === "account:disabled" && event.subjectId === (objective.personId || ticket.personId);
    case "group.add":
      return (
        event.type === "group:member-added" &&
        event.data?.groupId === objective.groupId &&
        (event.data?.personId || event.subjectId) === (objective.personId || ticket.personId)
      );
    case "share.grant":
      return event.type === "share:permissions-changed" && event.data?.shareId === objective.shareId;
    case "service.restart":
      return event.type === "service:restarted" && event.data?.service === objective.serviceId;
    case "software.install":
      return event.type === "software:installed" && event.data?.softwareId === objective.appId;
    case "ticket.reply":
      return event.type === "ticket:replied" && event.data?.template === objective.template;
    case "escalate":
      return event.type === "ticket:escalated" && event.data?.teamId === objective.teamId;
    default:
      return false;
  }
}

export function createTicketWatcher({ store, events, session, clock }) {
  let evaluating = false;

  const state = () => store.state;

  function recordEvidence(ticket, objective, event, draft) {
    const before = objective.baseline ?? describeObjective(objective, ticket, state());
    const after = describeObjective(objective, ticket, state());
    const evidence = {
      id: `evd_${ticket.id}_${draft.evidence.length + 1}`,
      objectiveId: objective.id,
      action: event?.type || "state.check",
      actionLabel: ACTION_LABEL[event?.type] || "State check",
      actionEventId: event?.id || null,
      actorId: event?.actorId || draft.session.technicianId,
      role: event?.data?.role || "helpdesk",
      at: event?.at || clock.stamp(),
      day: draft.session.day,
      before,
      after,
      summary: objectiveLabel(objective, state()),
    };
    draft.evidence.push(evidence);
    return evidence;
  }

  /** A wrong action that should be shown on the case, but not close it. */
  function noteWrong(ticket, draft, event, reason, detail, objectiveId = null) {
    const duplicate = draft.wrongActions.some(
      (entry) => entry.action === event?.type && entry.reason === reason && entry.eventId === event?.id,
    );
    if (duplicate) return null;
    const record = {
      id: `wr_${ticket.id}_${draft.wrongActions.length + 1}`,
      eventId: event?.id || null,
      action: event?.type || "unknown",
      actionLabel: ACTION_LABEL[event?.type] || "Unknown action",
      reason,
      detail,
      objectiveId,
      actorId: event?.actorId || draft.session.technicianId,
      role: event?.data?.role || "helpdesk",
      at: event?.at || clock.stamp(),
      day: draft.session.day,
    };
    draft.wrongActions.push(record);
    if (objectiveId) {
      const objective = ticket.objectives.find((item) => item.id === objectiveId);
      if (objective && objective.status !== "met") objective.status = "wrong";
    }
    return record;
  }

  /** Classify an action event against a ticket that is still open. */
  function detectWrong(ticket, draft, event, matchedObjectives) {
    const family = FAMILY[event.type];
    if (!family) return null;

    const personId = ticket.personId;
    const aboutPerson =
      event.subjectId === personId ||
      event.data?.personId === personId ||
      (event.data?.affectedPersonIds || []).includes(personId);
    const aboutMachine = Boolean(ticket.machineId) && event.data?.machineId === ticket.machineId;
    const familyObjectives = ticket.objectives.filter((objective) => KIND_FAMILY[objective.kind] === family);
    const selected = draft.session.ui?.ticketdesk?.selectedId === ticket.id;

    // Broader role than the objective allowed, even when the objective was met.
    const role = event.data?.role;
    if (role && ROLE_RANK[role] !== undefined) {
      const relevant = [...matchedObjectives, ...familyObjectives];
      const stricter = relevant.find((objective) => ROLE_RANK[role] > ROLE_RANK[objective.maxRole || "helpdesk"]);
      if (stricter) {
        return noteWrong(
          ticket,
          draft,
          event,
          "broader-role",
          `${ACTION_LABEL[event.type] || event.type} used ${role}; this case only needs ${
            stricter.maxRole || "helpdesk"
          }.`,
          stricter.id,
        );
      }
    }

    // Over-permission: a guarded share gained access that the case never asked for.
    if (event.type === "share:permissions-changed" && ticket.guards?.shareIds?.includes(event.data?.shareId)) {
      const affected = event.data?.affectedPersonIds || [];
      const asksForShare = ticket.objectives.some(
        (objective) => objective.kind === "share.grant" && objective.shareId === event.data.shareId,
      );
      if (!asksForShare && affected.includes(personId) && event.data.access !== "none") {
        return noteWrong(
          ticket,
          draft,
          event,
          "over-permission",
          `Granted ${event.data.access} on ${event.data.shareId} to ${personName(state(), personId)}, who should not have it.`,
        );
      }
      if (event.data.access === "none") return null;
    }

    // Installing guarded software that the case did not ask for.
    if (event.type === "software:installed" && ticket.guards?.softwareIds?.includes(event.data?.softwareId)) {
      const asked = ticket.objectives.some(
        (objective) => objective.kind === "software.install" && objective.appId === event.data.softwareId,
      );
      if (!asked) {
        return noteWrong(
          ticket,
          draft,
          event,
          "unapproved-install",
          `Installed ${event.data.softwareId} on the user's machine; the case says not to.`,
        );
      }
    }

    // Replies and escalations belong to this ticket by id.
    if (event.ticketId === ticket.id && family === "reply") {
      const wants = familyObjectives[0];
      if (wants && !matchedObjectives.some((objective) => objective.kind === "ticket.reply")) {
        return noteWrong(
          ticket,
          draft,
          event,
          "wrong-reply",
          `Replied "${event.data?.template}" but the case needs "${wants.template}".`,
          wants.id,
        );
      }
    }

    if (event.ticketId === ticket.id && family === "escalate") {
      const wants = familyObjectives[0];
      if (wants && !matchedObjectives.some((objective) => objective.kind === "escalate")) {
        return noteWrong(
          ticket,
          draft,
          event,
          "wrong-team",
          `Escalated to ${event.data?.teamId}; this case goes to ${wants.teamId}.`,
          wants.id,
        );
      }
      if (!wants) {
        return noteWrong(ticket, draft, event, "unnecessary-escalation", "Escalated a case that did not need it.");
      }
    }

    if (!aboutPerson && !aboutMachine) {
      // Wrong target only flags the case the technician currently has open.
      if (selected && family === "account" && familyObjectives.length) {
        return noteWrong(
          ticket,
          draft,
          event,
          "wrong-target",
          `${ACTION_LABEL[event.type] || event.type} for ${personName(state(), event.subjectId)}, but this case is about ${personName(
            state(),
            personId,
          )}.`,
          familyObjectives[0].id,
        );
      }
      return null;
    }

    if (matchedObjectives.length) return null;
    if (ticket.objectives.some((objective) => matchesTarget(objective, ticket, state(), event))) return null;
    if (!familyObjectives.length) return null;

    return noteWrong(
      ticket,
      draft,
      event,
      family === "share" ? "over-permission" : "wrong-action",
      `${ACTION_LABEL[event.type] || event.type} did not match what this case needs.`,
      familyObjectives[0].id,
    );
  }

  function evaluate(event) {
    if (evaluating) return;
    evaluating = true;
    try {
      const current = state();
      const running = current.session.shift.state === "running";
      const selectedId = current.session.ui?.ticketdesk?.selectedId || null;

      for (const ticket of current.tickets) {
        if (ticket.status !== "open") continue;
        // Future days stay asleep until their shift starts.
        if (ticket.day > current.session.day) continue;

        // Baselines are captured before the shift so evidence can show before/after.
        const pending = ticket.objectives.filter((objective) => objective.status !== "met");
        for (const objective of pending) {
          if (objective.baseline === null) objective.baseline = describeObjective(objective, ticket, current);
        }

        const matched = [];
        const newlyMet = [];
        for (const objective of ticket.objectives) {
          if (objective.status === "met") continue;
          if (objectiveMet(objective, ticket, current)) {
            matched.push(objective);
            newlyMet.push(objective);
          }
        }

        const draft = {
          session: current.session,
          evidence: ticket.evidence,
          wrongActions: ticket.wrongActions,
        };

        let wrong = null;
        if (event && ACTION_TYPES.has(event.type)) wrong = detectWrong(ticket, draft, event, matched);

        if (newlyMet.length) {
          for (const objective of newlyMet) {
            const evidence = recordEvidence(ticket, objective, event, draft);
            objective.status = "met";
            objective.evidenceId = evidence.id;
          }
        }

        if (!newlyMet.length && !wrong) continue;

        store.notify();

        for (const objective of newlyMet) {
          events.emit("ticket:objective-met", {
            category: "Application",
            code: 2003,
            message: `Objective met on #${ticket.id}: ${objectiveLabel(objective, current)}.`,
            subjectId: ticket.personId,
            ticketId: ticket.id,
            data: { objectiveId: objective.id, kind: objective.kind, evidence: ticket.evidence[ticket.evidence.length - 1] },
          });
        }

        if (wrong) {
          events.emit("ticket:wrong-action", {
            category: "Application",
            code: 2004,
            level: "warning",
            message: `Case #${ticket.id} marked ${wrong.reason}: ${wrong.detail}`,
            subjectId: ticket.personId,
            ticketId: ticket.id,
            data: { reason: wrong.reason, detail: wrong.detail },
          });
        }

        const allMet = ticket.objectives.every((objective) => objective.status === "met");
        if (allMet && running && ticket.status === "open") finalize(ticket);
      }
    } finally {
      evaluating = false;
    }
  }

  function finalize(ticket) {
    const current = state();
    const correct = ticket.wrongActions.length === 0;
    const trustDelta = correct ? 0 : -TRUST_HIT;
    const day = current.session.day;

    store.commit((draft) => {
      const record = draft.tickets.find((item) => item.id === ticket.id);
      record.status = "resolved";
      record.outcome = correct ? "correct" : "incorrect";
      record.resolvedDay = day;
      record.resolvedAt = clock.stamp();
      record.trustDelta = trustDelta;
    });

    const scored = session.recordResolved({ correct, trustDelta });
    const rule = current.handbook.policies.find((policy) => policy.id === ticket.ruleId);

    events.emit("ticket:resolved", {
      category: "Application",
      code: 2000,
      level: correct ? "info" : "warning",
      message: `Ticket #${ticket.id} resolved from evidence${correct ? "" : " with wrong actions"}. Policy ${ticket.ruleId}${
        rule ? ` — ${rule.title}` : ""
      }.`,
      subjectId: ticket.personId,
      ticketId: ticket.id,
      data: {
        correct,
        ruleId: ticket.ruleId,
        trustDelta,
        trust: scored.trust,
        wrongActions: ticket.wrongActions.length,
        evidence: ticket.evidence.length,
        personId: ticket.personId,
        machineId: ticket.machineId,
      },
    });
  }

  events.on("*", (event) => {
    if (!ACTION_TYPES.has(event.type)) return;
    evaluate(event);
  });

  // Capture baselines and pick up anything already true when a shift starts.
  events.on("session:shift-started", () => evaluate(null));
  events.on("session:day-started", () => evaluate(null));

  return {
    evaluate: () => evaluate(null),
    /** Exposed for the harness: what the checklist would say right now. */
    checklist: (ticketId) => {
      const ticket = state().tickets.find((item) => item.id === Number(ticketId));
      if (!ticket) return null;
      return ticket.objectives.map((objective) => ({
        id: objective.id,
        kind: objective.kind,
        label: objectiveLabel(objective, state()),
        status: objective.status,
      }));
    },
  };
}
