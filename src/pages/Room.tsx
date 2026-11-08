import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/app-shell";
import { Meta, Seal } from "@/components/brand";
import {
  AddIdeaDialog,
  AssessDialog,
  AssignDialog,
  BreedDialog,
  type AssessTarget,
  type BreedIdea,
  type StewardTarget,
} from "@/components/room-forms";
import { ArenaSection, BoutDialog } from "@/components/arena";
import { BoardDialog } from "@/components/board";
import { SourcesDialog, SourcesPanel } from "@/components/sources";
import { Registers, DeliberateDialog, type RegisterTarget } from "@/components/registers";
import { BestiarySection, KeepDialog } from "@/components/bestiary";
import { StageChip, StageRail } from "@/components/stage-rail";
import {
  BandChip,
  BandLadder,
  DimensionReadout,
  KindTag,
  RunscoreValue,
  ScoreMeter,
  bandMeta,
} from "@/components/runscore-ui";
import { Button } from "@/components/ui/button";
import { DIMENSIONS, bandFor } from "@/convex/runscore";
import { allows, normaliseStage, type Stage, trackMeta } from "@/convex/protocol";
import { HostCard } from "@/components/host";
import { Reactions } from "@/components/reactions";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  CornerDownRight,
  GitMerge,
  Link2,
  Loader2,
  Lock,
  MessagesSquare,
  Plus,
  Scale,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

