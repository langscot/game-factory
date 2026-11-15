// Dev harness. It builds the same world and the same app context as the game,
// opens any app in isolation, and runs the cross-app invariants from issue #26.
//
// Each check resets the world first, so a run is repeatable and checks cannot
// poison each other. Open dev.html, press "Run all checks", and read the list.

import { createWorld, DEFAULT_SEED } from "./world/index.js";
import { registerBuiltinApps, getApp, listApps } from "./apps/index.js";
import { createUi } from "./ui/index.js";
import { createAppContext } from "./context.js";

const $ = (id) => document.getElementById(id);

const world = createWorld({ seed: DEFAULT_SEED });
registerBuiltinApps();
const ui = createUi({ windows: () => [], endWindow: () => {} });
world.clock.start();

// ---------------------------------------------------------------------------
// app preview (the same contract the desktop uses)
// ---------------------------------------------------------------------------

let mounted = null;
let mountedApp = null;
let mountedCtx = null;

function unmountApp() {
  if (!mounted) return;
  mountedApp?.unmount?.(mounted);
  mountedCtx?.dispose();
  mounted.innerHTML = "";
  mounted.className = "dev-stage";
  mounted = null;
  mountedApp = null;
  mountedCtx = null;
  $("devAppMeta").textContent = "no app mounted";
}

