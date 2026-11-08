import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BOUT_QUESTIONS,
  trackMeta,
} from "@/convex/protocol";
import { bandFor } from "@/convex/runscore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RunscoreValue } from "@/components/runscore-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Plus, Swords, Trash2 } from "lucide-react";

export type BoutIdea = {
  id: Id<"ideas">;
  title: string;
  track: string;
  score: number | null;
  kept: boolean;
};

export type BoutBallot = {
  _id: Id<"boutVotes">;
  contributor: string;
  kind: "human" | "agent";
  side: "a" | "b" | "draw";
  forCase: string | null;
  againstCase: string | null;
};

export type MyBallot = {
  side: "a" | "b" | "draw";
  forCase: string | null;
  againstCase: string | null;
} | null;

export type BoutRow = {
  _id: Id<"bouts">;
  question: string;
  status: "open" | "called";
  winnerSide: "a" | "b" | null;
  rationale: string | null;
  calledBy: string | null;
  createdBy: string;
  createdAt: number;
  a: BoutIdea;
  b: BoutIdea;
  ballots: BoutBallot[];
  mySide: "a" | "b" | "draw" | null;
  myBallot: MyBallot;
};

export type ArenaIdea = {
  _id: Id<"ideas">;
  title: string;
  track: string;
  score: number | null;
};

function SidePanel({
  label,
  idea,
  winner,
}: {
  label: "A" | "B";
  idea: BoutIdea;
  winner: boolean;
}) {
  const band = idea.score === null ? null : bandFor(idea.score);
  return (
    <div className={cn("px-4 py-4", winner && "bg-highlight/30")}>
      <div className="flex items-center gap-2">
        <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
          {label}
        </span>
        <span className="label-sm text-muted-foreground">
          {trackMeta(idea.track).label}
        </span>
        {idea.kept && (
          <span className="label-sm border border-dashed border-border px-1.5 py-0.5 text-muted-foreground">
            Kept
          </span>
        )}
        {winner && <span className="label-sm ml-auto text-foreground">Called</span>}
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-snug">{idea.title}</h3>
      <div className="mt-2.5">
        <RunscoreValue
          score={idea.score}
          bandKey={band?.key ?? null}
          size="sm"
        />
      </div>
    </div>
  );
}

