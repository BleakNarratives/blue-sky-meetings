# Contributions & decision record

**Project:** Blue Sky Meeting (singular)
**Record opened:** 2026-11-08
**Status:** living document. Append dated entries; do not rewrite history.

This file exists so the work is witnessed, observed, and accounted for. It records
who asked for what, what the agent proposed on its own initiative, what was built,
what was deliberately not built, and where the agent was wrong or changed its mind.

If this file and the code disagree, the code is what shipped. Correct this file.

---

## Collaborators

| Role | Name | What they own |
| --- | --- | --- |
| Operator / commissioner | `foxwoodacademy` (committing as `Bleak Narratives`) | The brief, the taste, the go/no-go, the repository and deployment |
| Agent | **Buffy** (Codebuff), working in the Freebuff Web workspace | Protocol design, implementation, copy, documentation, verification |
| Host (in the fiction) | **Syntax AI** | A named host role. No model is called at runtime. It advises and never votes, authorizes, assigns, or calls a bout. |

The operator and the agent are peers in the design conversation. The operator holds
authorization. The agent holds the record and the implementation.

---

## What the operator asked for

| # | Brief | What shipped |
| --- | --- | --- |
| 1 | A scoring and viability system called the **Future Runscore**, and a sealed room to hold unannounced ideas. "Build exactly this first." | Sealed rooms, three stages, the runscore, assessments, dashboard, auth, landing. |
| 2 | Anyone with a thought to spare; loose and casual but like holy ground; iterate in increments when the time is right. | Open-to-all framing, sealed pool, staged protocol, iteration lineage, stewardship, brand voice. |
| 3 | Blind ideation with simultaneous reveal; mandatory asymmetry detection; exploration separated from execution; nods for belonging without an echo chamber; Syntax AI as host. | Sealed pool and permanent reveal, per-pass asymmetric flag, assignment briefs, nods/pushback, host card and host copy. |
| 4 | Share URLs, upload files, point at sources; a boardroom with chairs and cameos; an arena for head-to-head model battles; cross-concept/code/business-model breeding; the bootstraps metaphor. | Declared sources (links + files in Convex storage), six-chair board with signed readings, arena bouts with ballots and a human call, two-parent breeding, bootstrap field, assignment bar. |
| 5 | Be as open as open source and as private as closed doors; hold good, bad, illegal, and gray ideas; reuse existing modules; docs and a repo. | **This turn:** README, ROADMAP, this record. **Not built:** the visibility/permission layer that the open/private ask requires. See below. |

One term from the brief was not carried into product copy. The wildcard track and the
arena already hold that energy; the product does not need the word.

---

## Agent proposals: on the record

These are the agent's own contributions — proposed in conversation, then either built
or explicitly deferred. This is the "witnessed" part.

### Proposed and built

| Proposal | Where it lives | Why it exists |
| --- | --- | --- |
| **Can / Might / Ought** as three separate questions | `src/components/registers.tsx`, `positions` table, `deliberate.ts` | The runscore answers only *Can it work?* Likelihood and morality are different questions. Averaging them would launder values into arithmetic. One seat records one pair, tallied and never scored. |
| **The Bestiary** — a shelf for ideas that must be kept but not built | `src/components/bestiary.tsx`, `ideas.disposition`, `deliberate.keep/restore` | Deleting a dangerous or illegal idea makes it invisible and unrecognizable next time. A labeled shelf with a reason, keeper, and review date is more honest than deletion. It is also the anti-censorship guarantee. |
| **One seat, one position** | `deliberate.setPosition` upsert | Repetition cannot amplify a voice. Same rule as assessments, nods, and ballots. |
| **Seeded disagreement as documentation** | `rooms.createExample` | The example room demonstrates an iteration, a hybrid, a called bout with dissent, declared sources, a split board, and one idea on the Bestiary shelf. A product should show its arguments, not just its happy path. |
| **Assignment bar** | `ideas.bar`, `AssignDialog` | "Higher ambition" is declared as a band to be judged against, not as a higher number handed out. Hybrids can be given a higher bar; they still earn their own reading. |
| **Asymmetry, briefs, and nods kept out of the score** | `assessments.asymmetric`, `assignmentMode`, `nods` | The arithmetic should not be able to quietly erase a radical bet, a long-shot commitment, or belonging. |

### Proposed, not built (with reasons)

| Proposal | Status | Why not yet |
| --- | --- | --- |
| **Visibility ladder**: sealed → invited → unlisted → public, with memberships, roles, and expiring invite links | Deferred, top of the roadmap | It is a permissions rewrite touching auth, every room query, invite acceptance, reader roles, and public read routes. A half-verified permissions layer is worse than none. It needs its own pass. |
| **Publication gate + consent + audit log** | Deferred | A public room is a publication. It needs human review, contributor consent, and a record before it exists. |
| **Red Chair review** for ideas that propose harm or illegality | Deferred | The `Ought` register and the Bestiary hold the ethics that can exist before multi-user. A signed, appealable review needs the publication context to be meaningful. |
| **Outcome loop**: delivered / failed / abandoned / retired, cost, what it taught, bar met? | Deferred | The runscore is a forecast with no feedback. This is the highest-value addition after permissions, and it needs a place in the authorized stage. |
| **Room modes**: blue sky / red team / should / post-mortem | Deferred | Gives "bad ideas" a legitimate frame instead of a loophole. Should land with the publication work, not before. |
| **Host audit log** (what Syntax could see, read, flagged) | Deferred | Requires a real model integration and a record of its calls. |
| **Model-backed readings and asymmetry suggestions** | Deferred | Needs a provider key, a budget, and the audit log. Model output would enter as a signed reading, never as evidence or a score. |
| **Portable pitch sheet** (one-page export) | Deferred | An output, not the room. A leave-behind, not a deck builder. |
| **Vertical/industry-specific boards** | Deferred | Chairs are role lenses today. Industry scoping is a labeling layer with no behavior yet. |
| **Protocol spec + open-source license** | Deferred | Recommendation: MIT for code, CC BY-SA 4.0 for the protocol text. The operator has not chosen a license yet. |