function mountApp(appId) {
  const app = getApp(appId);
  if (!app) return;
  unmountApp();
  const stage = $("devStage");
  stage.className = `dev-stage app app-${app.id}`;
  stage.dataset.app = app.id;
  mounted = stage;
  mountedApp = app;
  const handle = {
    id: app.id,
    title: app.title,
    setTitle: () => {},
    close: () => unmountApp(),
  };
  mountedCtx = createAppContext({ platform: world, ui, app, handle, options: {}, open: (id) => mountApp(id) });
  app.mount(stage, mountedCtx);
  $("devAppMeta").textContent = `${app.id} · ${app.size[0]}×${app.size[1]} · ${app.desktop ? "desktop icon + Start" : "Start menu"}`;
  $("devAppSelect").value = app.id;
}

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [
  {
    id: "new-user",
    title: "Adding a user in the store appears in the Directory and the Outlook GAL",
    run(api) {
      const { world: view, actions } = api;
      const created = actions.addPerson({
        displayName: "Nina Okafor",
        logonName: "n.okafor",
        departmentId: "d_sales",
        title: "Sales Rep",
      });
      assert(created.ok, `addPerson failed: ${created.reason}`);
      const id = created.person.id;
      const gal = view.people.gal().find((person) => person.id === id);
      const table = view.people.search("nina").find((person) => person.id === id);
      assert(gal, "GAL selector does not include the new user");
      assert(table, "Directory search does not include the new user");
      assert(view.people.canOpenTicket(id), "new user is not a valid ticket sender");
      return `added ${id}; GAL has ${view.people.gal().length}, directory search finds "${table.displayName}".`;
    },
  },
  {
    id: "disable-user",
    title: "Disabling a user stops mail delivery and machine sign-in",
    run(api) {
      const { world: view, actions } = api;
      assert(view.people.gal().some((person) => person.id === "p_ben"), "Ben should start in the GAL");
      actions.setAccountEnabled("p_ben", false);
      assert(!view.people.gal().some((person) => person.id === "p_ben"), "disabled user is still in the GAL");
      assert(!view.machines.canSignIn("m_ben"), "disabled user can still sign in to m_ben");
      const delivery = actions.sendMail({ fromPersonId: "p_hayes", toPersonId: "p_ben", subject: "Test", lines: ["Hello"] });
      assert(!delivery.ok && delivery.reason === "recipient-disabled", `delivery should fail, got ${delivery.reason}`);
      return "GAL hides Ben, m_ben sign-in false, sendMail -> recipient-disabled.";
    },
  },
  {
    id: "password-event",
    title: "A password reset unlocks the account and logs Security 4724",
    run(api) {
      const { world: view, actions } = api;
      const result = actions.resetPassword("p_tom");
      assert(result.ok && result.unlocked, "resetPassword should unlock the locked account");
      assert(view.people.get("p_tom").account.state === "enabled", "Tom is still not enabled");
      const logged = view.audit.byCode(4724);
      assert(logged.length === 1 && logged[0].subjectId === "p_tom", "Security 4724 was not logged once");
      return `logged ${logged[0].id} · ${logged[0].category} ${logged[0].code}: ${logged[0].message}`;
    },
  },
  {
    id: "group-share",
    title: "Group membership changes file share access with no extra wiring",
    run(api) {
      const { world: view, actions } = api;
      assert(view.files.shareAccess("share_finance", "p_dev") === "none", "Dev should start without Finance access");
      actions.addToGroup("p_dev", "g_finance");
      assert(view.files.shareAccess("share_finance", "p_dev") === "modify", "group change did not grant share access");
      assert(view.audit.byCode(4728).length === 1, "group change was not logged");
      actions.removeFromGroup("p_dev", "g_finance");
      assert(view.files.shareAccess("share_finance", "p_dev") === "none", "removing the group did not revoke access");
      return "none -> modify after addToGroup(g_finance) -> none after removeFromGroup.";
    },
  },
  {
    id: "spooler",
    title: "Restarting Print Spooler clears the stuck print job and logs it",
    run(api) {
      const { world: view, actions } = api;
      assert(view.machines.printerQueue("m_hayes").length === 2, "expected two queued jobs");
      const result = actions.restartService("m_hayes", "spooler");
      assert(result.ok, `restartService failed: ${result.reason}`);
      assert(view.machines.printerQueue("m_hayes").length === 0, "print queue was not cleared");
      const logged = view.audit.byCode(7036).filter((event) => event.data.service === "spooler");
      assert(logged.length === 1, "service restart was not logged");
      assert(view.machines.service("m_hayes", "spooler").status === "running", "spooler is not running");
      return `cleared ${result.cleared.length} jobs; ${logged[0].message}`;
    },
  },
  {
    id: "software",
    title: "Installing software reaches Start, Task Manager and file associations",
    run(api) {
      const { world: view, actions } = api;
      const result = actions.installSoftware("m_hayes", "sw_7zip");
      assert(result.ok, `installSoftware failed: ${result.reason}`);
      const start = view.machines.startMenuEntries("m_hayes").map((app) => app.name);
      const processes = view.machines.processes("m_hayes").map((process) => process.name);
      const associations = view.machines.fileAssociations("m_hayes");
      assert(start.includes("7-Zip"), "Start menu selector does not list 7-Zip");
      assert(processes.includes("7zFM.exe"), "process list does not include 7zFM.exe");
      assert(associations[".zip"]?.softwareId === "sw_7zip", ".zip is not associated with 7-Zip");
      return `Start +${result.software.name}, process ${result.software.process}, .zip -> ${associations[".zip"].name}; install delay ${result.delay}s at tier ${view.session.hardwareTier()}.`;
    },
  },
  {
    id: "network",
    title: "Disabling the network adapter stops ipconfig and Outlook sending",
    run(api) {
      const { world: view, actions } = api;
      assert(view.mail.canSendFrom("p_hayes"), "technician should start online");
      actions.setNetworkState("m_hayes", false);
      assert(view.machines.ipconfig("m_hayes").includes("Media disconnected"), "ipconfig still reports an adapter");
      assert(!view.mail.canSendFrom("p_hayes"), "Outlook still thinks it can send");
      const send = actions.sendMail({ fromPersonId: "p_hayes", subject: "Offline", lines: ["x"] });
      assert(!send.ok && send.reason === "no-network", `sendMail should fail offline, got ${send.reason}`);
      actions.setNetworkState("m_hayes", true);
      assert(view.machines.ipconfig("m_hayes").includes("IPv4"), "network did not come back");
      return "ipconfig -> Media disconnected, sendMail -> no-network, adapter restored.";
    },
  },
  {
    id: "files-policy",
    title: "Saving in Notepad shows in Explorer; importing a .reg changes policy",
    run(api) {
      const { world: view, actions } = api;
      const saved = actions.saveFile({
        path: "C:/Users/m.hayes/Documents",
        name: "harness-note.txt",
        contents: "Saved by the platform harness.",
      });
      assert(saved.ok && saved.file.version === 1, "saveFile did not create the file");
      const listed = view.files.list("C:/Users/m.hayes/Documents").some((file) => file.name === "harness-note.txt");
      assert(listed, "File Explorer selector does not see the saved file");
      const reg = view.files.items().find((file) => file.name === "fix-printers.reg");
      assert(reg, "seeded .reg file is missing");
      const imported = actions.importRegistry("m_hayes", reg.id);
      assert(imported.ok, `importRegistry failed: ${imported.reason}`);
      assert(view.directoryServices.policy("AllowPrintSpoolerRemoteCalls") === "1", "policy state did not change");
      return `saved v1 visible in Explorer; imported ${imported.entries.length} values, AllowPrintSpoolerRemoteCalls = 1.`;
    },
  },
  {
    id: "reset-resolves",
    title: "Resetting the right user's password resolves the ticket from evidence",
    run(api) {
      const { world: view, actions, session } = api;
      assert(session.startShift().ok, "shift did not start");
      api.actions.setUi("ticketdesk", { selectedId: 1001 });
      const before = view.session.trust();
      const result = actions.resetPassword("p_priya", { role: "helpdesk" });
      assert(result.ok, `resetPassword failed: ${result.reason}`);
      const ticket = view.tickets.get(1001);
      assert(ticket.status === "resolved", "ticket did not resolve from the action");
      assert(ticket.outcome === "correct", "correct evidence was scored as incorrect");
      assert(ticket.evidence.length === 1, "expected one evidence record");
      assert(ticket.evidence[0].action === "account:password-reset", "evidence does not name the action");
      assert(ticket.evidence[0].role === "helpdesk", "evidence does not record the role");
      assert(view.session.trust() === before, "a clean resolution changed trust");
      const resolved = view.audit.forTicket(1001).filter((event) => event.type === "ticket:resolved");
      assert(resolved.length === 1 && resolved[0].data.ruleId === 1, "resolution event does not cite Policy 1");
      return `#1001 resolved correct from ${ticket.evidence[0].actionLabel}; trust ${view.session.trust()}, event ${resolved[0].id} cites Policy 1.`;
    },
  },
  {
    id: "wrong-target",
    title: "Resetting the wrong user leaves the case open with a wrong-action, then scores it wrong",
    run(api) {
      const { world: view, actions, session } = api;
      assert(session.startShift().ok, "shift did not start");
      actions.setUi("ticketdesk", { selectedId: 1001 });
      const before = view.session.trust();
      actions.resetPassword("p_tom", { role: "helpdesk" });
      let ticket = view.tickets.get(1001);
      assert(ticket.status === "open", "wrong target should not close the case");
      assert(ticket.wrongActions.length === 1 && ticket.wrongActions[0].reason === "wrong-target", "wrong target was not recorded");
      assert(ticket.objectives.some((objective) => objective.status === "wrong"), "checklist does not show the wrong action");
      actions.resetPassword("p_priya", { role: "helpdesk" });
      ticket = view.tickets.get(1001);
      assert(ticket.status === "resolved" && ticket.outcome === "incorrect", "case should resolve but score wrong");
      assert(view.session.trust() === before - 12, `trust should be ${before - 12}, got ${view.session.trust()}`);
      return `wrong reset on Tom: case stayed open, then correct reset closed it as ${ticket.outcome} at trust ${view.session.trust()}.`;
    },
  },
  {
    id: "escalation",
    title: "Escalation is an objective completed by the escalation action",
    run(api) {
      const { world: view, actions, session } = api;
      assert(session.startShift().ok, "shift did not start");
      const wrong = actions.escalateTicket(1007, "security", "trying the wrong team");
      assert(wrong.ok, "escalation action failed");
      let ticket = view.tickets.get(1007);
      assert(ticket.status === "open", "wrong team should not close the case");
      assert(ticket.wrongActions.some((entry) => entry.reason === "wrong-team"), "wrong team was not recorded");
      actions.escalateTicket(1007, "facilities", "badge reader on east door");
      ticket = view.tickets.get(1007);
      assert(ticket.status === "resolved" && ticket.outcome === "incorrect", "wrong-team case should resolve incorrect");
      assert(ticket.escalations.some((entry) => entry.teamId === "facilities"), "facilities escalation missing");
      assert(ticket.objectives.every((objective) => objective.status === "met"), "escalation objective not met");
      return `#1007: wrong team recorded, then Facilities escalation met the objective and closed the case as ${ticket.outcome}.`;
    },
  },
  {
    id: "over-permission",
    title: "Granting Finance to Marketing is flagged as over-permission, and the reply closes it wrong",
    run(api) {
      const { world: view, actions, session } = api;
      assert(session.startShift().ok, "shift did not start");
      actions.setUi("ticketdesk", { selectedId: 1005 });
      actions.setShareAccess("share_finance", "g_marketing", "read", { role: "helpdesk" });
      let ticket = view.tickets.get(1005);
      assert(ticket.status === "open", "over-permission should not close the case");
      assert(ticket.wrongActions.some((entry) => entry.reason === "over-permission"), "over-permission was not recorded");
      assert(view.files.shareAccess("share_finance", "p_alice") === "read", "Alice did not gain the share");
      const reply = actions.replyToTicket(1005, { template: "deny", text: "" });
      assert(reply.ok, `reply failed: ${reply.reason}`);
      ticket = view.tickets.get(1005);
      assert(ticket.status === "resolved" && ticket.outcome === "incorrect", "case should close as incorrect");
      return `Finance granted to Marketing: over-permission recorded, deny reply closed #1005 as ${ticket.outcome}.`;
    },
  },
  {
    id: "no-duplicates",
    title: "A new day and a reseed do not duplicate people, mail or tickets",
    run(api) {
      const { world: view, actions, session } = api;
      const snapshot = () => ({
        people: view.people.all().length,
        mail: view.mail.all().length,
        tickets: view.tickets.all().length,
        events: view.audit.count(),
        peopleIds: new Set(view.people.all().map((person) => person.id)).size,
        mailIds: new Set(view.mail.all().map((message) => message.id)).size,
        ticketIds: new Set(view.tickets.all().map((ticket) => ticket.id)).size,
      });
      const before = snapshot();
      assert(session.endShift("open"), "shift did not end");
      const next = actions.nextDay();
      assert(next.ok, "nextDay failed");
      const after = snapshot();
      assert(after.people === before.people && after.peopleIds === before.people, "people were duplicated on the new day");
      assert(after.mail === before.mail && after.mailIds === before.mail, "mail was duplicated on the new day");
      assert(after.tickets === before.tickets && after.ticketIds === before.tickets, "tickets were duplicated on the new day");
      assert(after.events > before.events, "the audit log should have grown");
      actions.resetWorld();
      const reseeded = snapshot();
      assert(reseeded.people === before.people, "reseed changed the people count");
      assert(reseeded.mail === before.mail, "reseed changed the mail count");
      assert(reseeded.tickets === before.tickets, "reseed changed the ticket count");
      assert(api.problems().length === 0, `seed has dangling references: ${api.problems().join("; ")}`);
      return `day 1 -> day ${after.people === before.people ? next.day : "?"}: people ${before.people}, mail ${before.mail}, tickets ${before.tickets}; reseed identical; validator clean.`;
    },
  },
];

