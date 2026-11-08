# Roadmap

**Project:** Blue Sky Meeting (singular)
**Updated:** 2026-11-08
**Current:** v0.1, single-owner prototype. Backend pushed, typechecked, not visually verified.

Items marked **†** were proposed by the agent and are recorded in
[CONTRIBUTIONS.md](./CONTRIBUTIONS.md). Items marked **P0** block the open/private
promise and should not be skipped.

---

## Shipped (v0.1)

- Sealed rooms with a server-enforced blind pool and permanent simultaneous reveal
- Three-stage protocol: open floor → assessment → authorized, one step at a time
- The Future Runscore: four weighted dimensions, mean of seats, band ladder
- Per-pass asymmetry flag, counted but never scored
- Nods and pushback at equal weight, never scored, never ordering the table
- Iterations (build-ons) and two-parent breeding with lineage and no inherited score
- Declared sources: links and files in Convex storage, prior-art/context labels
- Six-chair board with signed, revisable readings
- Arena bouts with one ballot per seat, for/against cases, a human call, and dissent
- Assignment briefs (explore/deliver) and a declared runscore bar
- Bootstraps as a named asset
- Can / Might / Ought positions, tallied and never averaged **†**
- The Bestiary: kept, not built, with reason, keeper, review date, and restore **†**
- Seeded worked example demonstrating disagreement, a hybrid, a called bout, and a shelf
- Landing, dashboard, auth, 404, brand, and docs

---

## Next

### 1. Visibility ladder and memberships — **P0**

The central missing primitive. Right now a room is readable only by its owner, so
"open as open source, private as closed doors" is aspirational.

- `rooms.visibility`: `sealed` (owner) → `invited` (named seats) → `unlisted`
  (link, read-only) → `public` (published after review)
- `memberships`: room, user, role (`owner`, `chair`, `seat`, `reader`), invited by,
  expiry
- Expiring invite links with hashed tokens; a join route that accepts and explains
- Access checks centralized in one helper and applied to every query and mutation
  (rooms, ideas, sources, readings, bouts, positions)
- Reader role: can read everything revealed, can mutate nothing
- Per-room pseudonyms and an explicit "attribution hidden until reveal" rule
- Withdrawal: a participant can remove their own contribution before publication
- Export: room as JSON and Markdown, including sources, readings, ballots, positions,
  and the Bestiary
- Tests for every role × every capability; this is not a feature to eyeball

**Why first:** every other addition assumes more than one person can be in the room.
**Do not** ship it halfway. A leaked room is worse than a sealed one.

### 2. Publication gate, consent, and the Red Chair — **P0** (depends on 1)

A public room is a publication. It needs a gate, not a toggle.

- "Publish" is an explicit human action with a checklist, not a visibility switch
- Contributor consent: attribution shown only with permission; pseudonymous by default
- A **Red Chair** review for ideas that propose harm or illegality: signed,
  appealable, with a disposition (keep as study/fiction, decline to operationalize,
  refer). Not a silent filter.
- Report/flag flow, operator review queue, takedown, and an audit log
- Age/terms gate for public rooms; jurisdiction and retention noted in the UI
- A written boundary: the room may think anything; it may not operationalize or
  publish harm **†**

**Why:** the operator inherits real legal and ethical exposure the moment a room is
public. This is self-protection as much as governance.

### 3. Outcome loop — **P1**

The runscore is a forecast with no feedback. Record what happened after authorization.

- Outcome: delivered / failed / abandoned / retired, with a note and date
- Cost and time actually spent, against the declared brief and bar
- Calibration view: forecast band vs. outcome, by track and by chair
- Retire an idea without deleting it; retirement is a disposition, not a redaction
- Feed outcomes back into room copy, not into an automated score adjustment

**Why:** without this, the instrument never learns. This is the highest-value
addition after permissions.

### 4. Room modes — **P1**

A frame, not a filter. The protocol stays identical; the prompt and the standard of a
good contribution change.

- **Blue sky** — generate and combine
- **Red team** — attack the idea; awful proposals are allowed as objects of critique
- **Should** — normative deliberation; Ought carries the weight
- **Post-mortem** — learn from an outcome; no new proposals

