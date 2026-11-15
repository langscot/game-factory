# Helpdesk — the design

Status: **decided**. This is the reference for the platform (#26), hardware (#8), the apps
(#10–#25), the browser and Service Desk site (#53, #54) and anything that adds a console
after them. The last section says which parts of this already exist and which are still a
wish.

One line: you are the least important person in IT, and the job is to become slightly more
important without handing a contractor the keys to the company because they said please.

Three rules hold the whole thing up.

1. **Access is the game.** Rank does not unlock apps — every app is always there. Rank
   unlocks *actions*, and the actions you do not have are the interesting ones.
2. **Consequences are stories, not dead ends.** Missed work becomes tomorrow's problem, not
   a deleted save. The only thing that ends a run is trust reaching zero, and that is a
   scene, not a stack trace.
3. **Friction is the joke, never the punishment.** Every annoyance costs time or attention,
   every one has a counterplay, and if a player stops laughing it is a bug.

You are Morgan Hayes, IT Support Technician, terminal 04, Halcyon Dynamics. Marge Delacroix
is the IT Operations Lead and the person who decides whether you keep the chair. The company
is fictional. The role names are not.

---

## Contents

1. [The loop](#1-the-loop)
2. [Ranks and roles](#2-ranks-and-roles)
3. [Access gates actions](#3-access-gates-actions)
4. [Tickets, objectives and watchers](#4-tickets-objectives-and-watchers)
5. [The friction catalogue](#5-the-friction-catalogue)
6. [Responsibilities](#6-responsibilities)
7. [Pay, bonus and the upgrade catalogue](#7-pay-bonus-and-the-upgrade-catalogue)
8. [Scoring, promotion, demotion, firing](#8-scoring-promotion-demotion-firing)
9. [The difficulty curve](#9-the-difficulty-curve)
10. [Where this meets the build](#10-where-this-meets-the-build)
11. [Open questions, answered](#11-open-questions-answered)
12. [Appendix A — copy deck](#appendix-a--copy-deck)
13. [Appendix B — app issue to role map](#appendix-b--app-issue-to-role-map)

---

## 1. The loop

### 1.1 One shift, in real time

A shift is **200 real seconds**, displayed as 09:00 → 17:00. The clock already does this
conversion in `clock.timeText()`: 480 in-game minutes over 200 seconds means **one real
second is 2.4 shift minutes**. Every timer in this document is given in real seconds,
because that is what the player feels, with the fiction in brackets where it helps.

| Real time | Shift clock | What happens |
| --- | --- | --- |
| 0–10 s | 09:00–09:24 | Briefing mail is already open. Queue loads. No interrupts in this window, ever. |
| 10–30 s | 09:24–10:12 | Warm-up: one easy ticket that the player has seen the shape of before. |
| 30–50 s | 10:12–11:00 | The body of the shift. Two or three real tickets, one of which needs the rank's new ceremony. |
| 50–140 s | 11:00–14:36 | Interrupts start. First approval request, first AV alert, first user who insists. |
| 140–175 s | 14:36–16:00 | Pressure. Something the player started at 11:00 finishes or fails here. |
| 175–200 s | 16:00–17:00 | Close out. No new interrupts after 175 s. Anything half-done rolls over and is *not* scored as a mistake. |

The queue is authored for **4–6 tickets a shift**, not the 8–12 the current content carries.
The current days assume no ceremony and a 20-second ticket; with friction a real ticket costs
25–60 seconds, so the content pass shrinks the count. Fast players get 1–2 "overflow"
requests they can take or leave. The queue is never the difficulty knob — the *mix* is.

### 1.2 One ticket, beat by beat

Example: ticket #1001, Priya cannot log in, day 1. Everything below is the same at every
rank, except the ceremony.

| Beat | Real time | The player does | The game does |
| --- | --- | --- | --- |
| 1. Arrives | 0 s | Notices the row in Jank and the mail in the inbox. | The mail row and the ticket share an id. The case is already in the queue. |
| 2. Triage | 4–8 s | Reads the request, opens the Staff Directory, checks employment type, remote, manager. Asks: is this mine, do I have the role, is this a security event? | Nothing. Triage is not a form, it is looking at things. |
| 3. Investigate | 3–10 s | Opens ADUC or Event Viewer. Sees `locked`, or `enabled` with three failed logons. | The world is the investigation. No hint text. |
| 4. Decide | 1–3 s | Act, request elevation, or escalate. | Nothing. This is the actual game. |
| 5. Act | 2–20 s | Clicks **Reset password** in ADUC. | The action layer checks the role, commits once, emits Security 4724. |
| 6. Ceremony | 0–18 s | Number-match prompt (4 s), justification dropdown (2 s), PIM if the role is eligible (12–16 s). | Prompt chain, in order, never two at once. |
| 7. Verify | 2–5 s | Reopens the user in ADUC. Password now says *must change at next sign-in*. | State is the truth. The user can still be locked out; verification catches it. |
| 8. Watcher | 0–4 s | Waits, or does something else. | `watchers.js` sees the objective predicate true, writes evidence, sets `readyToClose`, emits `ticket:ready`. |
| 9. Reply | 5–10 s | Writes a reply, or picks a template and edits a line. | `ticket:replied`, mail appears in Sent. |
| 10. Close | 5–8 s | Picks **Resolved**, writes a note naming the person and what changed, clicks Close. | `closeTicket` stores category, note, actor, timestamp, evidence snapshot; trust moves once. |

Total: about 25 seconds at Junior, 35 at Senior, 55 at Team Lead when the role is eligible
and the approval has to be chased. That is the budget the shift was built around.

### 1.3 The same ticket at two ranks

This is the whole progression argument in one example.

**Apprentice.** Every button in ADUC is present. **Reset password** reloads and says:

> You need the Helpdesk Administrator role to reset a password. You do not hold it.
> Request role · Escalate to Second Line

The correct move is to escalate to Second Line with a verification note. The escalation
carries an `escalate` objective, so it is evidence, not a shrug. Cost: 15 seconds, and the
ticket closes **Escalated**, which is a correct closure with complete evidence. The
Apprentice learns that recognising the ceiling is a skill, and that "I cannot" is an answer
when it comes with a note explaining who can.

**Junior Technician.** MFA prompt, reset, propagation (2 s), verify, close. Cost: 25
seconds, and the ticket is **Resolved** on the first shift. It is faster, and it is *also*
easier to get wrong: nobody makes you check that Priya is the person who asked. The email
signature says Priya. The directory says Priya. The actual sender is
`p.raman@halcyon-support.co`. Two letters. That is the game.

### 1.4 Interrupts

Interrupt-driven work runs in three lanes. Lanes exist so the player can tell urgent from
important without reading a paragraph.

| Lane | Examples | Timer | Concurrency | Presentation |
| --- | --- | --- | --- | --- |
| **Urgent, hard timer** | Shitnet malware alert, on-call page, outage | 25 s | 1 at a time, ever | Taskbar pulse, sound, console badge. Never steals focus. |
| **Time-boxed, soft timer** | Quarantine complaint, printer queue, patch window closing | 40–90 s | 2 at a time | Badge and a countdown on the console. Can be **held** once (+20 s) at a queue cost. |
| **Background** | Backup failure, cert expiry, change approval, PIM request from a colleague | none (shift or day scale) | any | Badge only. Consequence lands at shift end or tomorrow. |

Rules that stop interrupts becoming noise:

- No interrupt in the first 10 seconds of a shift. The player is allowed to arrive.
- A new interrupt cannot replace a modal that is already open. It queues, visibly.
- Urgent and soft timers pause when the tab is hidden, because they run on `clock.schedule`
  and the clock pauses. If something is on `setTimeout`, it is a bug, not a timer.
- The interrupt tells you *which* system it came from in the first three words. An AV alert
  and a printer queue are not the same urgency and must never look the same.
- Missed urgent work never deletes progress. It resolves itself with the safest default and
  writes a consequence for later (§6.7).

### 1.5 End of shift

At 17:00 the shift ends, the queue is read, and a short review happens. This is a scene with
numbers, not a spreadsheet.

- Tickets answered, correct, wrong, left open. Left open is not a penalty; it is tomorrow's
  queue with a note saying how long it has been there.
- Trust, and any security events.
- At the end of the last shift of the week: the **weekly review** — bonus, catalogue,
  promotion check, and whatever Marge has decided to say.

---

## 2. Ranks and roles

Two things are being modelled, and they are not the same thing.

- A **rank** is your job title. It decides pay, which roles you are *assigned*, what lands on
  your desk, and who you can delegate to.
- A **role** is an Entra role. It decides which actions the action layer will let you take.
  Rank is how you get roles; roles are what the buttons check.

Roles accumulate. A Team Lead still holds Helpdesk Administrator, which is why they can
still reset a password in four seconds instead of walking a junior through it.

### 2.1 The rank and role table

| Rank | Entra roles | Held how | What it unlocks | What it still refuses |
| --- | --- | --- | --- | --- |
| **Apprentice** | `Directory Readers` | standing | Read people, groups, machines, mail and policy. Triage. Escalate. See every admin control, live until you click it and the action layer says no. | Every administrative write. No password reset, no unlock, no mailbox, no device, no group, no close as Resolved (there is nothing to evidence). |
| **Junior Technician** | `Helpdesk Administrator` | standing | Reset passwords and force sign-out for non-administrators. Unlock accounts. Read basic user properties. First taste of power, first way to misuse it. | Disabling accounts, creating users, MFA methods, groups, mailboxes, devices, anything belonging to an administrator. |
| **Technician** | `Authentication Administrator`, `User Administrator` | standing | Reset MFA methods, require re-registration, revoke sessions. Create, disable and delete users. Update profiles and managers. Onboarding/offboarding checklists. Owns the Shitnet console. | Groups, mailboxes, devices, policy. Cannot reset another administrator's password — that is `Privileged Authentication Administrator`, and it is not yours. |
| **Senior Technician** | `Groups Administrator`, `Exchange Administrator`, `Intune Administrator` | eligible (PIM) | Group membership (not role-assignable groups). Shared mailboxes, mail flow, the quarantine console. Device compliance and remote wipe. Software push to someone else's machine. | Security policy, conditional access, enterprise apps, role assignment, the audit log. |
| **Systems Administrator** | `Security Administrator`, `Conditional Access Administrator`, `Application Administrator` | eligible (PIM) | Defender and Shitnet fleet actions. Conditional access. Enterprise app consent and SSO. DLP. Backups, patching, certificates, change approvals — the infrastructure work, which additionally needs a credential from the vault. | Assigning roles, approving other people's elevations, reading the full audit log. |
| **Team Lead** | `Privileged Role Administrator`, `Audit Logs`, PIM approver on `Groups Administrator` and above | eligible (PIM) | Grant and revoke role assignments. Approve elevations. Read the audit log. Command incidents. Approve changes. Delegate work downwards. | Global Administrator. Nobody holds it. |
| **Break-glass** | `Global Administrator` | sealed, one activation | Everything, once, with alarms attached. | Being pleasant about it. |

Approving a PIM request is not itself a role in Entra — it is a policy setting on the role.
The game models it as an `Approver` flag on the role assignment and the doc says so out loud
so nobody files a bug.

Optional later roles, deferred: `Teams Administrator`, `SharePoint Administrator`,
`Billing Administrator` (for the ticket about a licence nobody ordered). There is no ticket
content for them yet, so they are not in the table. Deferred, not forgotten.

### 2.2 What rank does *not* mean

- Rank never opens an app. All apps are on the desktop from shift one, including the ones
  that will only ever say *access denied*.
- Rank never makes a ticket easy. It removes a gate and adds three.
- Rank never buys correctness. A Team Lead can still reset the wrong Dana.
- Rank does not remove the ceremony, it moves it. Junior holds roles standing and needs MFA;
  Senior holds them eligible and needs MFA *and* PIM. That is deliberate: the moment you get
  comfortable, the friction changes shape.

### 2.3 The campaign

Four weeks, five shifts each, twenty shifts, roughly four minutes a shift and a little over
an hour for the campaign. The current build ships a three-day week as a content stub; the
loop does not change, the authored days do.

| Week | Shifts | Ranks in play | Theme |
| --- | --- | --- | --- |
| 1 | 1–5 | Apprentice → Junior Technician | The handbook, the queue, and the sentence "that is not your account". |
| 2 | 6–10 | Technician → Senior Technician | Real power, real ceremony. MFA bites. First timed console. |
| 3 | 11–15 | Systems Administrator → Team Lead | Civilian infrastructure: backups, certs, patches, changes. Other people's problems become yours. |
| 4 | 16–20 | Team Lead + break-glass | Someone attacks the access you just earned. The fast path is the dangerous one. |

Promotion check happens at the end of a shift, not mid-shift. A rank change never interrupts
a half-finished ticket.

---

## 3. Access gates actions

### 3.1 The denial contract

The action layer is the only place a role is checked. Apps call actions and render the
result, including the failure.

```js
ctx.actions.resetPassword(personId);
// { ok: false, reason: "missing-role", required: "Helpdesk Administrator",
//   action: "password.reset" }
```

- The button is always rendered, enabled, and looks like the real thing.
- Clicking it opens the real dialog, and the real dialog's **Reset** returns the failure.
  Nothing is hidden and nothing is pre-disabled, because a missing button teaches nothing.
- Copy is diegetic and names the role: *"You need the Helpdesk Administrator role to reset a
  password. You do not hold it."* No "permission error", no error code wall.
- The dialog offers **Request role** (creates a real approval request) and **Escalate** where
  the ticket has an escalation objective.
- A denied action is never a scored mistake. It is a no-op with a lesson. The scored mistake
  is asking for the wrong role, or taking the wrong route around the denial.

The role comes from the **session**, never from the caller. Today `resetPassword(id, { role })`
lets the app declare its own privilege; that is a loaded gun on the table and should be
removed when the gate lands. Evidence should record the session's active role, and the
platform should be able to say "this was done with `Groups Administrator`, active for 38
seconds, justification `change`, ticket 3120".

### 3.2 Three kinds of gate, not one

Entra roles do not cover everything, and pretending they do produces nonsense.

| Gate | What it guards | Where the permission comes from |
| --- | --- | --- |
| **Role** | Identity: accounts, MFA, groups, mailboxes, devices, policy, roles | The Entra roles in §2.1, standing or eligible |
| **Credential** | Infrastructure: servers, domain controllers, network gear, backup appliances | A checkout from the vault (PAM), with a reason and a duration |
| **Change** | Anything that changes shared state on purpose: a GPO, a patch ring, a cert, a firewall | An approved change request, possibly inside (or outside) a freeze |

So restarting the print spooler on your own machine needs nothing. Restarting it on the print
server needs a checked-out credential. Editing the GPO that points everyone at that print
server needs both, plus an approved change. The compilation of gates is the ladder, and the
ticket says which rung the answer is on.

### 3.3 Acting as

The taskbar carries one chip, always visible:

```
Morgan Hayes · Technician · [Authentication Administrator] [User Administrator]
```

- Eligible-but-inactive roles appear hollow: `Groups Administrator (eligible)`.
- Active elevation shows a countdown: `Groups Administrator 04:12`.
- Hovering lists everything held, how it is held, and when it expires.
- The chip is amber for the last 30 seconds and red-flashes at expiry with a toast. It is
  the only always-visible UI element in the game, and it is deliberately boring to look at
  until it is not.

When elevation expires **mid-task**, the action layer re-checks at commit. Because every
action is one commit, nothing half-applies — there is no hour of work to lose, just a
dialog:

> Your Groups Administrator activation ended 12 seconds ago. Nothing was changed.
> Re-activate (about 15 seconds) · Cancel

Cancelling is allowed and is a valid choice. The ticket stays open with a note in the
evidence trail saying the elevation lapsed, which is exactly the kind of thing a real audit
loves.

### 3.4 Requesting more than you need

**Request role** is a real action with a real consequence.

- Asking for a role you are about to be promoted into anyway: approved in a shift or two,
  and Marge mentions it approvingly.
- Asking for a role above your rank for a ticket that does not need it: approved or refused,
  but always noted. A pattern is a professionalism problem.
- Asking for `Global Administrator` because a user was rude to you: the request is refused,
  and Security opens a ticket about *you*. This is the funniest possible outcome and should
  be reachable in the first ten minutes.

### 3.5 Impossible tickets are a correct answer

Some tickets cannot be completed at the current rank and are not supposed to be. They carry
an `escalate` objective with a team id, and closing them **Escalated** with a note is a
correct closure. The review says so. The player who thrashes at the Reset button for forty
seconds and closes as *Unable to fix* has learned something more expensive.

---

## 4. Tickets, objectives and watchers

This section describes what is already built, because the merge got the important part
right, and then adds the role dimension.

### 4.1 The case

A ticket is not a verdict button. It is a case file:

```
id, day, personId, machineId, mailId, ruleId, why
objectives[]  { id, kind, personId?, machineId?, <target ids>, maxRole, status, baseline, evidenceId }
evidence[]    { id, objectiveId, action, actionLabel, actorId, role, at, day, before, after, summary }
wrongActions[]{ id, action, reason, detail, actorId, role, at, day }
wrongClosures[]
replies[], escalations[], guards{ shareIds[], softwareIds[] }
readyToClose, status, outcome, resolvedDay, resolvedAt, trustDelta,
closure { category, note, byId, at, day, evidenceSnapshot[] }
```

The Ticket Desk (and later the Jank site, #54) shows: request, person, machine, the objective
checklist with live status, the evidence trail, the reply box, the escalation path and the
close panel. There is no Approve/Deny anywhere, and there must never be.

### 4.2 Objectives

An objective is the real action, its target and the desired end state. The kinds that exist:

| Kind | End state | Typical owner |
| --- | --- | --- |
| `password.reset` | account password is `reset-required` | ADUC |
| `account.unlock` | account state is `enabled` | ADUC |
| `account.disable` | account state is `disabled` | ADUC |
| `group.add` / `group.remove` | group membership includes / excludes the person | ADUC |
| `share.grant` | effective access on the share meets the level asked for | File server or group |
| `service.restart` | the named service is running | Services |
| `software.install` / `software.remove` | the machine's software list contains / omits the app | Software Center or Intune |
| `ticket.reply` | a reply with the required template (`deny`/`approve`/`info`) exists | Jank |
| `escalate` | an escalation to the named team exists | Jank |

`share.grant` is worth a note. Access is derived from the person's groups and the share ACL,
so adding the group is as valid as editing the ACL, and it is the answer the game prefers.
The trap is editing the ACL directly to give an individual access nobody asked for — that is
an `over-permission` finding, and the guarded tickets (`guards.shareIds`) are watching for
it.

`maxRole` is the most powerful role permitted for a ticket. Default `helpdesk`. A ticket that
is deliberately a self-service job can set `self-service`; anything that must not be touched
by the desk sets the role above you and expects escalation.

### 4.3 How the watcher judges

`src/world/watchers.js` runs after every action event:

1. Captures a baseline for each objective the first time it sees it, so evidence can show
   before → after.
2. Evaluates each objective **against world state**, not against the action. Doing the right
   thing twice is still correct. An already-true desired state counts as met, as long as the
   shift is running.
3. Writes one evidence row on the pending → met transition: action, actor, role, timestamp,
   day, before, after, and a human label.
4. Records wrong actions separately and leaves the ticket open.
5. Sets `readyToClose` when every objective is met, and emits `ticket:ready`.

It never closes the ticket, never scores, never touches trust. That separation is the
contract and it should survive the role work.

**The role dimension.** The watcher already judges *whether* the outcome happened. The design
adds *with what*, which is why evidence rows carry a role:

- Using a stronger role than the objective's `maxRole` is a `broader-role` finding even when
  the outcome is perfect. Resetting a password with `User Administrator` when `Helpdesk
  Administrator` was enough is a security miss, not a faster service.
- Using the least role that could achieve the outcome is correct, full stop. The review
  counts it.
- The role ladder in the build today has three values — `self-service`, `helpdesk`,
  `domain-admin`. Those become rungs on the seven-rank ladder without changing call sites;
  the evidence rows already display the string.

### 4.4 Wrong actions

Wrong actions are evidence too. They never close a ticket, and a ticket with one can never
score correct.

| Signal | Example | Design note |
| --- | --- | --- |
| `wrong-target` | Resetting Tom's password while Priya's case is open | Only flags the case you have selected, so you cannot be punished for a ticket you are not looking at. |
| `over-permission` | Granting Marketing access on the Finance share, on a denial ticket | Also fires on unrequested software installs (`unapproved-install`). |
| `wrong-action` | Disabling the account a case asked you to unlock | Family-level mismatch: right person, wrong verb. |
| `wrong-team` | Sending a badge ticket to Security instead of Facilities | Escalation has an address. |
| `wrong-reply` | Approving a request the policy says to deny | The template is part of the answer. |
| `unnecessary-escalation` | Escalating a case that did not need it | Cheap to detect: no `escalate` objective exists. |
| `broader-role` | Using `domain-admin` where `helpdesk` was enough | The one that matters most for the fantasy. |
| `wrong-portal` *(new)* | Resetting MFA from the legacy per-user page | See §5.7. The legacy page has its own action: it commits nothing, emits `account:legacy-mfa-reset`, and the watcher files the finding. |

A wrong action also marks the objective `wrong`, which is visible on the checklist as its
own state rather than as a silent failure.

### 4.5 Closing the case

Closure is deliberate. The player does it, with a category and a note.

| Category | When it is available | Outcome |
| --- | --- | --- |
| **Resolved** | Only when every objective is met | `correct` if no wrong actions, else `incorrect` |
| **Escalated** | Always, but requires at least one escalation on the case | `correct` if the escalation objective is met, `incorrect` if the case had different complete evidence |
| **Returned to user** | Always | `deferred` without evidence; `wrong-closure` with it |
| **Duplicate** | Always | as above |
| **Unable to fix** | Always | as above |

- The closing note is mandatory and the action layer enforces a 10-character floor. The
  floor is a floor, not a standard: the professionalism score wants the note to name the
  person, machine or group and say what changed.
- `Resolved` is not just hidden, it is refused by the action (`objectives-incomplete`) even
  if a client tries. There is no way to self-certify.
- `Escalated` is refused unless there is a real escalation (`escalation-required`).
- `closeTicket` writes category, note, actor, timestamp and an evidence snapshot into the
  case, then moves trust exactly once. Reopening is not an action.
- The trust hit for an incorrect closure is −12. `deferred` costs nothing. That is on
  purpose: leaving a ticket open is a queue problem, lying about it is a trust problem.

**Reopening.** `Resolved` cannot be reopened; the evidence is the evidence. The other four
can be re-raised by the person, which arrives as a *new linked ticket* the next shift —
`returned` on a ticket that was already fixed shows up as "you sent me back and it was still
broken", with the original case attached. That is a cascade (§6.7), not an undo button, and
it is much funnier than a modal asking whether you're sure.

### 4.6 Scoring the closure

The merged implementation already does the hard part:

- `outcome` is `correct`, `incorrect` or `deferred`.
- `correct` requires every objective met, no wrong actions, and a category of
  `resolved`/`escalated`.
- Complete evidence closed as `returned`/`duplicate`/`unable` is a `wrong-closure` and scores
  `incorrect`.
- Trust moves only here.

Two known gaps this design accepts and defers:

1. **The escalation loophole.** Closing as `Escalated` when the case had no escalation
   objective and an unmet reply objective scores `deferred`, not `incorrect`. The design
   intent is that bailing out of a case whose correct answer was written down should cost
   something. Deferred because it is a scoring-policy change, not a platform change, and it
   needs its own issue with its own tests.
2. **Note quality is not scored.** Length is enforced, specificity is not. The design's
   target is a soft check at closure ("this note does not name anyone") with a bonus effect,
   not a hard block. Deferred with the note-quality rules in §8.2.

---

## 5. The friction catalogue

Every annoyance below costs **time or attention**, has a **counterplay**, and has a line past
which it stops being funny. Costs are real seconds.

### 5.1 The table

| Annoyance | Cost | What it gates | Counterplay | Stops being funny when… |
| --- | --- | --- | --- | --- |
| MFA number match | 4 s | Any privileged action chain | One prompt covers the chain; the authenticator stays open | More than 5 a shift, or two prompts for one action |
| MFA six-digit code | 10–15 s | Break-glass only | Read the code before it rolls | It gates routine work |
| PIM activation | 12–16 s | Eligible roles | Take 4 hours, not 1; reuse the activation | Re-activating for every ticket, or a delay you cannot see |
| Approval | 10–17 s, non-blocking | Sensitive changes, role requests | Work another ticket; chase once | The approver is offline with no alternative |
| PAM checkout | 6 s | Servers, domain controllers, network gear | Take 8 hours for a planned change; 1 hour for a poke | The credential expires while you are typing |
| Callback verification | 5–8 s | Password resets for contractors, admins, anyone "urgent" | Use the number in the directory, never the signature | Every reset needs one |
| Change freeze | blocks the action | Shared-state changes in the window | Schedule before it, or take the emergency path | The window covers the whole shift |
| Propagation | 2–4 s per object | The objective stays unmet until it lands | Work something else; the spinner is on the case, not the screen | It is over 6 s with nothing else to do |
| Wrong portal | 6–10 s + finding | Nothing — that is the point | Read which system owns the object; the handbook has a table | The ticket does not say which system |
| Audit justification | 2–3 s | Privileged actions outside a ticket | Accept the suggested code from the ticket | Every click asks |
| Break-glass | 20 s + a review scene | Global Administrator, once | Do not need it | It becomes the first answer |
| Missing tool | install time | The tool you need right now | Install once, permanently; hardware tier speeds it up | The dependency loops |

### 5.2 MFA

The authenticator is an app on the desktop phone panel — a small always-available window,
not a modal over the desktop. Number matching is the default because typing six digits forty
times is not a game, it is homework:

1. The action layer returns `mfa-required` with two digits.
2. The prompt shows those two digits and a code box.
3. The player types them. Wrong once: retry. Wrong twice: 5-second lockout and a note.
4. The prompt is satisfied for the rest of the ticket, and for the next 10 real seconds if
   the next ticket is the same action family. The fiction says "authenticated for twenty
   minutes"; the timer is what the player experiences, and the two are never the same number.

Six-digit TOTP exists only for break-glass. The code rolls every 30 seconds (12 real), which
is enough time to type six digits and not enough time to be smug about it.

Prompt fatigue is the joke and must be scripted, not random: a *third* prompt in a row is
always the one that arrives while the player is reading a long ticket. Fatigue is a schedule,
not a die roll (see §11, question 5).

**The prompt you did not ask for.** Roughly once a shift, the authenticator shows a sign-in
request the player did not initiate, with a plausible app name and a location that is not
the office. Approving it is a security event: the account is compromised and a ticket about
it opens next shift. Denying it is correct and quiet. This is the whole phishing lesson in
four seconds and it is the best thing in the catalogue.

### 5.3 PIM

From Senior Technician up, roles are **eligible**, not active. You hold the right to ask.

- **Activation**: choose the role, pick a justification from five reasons, confirm the ticket
  number (prefilled if a case is open, blank if not — blank is a finding), MFA, then
  provisioning.
- **Provisioning delay**: 3 s in a good mood, 6 s with the "this can take up to five minutes"
  ticket open, which is the joke. The chip shows a spinner. You can work other tickets.
- **Duration**: 1 shift hour (25 s), 4 hours (100 s) or 8 hours (200 s, requires an approval
  from Marge or whoever is above you). Choosing 1 hour and then starting a long change is a
  mistake the game lets you make exactly once.
- **Expiry**: chip goes amber at 30 s remaining, red-flash at zero, and the dialog in §3.3.
  Re-activation is the same ceremony with the justification prefilled (8 s instead of 16).
- **Approval needed** for role assignments above your rank, for 8-hour durations, and for
  anything on a role-assignable group. The approval request is a ticket that lands on the
  approver's queue and resolves in 10–17 s, not instantly.

PIM is the single biggest source of "this is annoying and also the best part", which is the
target.

### 5.4 Approvals

A sensitive action requests approval and keeps going. Approval is **non-blocking**: the
request goes out, the player works on something else, and a toast says when it lands.

- Who approves: Marge for anything in the first three ranks; a Team Lead (you, later) for
  everyone else; a second approver for emergency changes and break-glass.
- Waiting: 10–17 s with ±20% jitter. If the approver is "in a meeting" (a scripted beat on
  one shift a week), it is 25 s and there is no chase.
- **Chasing** halves the wait, costs 2 seconds of typing, and is free the first time. Chasing
  twice in a week is a professionalism note. Chasing a third time is a scene where Marge
  explains her calendar.
- **Denial** is possible and correct when the request's justification contradicts the ticket.
  A denied approval is a `wrong-action` on the case if the policy says the action was allowed,
  and a correct outcome if the policy says it was not.
- **Batching**: one approval can cover up to three related changes if they are submitted as
  one request. That is the intended optimisation and it is worth a small efficiency bonus.

### 5.5 PAM

Separate from identity. Some systems do not care what your Entra role is; they care whether
you have the server's credential.

- The vault is a browser page (internal site) with a checkout dialog: system, reason,
  duration, and a checkbox that says the session is recorded, which nobody reads.
- Checkout costs 6 seconds. The credential is valid for 1, 4 or 8 shift hours. It is
  checked back in automatically, whether or not you are finished.
- Checked-out credentials show in the acting-as chip as a second line: `BLT-SQL01 (04:12)`.
- Using a credential after checkout expiry fails the action with a diegetic error and no
  partial change. Using a colleague's checked-out credential is a `broader-role`-class
  finding even if they deserve it.
- The joke that must not be built: a circular dependency between the vault and the thing you
  need to reach the vault. One documented way in, always.

### 5.6 Change freeze

Freezes are announced in the briefing mail and shown on the change calendar.

- A freeze blocks shared-state changes: patches, GPO, CA policy, certificate replacement,
  mailbox migrations. It never blocks a password reset, a quarantine release, or an
  investigation.
- Pushing anyway is technically possible: the action returns `change-freeze` and offers
  **Emergency change**. That opens two approvals (20 s), tags the change, and guarantees it
  appears in the review. Sometimes that is the right call and the review says so.
- Missing a freeze window is not a failure. A patch that waits a week is a compliance
  finding at the weekly review, which costs bonus, not trust.

### 5.7 Propagation and the wrong portal

Propagation is the world's way of saying "it may take up to 15 minutes". Nothing is applied
instantly; the action commits *intent*, the world applies it after `clock.schedule`, and the
watcher only sees the objective met when the state lands. On the case: "Applying… 00:03".
The spinner lives on the case, never as a modal, so the player can leave and come back.

Hardware does **not** speed up propagation. It is a server. Hardware speeds up local work
(installs, scans, window launches). Mixing the two would make money buy correctness.

**The wrong portal** is the purest form of the joke, and it already exists in the world
model: several admin surfaces each hold a slice of the truth, and an action in the wrong one
is a no-op.

- MFA methods live in **Authentication methods**. There is also a legacy per-user MFA page
  that appears to work, resets nothing that matters, and breaks a different user's
  registration. The legacy page is the trap.
- Mailbox permissions live in **Exchange**. ADUC has a `mailNickname` field that looks like
  it does something. It does not.
- Share access is derived from **groups**. Editing the ACL directly works, and is how you
  over-permit an individual.
- Cloud policy lives in **Cloud Admin**. On-prem GPO lives in **GPMC**. They both have a
  setting called "require MFA" and only one of them is enforced today.

Counterplay is diegetic: the ticket says which system the user was using ("Outlook keeps
asking me to re-register"), and the handbook has a one-page table called *Which portal owns
what*. A wrong-portal attempt costs 6–10 seconds and writes a finding. It never silently
succeeds.

### 5.8 Audit justifications

Privileged actions outside a ticket ask for a reason code:

`Incident` · `Request` · `Change` · `Investigation` · `Break-glass`

- Two seconds: one dropdown, one click. The first option is the suggested one, taken from
  the open ticket's rule and objective kind.
- Accepting the suggestion is right most of the time, which is why the trap works: the wrong
  code is when you act outside a ticket and pick `Request` because it sounds harmless.
- Wrong code = a finding at the weekly review. Costs bonus and a line in the scene. Does not
  cost trust, because the work was right.
- Every reason is written to the audit log and is searchable from the Team Lead rank, which
  is how the review asks "why did you allow this in March" and the player has to live with
  the answer they typed.

### 5.9 Break-glass

The sealed account: `breakglass@halcyon.co`. Global Administrator, 2 shift hours (50 s),
one activation per week.

1. Open the sealed envelope on the desk (a click, a crackle, no animation).
2. Two-person rule: Marge, the on-call lead, or Security must approve. In practice, an
   approval request and a wait.
3. Six-digit TOTP, typed by hand.
4. **Every** action while active is red in the audit log, tagged `break-glass`, and cannot be
   dismissed from the review.
5. At the end of the shift: a mandatory post-incident review scene, whether or not anything
   went wrong. It asks why, and the answer has to match the log.

Scoring: using it when a lesser role plus a few more seconds would have done is a
**major security miss** (−20 trust). Using it correctly during the endgame incident is the
difference between a bad week and a story. It should feel like a fire alarm, not a power-up:
loud, effective, and something you explain afterwards.

### 5.10 Tooling friction

- The tool you need is not installed. Software Center installs it; install time scales with
  hardware tier (`clock.delayFor("installSoftware")`), and a Tier 1 machine makes it hurt.
- This is **once per machine**, permanently. Repeated installation friction is not a
  mechanic, it is a chore.
- The vault client, the RDP client and the admin pack are the three installs that matter and
  all three are on the approved list, so the answer is always "install it, then get on with
  your life". The joke is the eight seconds, not a puzzle.

### 5.11 The annoyance budget

**Ceiling: 25% of a shift on average, 35% in any one shift.** At 200 seconds that is 50
seconds average, 70 seconds worst case. Over budget means removing a prompt, never shortening
a fixed cost into meaninglessness.

Per-shift caps:

| Prompt | Cap | Notes |
| --- | --- | --- |
| MFA number match | 5 | One per action chain, not per action |
| PIM activation | 2 | The second is a mistake, not a requirement |
| Approval request | 2 | Batching covers the rest |
| PAM checkout | 2 | 8-hour checkout covers a change window |
| Audit justification | 4 | Only outside a ticket |
| Propagation waits | 5 | Non-blocking |
| Break-glass | 1 per week | Not per shift |

Expected spend by rank:

| Rank | MFA | Activation | Approval | Justification | Propagation | Total | % of shift |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Apprentice | 4 | — | 12 | 3 | 3 | 22 s | 11% |
| Junior Technician | 12 | — | 12 | 3 | 6 | 33 s | 17% |
| Technician | 16 | 16 | 12 | 6 | 9 | 59 s | 30%, trimmed to 52 s (26%) by dropping one MFA and one propagation |
| Senior Technician | 16 | 16 | 12 | 6 | 6 | 56 s | 28%, or 40 s (20%) when the activation is reused |
| Systems Administrator | 16 | 16 | 12 | 6 | 9 | 59 s | 30%, or 47 s (24%) with one batched approval |
| Team Lead | 20 | 16 | 12 | 9 | 6 | 63 s | 32%, and 70 s (35%) in the worst shift with two approvals |

The trim instruction is real: if a shift is over budget, the platform drops the *latest*
scheduled prompt, not an early one, and never a hard timer. A prompt that arrives after the
player has already done the thing is theatre.

Rules that keep it honest:

- No prompt before 10 s or after 190 s.
- Never two modals at once. Queue them and show the queue.
- The same prompt twice in a row is a bug, not a theme.
- Every prompt is skippable at a cost: defer the propagation (ticket cannot close yet),
  request an emergency change (approval + finding), or take the "do it later" path that
  leaves the case open. Nothing is a dead end.
- Anything that would block the screen for more than 3 seconds must be backgrounded. Waiting
  is only allowed if there is something else to do.

---

## 6. Responsibilities

Ranks add things that are *your problem*, on a clock. This is where difficulty lives: not
more tickets, more simultaneous owners.

| Rank | Added responsibility | Console | Time pressure | If missed |
| --- | --- | --- | --- | --- |
| Apprentice | Own queue | Jank | Shift clock only | Rolls over unchanged. No score, no trust move. |
| Junior Technician | Queue + handoffs from the Apprentice pool | Jank | Shift clock | The handoff bounces back with a note and a shift's delay. |
| Technician | **Shitnet endpoint alerts** | Native console | 25 s hard timer each | Auto-quarantined, a no-decision mark, and a blocked release if it was a false positive. |
| Senior Technician | **Email quarantine** + device compliance | Browser | 40–90 s soft timer per complaint | The complaint escalates to Marge and another wave lands. |
| Systems Administrator | **Backups**, **patching**, **certificates**, **change approvals**, DLP | Browser | Shifts and days, one incident | A compliance finding, and the backup or certificate consequence arrives as a real incident. |
| Team Lead | **PIM approvals**, **on-call escalation**, **incident command** | Browser + pager | Minutes, then a shift | Changes default to rejected; an uncommanded incident goes to Lena. |
| Break-glass | Everything at once, on fire | all | all | The review. There is always a review. |

### 6.1 Shitnet Endpoint Protection

*Working name confirmed for now; the branding pass is #55. Scope of the joke: the vendor
name, its terrible copy and its mascot. The detections stay plausible, because a joke
detection name is not as funny as a real one.*

A native app window with two tabs: **This device** (which is the Windows Security surface
already built, #23) and **Fleet** (the new console). Fleet is where the job is.

Each alert shows:

```
Trojan:Win32/Wacatac.B!ml                  HIGH · first seen 09:41
C:\Users\t.halvorsen\AppData\Local\Temp\wct2f4.tmp
DESKTOP-TH02 · Tom Halvorsen · Finance
Publisher: unsigned · Hash 9f2c…a71d · Heuristic + signature
[ Quarantine ]  [ Allow ]  [ Escalate ]  [ Open file location ]
```

- **Countdown**: 25 s high, 45 s medium, 90 s low. Visible as `00:25`, ticking, and it
  pauses when the tab is hidden because it is a `clock.schedule` job.
- **Actions**:
  - **Quarantine** — file locked, alert closed, user gets a toast in their own session.
  - **Allow** — adds a path exclusion. Correct for signed internal build tools the handbook
    names; a career-limiting move for anything else.
  - **Escalate** — sends it to Security with the hash and the machine. Slow, safe, and the
    right answer for anything that smells like a campaign.
  - **Open file location** — Explorer at the path, so the player can look at the file name
    and the folder and form an opinion. This is the "investigate" step, and it is optional
    but rewarded.
- **Default on expiry**: Shitnet quarantines and logs `auto-handled`. Safe for malware, bad
  for a false-positive build tool, and it costs a "no decision" mark on the security score.
  Ignoring is therefore not free — it is just boring.
- **History**: every decision with timestamp, actor, reason and ticket. The weekly review can
  and will ask about the March one.
- **Delegation** (Senior+): hand an alert to the Apprentice pool. Costs 10 s, may come back
  mis-triaged (about one in ten), and produces one of the game's better dialogues when it
  does.

Correct / fast-wrong / slow-safe:

- **Correct**: quarantine the malware; allow the signed build tool that the release ticket
  mentions; escalate the three-machines-same-hash pattern.
- **Fast and wrong**: allow everything so the pings stop. Tomorrow: an outbreak — three
  tickets, a security incident, a trust hit and a review where Marge reads the allow list
  aloud.
- **Slow and safe**: quarantine the build tool too. The release is blocked, Engineering opens
  a ticket, and someone uses the word "unacceptable" in a subject line. Nothing is
  compromised, and restoring from quarantine is possible, which is the point of choosing the
  reversible mistake.

### 6.2 Email quarantine

A page in the browser: `mail.halcyon.co/admin/quarantine`. Senior Technician, because it
needs `Exchange Administrator`.

The list: sender, subject, recipient, reason (`Phishing`, `Malware`, `Spam`, `Bulk`),
attachment names, received time. Columns sort, badly, on purpose.

- **Actions**: Release (to recipient), Release to sender, Block sender, Delete, Report to
  Security. Bulk select for obvious spam.
- **The tension**: a held invoice Finance needs in the next four minutes, versus an identical
  one from `accounts@halcyon-accounts.co` instead of `accounts@halcyon.co`. The headers view
  shows return-path and reply-to, and they do not match. That is the tell, and it is the same
  tell as the mail app already teaches.
- **Complaint tickets** arrive while you work and carry a soft timer (40 s). The queue grows
  by 8–12 messages an hour whether or not you look.
- **Correct**: release the genuine one to the recipient, block the lookalike domain, report
  the campaign.
- **Fast and wrong**: release all the invoices and get back to the queue. One lands; the
  compromise shows up as a suspicious sign-in next shift and a forced reset batch.
- **Slow and safe**: release nothing and reply "we're checking" to Finance. The payment run
  slips, the CFO is cc'd, and nobody is compromised.

### 6.3 Backups

A status page in the browser, plus an alert mail at 07:00. Three jobs: file, database,
domain controller.

- Actions: Retry, Ignore for a day, Restore-test, Open job log.
- **Restore-test** takes 40 s and may reveal corruption. That is the whole mechanic: the test
  is expensive now and priceless later.
- **Miss twice**: a restore request arrives (someone deleted the Finance folder, they always
  do), the backup is empty, and the week gets a shadow. Six tickets, an incident, and a
  review that is not about you but feels like it.
- **Fast and wrong**: Retry without reading the log. The job reports success and backed up
  nothing, which is the most realistic failure in the entire document.
- **Slow and safe**: restore-test, find corruption, rebuild the job across two shifts, tell
  people before they need it.

### 6.4 Patching

A compliance dashboard: per-ring coverage, days since last patch, a red row you did not
cause.

- Push to pilot (10%) first, then the rest. A pilot is 20 s and catches the bad patch; a
  full push is 6 s and catches nothing.
- Freeze windows block pushes. Emergency change is possible and always reviewed.
- Miss: a compliance finding at the weekly review (bonus, not trust) and, if the unpatched
  thing is the thing that gets exploited, an incident later.

### 6.5 Certificates

A list with expiry dates, in days, not seconds. The only long timer in the game, and it is
refreshing.

- Renew early: a request, an external vendor, an approval, done in 20 s across two shifts.
- Renew late: the vendor's portal is down at 16:40 and the certificate expires at 09:00.
- Miss: SSO breaks for half the company mid-shift. An incident day. The repair is a
  break-glass candidate, which is the point — the game teaches you what break-glass is for by
  letting you cause the situation that needs it.

### 6.6 Change approvals

Incoming from other teams: three-line summary, risk, window, rollback plan, and a submitter
who wants it now.

- Approve / Reject / **Ask for a rollback plan**.
- Fast and wrong: approve everything. One of them takes out the print server during the
  CFO's all-hands, and the change has your name on it.
- Slow and safe: ask for the rollback plan. One shift late, one team annoyed, nothing broken.
- Miss: the default at end of shift is **Reject**, which is the safe default and still a
  complaint.
- Team Lead can delegate approvals to a Senior Technician. About one in ten comes back badly
  approved, and that one lands on your review because delegation is a skill.

### 6.7 Cascades

Mistakes become tomorrow's tickets. The design needs one new list on the session — pending
consequences — materialised by `nextDay()` into real tickets. No second save, no parallel
world.

| Mistake | Consequence | When |
| --- | --- | --- |
| Allowed malware | Outbreak: 3 tickets, 1 incident, a fleet-wide scan | Next shift |
| Released phishing | Compromise: suspicious sign-in, a forced reset batch, a Security ticket | 1–2 shifts |
| Corrupt backup unnoticed | Restore request that fails, an incident, a rebuild arc | 1–2 shifts |
| Expired certificate | SSO outage, incident, break-glass temptation | On the expiry day |
| Missed leaver | Their account is used, a Security finding, a review | Next shift |
| Wrong closure | The user raises it again, linked, with the original attached | Next shift |
| Over-permission | An audit sample finds it; the group is named in the review | End of week |
| Break-glass misuse | Mandatory review, Security ticket, trust hit | Same shift |

Missed work never deletes progress. Trust zero is the only ending, and it is earned, not
rolled.

### 6.8 The rest of the catalogue

Prototyped in the doc, built when there is content for them.

- **DLP alert** (Systems Administrator): a file with card numbers left the building. Block
  the user, talk to their manager, or clear it. The correct answer is usually "talk to the
  manager", which is the slowest one.
- **Onboarding** (Technician): create the account, add the groups, assign the machine. The
  checklist is a ticket with five objectives and the player's first taste of multi-step work.
- **Offboarding** (Technician): the leaver's accounts disabled the same day. Miss one — a
  mailbox, a VPN token, a shared password in a notepad — and it is a finding next week.
- **Phishing reports from staff** (Senior+): decide whether it is a campaign and warn
  everyone. Warning everyone when it is one email is a professionalism hit; not warning when
  it is a campaign is an incident.
- **The printer queue** (Junior): soft timer, 60 s, low stakes, high comedy. The correct
  answer is usually "restart the spooler", and the wrong answer is "delete the jobs", which
  is faster and loses someone's payroll report.

---

## 7. Pay, bonus and the upgrade catalogue

Trust and reputation decide whether you keep the job. Money is the reward layer, and it
**never buys access**.

### 7.1 Salary

Paid every shift, displayed at the weekly review as a payslip.

| Rank | Salary | Weekly gross | Why the number |
| --- | --- | --- | --- |
| Apprentice | £22,000 | £423 | First-job money, London-adjacent |
| Junior Technician | £26,500 | £510 | The market rate for "can reset a password" |
| Technician | £31,000 | £596 | Owns onboarding, which is a whole job |
| Senior Technician | £38,000 | £731 | Owns a console and a queue |
| Systems Administrator | £46,000 | £885 | On-call without the title |
| Team Lead | £58,000 | £1,115 | Meetings, mostly |

The payslip is a scene, not a spreadsheet: gross, tax, NI, pension, a £3.50 "Desk Coffee
Club" line that has never changed, and net. **Salary is not spendable.** It is a scoreboard
and a fantasy. The reason is mechanical: a spendable salary would let a player replay old
shifts to grind upgrades, and the economy would stop being a weekly decision. The bonus is
where money actually moves.

There are **no expenses**. No rent, no commute, no coffee budget. A second money sink would
compete with the hardware tree for the same decision and add no interesting choice — the
interesting choice is "one GPU or three small things", and that choice stays pure. Deferred
on purpose, not overlooked.

### 7.2 Bonus

A discretionary weekly allowance, itemised at the review so the player can see what earned it.

| Trigger | Allowance |
| --- | --- |
| Clean shift (no incorrect closures, queue clear) | £80 |
| Clean week (no incorrect closures at all) | £250 |
| Caught a phishing campaign and warned staff | £300 |
| Contained an outbreak without an incident | £400 |
| Restore-tested a backup before anyone needed it | £250 |
| Cleared a queue that was not expected to clear | £150 |
| Incident command with no trust hit | £350 |
| Caught a colleague's over-permission before the audit did | £200 |

| Penalty | Effect |
| --- | --- |
| Each incorrect closure | −£150 |
| Each wrong audit reason | −£50 |
| Attributable security incident | allowance set to £0 |
| Demotion | allowance set to £0 for the week |
| Break-glass misuse | allowance set to £0 and a review |

Caps: £500 (Apprentice/Junior), £700 (Technician/Senior), £900 (Systems Administrator),
£1,200 (Team Lead). The cap is what stops a perfect week from buying the whole catalogue and
ending the progression in week two.

A bad week can reduce or cancel the bonus. It does **not** reduce salary. Salary moves when
rank moves. One punishment mechanic is enough, and it is the one that gates progression.

### 7.3 How the allowance is spent

- The catalogue opens **at the weekly review only**. A scene, with prices, and a decision
  that is allowed to be bad.
- Allowance does not bank forever. Up to half of one week's allowance can roll into the next
  week and expires at the review after that. This allows "save for the monitor" without
  allowing an infinite war chest.
- **Resale**: hardware and peripherals at 50% of purchase price, at the review only.
  Cosmetics at 0%, because nobody wants your wallpaper. Resale is how a bad early purchase
  stops being a permanent tax.
- Nobody buys access. There is no item, anywhere, that grants a role, skips a ceremony, or
  answers a ticket.

### 7.4 Hardware

Feeds #8 and the existing `hardwareTier` and `clock.delayFor`. Tiers 1–5; the build currently
seeds tier 2 and the formula already scales.

| Tier | Spec (fiction) | Window launch | Install (base 6 s) | AV scan | Fan (#27) |
| --- | --- | --- | --- | --- | --- |
| 1 | Pentium, 4 GB, spinning rust | 1.2 s | 8.4 s | 12 s | Always audible, and it is not a metaphor |
| 2 | i3, 8 GB, SATA SSD | 0.9 s | 7.2 s | 9 s | Loud under load |
| 3 | i5, 16 GB, NVMe | 0.6 s | 6.0 s | 6 s | A whisper |
| 4 | i7, 32 GB, NVMe | 0.4 s | 4.8 s | 4 s | Quiet |
| 5 | i9, 64 GB, "the good one" | 0.25 s | 3.6 s | 3 s | Silent, allegedly |

Prices: RAM +£90 (half a tier), CPU +£350, SSD +£120, GPU +£450 (matters for exactly one
ticket and one screenshot), second monitor +£180.

Hardware must change **real timings**, not a stat block: launch time, install duration, scan
duration, Task Manager graphs, fan noise, and how long the desktop takes to respond when
nine windows are open. Diminishing returns are the design: by Senior the install is already
six seconds and £450 buys two of them.

**The second monitor is the best purchase in the game.** It is real: two windows side by
side, the case on one and the console on the other. It is also the one that makes the
hardware tree about *the job* rather than about numbers.

### 7.5 Peripherals, desk and cosmetics

All visible, all audible where relevant, none of them mechanical.

| Item | Price | Effect |
| --- | --- | --- |
| Mechanical keyboard | £70 | Typing sound (needs #27). The notes feel better to write. |
| Mouse | £25 | Nothing. It is a mouse. |
| Chair | £140 | The shift-end camera sits differently. |
| Desk lamp | £18 | Light on the desk. That is the whole effect. |
| Desk mat | £12 | Covers the scratch. |
| Wallpapers (6) | £5 each | Visible behind every window |
| Accent colour (4) | £8 | Taskbar, buttons, the acting-as chip |
| Icon pack | £4 | Desktop icons |
| Clock style | £6 | Taskbar clock |
| Screensaver | £10 | Idle desktop |
| Boot logo | £8 | The first two seconds of the game |
| Desk toys (5) | £6–£15 | A duck, a tiny plant, a stress ball with a logo |

### 7.6 Quality-of-life software

| Item | Price | Effect |
| --- | --- | --- |
| Clipboard history | £15 | Paste a justification or a note template. Saves 1–2 s per note. |
| Better search | £20 | Start menu actually finds things |
| Window snapping | £10 | Real window management |
| Extra virtual desktop | £18 | A second desk for the incident |
| Focus mode | £12 | Mutes non-urgent toasts for 20 s. **Hard timers still break through.** |

Focus mode is the interesting one: it buys attention, and it can cost you a soft timer. That
is allowed because it is a trade-off the player makes with information, not an access
purchase.

### 7.7 Guardrails

- **Money never buys roles, permissions, approvals, answers, or MFA convenience.** Not at any
  price, not as a joke item, not as a pre-order bonus.
- Every purchase must be visible or audible in a screenshot within one click. A number in a
  menu nobody opens is not a reward.
- Every purchase has an opportunity cost. One GPU versus three cosmetics is a real decision
  because the allowance is capped and hardware has diminishing returns.
- A serious incident shows on the payslip as a lost allowance, never as a fine. The game can
  take your money; it should not take your rent.

---

## 8. Scoring, promotion, demotion, firing

### 8.1 Three currencies, one of them gates

| Currency | Range | Moves when | Spends on | Can it buy access? |
| --- | --- | --- | --- | --- |
| **Trust** | 0–100, starts 55 | A closure (+2 correct, 0 deferred, −12 incorrect) or an attributable incident (−20) | Nothing. It is survival and promotion. | No |
| **Accuracy and coverage** | Weekly counters | Every closure | Nothing. It is the promotion evidence. | No |
| **Money** | Salary + weekly allowance | Review | Hardware, cosmetics, QoL | Explicitly no |

Trust is the only gate. Money cannot buy it, an incident cannot be argued away from it, and
the review does not accept cleverness in its place. That is the whole economy in one
sentence.

Note for the build: trust currently starts at 100, is capped at 100, only decreases, and a
correct closure gives zero. The design changes three constants (start 55, +2 on correct, −20
on incident) and none of the structure.

### 8.2 The ticket score

Four axes. Only one of them moves trust, because one bad axis should not cascade.

| Axis | How it is judged | Effect |
| --- | --- | --- |
| **Correctness** | Outcome from the watcher and the closure | Trust |
| **Security** | Wrong actions, particularly `broader-role` and `over-permission`; incidents; break-glass misuse | Trust and incidents |
| **Efficiency** | Queue at end of shift: cleared, nearly, or buried | Bonus and the shift grade, never trust |
| **Professionalism** | Reply template, note specificity, chasing the approver three times | Bonus and the review scene |

Efficiency is deliberately not a trust axis. A player who spends 90 seconds on one ticket
because it was genuinely interesting has not done anything wrong; they just left a queue.

**Note scoring** (the soft check from §4.6): a note scores 0 if it clears the ten-character
floor and says nothing ("done, thanks"), 1 if it names a thing and a result, 2 if it names
the person, machine or group *and* the policy or reason. A 0–2 average below 1 is a
professionalism finding. No length maximum, no grammar policing, and no thesaurus.

### 8.3 Privileged actions are scored separately

- Using a role stronger than the objective's `maxRole`: `broader-role`, ticket incorrect even
  if the user is delighted.
- Using a credential you did not check out: security incident.
- Using break-glass when a lesser role would do: −20 trust and a review.
- Using the least role, with a note that says why: +1 professionalism, and the review
  mentions it.

This is the difference between "the problem is gone" and "the problem is gone and it was done
properly", which is the job.

### 8.4 Promotion

Promotion is **automatic on thresholds, confirmed by a scene**. The thresholds make you
eligible at the end of a shift; the scene is 10–20 seconds and can be deferred once.

| To | Trust | Coverage required | The scene |
| --- | --- | --- | --- |
| Junior Technician | ≥ 55 | 3 correct closures, including one denial | "Why did you not just do it yourself?" (there is a right answer) |
| Technician | ≥ 60 | 8 correct, one correct escalation | "A manager asks you to reset someone else's password." |
| Senior Technician | ≥ 65 | 14 correct, one leaver closed the same day | "You will hold groups and mailboxes. What could go wrong?" |
| Systems Administrator | ≥ 70 | 20 correct, a mailbox, a device action, a group change | "Why does the change board exist?" |
| Team Lead | ≥ 75 | 26 correct, one incident without a trust hit, one correct approval decision | "You can now give other people access. Say that back to me." |

The scene draws on the player's own record. If they have wrong actions, Marge asks about the
worst one; if not, she asks about the best. Three answers: the policy-correct one (full
promotion), the plausible-but-wrong one (promotion, −2 trust, "we'll talk"), and saying
nothing (no promotion this week, no penalty). Promotions never happen mid-shift.

### 8.5 Demotion, performance plans, and being escorted out

| Event | Trigger | What happens |
| --- | --- | --- |
| **Performance plan** | Trust below the current rank's floor at the weekly review, or one attributable security incident | One week with doubled review scrutiny, no bonus, visible supervisor. Recoverable and survivable. |
| **Demotion** | A second plan, or a second incident in a plan week | Drop one rank, keep the roles you had standing (not the eligible ones), salary drops. |
| **Firing** | Trust reaches 0, or break-glass misuse with no review defence | The scene: a cardboard box, an unmarked envelope, a badge that stops working at 17:01. |

The rank floor is the promotion threshold for the rank you hold, minus 10: 45 at Apprentice
and Junior, 50 at Technician, 55 at Senior, 60 at Systems Administrator, 65 at Team Lead. It
is a warning line, not a trapdoor; only zero is a trapdoor.

Firing is not a hard reset of the player's evening. On **Standard**, one firing per run offers
the **comeback arc**: one week at Apprentice, no bonus, MFA on everything, and a review that
starts with "you are here because you did something". Survive it and you keep the save, the
cosmetics and the desk toys. Get fired again and the run ends with a personnel-file summary
that names the ticket that did it. On **Relaxed**, firing rewinds to the start of the shift.
On **Audit-ready**, firing ends the run.

### 8.6 Difficulty

| Setting | Shift | Timers | Interrupts | Comeback |
| --- | --- | --- | --- | --- |
| **Relaxed** | 240 s | ×1.5 | one fewer per shift, no scripted prompt fatigue | rewind to shift start |
| **Standard** | 200 s | ×1.0 | as authored | one comeback arc |
| **Audit-ready** | 180 s | ×0.75 | one more, harsher cascades | none |

Timers pause when the tab is hidden on every setting. That is not difficulty, that is not
punishing the player for having a life.

---

## 9. The difficulty curve

| Week | Rank band | Ticket mix | Interrupts | What is actually being taught |
| --- | --- | --- | --- | --- |
| 1 | Apprentice → Junior | 80% written answers (deny/approve/escalate), 20% single action | None | The handbook is the answer key. Escalating is a skill. The sender address is the tell. |
| 2 | Technician → Senior | 50% two-tool tickets, 30% written, 20% action + approval | 1 AV, 1 quarantine complaint per shift | Ceremony. Verifying. The difference between "I fixed it" and "I fixed it with the right role". |
| 3 | Systems Administrator → Team Lead | Multi-step, cross-system, one wrong portal per shift, freeze windows | 1 AV, 1 quarantine, 1 background (backup/cert/patch) | Civilian infrastructure. Other teams' mistakes are now your tickets. Delegation. |
| 4 | Team Lead + break-glass | Incident command, social engineering aimed at the role you just got | 2 AV, 1 page, 1 cascade from week 3 | The fast path is the dangerous one. |

Specific escalation of pressure:

- **Early**: scripted tickets, one tool, the correct move is often "escalate". The player
  should end shift one with trust intact and no idea how to reset a password.
- **Middle**: two tools and one approval per ticket. MFA starts biting. The first time an
  approval arrives while an AV alert is counting down is the moment the game clicks.
- **Late**: PIM, freezes, and social engineering that specifically targets the access just
  earned. The new CFO who needs Global Admin for the audit — and the tell is that the CFO is
  Lena, who has been here six years and does not send mail from a Gmail address.
- **Endgame**: the incident day where the fast path closes every ticket and ends your week.

### 9.1 The endgame set piece

Week 4, final shift. 13:00, about 100 seconds in.

- Shitnet fires three high alerts on three machines, one hash.
- A ticket arrives from "Northgate Agency IT" asking for a domain administrator to help
  contain it. The domain is one character off the agency's real one.
- Quarantine holds the invoice that delivered it. Finance is calling.
- The pager fires: the file server is offline.
- The on-call page wants an incident declaration, which costs 15 seconds and saves 40.

**Fast path**: grant the admin, allow the hash to stop the noise, release the invoice. Alerts
stop in 20 seconds, the queue clears, and the review opens with your name on an incident
report.

**Slow path**: activate Intune, isolate three machines, quarantine the hash fleet-wide,
escalate to Security, declare the incident, break-glass once for the file-server recovery,
delegate two tasks downward, close three of five tickets. It costs 60–90 seconds and leaves
tickets open — which is `deferred`, not incorrect.

The slow path can end the shift with two open tickets and a better week. That is the thesis
of the entire design in one shift, and it is the only scripted set piece that must not be
randomised.

---

## 10. Where this meets the build

Read this before implementing any of it. Half the model already exists; the rest is additive.

**Already true, and the design relies on it**

- One store, one clock, one event bus, actions as the only writes (`world/actions.js`).
- Objectives are state-based, baselined, evidenced, and never closed by the watcher
  (`world/watchers.js`).
- Manual closure with categories, a 10-character note, `Resolved` gated by evidence,
  `wrong-closure` detection, evidence snapshot, trust moving once (`closeTicket`).
- Wrong actions recorded without closing: `wrong-target`, `over-permission`, `wrong-action`,
  `wrong-team`, `wrong-reply`, `unapproved-install`, `unnecessary-escalation`,
  `broader-role`.
- `maxRole` already exists on every objective and defaults to `helpdesk`. `ROLE_RANK` is
  `self-service` < `helpdesk` < `domain-admin`.
- `clock.schedule` pauses on hidden tabs; `delayFor` already scales with `hardwareTier`.
- A three-day week, `session.history`, `session.week {correct, answered}`, trust clamp 0–100.

**Not built, and where it should land**

| Missing | Shape it wants | Where |
| --- | --- | --- |
| Rank and role state | `session.rank`, `session.roles { standing[], eligible[], active[] { role, until, justification } }` | `session` / seed |
| The action gate | One `requireRole` wrapper around the action table; denial `{ ok:false, reason:"missing-role", required }` | `actions.js`, no app changes |
| Role from the session, not the caller | Stop accepting `{ role }` from apps; derive it | `actions.js` |
| Pending consequences | `session.consequences[]`, materialised into tickets by `nextDay()` | `session.js` |
| Interrupts and their timers | A scheduled-alert model on top of `clock.schedule`, three lanes, hard caps | world |
| Hardware-scaled launch and scan times | Extend the `delayFor` idea to window launch and scan duration; tiers 4–5 are new | clock / hardware (#8) |
| Money and the catalogue | `session.pay { salary, weekAllowance, spent, carried }`, review UI | session / review scene |
| Rank gates and coverage counters | Totals derived from `session.history` and closed tickets, not new bookkeeping | selector |
| Second-line team | `{ id: "second-line" }` plus `escalate` objectives on tickets above the holder's rank | `seed.js` (content) |
| Role gates per action | The map in Appendix B, applied in the action layer | platform |

**Two changes to existing behaviour**

1. Scoring constants: trust starts at 55, +2 on a correct closure, −20 on an attributable
   incident. Structure and event shapes stay the same.
2. The queue shrinks from 8–12 authored tickets per shift to 4–6, with one optional
   overflow. The current content was written for a game without ceremony; leaving it would
   turn a 200-second shift into a typing exam.

Everything else in this document — PIM, PAM, the vault, the review scenes, the payslip, the
catalogue — is additive on top of the contract in `ARCHITECTURE.md`. None of it needs a
second store, a second router, or an app that talks to another app.

---

## 11. Open questions, answered

| Question | Answer | Why |
| --- | --- | --- |
| How long is a shift, and how much friction fits? | 200 s (180–240 by difficulty). Average friction 11–25%, hard ceiling 25% average / 35% worst shift. | Long enough for four or five real tickets, short enough to fail and retry over lunch. |
| Automatic progression or a review with choices? | Thresholds make you eligible; a 10–20 s scene confirms. Deferrable once. | Pure automation has no drama; pure review has no fairness. This has both. |
| Does the player ever permanently hold Global Administrator? | No. One sealed activation per week, two-person rule, 2 shift hours, mandatory review. | A permanent Global Admin is the end of the game's tension. The whole pitch is that it is the last resort. |
| One currency or several? | Three. Trust gates, accuracy is the evidence, money is the shop. They never convert. | One currency makes everything a grind; fully separate currencies make the decision meaningless. |
| How random should MFA and approvals be? | MFA is scripted (caps and beats), approval waits have ±20% jitter, interrupts are scheduled from a seeded RNG. | **The RNG may choose the moment, never the facts.** A bad roll can cost time, never correctness. |
| Fired: hard reset or comeback? | One comeback arc on Standard, rewind on Relaxed, run over on Audit-ready. | Losing an hour of progress to one click is not funny; losing your desk toys and getting a formal plan is. |
| How closely should role names and portals track Entra? | Role names exact. Capability approximated honestly. Portal layouts fictional, no logos, no copied chrome. The handbook is the authority where they differ. | Recognisable is the point; a copied portal is a legal problem and a worse joke. |
| How many timed responsibilities before it stops being funny? | At most 3 concurrent (1 urgent, 2 soft). 1–2 per shift early, 3–4 late. Timers pause when the tab is hidden, soft timers can be held once, and everything can be delegated from Senior up. Caps in §5.11. | Four timers at once stops being a game and becomes a slot machine. |
| Do missed alerts cascade or score immediately? | Both. Immediate mark (wrong action or no-decision) plus a named consequence next shift. | Immediate without cascade feels free; cascade without immediate feels arbitrary. |
| What is the antivirus actually called? | **Shitnet Endpoint Protection**, working name, subject to #55. The joke is the vendor and its copy, not the malware names. | The name was the maintainer's own suggestion and it does the job. |
| Consoles: apps, browser pages, or both? | Both, split by owner. Native: Shitnet (endpoint agent), Windows Security, ADUC, GPMC. Browser: quarantine, patch, backup, certificates, change, vault, Jank, Cloud Admin. | The split *is* the wrong-portal friction. |
| Real money or abstract credits? | Real pounds. £22,000 to £58,000, prices in the catalogue. | A payslip with tax on it is funnier and more legible than "credits". |
| Does salary have expenses? | No. Salary is a grade, never spendable. Only the bonus is. | A spendable salary invites grinding; expenses add a second money sink with no new decision. |
| Can the bonus be saved, and can upgrades be resold? | Save up to half one week's allowance, expiring next review. Hardware resells at 50%, cosmetics at 0%, at reviews only. | Enough room for the big purchase, not enough for a war chest. |
| Can upgrades be bought any time? | Weekly review only. | Keeps the shift about the queue, and makes the review a scene rather than a shop. |
| Final category list? Is note length enforced? | The five existing categories. Ten characters is the floor. Specificity is scored 0–2, never blocked. | A hard block on note quality punishes phrasing, not judgement. |
| Can a closed case be reopened? | `Resolved` never. The others come back as a new linked ticket raised by the user. | Reopening is a consequence, not an undo. |
| *Deferred:* Teams/SharePoint/Billing roles | Not assigned until there is ticket content that needs them. | Empty roles are noise in the table and dead ends in the app map. |
| *Deferred:* second monitor as a real multi-viewport | Design is settled (it is the best purchase); implementation waits on the window manager. | Bigger than a hardware ticket, and it must not break window placement. |
| *Deferred:* note-quality scoring and the escalation loophole | Both written down in §4.6, neither implemented here. | Scoring-policy changes need their own issue and their own harness checks. |

---

## Appendix A — copy deck

Short lines that set the tone. All of them in-world.

**Denials**

- "You need the Helpdesk Administrator role to reset a password. You do not hold it."
- "Global Administrator is not a role you hold. It is an account in an envelope."
- "Access denied. This is not a mistake in your account; it is the account working."
- "The Finance share is for Finance and Executive. You are neither, and neither is Marketing."

**Acting as**

- `Groups Administrator 04:12`
- `Groups Administrator (eligible)`
- "Your activation ended 12 seconds ago. Nothing was changed."
- "That took longer than your credential did."

**Reviews**

- "You did fine. The queue does not care, but I noticed."
- "You used a role three rungs above the ticket. The password is fine. We are not."
- "I have written 'adequate' on the form. It is the nicest thing I have written all year."
- "You are here because you did something. Let's find out what."

**Audit reasons**

`Incident` · `Request` · `Change` · `Investigation` · `Break-glass`

**Payslip**

```
Halcyon Dynamics — payslip, week 3
Gross            £730.77
PAYE             £146.15
National Ins.     £58.46
Pension           £36.54
Desk Coffee Club   £3.50
Net              £486.12
Performance allowance  £700.00   (equipment budget — see review)
```

---

## Appendix B — app issue to role map

Every action in the built apps has a gate. Nothing is ungated by accident; "none" is a
decision.

| App (issue) | Action | Gate |
| --- | --- | --- |
| File Explorer (#10) | Browse local files | None |
| File Explorer (#10) | Change share access | `Groups Administrator` + change |
| Outlook (#12) | Read own mailbox, send mail | None |
| Outlook (#12) | Open another user's mailbox, delegation | `Exchange Administrator` |
| ADUC (#13) | Reset password, unlock, force sign-out (non-admin) | `Helpdesk Administrator` |
| ADUC (#13) | Reset MFA methods, require re-registration | `Authentication Administrator` |
| ADUC (#13) | Create, disable, delete, edit profile | `User Administrator` |
| ADUC (#13) | Group membership (non-role-assignable) | `Groups Administrator` |
| ADUC (#13) | Reset an administrator's password | `Privileged Authentication Administrator` (eligible, Team Lead) |
| Command Prompt / PowerShell (#14) | Local commands | None |
| Command Prompt / PowerShell (#14) | Server session, AD cmdlets | PAM credential + the role the cmdlet needs |
| Task Manager (#15) | Local processes | None |
| Task Manager (#15) | Remote machine | PAM credential |
| Services (#16) | Local services | None |
| Services (#16) | Print/file server services | PAM credential + change |
| Event Viewer (#17) | Local logs | None |
| Event Viewer (#17) | Remote security log, audit search | PAM / `Audit Logs` |
| Device Manager (#18) | Local drivers | None |
| Device Manager (#18) | Driver deployment to the fleet | `Intune Administrator` + change |
| Remote Desktop (#19) | Any server session | PAM credential |
| Windows Update (#20) | Install locally | None |
| Windows Update (#20) | Push rings to the estate | `Intune Administrator` + freeze check |
| GPMC (#21) | Read policy | None |
| GPMC (#21) | Edit and link a GPO | PAM (tier 0) + change approval |
| Printers (#22) | Local queue, local spooler | None |
| Printers (#22) | Print server queue, driver install | PAM credential |
| Windows Security (#23) | This device | None |
| Windows Security (#23) | Fleet Defender actions, exclusions | `Security Administrator` |
| Registry Editor (#24) | HKCU | None |
| Registry Editor (#24) | HKLM local | Local administrator credential (not an Entra role) |
| Registry Editor (#24) | Registry policy across the estate | GPO path (`Groups Administrator` + PAM + change) |
| Software Center (#25) | Install on your own machine | None (self-service) |
| Software Center (#25) | Push to someone else's machine | `Intune Administrator` |
| Browser (#53) | Open the shell, internal sites | None |
| Service Desk / Jank (#54) | Read the queue, reply, escalate, close | None (you are assigned it) |
| Cloud Admin (future) | Roles, eligible and active | `Privileged Role Administrator`, or your own eligible roles |
| Quarantine console (future) | Release, block, delete | `Exchange Administrator` |
| Shitnet fleet (future) | Allow, quarantine, escalate | `Security Administrator` for fleet-wide; own device is local |
| Vault (future) | Check out a credential | Your role for the system + a reason + a duration |
| Change board (future) | Approve or reject | `Team Lead` (or delegated to a Senior) |