// ---------------------------------------------------------------------------
// harness UI
// ---------------------------------------------------------------------------

const rows = new Map();
let passed = 0;
let failed = 0;

function buildUi() {
  const list = $("devChecks");
  for (const check of checks) {
    const row = document.createElement("div");
    row.className = "dev-check";
    row.dataset.check = check.id;
    row.innerHTML = `
      <span class="name">${check.title}</span>
      <span class="actions"><span class="status">idle</span><button class="btn" data-run="${check.id}">Run</button></span>
      <span class="detail"></span>`;
    row.querySelector("[data-run]").addEventListener("click", () => runCheck(check.id));
    list.append(row);
    rows.set(check.id, row);
  }

  const select = $("devAppSelect");
  for (const app of listApps()) {
    const option = document.createElement("option");
    option.value = app.id;
    option.textContent = `${app.title} (${app.id})`;
    select.append(option);
  }
  $("devMount").addEventListener("click", () => mountApp(select.value));
  $("devUnmount").addEventListener("click", unmountApp);
  $("devRunAll").addEventListener("click", runAll);
  $("devReset").addEventListener("click", () => {
    const seed = Number($("devSeed").value) || DEFAULT_SEED;
    world.actions.resetWorld({ seed });
    world.events.emit("harness:reset", {
      category: "System",
      code: 6006,
      message: `Harness reseeded the world with seed ${seed}.`,
    });
    updateSummary();
  });

  updateSummary();
  mountApp("directory");
}