function RoomSkeleton() {
  return (
    <div className="flex items-center gap-2 py-24 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Opening the room…
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const data = useQuery(
    api.rooms.get,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const setStage = useMutation(api.rooms.setStage);

  const [addOpen, setAddOpen] = useState(false);
  const [iterateParent, setIterateParent] = useState<{
    _id: Id<"ideas">;
    title: string;
  } | null>(null);
  const [assessTarget, setAssessTarget] = useState<AssessTarget | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<StewardTarget | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesIdea, setSourcesIdea] = useState<{
    _id: Id<"ideas">;
    title: string;
  } | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardIdea, setBoardIdea] = useState<{
    _id: Id<"ideas">;
    title: string;
  } | null>(null);
  const [breedOpen, setBreedOpen] = useState(false);
  const [breedTarget, setBreedTarget] = useState<BreedIdea | null>(null);
  const [boutOpen, setBoutOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [positionTarget, setPositionTarget] = useState<RegisterTarget | null>(
    null,
  );
  const [keepOpen, setKeepOpen] = useState(false);
  const [keepTarget, setKeepTarget] = useState<{
    _id: Id<"ideas">;
    title: string;
  } | null>(null);
  const [stagePending, setStagePending] = useState(false);

  if (data === undefined) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[1080px]">
          <RoomSkeleton />
        </div>
      </AppShell>
    );
  }

  if (data === null) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[640px] py-20">
          <Seal>Access</Seal>
          <h1 className="display mt-5 text-4xl">This room isn&rsquo;t yours.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The room either doesn&rsquo;t exist or belongs to another seat. Rooms
            are sealed, not shared.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to the board</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { room, stats, ideas } = data;
  const averageBand =
    stats.averageScore === null ? null : bandFor(stats.averageScore);

  const sealed = data.sealed;
  const canContribute = allows(room.stage, "contribute");
  const canBuildOn = normaliseStage(room.stage) === "assessment";
  const canScore = allows(room.stage, "score");
  const canAssign = allows(room.stage, "assign");

  const changeStage = async (next: Stage) => {
    setStagePending(true);
    try {
      await setStage({ roomId: room._id, stage: next });
      if (next === "assessment") {
        toast("The pool is revealed", {
          description:
            "Everything is on the table at once, names attached. Scoring is open.",
        });
      } else if (next === "authorized") {
        toast("Authorized", {
          description: "You decided. Assignments carry a brief now.",
        });
      } else {
        toast("Floor reopened", {
          description: "Nothing is graded until it closes again.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The stage did not change.",
      );
    } finally {
      setStagePending(false);
    }
  };

  const openAdd = (parent: { _id: Id<"ideas">; title: string } | null) => {
    setIterateParent(parent);
    setAddOpen(true);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1080px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/dashboard"
            className="label inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            The board
          </Link>

          <div className="mt-6 flex flex-col gap-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Seal>Sealed room</Seal>
                <StageChip stage={room.stage} />
                <Meta>
                  {sealed ? (
                    <>
                      {data.poolSize} sealed · nobody has seen them
                    </>
                  ) : (
                    <>
                      {stats.ideaCount} {stats.ideaCount === 1 ? "idea" : "ideas"}{" "}
                      · {stats.scoredCount} scored
                      {stats.bestiaryCount > 0
                        ? ` · ${stats.bestiaryCount} kept`
                        : ""}
                    </>
                  )}
                </Meta>
                {room.isExample && (
                  <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                    Worked example
                  </span>
                )}
              </div>
              <h1 className="display mt-4 text-4xl leading-[0.95] sm:text-5xl">
                {room.title}
              </h1>
              {room.premise && (
                <p className="mt-3 max-w-[42rem] text-sm leading-6 text-muted-foreground">
                  {room.premise}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canContribute ? (
                <Button onClick={() => openAdd(null)}>
                  <Plus className="size-3.5" />
                  Put something down
                </Button>
              ) : (
                <span className="label inline-flex items-center gap-2 border border-border px-2.5 py-2 text-muted-foreground">
                  <Lock className="size-3" />
                  Floor closed
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <StageRail
          stage={room.stage}
          pending={stagePending}
          revealed={!sealed}
          onSetStage={changeStage}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-10">
          <aside className="order-2 min-w-0 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:sticky lg:top-8"
            >
              <HostCard className="mb-4" />

              <div className="border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="label text-muted-foreground">Room reading</span>
                  <span className="label-sm text-muted-foreground">
                    {sealed ? "Sealed" : "Mean"}
                  </span>
                </div>
                <div className="px-4 py-5">
                  <p className="label-sm text-muted-foreground">
                    Mean of scored ideas
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <RunscoreValue
                      score={stats.averageScore}
                      bandKey={averageBand?.key ?? null}
                    />
                    <BandChip bandKey={averageBand?.key ?? null} />
                  </div>
                  <ScoreMeter
                    score={stats.averageScore}
                    bandKey={averageBand?.key ?? null}
                    segments={16}
                    className="mt-4"
                  />
                  <p className="mt-3 text-[0.75rem] leading-5 text-muted-foreground">
                    {sealed
                      ? "Nothing has been read yet. The pool opens once, together."
                      : stats.averageScore === null
                        ? "No pass has been recorded yet. The room is allowed to sit unscored."
                        : "Averages every scored idea once. Unscored ideas are held apart, not counted against the room."}
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                  {[
                    { label: sealed ? "Sealed" : "Ideas", value: stats.ideaCount },
                    { label: "Scored", value: stats.scoredCount },
                    { label: "Unscored", value: stats.unscoredCount },
                  ].map((cell) => (
                    <div key={cell.label} className="px-3 py-3">
                      <p className="label-sm text-muted-foreground">{cell.label}</p>
                      <p className="num mt-1 text-base">{cell.value}</p>
                    </div>
                  ))}
                </div>

                {stats.bestiaryCount > 0 && (
                  <p className="label-sm border-t border-border px-4 py-2.5 text-muted-foreground">
                    {stats.bestiaryCount} kept in the bestiary · not counted above
                  </p>
                )}

                <div className="border-t border-border px-4 py-4">
                  <BandLadder counts={stats.bands} />
                </div>
              </div>

              <SourcesPanel
                rows={data.sources.filter((source) => source.ideaId === null)}
                canDeclare
                onOpen={() => {
                  setSourcesIdea(null);
                  setSourcesOpen(true);
                }}
              />

              <div className="mt-4 border border-border bg-secondary/50 px-4 py-4">
                <p className="label flex items-center gap-2 text-muted-foreground">
                  <Scale className="size-3.5" />
                  How the mean behaves
                </p>
                <p className="mt-2 text-[0.75rem] leading-5 text-muted-foreground">
                  One seat, one pass. Re-scoring as the same contributor replaces
                  that pass instead of stacking it, so a single voice cannot raise
                  an idea by repeating itself.
                </p>
              </div>
            </motion.div>
          </aside>

          <section className="order-1 min-w-0">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="label text-muted-foreground">On the table</p>
                <h2 className="display mt-2 text-2xl">
                  {sealed ? "Sealed pool" : "Ranked by runscore"}
                </h2>
                {!sealed && (
                  <p className="label-sm mt-2 text-muted-foreground">
                    Asymmetry is flagged beside the score, never added to it.
                  </p>
                )}
              </div>
              <span className="label-sm shrink-0 text-muted-foreground">
                {sealed
                  ? `${data.poolSize} down`
                  : `${stats.scoredCount} of ${stats.ideaCount} read`}
              </span>
            </div>

            {sealed ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="border border-border bg-card"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="label text-muted-foreground">Sealed pool</span>
                  <span className="label-sm text-muted-foreground">
                    {data.poolSize}{" "}
                    {data.poolSize === 1 ? "contribution" : "contributions"}
                  </span>
                </div>
                <div className="px-4 py-5 sm:px-6">
                  <p className="display text-2xl leading-tight">
                    Nobody sees these yet.
                  </p>
                  <p className="mt-2 max-w-[34rem] text-[0.8125rem] leading-6 text-muted-foreground">
                    No author, no order, no anchor. Everything is revealed at the
                    same moment when the floor closes, names attached — after
                    everyone has already said their piece.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {Array.from({ length: data.poolSize }).map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="flex h-24 w-20 items-center justify-center border border-dashed border-border bg-secondary/40"
                      >
                        <span className="label-sm -rotate-90 whitespace-nowrap text-muted-foreground">
                          Sealed
                        </span>
                      </motion.div>
                    ))}
                    {canContribute && (
                      <button
                        type="button"
                        onClick={() => openAdd(null)}
                        className="flex h-24 w-20 flex-col items-center justify-center gap-1.5 border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                      >
                        <Plus className="size-4" />
                        <span className="label-sm">Add</span>
                      </button>
                    )}
                  </div>

                  {data.poolSize === 0 && (
                    <p className="mt-4 text-[0.8125rem] leading-6 text-muted-foreground">
                      Nothing down yet. The first thing doesn&rsquo;t have to be
                      good. It has to be said.
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <Button
                      size="sm"
                      onClick={() => changeStage("assessment")}
                      disabled={stagePending}
                    >
                      {stagePending && <Loader2 className="size-3.5 animate-spin" />}
                      Close the floor and reveal
                    </Button>
                    <span className="label-sm text-muted-foreground">
                      One action. Everybody at once.
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : ideas.length === 0 ? (
              <div className="hatch border border-dashed border-border">
                <div className="flex flex-col items-start gap-4 bg-background/90 px-6 py-10">
                  <Seal>Nothing on the table</Seal>
                  <p className="max-w-[26rem] text-sm leading-6 text-muted-foreground">
                    An empty room is still a room. Put the first thing down — the
                    fragment, the complaint, the name that might be a slogan. It
                    will sit here unscored until the floor closes.
                  </p>
                  {canContribute ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdd(null)}
                    >
                      <Plus className="size-3.5" />
                      Put the first thing down
                    </Button>
                  ) : (
                    <p className="label-sm text-muted-foreground">
                      The floor is closed and nothing was recorded.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {ideas.map((idea, index) => {
                  const band = idea.bandKey ? bandMeta(idea.bandKey) : null;
                  const notes = idea.assessments.filter((a) => a.note);
                  const track = trackMeta(idea.track);
                  const ideaSources = data.sources.filter(
                    (source) => source.ideaId === idea._id,
                  );
                  const ideaReadings = data.readings.filter(
                    (reading) => reading.ideaId === idea._id,
                  );
                  return (
                    <motion.article
                      key={idea._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.05 }}
                      className="border border-border bg-card"
                    >
                      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="num text-[0.65rem] text-muted-foreground">
                              {idea.score === null
                                ? "——"
                                : `#${String(index + 1).padStart(2, "0")}`}
                            </span>
                            <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                              {track.label}
                            </span>
                            <span className="label text-foreground">
                              {idea.contributor}
                            </span>
                            <KindTag kind={idea.kind} />
                          </div>
                          <h3 className="mt-2 text-[1.05rem] font-semibold leading-snug tracking-tight">
                            {idea.title}
                          </h3>
                          {idea.thesis && (
                            <p className="mt-1.5 max-w-[34rem] text-[0.8125rem] leading-6 text-muted-foreground">
                              {idea.thesis}
                            </p>
                          )}
                          {idea.parentTitle && (
                            <p className="label-sm mt-2 flex items-center gap-1.5 text-muted-foreground">
                              <CornerDownRight className="size-3" />
                              Builds on {idea.parentTitle}
                            </p>
                          )}
                          {idea.bredFromTitles.length > 0 && (
                            <p className="label-sm mt-2 flex items-center gap-1.5 text-muted-foreground">
                              <GitMerge className="size-3" />
                              Bred from {idea.bredFromTitles.join(" + ")}
                            </p>
                          )}
                          {idea.bootstrap && (
                            <p className="mt-2 text-[0.75rem] leading-5 text-muted-foreground">
                              <span className="label-sm text-foreground">
                                Pulls on
                              </span>{" "}
                              {idea.bootstrap}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-end justify-between gap-3 sm:flex-col sm:items-end">
                          <RunscoreValue
                            score={idea.score}
                            bandKey={idea.bandKey}
                            size="sm"
                          />
                          <BandChip bandKey={idea.bandKey} />
                          {idea.asymmetricSeats > 0 && (
                            <span
                              className="label-sm border border-dashed border-foreground/40 px-1.5 py-0.5 text-foreground"
                              title="Precedent says it probably fails. The upside is not linear."
                            >
                              Asymmetric · {idea.asymmetricSeats}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border px-4 py-4 sm:px-5">
                        {idea.dimensions ? (
                          <div className="flex flex-col gap-2.5">
                            {DIMENSIONS.map((dimension) => (
                              <DimensionReadout
                                key={dimension.key}
                                dimensionKey={dimension.key}
                                value={
                                  idea.dimensions
                                    ? idea.dimensions[dimension.key]
                                    : 0
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-[0.78rem] leading-6 text-muted-foreground">
                            Unscored. No seat has put a number behind this yet — it
                            stays on the table anyway.
                          </p>
                        )}
                      </div>

                      <Registers
                        idea={idea}
                        onOpen={() => {
                          setPositionTarget(idea);
                          setPositionOpen(true);
                        }}
                      />

                      {idea.assessments.length > 0 && (
                        <div className="border-t border-border bg-secondary/40 px-4 py-3 sm:px-5">
                          <div className="flex flex-col gap-2">
                            {notes.length > 0 ? (
                              notes.map((assessment) => (
                                <p
                                  key={assessment._id}
                                  className="text-[0.78rem] leading-6 text-muted-foreground"
                                >
                                  <span className="label-sm text-foreground">
                                    {assessment.contributor}
                                  </span>
                                  <span className="mx-1.5 text-border">/</span>
                                  {assessment.note}
                                </p>
                              ))
                            ) : (
                              <p className="label-sm text-muted-foreground">
                                {idea.assessments.length}{" "}
                                {idea.assessments.length === 1 ? "seat" : "seats"}{" "}
                                scored without a note
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 sm:px-5">
                        <Reactions
                          ideaId={idea._id}
                          nodCount={idea.nodCount}
                          pushCount={idea.pushCount}
                          myStance={idea.myStance}
                        />
                        <span className="label-sm ml-auto text-muted-foreground">
                          Company, not evidence
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
                        <span className="label-sm text-muted-foreground">
                          {idea.assessments.length}{" "}
                          {idea.assessments.length === 1
                            ? "seat scored"
                            : "seats scored"}
                          {band && ` · ${band.label.toLowerCase()}`}
                        </span>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {idea.steward && (
                            <span className="label-sm mr-1 inline-flex items-center gap-1.5 text-foreground">
                              <UserRoundCheck className="size-3" />
                              Steward · {idea.steward}
                              {idea.assignmentMode
                                ? ` · ${idea.assignmentMode === "explore" ? "exploration" : "delivery"}`
                                : ""}
                              {idea.bar ? ` · bar ${bandMeta(idea.bar).label}` : ""}
                            </span>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={() => {
                              setKeepTarget({
                                _id: idea._id,
                                title: idea.title,
                              });
                              setKeepOpen(true);
                            }}
                          >
                            <Archive className="size-3" />
                            Keep, don&rsquo;t build
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={() => {
                              setSourcesIdea({
                                _id: idea._id,
                                title: idea.title,
                              });
                              setSourcesOpen(true);
                            }}
                          >
                            <Link2 className="size-3" />
                            Sources
                            {ideaSources.length > 0
                              ? ` · ${ideaSources.length}`
                              : ""}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={() => {
                              setBoardIdea({
                                _id: idea._id,
                                title: idea.title,
                              });
                              setBoardOpen(true);
                            }}
                          >
                            <MessagesSquare className="size-3" />
                            Board
                            {ideaReadings.length > 0
                              ? ` · ${ideaReadings.length}`
                              : ""}
                          </Button>

                          {canBuildOn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBreedTarget({
                                  _id: idea._id,
                                  title: idea.title,
                                  track: idea.track as BreedIdea["track"],
                                });
                                setBreedOpen(true);
                              }}
                            >
                              <GitMerge className="size-3" />
                              Breed
                            </Button>
                          )}

                          {canBuildOn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openAdd({ _id: idea._id, title: idea.title })
                              }
                            >
                              Build on this
                            </Button>
                          )}

                          {canScore && (
                            <Button
                              size="sm"
                              variant={idea.score === null ? "default" : "outline"}
                              onClick={() => {
                                setAssessTarget(idea);
                                setAssessOpen(true);
                              }}
                            >
                              Score this idea
                            </Button>
                          )}

                          {canAssign && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssignTarget(idea);
                                setAssignOpen(true);
                              }}
                            >
                              {idea.steward ? "Reassign" : "Assign steward"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}

            {!sealed && (
              <ArenaSection
                bouts={data.bouts}
                canOpen={canScore}
                onOpenBout={() => setBoutOpen(true)}
              />
            )}

            {!sealed && <BestiarySection entries={data.bestiary} />}

            <p className="mt-5 font-mono text-[0.625rem] uppercase leading-5 tracking-[0.14em] text-muted-foreground">
              {sealed
                ? "Nothing above has been shown to the room. The pool opens once, together."
                : canScore
                  ? "A runscore is a reading, not permission. Nothing here authorizes a change outside the room."
                  : "This room is still listening. Scoring opens once the floor closes."}
            </p>
          </section>
        </div>
      </div>

      <AddIdeaDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setIterateParent(null);
        }}
        roomId={room._id}
        parent={iterateParent}
        sealed={sealed}
      />
      <AssessDialog
        open={assessOpen}
        onOpenChange={(open) => {
          setAssessOpen(open);
          if (!open) setAssessTarget(null);
        }}
        idea={assessTarget}
      />
      <AssignDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignTarget(null);
        }}
        idea={assignTarget}
      />
      <SourcesDialog
        open={sourcesOpen}
        onOpenChange={(open) => {
          setSourcesOpen(open);
          if (!open) setSourcesIdea(null);
        }}
        roomId={room._id}
        idea={sourcesIdea}
        rows={data.sources.filter((source) =>
          sourcesIdea
            ? source.ideaId === sourcesIdea._id
            : source.ideaId === null,
        )}
      />
      <BoardDialog
        open={boardOpen}
        onOpenChange={(open) => {
          setBoardOpen(open);
          if (!open) setBoardIdea(null);
        }}
        idea={boardIdea}
        rows={data.readings.filter(
          (reading) => reading.ideaId === boardIdea?._id,
        )}
      />
      <BreedDialog
        open={breedOpen}
        onOpenChange={(open) => {
          setBreedOpen(open);
          if (!open) setBreedTarget(null);
        }}
        source={breedTarget}
        ideas={ideas
          .filter((idea) => idea._id !== breedTarget?._id)
          .map((idea) => ({
            _id: idea._id,
            title: idea.title,
            track: idea.track as BreedIdea["track"],
          }))}
      />
      <BoutDialog
        open={boutOpen}
        onOpenChange={setBoutOpen}
        roomId={room._id}
        ideas={ideas.map((idea) => ({
          _id: idea._id,
          title: idea.title,
          track: idea.track,
          score: idea.score,
        }))}
      />
      <DeliberateDialog
        open={positionOpen}
        onOpenChange={(open) => {
          setPositionOpen(open);
          if (!open) setPositionTarget(null);
        }}
        idea={positionTarget}
      />
      <KeepDialog
        open={keepOpen}
        onOpenChange={(open) => {
          setKeepOpen(open);
          if (!open) setKeepTarget(null);
        }}
        idea={keepTarget}
      />
    </AppShell>
  );
}
