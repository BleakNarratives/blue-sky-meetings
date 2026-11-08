import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Dices,
  DoorClosed,
  Gavel,
  Lock,
  Megaphone,
  Shapes,
  Tag,
} from "lucide-react";
import { Link } from "react-router";
import { Brand, Meta, Seal } from "@/components/brand";
import {
  BandChip,
  BandLadder,
  RunscoreValue,
  ScoreMeter,
} from "@/components/runscore-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BANDS, DIMENSIONS, computeRunscore, bandFor } from "@/convex/runscore";
import { STAGES, TRACKS } from "@/convex/protocol";

const SPECIMEN = { novelty: 9, warrant: 9, reach: 8, drag: 2 };
const SPECIMEN_SCORE = computeRunscore(SPECIMEN);
const SPECIMEN_BAND = bandFor(SPECIMEN_SCORE);

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const RULES = [
  {
    index: "01",
    title: "Everyone gets the floor.",
    body: "No one frames the answer before everyone has had a turn. The floor closes when people say they're done — not when the loudest person runs out of steam.",
  },
  {
    index: "02",
    title: "Attribution is permanent.",
    body: "Originals, improvements, and build-ons stay distinguishable. Nobody's idea gets quietly rewritten and handed back as the improved version.",
  },
  {
    index: "03",
    title: "Evidence outranks confidence.",
    body: "Facts, estimates, assumptions, unknowns — say which one you're holding. A convincing voice is not a source.",
  },
  {
    index: "04",
    title: "Permission comes before production.",
    body: "A good idea is not a green light. The machine advises, the humans authorize, and nothing advances because an AI is enthusiastic.",
  },
  {
    index: "05",
    title: "Ideas earn credit. Delivery earns responsibility.",
    body: "Contribution doesn't excuse nonperformance. Authorship doesn't own the work. Both are recorded, and both are accountable.",
  },
];

const TRACK_ICONS = {
  concept: Shapes,
  brand: Tag,
  market: Megaphone,
  wild: Dices,
} as const;