function setStatus(checkId, status, detail) {
  const row = rows.get(checkId);
  if (!row) return;
  row.classList.remove("pass", "fail", "running");
  if (status) row.classList.add(status);
  row.querySelector(".status").textContent = status === "pass" ? "pass" : status === "fail" ? "fail" : status || "idle";
  row.querySelector(".detail").textContent = detail || "";
}

function runCheck(checkId) {
  const check = checks.find((item) => item.id === checkId);
  if (!check) return { id: checkId, pass: false, detail: "unknown check" };
  world.actions.resetWorld();
  setStatus(check.id, "running", "running…");
  try {
    const detail = check.run(world);
    setStatus(check.id, "pass", detail);
    console.info(`[harness] PASS ${check.id}: ${detail}`);
    updateSummary();
    return { id: check.id, pass: true, detail };
  } catch (error) {
    setStatus(check.id, "fail", String(error.message || error));
    console.error(`[harness] FAIL ${check.id}: ${error.message || error}`);
    updateSummary();
    return { id: check.id, pass: false, detail: String(error.message || error) };
  }
}

function runAll() {
  passed = 0;
  failed = 0;
  const results = [];
  for (const check of checks) {
    const result = runCheck(check.id);
    results.push(result);
    if (result.pass) passed += 1;
    else failed += 1;
  }
  setScore();
  updateSummary();
  return results;
}

