import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/app-shell";
import { Meta, Seal } from "@/components/brand";
import { AddIdeaDialog, AssessDialog, type AssessTarget } from "@/components/room-forms";
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
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Plus, Scale } from "lucide-react";

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

  const [addOpen, setAddOpen] = useState(false);
  const [assessTarget, setAssessTarget] = useState<AssessTarget | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);

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
            The room either does not exist or belongs to another seat. Rooms are
            sealed, not shared.
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

          <div className="mt-6 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Seal>Sealed room</Seal>
                <Meta>
                  {stats.ideaCount} {stats.ideaCount === 1 ? "idea" : "ideas"} ·{" "}
                  {stats.scoredCount} scored
                </Meta>
                {room.isExample && (
                  <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                    Example
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
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" />
                Put an idea on the table
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-10">
          <aside className="min-w-0 lg:order-2 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:sticky lg:top-8"
            >
              <div className="border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="label text-muted-foreground">Room reading</span>
                  <span className="label-sm text-muted-foreground">Mean</span>
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
                    {stats.averageScore === null
                      ? "No pass has been recorded yet. The table is allowed to sit unscored."
                      : "Averages every scored idea once. Unscored ideas are held apart, not counted against the room."}
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                  {[
                    { label: "Ideas", value: stats.ideaCount },
                    { label: "Scored", value: stats.scoredCount },
                    { label: "Unscored", value: stats.unscoredCount },
                  ].map((cell) => (
                    <div key={cell.label} className="px-3 py-3">
                      <p className="label-sm text-muted-foreground">{cell.label}</p>
                      <p className="num mt-1 text-base">{cell.value}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border px-4 py-4">
                  <BandLadder counts={stats.bands} />
                </div>
              </div>

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

          <section className="min-w-0 lg:order-1">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="label text-muted-foreground">On the table</p>
                <h2 className="display mt-2 text-2xl">Ranked by runscore</h2>
              </div>
              <span className="label-sm text-muted-foreground">
                {stats.scoredCount} of {stats.ideaCount} read
              </span>
            </div>

            {ideas.length === 0 ? (
              <div className="hatch border border-dashed border-border">
                <div className="flex flex-col items-start gap-4 bg-background/90 px-6 py-10">
                  <Seal>Nothing on the table</Seal>
                  <p className="max-w-[26rem] text-sm leading-6 text-muted-foreground">
                    An empty room is still a room. Put the first unannounced idea
                    in and it will sit here unscored until someone makes a case.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="size-3.5" />
                    Add the first idea
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {ideas.map((idea, index) => {
                  const band = idea.bandKey ? bandMeta(idea.bandKey) : null;
                  const notes = idea.assessments.filter((a) => a.note);
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
                        </div>

                        <div className="flex shrink-0 items-end justify-between gap-3 sm:flex-col sm:items-end">
                          <RunscoreValue
                            score={idea.score}
                            bandKey={idea.bandKey}
                            size="sm"
                          />
                          <BandChip bandKey={idea.bandKey} />
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

                      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
                        <span className="label-sm text-muted-foreground">
                          {idea.assessments.length}{" "}
                          {idea.assessments.length === 1 ? "seat scored" : "seats scored"}
                          {band && ` · ${band.label.toLowerCase()}`}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAssessTarget(idea);
                            setAssessOpen(true);
                          }}
                        >
                          Score this idea
                        </Button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}

            <p className="mt-5 font-mono text-[0.625rem] uppercase leading-5 tracking-[0.14em] text-muted-foreground">
              A runscore is a reading, not permission. Nothing here authorizes a
              change outside the room.
            </p>
          </section>
        </div>
      </div>

      <AddIdeaDialog open={addOpen} onOpenChange={setAddOpen} roomId={room._id} />
      <AssessDialog
        open={assessOpen}
        onOpenChange={(open) => {
          setAssessOpen(open);
          if (!open) setAssessTarget(null);
        }}
        idea={assessTarget}
      />
    </AppShell>
  );
}