function Nav() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-5">
        <Brand />

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#runscore"
            className="label text-muted-foreground transition-colors hover:text-foreground"
          >
            The runscore
          </a>
          <a
            href="#stages"
            className="label text-muted-foreground transition-colors hover:text-foreground"
          >
            The order
          </a>
          <a
            href="#rules"
            className="label text-muted-foreground transition-colors hover:text-foreground"
          >
            Ground rules
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth?returnTo=%2Fdashboard">Sign in</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard"}>
              {isAuthenticated ? "The board" : "Take a seat"}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();
  const target = isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard";

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-border lg:block"
      />
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-5 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="label inline-flex items-center gap-2 border border-border bg-card px-2.5 py-1.5 text-muted-foreground">
              <span className="size-1.5 bg-highlight ring-1 ring-foreground/30" />
              Doors closed · floor open
            </span>
            <Meta>v1 / sealed</Meta>
          </div>

          <h1 className="display mt-7 text-[3.25rem] leading-[0.92] tracking-tight sm:text-6xl lg:text-[4.75rem]">
            Bring the
            <br />
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 h-3 -skew-x-6 bg-highlight/80"
              />
              <span className="relative italic">half-formed</span>
            </span>
            <br />
            thing.
          </h1>

          <p className="mt-7 max-w-[34rem] text-[0.95rem] leading-7 text-muted-foreground">
            Blue Sky Meeting is a sealed room for ideas that aren&rsquo;t ready for
            the world yet. Bring the fragment, the crude version, the thing you
            can&rsquo;t explain. Everyone gets heard once before anything gets
            judged — then the room scores what could actually survive.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link to={target}>
                Take a seat
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#runscore">How it&rsquo;s scored</a>
            </Button>
          </div>

          <p className="label-sm mt-8 max-w-[31rem] leading-5 text-muted-foreground">
            Blue sky means unlimited room to think. It has never meant permission
            to act. It also has nothing to do with weather.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -left-3 -top-3 z-10 size-6 border-l border-t border-foreground/30" />
          <div className="absolute -bottom-3 -right-3 z-10 size-6 border-b border-r border-foreground/30" />

          <div className="relative bg-foreground px-5 py-6 text-background sm:px-7 sm:py-7">
            <div className="flex items-start justify-between gap-4 border-b border-background/20 pb-4">
              <div>
                <p className="label-sm text-background/55">Specimen — sealed room</p>
                <p className="mt-2 font-mono text-[0.7rem] text-background/80">
                  Four devices, one truth
                </p>
              </div>
              <Seal className="text-background/70">Sealed</Seal>
            </div>

            <div className="pt-5">
              <p className="display text-2xl leading-tight sm:text-[1.75rem]">
                Reconcile on read, not on write
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-background/55">
                <span className="size-1.5 rounded-full bg-highlight" />
                lantern
                <span aria-hidden>/</span>
                agent seat
                <span aria-hidden>/</span>
                concept
              </p>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-background/20 pt-5">
              <div>
                <p className="label-sm text-background/55">Future runscore</p>
                <RunscoreValue
                  score={SPECIMEN_SCORE}
                  bandKey={SPECIMEN_BAND.key}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <BandChip bandKey={SPECIMEN_BAND.key} />
                <span className="label-sm text-background/45">
                  3 seats · 1 kept disagreement
                </span>
              </div>
            </div>

            <ScoreMeter
              score={SPECIMEN_SCORE}
              bandKey={SPECIMEN_BAND.key}
              className="mt-4"
            />

            <div className="mt-6 flex flex-col gap-3">
              {DIMENSIONS.map((dimension) => {
                const value = SPECIMEN[dimension.key];
                return (
                  <div key={dimension.key} className="flex items-center gap-3">
                    <span className="label-sm w-[5.25rem] shrink-0 text-background/55">
                      {dimension.label}
                    </span>
                    <span className="flex flex-1 gap-[3px]" aria-hidden>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <span
                          key={index}
                          className={
                            index < value
                              ? "h-2 flex-1 bg-highlight"
                              : "h-2 flex-1 bg-background/20"
                          }
                        />
                      ))}
                    </span>
                    <span className="num w-6 text-right text-[0.65rem] text-background/70">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 border-l border-highlight/60 pl-3 font-mono text-[0.65rem] leading-5 text-background/60">
              Warrant is the heaviest dimension on purpose. Confidence is not
              evidence.
            </p>
          </div>

          <p className="label-sm mt-5 text-muted-foreground">
            Fig. 1 — a runscore mid-meeting. It moves when the evidence does.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Ticker() {
  return (
    <div className="border-b border-border bg-secondary">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-2 px-5 py-3">
        <span className="label text-foreground">Fixed weights</span>
        {DIMENSIONS.map((dimension) => (
          <span key={dimension.key} className="label-sm text-muted-foreground">
            {dimension.label} · {Math.round(dimension.weight * 100)}
            {dimension.inverse && " (inverse)"}
          </span>
        ))}
        <span className="label-sm ml-auto hidden text-muted-foreground sm:block">
          One voice, one seat. The mean decides nothing by itself.
        </span>
      </div>
    </div>
  );
}

function WhoSection() {
  const notes = [
    {
      title: "Loose, not careless",
      body: "Say it badly. Say it twice. Say the version that sounds stupid out loud. The room records; the runscore sorts.",
    },
    {
      title: "Sealed, not secretive",
      body: "Closed to imports and exports. Open to whoever you invite. Nothing in here is a launch.",
    },
    {
      title: "Serious underneath",
      body: "The tone is casual. The boundary isn't. This is where notions get a fair hearing before the world gets a vote.",
    },
  ];

  return (
    <section id="who" className="border-b border-border">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <motion.div {...fade}>
            <p className="label text-muted-foreground">01 / who this is for</p>
            <h2 className="display mt-4 text-4xl leading-[0.98] sm:text-5xl">
              If you have a thought to spare,
              <br />
              you have a <span className="italic">seat.</span>
            </h2>
            <p className="mt-5 max-w-[30rem] text-[0.9rem] leading-7 text-muted-foreground">
              No résumé, no pitch deck, no standing in the room. Curiosity beats
              credentials here, and half an idea is enough to start. The room is
              built for the moment before you know whether the thing is good —
              because that is the only moment when it can still become something.
            </p>
            <p className="mt-4 max-w-[30rem] text-[0.9rem] leading-7 text-muted-foreground">
              It is also built for the quiet ones. Everyone speaks once before
              anyone gets graded, so the meeting can&rsquo;t be won by the person
              who talks first or loudest.
            </p>
          </motion.div>

          <div className="flex flex-col justify-center gap-3">
            {notes.map((note, index) => (
              <motion.div
                key={note.title}
                {...fade}
                transition={{ ...fade.transition, delay: index * 0.06 }}
                className="border border-border bg-card px-5 py-4"
              >
                <h3 className="text-base font-semibold tracking-tight">
                  {note.title}
                </h3>
                <p className="mt-1.5 text-[0.8125rem] leading-6 text-muted-foreground">
                  {note.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RunscoreSection() {
  return (
    <section id="runscore" className="border-b border-border">
      <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
        <motion.div {...fade}>
          <p className="label text-muted-foreground">02 / the instrument</p>
          <h2 className="display mt-4 text-4xl leading-[0.98] sm:text-5xl">
            The Future <span className="italic">Runscore</span>
          </h2>
          <p className="mt-5 max-w-[26rem] text-[0.9rem] leading-7 text-muted-foreground">
            One number from 0 to 100 that asks a crude, useful question: if this
            idea were run in the future, would it hold? Every pass is entered by
            hand, weighted in the open, and averaged across seats.
          </p>
          <p className="mt-4 max-w-[26rem] text-[0.9rem] leading-7 text-muted-foreground">
            Nothing hides behind a model&rsquo;s confidence. A persuasive voice
            scores one seat, not the room.
          </p>

          <div className="mt-8 border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="label text-muted-foreground">Band ladder</span>
              <span className="label-sm text-muted-foreground">0 → 100</span>
            </div>
            <BandLadder className="mt-3" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {BANDS.map((band) => (
              <BandChip key={band.key} bandKey={band.key} showRange />
            ))}
          </div>
        </motion.div>

        <motion.div {...fade} transition={{ ...fade.transition, delay: 0.08 }}>
          <div className="border border-border bg-card">
            {DIMENSIONS.map((dimension, index) => (
              <div
                key={dimension.key}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-border p-5 first:border-t-0 sm:grid-cols-[3rem_1fr_auto] sm:items-start sm:p-6"
              >
                <span className="num pt-1 text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold tracking-tight">
                      {dimension.label}
                    </h3>
                    <span className="label-sm text-muted-foreground">
                      weight {Math.round(dimension.weight * 100)}%
                    </span>
                    {dimension.inverse && (
                      <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                        inverse
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/85">
                    {dimension.question}
                  </p>
                  <p className="mt-2 max-w-[28rem] text-[0.8125rem] leading-6 text-muted-foreground">
                    {dimension.hint}
                  </p>
                </div>
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                  <span className="label-sm text-muted-foreground">
                    {dimension.low}
                  </span>
                  <span className="h-px flex-1 bg-border sm:h-6 sm:w-px sm:flex-none" />
                  <span className="label-sm text-foreground">{dimension.high}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 border border-border bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[0.65rem] uppercase leading-5 tracking-[0.14em] text-muted-foreground">
              runscore = (novelty·25 + warrant·35 + reach·20 + (10 − drag)·20) · 10
            </p>
            <span className="label-sm text-foreground">0 — 100</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StageSection() {
  return (
    <section id="stages" className="border-b border-border bg-secondary/40">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:py-24">
        <motion.div {...fade} className="max-w-[42rem]">
          <p className="label text-muted-foreground">03 / the order of things</p>
          <h2 className="display mt-4 text-4xl leading-[0.98] sm:text-5xl">
            Nothing here happens
            <br />
            <span className="italic">all at once.</span>
          </h2>
          <p className="mt-5 text-[0.9rem] leading-7 text-muted-foreground">
            Hear everything. Score it. Then authorize the work. The gates
            aren&rsquo;t paperwork — they are what stops the loudest voice from
            becoming the meeting. Stages move one step at a time, and a human moves
            them.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STAGES.map((stage, index) => (
            <motion.div
              key={stage.key}
              {...fade}
              transition={{ ...fade.transition, delay: index * 0.07 }}
              className="flex flex-col justify-between gap-6 border border-border bg-card p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="num text-xs text-muted-foreground">
                    {stage.index}
                  </span>
                  {stage.key === "open" ? (
                    <span className="label-sm flex items-center gap-1.5 text-muted-foreground">
                      <DoorClosed className="size-3" />
                      Floor open
                    </span>
                  ) : stage.key === "assessment" ? (
                    <span className="label-sm flex items-center gap-1.5 text-muted-foreground">
                      <Gavel className="size-3" />
                      Grading
                    </span>
                  ) : (
                    <span className="label-sm flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="size-3" />
                      Authorized
                    </span>
                  )}
                </div>
                <h3 className="display mt-4 text-3xl leading-tight">
                  {stage.label}
                </h3>
                <p className="mt-3 text-[0.8125rem] leading-6 text-muted-foreground">
                  {stage.blurb}
                </p>
              </div>
              <p className="label-sm border-t border-border pt-3 text-muted-foreground">
                {stage.rule}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fade} className="mt-8 grid gap-4 border border-border bg-card p-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <h3 className="display text-2xl leading-tight">
            You can stand on someone&rsquo;s idea.
            <br />
            You can&rsquo;t quietly replace it.
          </h3>
          <p className="text-[0.8125rem] leading-6 text-muted-foreground">
            Build-ons become their own entries with their own author, their own
            score, and a visible line back to the original. Iteration is the point
            of the room. Erasure isn&rsquo;t. The first version stays exactly as it
            was said.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function RulesSection() {
  return (
    <section id="rules" className="border-b border-border bg-foreground text-background">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <motion.div {...fade}>
            <p className="label text-background/50">04 / ground rules</p>
            <h2 className="display mt-4 text-4xl leading-[0.98] sm:text-5xl">
              Loose on the surface.
              <br />
              <span className="italic">Holy ground</span> underneath.
            </h2>
            <p className="mt-5 max-w-[27rem] text-[0.9rem] leading-7 text-background/65">
              This is a room, not a stage. Nothing comes in that existed before the
              meeting; nothing leaves that was made in it. The machine advises. The
              humans authorize. Attribution is permanent, and confidence is not
              evidence.
            </p>

            <div className="mt-8 border-t border-background/20 pt-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Inbound", value: "Closed" },
                  { label: "Outbound", value: "Closed" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="label-sm text-background/45">{item.label}</p>
                    <p className="display mt-1 text-2xl">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 max-w-[27rem] text-[0.75rem] leading-6 text-background/50">
                Models carry knowledge from before the meeting, and we won&rsquo;t
                pretend otherwise. What the room enforces is disclosure,
                attribution, and your authorization before anything from outside is
                used.
              </p>
            </div>
          </motion.div>

          <ol className="flex flex-col border-t border-background/20">
            {RULES.map((rule, index) => (
              <motion.li
                key={rule.index}
                {...fade}
                transition={{ ...fade.transition, delay: index * 0.05 }}
                className="grid grid-cols-[2rem_1fr] gap-4 border-b border-background/20 py-5 sm:gap-6"
              >
                <span className="num pt-1 text-[0.65rem] text-background/45">
                  {rule.index}
                </span>
                <div>
                  <h3 className="text-base font-medium tracking-tight">
                    {rule.title}
                  </h3>
                  <p className="mt-1.5 max-w-[32rem] text-[0.8125rem] leading-6 text-background/60">
                    {rule.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MakingSection() {
  return (
    <section id="making" className="border-b border-border">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <motion.div {...fade}>
            <p className="label text-muted-foreground">05 / what leaves the room</p>
            <h2 className="display mt-4 text-4xl leading-[0.98] sm:text-5xl">
              Names. Slogans.
              <br />
              <span className="italic">The move.</span>
            </h2>
            <p className="mt-5 max-w-[27rem] text-[0.9rem] leading-7 text-muted-foreground">
              Not every meeting is a software meeting. Bring a product, a campaign,
              a title, a brand direction, a market response, or the idea that
              refuses to fit a category. The room doesn&rsquo;t need to know what
              kind of meeting it is before it starts.
            </p>
            <p className="mt-4 max-w-[27rem] text-[0.9rem] leading-7 text-muted-foreground">
              When you authorize something, you name a steward to carry it. Chosen
              for demonstrated ability and appetite — not for who spoke first.
              Authorship and stewardship are recorded separately, on purpose.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRACKS.map((track, index) => {
              const Icon = TRACK_ICONS[track.key];
              return (
                <motion.div
                  key={track.key}
                  {...fade}
                  transition={{ ...fade.transition, delay: index * 0.05 }}
                  className="border border-border bg-card p-5"
                >
                  <Icon className="size-4" strokeWidth={1.6} />
                  <h3 className="mt-3 text-base font-semibold tracking-tight">
                    {track.label}
                  </h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-6 text-muted-foreground">
                    {track.hint}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 text-center lg:py-24">
        <motion.div {...fade}>
          <Meta>No evidence, no seat.</Meta>
          <h2 className="display mx-auto mt-5 max-w-[44rem] text-4xl leading-[0.98] sm:text-6xl">
            You&rsquo;ve been carrying it around
            <br />
            for a while. <span className="italic">Put it down.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[34rem] text-[0.9rem] leading-7 text-muted-foreground">
            It&rsquo;s safe to be wrong in here. That&rsquo;s the entire point of
            the room.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="group">
              <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard"}>
                {isAuthenticated ? "Return to the board" : "Open your first room"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          <p className="label-sm mt-5 text-muted-foreground">
            Free to open · sealed by default · nobody&rsquo;s watching you rehearse
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-5 py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Brand />
          <p className="label-sm mt-4 text-muted-foreground">
            A room for the ideas you haven&rsquo;t said out loud yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="#runscore" className="label text-muted-foreground hover:text-foreground">
            Method
          </a>
          <a href="#rules" className="label text-muted-foreground hover:text-foreground">
            Rules
          </a>
          <Link to="/auth" className="label text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <span className="label-sm text-muted-foreground">
            © {new Date().getFullYear()} BSM
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <WhoSection />
        <RunscoreSection />
        <StageSection />
        <RulesSection />
        <MakingSection />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