function setScore() {
  const total = checks.length;
  const score = $("devScore");
  if (passed + failed === 0) score.textContent = `not run · ${total} checks`;
  else score.textContent = `${passed} pass · ${failed} fail · ${total} checks`;
  score.style.color = failed ? "#ff9a9a" : passed === total ? "#6ee7a0" : "";
}

function updateSummary() {
  const current = world.world;
  $("devSummary").innerHTML = `
    <span>Day <b>${current.session.day()}</b></span>
    <span>Trust <b>${current.session.trust()}</b></span>
    <span>People <b>${current.people.all().length}</b></span>
    <span>Machines <b>${current.machines.all().length}</b></span>
    <span>Tickets <b>${current.tickets.all().length}</b></span>
    <span>Mail <b>${current.mail.all().length}</b></span>
    <span>Events <b>${current.audit.count()}</b></span>`;
  setScore();
}

// The browser-side handle used by scripts and the PR evidence.
window.devHarness = {
  world,
  checks: checks.map((check) => ({ id: check.id, title: check.title })),
  runCheck,
  runAll,
  mountApp,
  unmountApp,
  snapshot: () => ({
    day: world.world.session.day(),
    trust: world.world.session.trust(),
    people: world.world.people.all().length,
    machines: world.world.machines.all().length,
    tickets: world.world.tickets.all().length,
    mail: world.world.mail.all().length,
    events: world.world.audit.count(),
  }),
};

buildUi();
