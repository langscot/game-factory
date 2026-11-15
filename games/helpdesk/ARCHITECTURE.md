# Helpdesk platform architecture

The desktop is one simulated Windows machine with one shared world. Apps are
tools inside a shift loop, not mini-games with private state. This document is
the contract for every app that lands after #26.

```
games/helpdesk/
  index.html              the game
  dev.html                the platform harness (checks + app preview)
  src/
    main.js               builds the world, registers apps, owns the day loop
    shell.js              desktop chrome: icons, taskbar, Start, lock screen
    wm.js                 window manager (unchanged)
    context.js            createAppContext() — ctx for shell and harness
    content/              authored content: company, handbook, software list
    world/
      index.js            createWorld() — store + selectors + actions + events + clock
      seed.js             the seeded world
      store.js            one plain object + commit/subscribe
      selectors.js        read-only projections
      actions.js          the only writes
      events.js           event bus + audit log
      clock.js            one tick, one RNG, delayed jobs
      session.js          shift loop and scoring
      validate.js         dangling-reference check, runs at load
    ui/                   shared dialog/toast/menu/styles helpers
    apps/
      registry.js         app contract + registry
      index.js            the only file that imports app modules
      ticketdesk/         migrated reference app
      directory/          migrated tool app (shared people table)
      calculator/         proof app, built on the contract
      mail/ handbook/ explorer/ notepad/ settings/ taskmanager/ recyclebin/
```

## The store

`src/world/seed.js` returns one plain, serialisable object. IDs are stable
across days and saves: a person keeps `p_dev` when renamed, locked or disabled.

```
meta        { version, seed, createdAt }
session     day, maxDay, technicianId, hardwareTier, seed, trust,
            shift { state: briefing|running|ended, remaining, total },
            days[], resolvedToday[], week{}, history[], ui{}
people[]    id, displayName, logonName, departmentId, employmentType,
            managerId, remote, email, account { state, password, lastLogon },
            groupIds[], title
org         departments[], ous[], groups[] { id, name, memberIds[] }
machines[]  id, hostname, ownerId, hardwareTier, os, software[],
            services[], devices[], printers[] { queue[] }, rdpEnabled,
            network { connected, adapterId }
mail[]      id, folder, from, fromAddress, replyTo, returnPath, toPersonId?,
            subject, lines[], personId, ticketId, read, day, briefing
tickets[]   id, day, personId, machineId, mailId, ruleId, why,
            objectives[] { id, kind, target ids, maxRole, status,
                           baseline, evidenceId },
            evidence[] { action, actorId, role, at, before, after },
            wrongActions[], replies[], escalations[],
            status, outcome, resolvedDay, resolvedAt, trustDelta
            guards { shareIds[], softwareIds[] }   over-permission tripwires
files       drives[], shares[] { path, acl[] { groupId|personId, access } },
            items[] { id, path, name, kind, contents, version, ownerId },
            recycleBin[]
directoryServices
            softwareCatalogue[], drivers[], updates[], gpos[], registry[],
            policies{}            typed sub-state, never free text
handbook    policies[]            rule numbers are data
events[]    audit log: id, seq, type, category, level, code, message,
            subjectId, actorId, ticketId, day, at, data
```

Rules that keep it cohesive:

- **Derived, not duplicated.** Folders in File Explorer are derived from file
  paths. The Outlook GAL is the enabled subset of `people`. A ticket's subject
  and body live on its `mail` row and are joined by `tickets.view()`.
- **Ticket content references IDs.** The load-time validator in
  `world/validate.js` throws on a ticket pointing at a missing person, a mail
  row pointing at a missing ticket, a share ACL pointing at a missing group.

## Selectors — `ctx.world`

Read-only projections over the store. They return copies (`structuredClone`),
so an app cannot corrupt the world by sorting an array it was handed.

```js
world.people.get(id)              world.people.gal()
world.people.search(query)        world.people.byDepartment(id)
world.people.groupsOf(id)         world.people.canSignIn(id)
world.machines.byOwner(id)        world.machines.services(machineId)
world.machines.printerQueue(id)   world.machines.installedSoftware(id)
world.machines.fileAssociations(id)
world.machines.processes(id)      world.machines.ipconfig(id)
world.mail.inbox(day)             world.mail.support()
world.mail.forTicket(ticketId)    world.mail.canDeliverTo(personId)
world.tickets.forDay(day)         world.tickets.openForDay(day)
world.tickets.view(ticketId)      world.tickets.summary(day)
world.tickets.objectiveLabel(obj) world.org.teams()
world.files.list(path)            world.files.read(fileIdOrPath)
world.files.shareAccess(shareId, personId)
world.files.sharesFor(personId)
world.directoryServices.policy(key)
world.audit.byCode(4724)          world.audit.forTicket(ticketId)
world.handbook.policies(day)      world.handbook.policy(ruleId)
world.session.overview()          world.session.ui(appId)
```