---

## Agent positions on the record

These are opinions, not features. They are recorded so they can be argued with.

1. **The room may think anything. It may not operationalize or publish anything
   without a human.** Private rooms can hold the illegal idea, the unethical idea,
   the thing that should not exist, as an object of thought. Public rooms are
   publications and need a gate. Operational harm is out of scope everywhere. This is
   the difference between a think tank and a workshop.
2. **Privacy is a ladder, not a binary, and "private" is not "end-to-end."** A
   Convex-hosted room is access-controlled, and the operator can read it. Say that
   plainly. True secrecy is a different architecture, and it would blind the host.
3. **Do not add more formats before the spine is visible.** The life of an idea is:
   heard → read → argued → called → authorized → carried → retired. Every module
   should be a step on that spine, not a new wing of the amusement park.
4. **The score needs a past.** Without outcomes, the Future Runscore is a vibe with
   decimals. Calibrate it against what actually happened.
5. **Four kinds of opinion, four different jobs.** Assessments are evidence. Readings
   are argument. Ballots are comparison. Nods are company. If the room cannot explain
   the difference in one line each, it is too dense.
6. **A host that cannot show its work is a mascot.** Syntax should have an audit log
   before it has a personality.
7. **Open source the protocol, not just the client.** The institution is the artifact.
   The code is replaceable; the rules are the contribution.

---

## Decisions and why

| Decision | Rationale | Cost |
| --- | --- | --- |
| Sealed pool enforced server-side | The client never receives sealed ideas, authors, or order. A CSS blur is not a seal. | `rooms.get` returns an empty list plus a count while sealed. |
| Reveal is permanent | Reopening the floor must not re-blind what everyone already saw. | Once revealed, the room can never return to a blind pool. |
| One seat, one pass / nod / ballot / position | A single voice cannot move a score or a tally by repeating itself. | Contributors are identified by their display name, which is not a hard identity. |
| Asymmetry is flagged, never scored | Radical bets are not quietly outvoted by arithmetic. | The flag can be gamed; it is still only a flag. |
| Exploration and delivery are separate briefs | A failed long shot is not a dropped commitment. | No participant capability scores yet — deliberately, because they would be gamed. |
| Bestiary instead of deletion | Dangerous ideas should be labeled and dated, not erased. | More record to maintain; no hard purge. |
| Sources are declared, not smuggled | The old "inbound closed" rule became a lie once links and files existed. | Requires attribution, labels, and file storage. |
| Files live in Convex storage | No extra provider, key, or bucket to manage. | Convex storage limits and no virus scanning. |
| No model wired | No provider key, no budget, no audit log; readings are written by seats. | Syntax is a named host role, not an intelligence. |
| Single-owner until permissions are real | Rooms are sealed, not shared. | The open/private promise is not yet usable. |

---

## Where the agent was wrong or changed its mind

- **"Inbound closed"** was written before declared sources existed. Once links and
  files were allowed, the rule was false. It was changed to **"Inbound declared ·
  Outbound closed,"** with prior art/context labels and attribution.
- **Lineage was single-parent** (build-ons only). The operator asked for breeding, so
  two-parent hybrids were added with both lineages and no inherited score.
- **Viability was one number.** After the operator's "anything involving should"
  brief, the Can/Might/Ought split was added. The score remains the *Can* answer only.
- **The agent called the visibility ladder the top priority and then did not build
  it** in the same pass. That was deliberate: a permissions rewrite deserves its own
  verified pass, not a rushed one. It remains the top of the roadmap.
- **No UI in this project has been visually inspected by the agent.** There is no
  browser in the authoring workspace. Typechecks and Convex pushes are not visual
  verification. This is recorded as a limitation, not a pass.

---

## Verification ledger

What was actually run, and what was not.

**Run and passed**

- `bun convex dev --once` — schema and functions pushed to the development
  deployment after each backend change (sources, board, arena, breeding, positions,
  Bestiary).
- `bun tsc -b --noEmit` — exit 0 after the final edits.
- Tailwind compile check against the theme tokens — passed for the classes checked.
- Protocol capability matrix checked directly (open: contribute only; assessment:
  score/build-on/breed/deliberate; authorized: score/assign; sealed: nothing visible).

**Not run**

- No browser interaction, no click-through, no screenshots.
- No upload test against Convex storage.
- No multi-user or permission test (there is no multi-user layer).
- No production build (`bun run build`).
- No load, retention, or deletion test beyond the cascade code.
- No model call (none is wired).

---

## How this was made (environment provenance)

- Authored in the Freebuff Web workspace at `/home/daytona/codebase`.
- The workspace contains a `.git` directory with **no remote configured**, and the
  host blocks `git` and GitHub commands. The agent could not commit or push.
- The agent can read public GitHub repositories over HTTP. It cannot read the
  operator's device, private repositories, or files outside this project.
- The operator publishes the repository. See README → Publishing.

---

## Update protocol

Append a dated entry under "Agent proposals" or "Where the agent was wrong" when a
proposal is accepted, rejected, or superseded. Never delete a shipped decision from
this record; mark it superseded and say why. The point is to be able to reconstruct
how the room got here.
