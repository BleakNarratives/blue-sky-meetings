# Blue Sky Meeting

**A sealed room for the ideas you haven't said out loud yet.**

Blue Sky Meeting (singular) is a working prototype of a meeting room for
unannounced ideas. Put a half-formed thing on the table, hear everyone before
anyone grades it, and decide what deserves to be carried — with a human
authorizing every step.

> **Status: v0.1 — single-owner prototype.**
> No model is wired. No public sharing or publication gate yet. The UI has been
> typechecked and the backend pushed, but it has not been visually verified in the
> authoring workspace. Read [Privacy & safety](#privacy--safety-current-limits)
> before exposing it to anyone.

---

## The protocol in one pass

| Stage | What the room allows |
| --- | --- |
| **Open floor** | Contributions go into a sealed pool. The server does not send titles, authors, or order to the client. Room-level sources can be declared. Nothing is scored. |
| **Reveal** | Closing the floor releases everything at once, names attached. The reveal is permanent; reopening the floor later never re-blinds what the room has already seen. |
| **Assessment** | Score, build on an idea, breed two ideas, record board readings, take a Can/Might/Ought position, open arena bouts, declare sources. No assignments. |
| **Authorized** | Assign a steward with a brief (**explore** or **deliver**) and a **bar** (Provisional / Viable / Runaway). Closed to new entries. |

Stages move one step at a time, in either direction. A human moves them. The host
never does.

---

## The Future Runscore

A single 0–100 reading of whether an idea could survive being run in the future.
Each pass scores four dimensions from 0–10; the idea's score is the mean of every
seat's pass, so one confident voice cannot manufacture a high number.

```
score = 10 × (0.25·novelty + 0.35·warrant + 0.20·reach + 0.20·(10 − drag))
```

| Dimension | Weight | Question |
| --- | --- | --- |
| Novelty | 25% | Has this been said before? |
| Warrant | 35% | What stands behind the claim? |
| Reach | 20% | Can it touch anything that already exists? |
| Drag | 20% (inverse) | What does it cost to move? |

Bands: **Dormant** 0–39, **Provisional** 40–64, **Viable** 65–84, **Runaway** 85–100.

Every pass also makes one non-numeric call: **steady bet** or **asymmetric bet**
(precedent says it probably fails; the upside is not linear). Symmetry flags are
counted beside the score and never added to it.

---

## What's in the room

- **Declared sources** — links or uploaded files, attached to the room or an idea,
  labelled **Prior art** or **Context**, attributed, and removable. Files live in
  Convex storage. Deleting an idea or room deletes its files.
- **The board** — six chairs: Chair, Advocate, Operator, Skeptic, Market, Cameo.
  Anyone can sit in one; readings are signed, revisable, and never scored.
- **The arena** — two ideas, one question, one ballot per seat with a case for and a
  case against. A human calls the bout with a rationale; the dissent stays attached
  and the losing idea stays on the table.
- **Breeding** — combine two ideas into a third. The hybrid keeps both lineages and
  inherits no score.
- **Bootstraps** — every idea can name the asset it actually pulls on. A bootstrap is
  not a virtue; it is a thing you can point at.
- **Can / Might / Ought** — the score answers *Can*. Seats record a pair of positions
  on *Might it happen?* and *Ought it exist?* Tallied, never averaged, never folded
  into the score.
- **The Bestiary** — the shelf for ideas that must be kept but not built. A reason, a
  keeper, and a review date. Off the table and out of the mean; still readable, still
  restorable, never deleted.
- **Company, not consensus** — one nod and one pushback per seat, at equal weight and
  identical styling, never affecting the score or the order.

---

## Principles

1. **Hear everything before grading anything.** The floor closes before the first pass.
2. **The machine advises; a human authorizes.** The host never votes, assigns, or calls
   a bout.
3. **One seat, one pass.** Repeating yourself replaces your position instead of
   stacking it.
4. **Advice and evidence are different objects.** Readings, ballots, nods, and
   positions are recorded; only assessments move the score.
5. **Nothing is deleted for losing.** Low scores stay on the record; dangerous ideas go
   to the Bestiary with a label.
6. **Declared, not smuggled.** Anything brought in from outside is listed, labelled,
   and attributable.

---

## Stack

- **Frontend:** Vite 7, React 19, TypeScript, React Router 7, Tailwind CSS v4,
  shadcn/ui, Framer Motion, Lucide
- **Backend / database:** Convex (queries, mutations, file storage)
- **Auth:** Convex Auth (email OTP and anonymous users)
- **Package manager:** Bun
- **Notifications:** Sonner

---

## Data model

| Table | Purpose |
| --- | --- |
| `rooms` | A sealed room: owner, title, premise, stage, permanent `revealed` flag |
| `ideas` | Contributions: title, thesis, author, track, lineage (`parentId`, `bredFrom`), bootstrap, disposition, steward, brief, bar |
| `assessments` | One scoring pass per seat: four dimensions, note, asymmetric flag |
| `nods` | One nod or pushback per seat per idea |
| `sources` | Declared links/files, room- or idea-scoped, with prior/context label |
| `readings` | A seat speaking from a board chair |
| `bouts` | A head-to-head question, its sides, status, call, and rationale |
| `boutVotes` | One ballot per seat per bout, with for/against cases |
| `positions` | One Might/Ought pair per seat per idea |
| `users` | Convex Auth user records |

`src/convex/_generated` is gitignored. Run codegen before typechecking a fresh clone.

---

## Repository layout

```
src/
  convex/           schema, queries, mutations, protocol, runscore, seed data
  components/       room instruments, dialogs, app shell, UI primitives
  pages/            Landing, Auth, Dashboard, Room, NotFound
  hooks/            auth hook
  main.tsx          router and providers
  index.css         theme tokens and print/room styles
public/             logo, manifest
```

Key documents:

- [ROADMAP.md](./ROADMAP.md) — what's next, what's deliberately not planned
- [CONTRIBUTIONS.md](./CONTRIBUTIONS.md) — who asked for what, what the agent
  proposed, the decision record, and the verification ledger

---

## Local development

Requirements: Bun, a Convex account (or a self-hosted Convex deployment), and the
Convex CLI via `bunx`.

```bash
bun install
cp .env.example .env.local
# fill in VITE_CONVEX_URL and CONVEX_DEPLOYMENT
bunx convex dev        # pushes functions, runs codegen, watches for changes
bun run dev            # Vite dev server
```

In a non-interactive environment (CI, this workspace), use:

```bash
bunx convex dev --once
bun tsc -b --noEmit
```

Other scripts: `bun run lint`, `bun run format`, `bun run build`, `bun run preview`.

The Convex deployment needs its own environment for auth. The template expects
`JWKS`, `JWT_PRIVATE_KEY`, and `SITE_URL` on the deployment; keep them out of the
client and out of git. This repo does not include the email OTP provider setup beyond
what is in `src/convex/auth/`; do not modify `emailOtp.ts`, `auth.config.ts`, or
`auth.ts` without understanding the auth flow.

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_CONVEX_URL` | client / `.env.local` | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | CLI / `.env.local` | Deployment used by `convex dev` |
| `CONVEX_SITE_URL` | client / `.env.local` | Auth site URL |
| `JWKS` | Convex deployment | Auth key set |
| `JWT_PRIVATE_KEY` | Convex deployment | Auth signing key |
| `SITE_URL` | Convex deployment | Auth redirect origin |
| `VLY_INTEGRATION_KEY` | Convex deployment (optional) | Host integration gateway; **not used by the current app** |

`.env.local` is gitignored. Never commit deployment keys.

---

## Privacy & safety (current limits)

This is a prototype, and the privacy language must match the implementation.

- **Single-owner.** Every room is readable and writable only by the account that
  created it. There are no invites, guest seats, reader roles, or shareable links yet.
  The "open as open source, private as closed doors" promise is **not implemented**.
- **Access-controlled, not end-to-end encrypted.** A Convex-hosted room is readable by
  the deployment operator. Do not describe it as E2E.
- **No publication gate.** There is no public gallery, no moderation queue, no
  reporting flow, and no contributor consent flow. Do not expose rooms publicly until
  those exist.
- **No model.** Syntax AI is copy and a role. No provider key is configured and no
  inference is run. Board readings and asymmetry calls are entered by seats.
- **Uploads** go to Convex storage. There is no virus scanning and no file-type
  allowlist; keep uploads small and trusted.
- **Illegal and gray ideas** can be recorded, scored as ideas, marked *Ought:
  shouldn't*, and shelved in the Bestiary. The app is not a moderation system, and it
  is not a place to operationalize harm. See `CONTRIBUTIONS.md` for the design
  position.

---

## Verification

Passed in the authoring workspace:

```bash
bun convex dev --once     # schema + functions pushed
bun tsc -b --noEmit       # exit 0
```

Also checked directly: the protocol capability matrix (sealed → nothing visible;
open → contribute only; assessment → score/build-on/breed/deliberate; authorized →
score/assign) and the runscore weights/bands.

**Not verified:** browser interaction, uploads, mobile layout, dark mode, deletion
cascades under real data, multi-user permissions (none exist), production build, and
any model call. There are no screenshots. Treat the UI as compiled, not proven.

---

## Publishing this repository

This authoring workspace blocks `git` and GitHub commands and has **no remote
configured**, so the agent cannot commit or push from here. Export or download the
workspace, then run this from your machine:

```bash
git status                       # confirm .env.local is not staged
git add .
git commit -m "Blue Sky Meeting v0.1: sealed ideation room with the Future Runscore"
git branch -M main
git remote add origin git@github.com:<your-account>/blue-sky-meeting.git
git push -u origin main
```

Or, with the GitHub CLI:

```bash
gh repo create blue-sky-meeting --public --source=. --remote=origin --push
```

Choose public or private deliberately. If public, remove the seeded example's
personal-sounding names if you do not want them in a demo, and confirm no deployment
identifiers or keys are in the tree. `.gitignore` already excludes `.env.local`,
`node_modules`, `dist`, and `src/convex/_generated`.

If the host offers a version-control integration, use it instead; this workspace's
`.git` has no remote and the terminal refuses git operations.

---

## License

No license has been chosen yet. Until a `LICENSE` file is added, default copyright
applies. The recommendation on record is **MIT for the code** and **CC BY-SA 4.0 for
the protocol text** — open-source the institution, keep deployment keys private.

---

## Name

**Blue Sky Meeting**, singular. The room is the container; the brand is the meeting.
The "Future Runscore" is the instrument, not the product.