`shareAccess()` is the important one: it is computed from the person's groups
and the share ACL, so changing a group membership changes file access with no
extra wiring.

## Actions — `ctx.actions`

The only way to write. Every action validates, commits once, emits an event and
returns `{ ok: true, ... }` or `{ ok: false, reason }`.

```js
startShift()  endShift(reason)  nextDay()  resetWorld({ seed? })
setUi(appId, patch)                       // per-app UI state, no audit entry

addPerson(profile)          setAccountEnabled(personId, enabled)
resetPassword(personId)     setAccountLocked(personId, locked)
addToGroup(personId, groupId)   removeFromGroup(personId, groupId)
setShareAccess(shareId, groupId, access)

restartService(machineId, serviceKey)
installSoftware(machineId, softwareId)  removeSoftware(...)
setNetworkState(machineId, connected)   setDeviceStatus(machineId, deviceId, status)

saveFile({ path, name, contents })      importRegistry(machineId, fileId)
sendMail({ fromPersonId, toPersonId, subject, lines })
markMailRead(mailId)

replyToTicket(ticketId, { template, text })   // template: deny | approve | info
escalateTicket(ticketId, teamId, note)
```

Scoring is platform-owned. A ticket is never closed by a button: the watcher
(see below) resolves it when every objective is met, then `session.recordResolved()`
applies the trust hit exactly once. Actions accept an optional `{ role }`
(`self-service`, `helpdesk`, `domain-admin`) which is written into the evidence
and used to flag broader-role access. Apps must never write `session.trust`.

## Ticket watchers and evidence

`src/world/watchers.js` runs after every action event. For each open ticket due
today or earlier it:

1. captures a baseline the first time it sees an objective;
2. evaluates each objective predicate against the world (state-based, so doing
   the right thing twice is still correct and an already-desired state counts as
   met, as long as the shift is running);
3. records an evidence row on the pending → met transition: action, actor, role,
   timestamp and before/after values;
4. detects wrong actions and records them without closing the ticket;
5. resolves the ticket, through the platform, when every objective is met.

Objective kinds: `password.reset`, `account.unlock`, `account.disable`,
`group.add`, `group.remove`, `share.grant`, `service.restart`,
`software.install`, `software.remove`, `ticket.reply`, `escalate`.

Wrong actions are evidence too:

| signal | example |
| --- | --- |
| `wrong-target` | resetting Tom's password while Priya's case is open |
| `over-permission` | granting `share_finance` to Marketing on a denial case |
| `wrong-action` | disabling the account a case asked you to unlock |
| `wrong-team` | escalating a badge ticket to Security instead of Facilities |
| `wrong-reply` | approving a request the policy says to deny |
| `broader-role` | using `domain-admin` where `helpdesk` was enough |

A wrong action leaves the ticket open. Once the right work is done the ticket
resolves, but with `outcome: "incorrect"` and the one-off trust hit. That is the
whole scoring loop; there is no approve/deny verdict anywhere in the game.

## Events — `ctx.events`

One bus, one audit log. Audited events are appended to `store.events` and
dispatched to their own topic and to `"*"`. Transient notifications
(`ui:changed`, `mail:changed`) go through `bump()` and are dispatched but not
logged.

```js
const off = events.on("ticket:resolved", (event) => { ... });
const off = events.on("*", () => redraw());        // typical app subscription
events.log();                                      // the audit log, read-only
```

Every action emits: `account:created`, `account:password-reset` (Security 4724),
`account:disabled` (4725), `group:member-added` (4728), `share:permissions-changed`
(4670), `service:restarted` (7036), `software:installed` (11707),
`network:disconnected`, `file:saved`, `registry:imported` (4657), `mail:sent`,
`ticket:replied`, `ticket:escalated`, `ticket:objective-met`,
`ticket:wrong-action`, `ticket:resolved`, `session:shift-started` / `-ended` /
`day-started`.

## The clock — `ctx.clock`

`world/clock.js` owns the single `requestAnimationFrame` loop. It pauses while
`document.hidden`, caps frame deltas and exposes:

```js
clock.onTick(fn)        // called each visible frame; unsubscribe on unmount
clock.timeText()        // shift wall clock, 09:00 → 17:00
clock.schedule(s, fn)   // delayed work, paused when the tab is hidden
clock.delayFor(kind)    // passwordReset | restartService | installSoftware,
                        // scaled by session.hardwareTier
clock.random()          // seeded RNG; clock.float/int/pick also available
```

No app may call `setInterval` or `setTimeout` for game state. Debounces, delayed
installs and periodic refreshes all go through `clock.schedule()`.

## App contract

Each app lives in `src/apps/<id>/` and default-exports:

```js
export default {
  id: "notepad",
  title: "Notepad",
  icon: "notepad",              // an icons.js key
  size: [560, 420],
  desktop: true,                // optional shell metadata
  pinned: true,                 // optional: appears in Start
  multi: true,
  position: [300, 70],
  titleFor: (options) => "…",   // optional
  mount(container, ctx) { /* render + wire */ },
  unmount(container) { /* optional cleanup */ },
};
```

`ctx` is the only way in or out:

| key | what it is |
| --- | --- |
| `ctx.world` | read-only selectors |
| `ctx.actions` | named mutations |
| `ctx.events` | subscribe/unsubscribe to the bus and read the audit log |
| `ctx.clock` | shift time, tick subscription, delayed work, seeded RNG |
| `ctx.session` | day, trust, shift, technician, hardware tier, seed (read-only) |
| `ctx.ui` | dialog/alert/confirm/toast/menu/styles/prefs/icon/formatClock |
| `ctx.open(appId, options)` | launch another app by id — never import it |
| `ctx.options` | whatever the launcher passed |
| `ctx.window` | `id`, `title`, `setTitle()`, `close()` |
| `ctx.onDispose(fn)` | cleanup that runs when the window closes |

Rules:

- Apps never import another app. `src/apps/index.js` is the only module that
  imports app modules.
- Apps never mutate the store. If a fact belongs to the world, add an action.
- Ephemeral widget state (the text in a textarea, a scroll position) may live in
  the app instance and is discarded on unmount. Selection, filters and anything
  another app or the harness should see go in `actions.setUi(appId, patch)`.
- App CSS is a template string passed to `ctx.ui.styles(appId, css)` and every
  selector is scoped under `.app-<id>`. No global selectors, no `<style>` in
  HTML.

## Worked example: adding an app

Say issue #42 needs a "VPN Tokens" app. Create
`src/apps/vpntokens/index.js`:

```js
export default {
  id: "vpntokens",
  title: "VPN Tokens",
  icon: "book",
  size: [520, 420],
  desktop: true,
  pinned: true,
  order: 11,

  mount(container, ctx) {
    ctx.ui.styles("vpntokens", `
      .app-vpntokens .vpn { padding: 14px; }
      .app-vpntokens .vpn button { display: block; width: 100%; text-align: left; }
    `);

    const paint = () => {
      const people = ctx.world.people.all().filter((p) => p.remote);
      container.innerHTML = `<div class="vpn">${people
        .map((p) => `<button data-issue="${p.id}">${ctx.ui.esc(p.displayName)}</button>`)
        .join("")}</div>`;
      for (const button of container.querySelectorAll("[data-issue]")) {
        button.addEventListener("click", () => {
          const result = ctx.actions.issueVpnToken(button.dataset.issue);
          ctx.ui.toast("VPN Tokens", result.ok ? "Token issued." : result.reason, "book");
        });
      }
    };

    const off = ctx.events.on("*", paint);
    ctx.onDispose(off);
    paint();
  },
};
```

Then add the action in `src/world/actions.js` (mutate `people`, emit an event),
register the app in `src/apps/index.js`, and add a check to `src/dev.js`:

1. `npm run build`
2. open `dev.html`, mount the app, run the checks
3. open the game, sign in, start a shift, and use the app

No other file changes. That is the whole contract.

## Migration notes

- `src/data.js` and `src/apps.js` are gone. People, mail, tickets, files and
  ticket answers now live in the seeded world; handbook text and software
  catalogue live in `src/content/` and are copied into the store on seed.
- The Ticket Desk is a case file: request, person/machine, live objective
  checklist, evidence trail, reply box and escalation path. It has no
  Approve/Deny actions; resolution comes from the watcher.
- The Staff Directory is the reference tool app. It reads the same people table
  as the GAL and ticket desk, and shows the share access derived from groups.
- **Stopgap:** the Directory also carries a deliberately minimal account console
  (reset password, unlock, disable, add to group) so account and group tickets
  can actually be completed before ADUC (#13) lands. ADUC replaces that block;
  it is not meant to grow.
- **Stopgap:** Settings > System lists approved software with Install buttons so
  software tickets are playable before Software Center (#25). It is not a full
  Software Center.
- Tickets whose real owner app does not exist yet (laptops/hardware #8, VPN
  tokens, file shares) use a `ticket.reply` objective: you still have to send the
  correct denial or approval in writing. When the owning app lands, replace the
  reply objective with the real action objective.
- The Calculator was rebuilt on the contract to prove a small app can be added
  without touching the platform.
- Mail, Handbook, Notepad, File Explorer, Task Manager, Settings and Recycle Bin
  were migrated in the same pass so there is exactly one app code path.
- The dev harness (`dev.html`) builds the same world and the same ctx as the
  desktop. `window.devHarness.runAll()` returns one result per invariant.
