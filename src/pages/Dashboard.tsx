import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Meta, Seal } from "@/components/brand";
import { HostLine } from "@/components/host";
import { StageChip } from "@/components/stage-rail";
import { NewRoomDialog } from "@/components/room-forms";
import {
  BandChip,
  BandLadder,
  RunscoreValue,
  ScoreMeter,
} from "@/components/runscore-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { bandFor, DIMENSIONS } from "@/convex/runscore";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Loader2, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-4 sm:px-6">
      <span className="label text-muted-foreground">{label}</span>
      <span className="num text-2xl font-medium tracking-tight">
        {value}
        {suffix && (
          <span className="ml-0.5 text-xs text-muted-foreground">{suffix}</span>
        )}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const rooms = useQuery(api.rooms.list);
  const createExample = useMutation(api.rooms.createExample);
  const navigate = useNavigate();
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const roomList = rooms ?? [];
  const ideaTotal = roomList.reduce((total, room) => total + room.ideaCount, 0);
  const scoredTotal = roomList.reduce((total, room) => total + room.scoredCount, 0);
  const scoredRooms = roomList.filter((room) => room.topScore !== null);
  const meanTop =
    scoredRooms.length > 0
      ? scoredRooms.reduce((total, room) => total + (room.topScore ?? 0), 0) /
        scoredRooms.length
      : null;
  const meanBand = meanTop === null ? null : bandFor(meanTop);

  const startExample = async () => {
    setSeeding(true);
    try {
      const roomId = await createExample({});
      toast("Example room opened", {
        description:
          "Five ideas, an iteration, twelve scoring passes, and one disagreement kept intact.",
      });
      navigate(`/room/${roomId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The example room failed to open.",
      );
    } finally {
      setSeeding(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] ?? null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1080px]">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label text-muted-foreground">The board</span>
              <span className="h-px w-6 bg-border" />
              <HostLine />
            </div>
            <h1 className="display mt-3 text-4xl leading-[0.95] sm:text-5xl">
              {firstName ? `Welcome back, ${firstName}.` : "What hasn't been said yet."}
            </h1>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-muted-foreground">
              Every room opens with a sealed pool: no author, no order, no anchor.
              When the floor closes, everything is revealed at once. Then the room
              scores what could survive, and you decide what gets worked on.
            </p>
          </div>
          <Button onClick={() => setNewRoomOpen(true)} className="shrink-0 self-start">
            <Plus className="size-3.5" />
            Open a room
          </Button>
        </motion.header>

        <div className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-4 sm:divide-x">
          <Stat label="Rooms" value={roomList.length} />
          <Stat label="On the table" value={ideaTotal} suffix="ideas" />
          <Stat label="Scored" value={scoredTotal} suffix="passes" />
          <Stat
            label="Mean peak"
            value={meanTop === null ? "—" : meanTop.toFixed(1)}
            suffix={meanBand ? meanBand.label.toLowerCase() : undefined}
          />
        </div>

        <section className="mt-8">
          {rooms === undefined ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Reading the board…
            </div>
          ) : roomList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="hatch border border-dashed border-border"
            >
              <div className="flex flex-col items-start gap-6 bg-background/90 px-6 py-12 sm:px-10">
                <Seal>No rooms yet</Seal>
                <div>
                  <h2 className="display text-3xl leading-tight sm:text-4xl">
                    The table is clear.
                  </h2>
                  <p className="mt-3 max-w-[32rem] text-sm leading-6 text-muted-foreground">
                    Start with a room and a sealed pool. Contributions stay hidden
                    until the floor closes, so nothing anchors the room — not a
                    name, not an order, not the half-formed thing you almost
                    didn&rsquo;t bring. Or open the worked example to see a reveal
                    that has already happened.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setNewRoomOpen(true)}>
                    <Plus className="size-3.5" />
                    Open the floor
                  </Button>
                  <Button
                    variant="outline"
                    onClick={startExample}
                    disabled={seeding}
                  >
                    {seeding && <Loader2 className="size-3.5 animate-spin" />}
                    See a worked example
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roomList.map((room, index) => {
                const band = room.topScore === null ? null : bandFor(room.topScore);
                const sealed = room.stage === "open" && !room.revealed;
                return (
                  <motion.div
                    key={room._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <Link
                      to={`/room/${room._id}`}
                      className="group flex h-full flex-col border border-border bg-card transition-colors hover:border-foreground/40"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <span className="label text-muted-foreground">
                          Room {String(index + 1).padStart(2, "0")}
                        </span>
                        <Meta>
                          {sealed
                            ? `${room.ideaCount} sealed`
                            : `${room.ideaCount} ${room.ideaCount === 1 ? "idea" : "ideas"} · ${room.scoredCount} scored`}
                        </Meta>
                      </div>

                      <div className="flex-1 px-4 py-5">
                        <h3 className="text-[1.05rem] font-semibold leading-snug tracking-tight">
                          {room.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-6 text-muted-foreground">
                          {room.premise || "No premise recorded. The room still holds."}
                        </p>
                      </div>

                      <div className="border-t border-border px-4 py-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="label-sm text-muted-foreground">
                              Peak runscore
                            </p>
                            <RunscoreValue
                              score={room.topScore}
                              bandKey={band?.key ?? null}
                              size="sm"
                              className="mt-1"
                            />
                          </div>
                          <BandChip bandKey={band?.key ?? null} />
                        </div>
                        <ScoreMeter
                          score={room.topScore}
                          bandKey={band?.key ?? null}
                          segments={14}
                          className="mt-3"
                        />
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <StageChip stage={room.stage} />
                          <span className="label flex items-center gap-1 text-foreground">
                            Enter
                            <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}

              <motion.button
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: roomList.length * 0.05 }}
                onClick={() => setNewRoomOpen(true)}
                className="flex min-h-[13rem] flex-col items-start justify-between gap-6 border border-dashed border-border p-4 text-left transition-colors hover:border-foreground/40 hover:bg-card"
              >
                <span className="flex size-8 items-center justify-center border border-border">
                  <Plus className="size-3.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">Another sealed room</span>
                  <span className="mt-1 block text-[0.8125rem] leading-6 text-muted-foreground">
                    A new question that hasn&rsquo;t been asked out loud, and an open
                    floor to put it on.
                  </span>
                </span>
              </motion.button>
            </div>
          )}
        </section>

        <section className="mt-14 border-t border-border pt-8">
          <div className="grid gap-8 sm:grid-cols-[1.1fr_0.9fr] sm:gap-12">
            <div>
              <p className="label text-muted-foreground">Reading the board</p>
              <h2 className="display mt-3 text-3xl leading-tight">
                Bands describe warrant, not enthusiasm.
              </h2>
              <p className="mt-3 max-w-[32rem] text-[0.8125rem] leading-6 text-muted-foreground">
                A room can hold a Runaway idea and a Dormant one at the same time.
                That is the point. Nothing is removed for scoring low — it stays on
                the record with the evidence, or lack of it, attached. Stages keep
                the order honest: hear everything, score it, then authorize the
                work.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link to="/">
                  The scoring method
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="label text-muted-foreground">Band ladder</span>
                <span className="label-sm text-muted-foreground">0 → 100</span>
              </div>
              <BandLadder className="mt-2" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.key} className="bg-card px-4 py-3">
                <p className="label text-muted-foreground">{dimension.label}</p>
                <p className="num mt-1.5 text-xs">
                  {Math.round(dimension.weight * 100)}%
                  <span className="ml-1 text-muted-foreground">
                    {dimension.inverse ? "inverse" : "weight"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        onCreated={(roomId) => navigate(`/room/${roomId}`)}
      />
    </AppShell>
  );
}