### 5. Host audit log and model-backed readings — **P1**

Syntax AI is currently a named role, not an intelligence.

- A per-room log: what the host could see, what it read, what it flagged, what it
  could not see
- One provider integration (Convex action, `"use node"`), with a budget and a kill
  switch
- Model output enters as a signed **reading** in a chair, never as evidence, a score,
  a vote, or a call
- Asymmetry suggestions are suggestions; the seat still makes the call
- No model access to sealed pools

**Why later:** needs keys, billing, evals, and an audit surface. Shipping a
personality before a log is how trust dies.

---

## Later

- **Room rail:** Floor / Table / Board / Arena / Record, with counts, so the
  instruments are phases of one meeting rather than drawers below a feed **†**
- **Portable pitch sheet:** one-page export (premise, thesis, sources, readings,
  score, dissent, bar, disposition). Not a deck builder.
- **Protocol spec:** a standalone document other implementations can follow; the
  institution is the artifact **†**
- **License:** MIT for code, CC BY-SA 4.0 for the protocol text (decision pending)
- **Self-host guide:** private deployment for closed-door rooms; be explicit that
  "private" is access control, not E2E
- **Search and cross-room index** with privacy scoping
- **Vertical/industry boards:** a domain label and chair presets, not a behavior change
- **Notifications** for review dates and invited seats
- **Bulk source ingestion** with size/type limits and a malware scan

---

## Not planned

- Engagement metrics, streaks, leaderboards, or anything that rewards posting volume
- A public gallery or "explore" feed before the publication gate exists
- Automatic authorization, automatic assignment, or a model that votes/calls
- End-to-end encryption claims on a hosted deployment that can read plaintext
- A pitch-deck builder, outreach automation, or marketing calendar
- Participant capability scores (gameable; briefs and bars are the honest version)
- Deleting ideas for scoring low
- Importing formats faster than the spine can hold them **†**

---

## Open questions

1. **Privacy semantics.** Is "sealed" a promise about access, or about readability by
   the operator? The current answer is access only. If it must be readability, the
   architecture changes and the host goes blind.
2. **Moderation capacity.** Who staffs the publication gate? If the answer is "one
   person," public rooms should stay closed.
3. **Legal exposure.** Which jurisdictions, what retention, what reporting duty, what
   happens to illegal content in a private room?
4. **Attribution and consent.** Pseudonymous by default? Can a contributor withdraw
   after reveal? What does the record owe the room vs. the person?
5. **The Bestiary's ethics.** Is shelving an idea a form of censorship, or the only
   honest alternative to deletion? Current position: labeling beats erasure, but the
   keeper's power needs review.
6. **Model role.** Does Syntax generate readings at all, or only summarize and flag?
   The current design says readings are human-signed; a model would need its own chair
   and a visible label.
7. **Identity.** Display names are not identities. Multi-user needs a real seat model
   before one-seat-one-pass means anything.

---

## Milestones

| Milestone | Definition of done |
| --- | --- |
| **v0.1 — prototype** | Single-owner room, protocol, runscore, instruments, Bestiary, docs (current) |
| **v0.2 — multi-seat** | Visibility ladder, memberships, invites, reader role, withdrawal, export, role tests |
| **v0.3 — publication** | Consent, publication gate, Red Chair, reporting, audit log, terms |
| **v0.4 — learning** | Outcome loop and calibration view |
| **v1.0 — institution** | Protocol spec, license, self-host guide, model host with audit, calibrated score |

No dates. Dates create pressure to skip the gates, and the gates are the product.

---

## Risks

- **Permissions half-done** → leakage. Mitigation: dedicated pass, centralized access
  helper, tests per role.
- **Moderation without staff** → legal and ethical exposure. Mitigation: keep public
  rooms closed until a human review path exists.
- **Score theater** → a precise-looking number that never learns. Mitigation: the
  outcome loop.
- **Format sprawl** → a collage instead of an institution. Mitigation: the spine, and
  a high bar for new modules.
- **Host personality before host accountability** → trust collapse. Mitigation: audit
  log first.
- **UI never visually verified** → shipped blind spots. Mitigation: a real browser
  pass before calling v0.1 done.