function BoutCard({ bout }: { bout: BoutRow }) {
  const vote = useMutation(api.arena.vote);
  const call = useMutation(api.arena.call);
  const remove = useMutation(api.arena.remove);

  const [side, setSide] = useState<"a" | "b" | "draw">(
    bout.myBallot?.side ?? "a",
  );
  const [forCase, setForCase] = useState(bout.myBallot?.forCase ?? "");
  const [againstCase, setAgainstCase] = useState(
    bout.myBallot?.againstCase ?? "",
  );
  const [rationale, setRationale] = useState("");
  const [pending, setPending] = useState(false);
  const [calling, setCalling] = useState(false);

  const tally = {
    a: bout.ballots.filter((ballot) => ballot.side === "a").length,
    b: bout.ballots.filter((ballot) => ballot.side === "b").length,
    draw: bout.ballots.filter((ballot) => ballot.side === "draw").length,
  };

  const cast = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await vote({
        boutId: bout._id,
        side,
        forCase: forCase.trim() || undefined,
        againstCase: againstCase.trim() || undefined,
        kind: "human",
      });
      toast(bout.myBallot ? "Ballot revised" : "Ballot cast", {
        description: "One seat, one ballot. The call stays a human's.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The ballot was not recorded.",
      );
    } finally {
      setPending(false);
    }
  };

  const callIt = async (winner: "a" | "b") => {
    setCalling(true);
    try {
      await call({ boutId: bout._id, winner, rationale });
      toast("Bout called", {
        description: "Nothing is deleted. The dissent stays attached.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The bout was not called.",
      );
    } finally {
      setCalling(false);
    }
  };

  const removeBout = async () => {
    try {
      await remove({ boutId: bout._id });
      toast("Bout cleared");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The bout could not be cleared.",
      );
    }
  };

  const called = bout.status === "called";

  return (
    <article className="border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="label-sm text-muted-foreground">Bout · {bout.createdBy}</p>
          <h3 className="mt-1 text-sm font-medium leading-snug">{bout.question}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "label-sm border px-1.5 py-0.5",
              called
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground",
            )}
          >
            {called ? "Called" : "Open"}
          </span>
          <button
            type="button"
            onClick={removeBout}
            aria-label="Clear this bout"
            className="border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <SidePanel label="A" idea={bout.a} winner={bout.winnerSide === "a"} />
        <SidePanel label="B" idea={bout.b} winner={bout.winnerSide === "b"} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="label text-muted-foreground">Ballots</span>
          <span className="num text-[0.6875rem] text-muted-foreground">
            A {tally.a} · B {tally.b} · Draw {tally.draw}
          </span>
          <span className="label-sm ml-auto text-muted-foreground">
            Advice, not arithmetic
          </span>
        </div>

        {bout.ballots.length === 0 ? (
          <p className="mt-2 text-[0.75rem] leading-5 text-muted-foreground">
            No ballots yet. A vote without a reason is only a temperature.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2">
            {bout.ballots.map((ballot) => (
              <div
                key={ballot._id}
                className="border-l-2 border-border pl-2.5 text-[0.75rem] leading-5"
              >
                <span className="label-sm text-foreground">
                  {ballot.contributor}
                </span>
                <span className="mx-1.5 text-border">/</span>
                <span className="label-sm text-muted-foreground">
                  {ballot.side === "a"
                    ? "A"
                    : ballot.side === "b"
                      ? "B"
                      : "Draw"}
                </span>
                {ballot.forCase && (
                  <p className="mt-1 text-muted-foreground">
                    <span className="text-foreground">For</span> — {ballot.forCase}
                  </p>
                )}
                {ballot.againstCase && (
                  <p className="text-muted-foreground">
                    <span className="text-foreground">Still loses</span> —{" "}
                    {ballot.againstCase}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!called && (
        <div className="grid gap-4 border-t border-border bg-secondary/30 px-4 py-4 lg:grid-cols-2">
          <form onSubmit={cast} className="flex flex-col gap-2.5">
            <p className="label text-muted-foreground">
              {bout.myBallot ? "Your ballot" : "Cast a ballot"}
            </p>
            <div className="grid grid-cols-3 border border-border">
              {(["a", "b", "draw"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  aria-pressed={side === option}
                  onClick={() => setSide(option)}
                  className={cn(
                    "label-sm px-2 py-2 transition-colors",
                    side === option
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "a" ? "A" : option === "b" ? "B" : "Draw"}
                </button>
              ))}
            </div>
            <Input
              value={forCase}
              onChange={(event) => setForCase(event.target.value)}
              placeholder="What it wins on"
              maxLength={240}
              aria-label="What it wins on"
            />
            <Input
              value={againstCase}
              onChange={(event) => setAgainstCase(event.target.value)}
              placeholder="What it still loses"
              maxLength={240}
              aria-label="What it still loses"
            />
            <Button type="submit" size="sm" disabled={pending} className="self-start">
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {bout.myBallot ? "Revise ballot" : "Cast ballot"}
            </Button>
          </form>

          <div className="flex flex-col gap-2.5">
            <p className="label text-muted-foreground">The call is yours</p>
            <Textarea
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              placeholder="What actually decided it?"
              rows={2}
              maxLength={400}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={calling || rationale.trim().length < 3}
                onClick={() => callIt("a")}
              >
                Call A
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={calling || rationale.trim().length < 3}
                onClick={() => callIt("b")}
              >
                Call B
              </Button>
            </div>
            <p className="text-[0.6875rem] leading-5 text-muted-foreground">
              Ballots advise. A human calls it, and the dissent stays on the
              record. Losing does not remove an idea from the room.
            </p>
          </div>
        </div>
      )}

      {called && (
        <div className="border-t border-border bg-foreground px-4 py-4 text-background">
          <p className="label text-background/50">The call</p>
          <p className="display mt-1 text-xl leading-snug">
            {bout.winnerSide === "a" ? bout.a.title : bout.b.title}
          </p>
          {bout.rationale && (
            <p className="mt-2 text-[0.78rem] leading-6 text-background/65">
              {bout.rationale}
            </p>
          )}
          <p className="label-sm mt-3 text-background/45">
            Called by {bout.calledBy ?? "a seat"}
            {tally.a + tally.b + tally.draw > 0
              ? ` · room split A ${tally.a}, B ${tally.b}, Draw ${tally.draw}`
              : ""}
          </p>
        </div>
      )}
    </article>
  );
}

export function ArenaSection({
  bouts,
  canOpen,
  onOpenBout,
}: {
  bouts: BoutRow[];
  canOpen: boolean;
  onOpenBout: () => void;
}) {
  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-muted-foreground">The arena</p>
          <h2 className="display mt-2 text-2xl">Two ideas. One question.</h2>
          <p className="label-sm mt-2 max-w-[38rem] text-muted-foreground">
            A bout is a comparison, not an election. Ballots advise; a human
            calls it. Nothing is deleted for losing.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenBout}
          disabled={!canOpen}
        >
          <Swords className="size-3.5" />
          Open a bout
        </Button>
      </div>

      {bouts.length === 0 ? (
        <div className="hatch mt-4 border border-dashed border-border">
          <div className="bg-background/90 px-5 py-6">
            <p className="text-sm leading-6 text-muted-foreground">
              No bouts yet. Putting two ideas head to head is how a room finds out
              whether it likes a thing or merely likes talking about it.
            </p>
            <p className="label-sm mt-2 text-muted-foreground">
              Open one. Ask a question that can actually be answered by a call.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {bouts.map((bout) => (
            <BoutCard key={bout._id} bout={bout} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BoutDialog({
  open,
  onOpenChange,
  roomId,
  ideas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: Id<"rooms">;
  ideas: ArenaIdea[];
}) {
  const create = useMutation(api.arena.create);
  const [aId, setAId] = useState<Id<"ideas"> | "">("");
  const [bId, setBId] = useState<Id<"ideas"> | "">("");
  const [question, setQuestion] = useState<string>(BOUT_QUESTIONS[0]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAId(ideas[0]?._id ?? "");
    setBId(ideas[1]?._id ?? "");
    setQuestion(BOUT_QUESTIONS[0]);
    // Only reset when the dialog opens; `ideas` is rebuilt by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!aId || !bId) return;
    setPending(true);
    try {
      await create({ roomId, aId, bId, question });
      toast("Bout opened", {
        description: "Two ideas, one question. The room advises; you call it.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The bout was not opened.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-3xl">Open a bout</DialogTitle>
          <DialogDescription>
            Put two ideas on the same question. The point is not to humiliate the
            loser — it is to find out what each one is actually better at.
          </DialogDescription>
        </DialogHeader>

        {ideas.length < 2 ? (
          <p className="border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
            A bout needs two ideas on the table. Once the pool is open, this
            becomes possible.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { label: "Side A", value: aId, set: setAId, other: bId },
                  { label: "Side B", value: bId, set: setBId, other: aId },
                ] as const
              ).map((field) => (
                <div key={field.label} className="flex flex-col gap-2">
                  <Label className="label">{field.label}</Label>
                  <select
                    value={field.value}
                    onChange={(event) =>
                      field.set(event.target.value as Id<"ideas">)
                    }
                    className="h-10 w-full border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  >
                    <option value="">Choose an idea</option>
                    {ideas.map((idea) => (
                      <option
                        key={idea._id}
                        value={idea._id}
                        disabled={idea._id === field.other}
                      >
                        {idea.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bout-question" className="label">
                The question
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {BOUT_QUESTIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuestion(preset)}
                    aria-pressed={question === preset}
                    className={cn(
                      "border px-2 py-1 text-left text-[0.6875rem] leading-4 transition-colors",
                      question === preset
                        ? "border-foreground bg-secondary"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                id="bout-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Or ask your own"
                maxLength={140}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  pending ||
                  !aId ||
                  !bId ||
                  aId === bId ||
                  question.trim().length < 6
                }
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                <Plus className="size-3.5" />
                Open the bout
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
