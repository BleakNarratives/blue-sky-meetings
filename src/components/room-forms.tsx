import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DIMENSIONS,
  bandFor,
  computeRunscore,
  type DimensionKey,
} from "@/convex/runscore";
import { useAuth } from "@/hooks/use-auth";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { BandChip, ScoreMeter, RunscoreValue } from "@/components/runscore-ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "human" | "agent";

function KindToggle({
  value,
  onChange,
  disabled,
}: {
  value: Kind;
  onChange: (kind: Kind) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["human", "agent"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={disabled}
          onClick={() => onChange(kind)}
          className={cn(
            "label border px-3 py-2.5 transition-colors",
            value === kind
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {kind === "human" ? "Human seat" : "Agent seat"}
        </button>
      ))}
    </div>
  );
}

export function NewRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (roomId: Id<"rooms">) => void;
}) {
  const create = useMutation(api.rooms.create);
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setPremise("");
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      const roomId = await create({ title, premise });
      toast("Room sealed", {
        description: "Nothing spoken here leaves it.",
      });
      onOpenChange(false);
      onCreated?.(roomId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The room could not be sealed.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-3xl">Open a sealed room</DialogTitle>
          <DialogDescription>
            A room holds ideas that have not been announced anywhere else. It does
            not open outward, and nothing said in it leaves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-title" className="label">
              Room name
            </Label>
            <Input
              id="room-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Four devices, one truth"
              maxLength={90}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-premise" className="label">
              What is on the table
            </Label>
            <Textarea
              id="room-premise"
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
              placeholder="The question this room is allowed to think about."
              maxLength={400}
              rows={3}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Blue sky means unlimited permission to think. It does not authorize
              anyone to touch a file.
            </p>
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
            <Button type="submit" disabled={pending || title.trim().length < 2}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Seal the room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddIdeaDialog({
  open,
  onOpenChange,
  roomId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: Id<"rooms">;
}) {
  const add = useMutation(api.ideas.add);
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [contributor, setContributor] = useState("");
  const [kind, setKind] = useState<Kind>("human");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setThesis("");
    setKind("human");
    setContributor(user?.name ?? user?.email?.split("@")[0] ?? "");
  }, [open, user?.name, user?.email]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await add({ roomId, title, thesis, contributor, kind });
      toast("On the table", {
        description: "Unscored until someone puts a number behind it.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The idea was not recorded.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-3xl">Put an idea on the table</DialogTitle>
          <DialogDescription>
            State it as you would say it out loud for the first time. No polish, no
            announcement. The room holds it until the runscore decides what it
            deserves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="idea-title" className="label">
              The idea
            </Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Reconcile on read, not on write"
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="idea-thesis" className="label">
              The claim, in one breath
            </Label>
            <Textarea
              id="idea-thesis"
              value={thesis}
              onChange={(event) => setThesis(event.target.value)}
              placeholder="What would have to be true for this to work?"
              maxLength={600}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="idea-contributor" className="label">
              Submitted by
            </Label>
            <Input
              id="idea-contributor"
              value={contributor}
              onChange={(event) => setContributor(event.target.value)}
              placeholder="Name or agent handle"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="label text-muted-foreground">Seat</span>
            <KindToggle value={kind} onChange={setKind} disabled={pending} />
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
            <Button type="submit" disabled={pending || title.trim().length < 3}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Record it
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type AssessTarget = {
  _id: Id<"ideas">;
  title: string;
  thesis: string;
  assessments: Array<{
    contributor: string;
    kind: Kind;
    novelty: number;
    warrant: number;
    reach: number;
    drag: number;
    note: string | null;
  }>;
};

const START: Record<DimensionKey, number> = {
  novelty: 5,
  warrant: 5,
  reach: 5,
  drag: 5,
};

export function AssessDialog({
  open,
  onOpenChange,
  idea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: AssessTarget | null;
}) {
  const assess = useMutation(api.ideas.assess);
  const { user } = useAuth();
  const [values, setValues] = useState<Record<DimensionKey, number>>(START);
  const [note, setNote] = useState("");
  const [contributor, setContributor] = useState("");
  const [kind, setKind] = useState<Kind>("human");
  const [pending, setPending] = useState(false);

  const defaultSeat = user?.name ?? user?.email?.split("@")[0] ?? "";

  // Opening a scoring pass should reflect that seat's last position, if any.
  useEffect(() => {
    if (!open || !idea) return;
    const seat = idea.assessments.find(
      (row) => row.contributor.trim().toLowerCase() === defaultSeat.trim().toLowerCase(),
    );
    setContributor(defaultSeat);
    if (seat) {
      setValues({
        novelty: seat.novelty,
        warrant: seat.warrant,
        reach: seat.reach,
        drag: seat.drag,
      });
      setNote(seat.note ?? "");
      setKind(seat.kind);
    } else {
      setValues(START);
      setNote("");
      setKind("human");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idea?._id, defaultSeat]);

  const existingSeat = useMemo(() => {
    if (!idea) return null;
    const name = contributor.trim().toLowerCase();
    if (!name) return null;
    return (
      idea.assessments.find(
        (row) => row.contributor.trim().toLowerCase() === name,
      ) ?? null
    );
  }, [idea, contributor]);

  const reading = computeRunscore(values);
  const band = bandFor(reading);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idea) return;
    setPending(true);
    try {
      await assess({ ideaId: idea._id, ...values, note, contributor, kind });
      toast("Score recorded", {
        description: `${idea.title} reads ${reading.toFixed(1)} on this pass.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The score was not recorded.",
      );
    } finally {
      setPending(false);
    }
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <p className="label text-muted-foreground">Scoring pass</p>
          <DialogTitle className="display text-2xl leading-tight sm:text-3xl">
            {idea.title}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{idea.thesis}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="border border-border bg-background px-4 py-3">
            <p className="label text-muted-foreground">This pass reads</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <RunscoreValue score={reading} bandKey={band.key} size="sm" />
              <BandChip bandKey={band.key} />
            </div>
            <ScoreMeter
              score={reading}
              bandKey={band.key}
              segments={10}
              className="mt-3"
            />
          </div>

          <div className="flex flex-col gap-4">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.key} className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Label className="label">
                    {dimension.label}
                    <span className="ml-2 text-[0.5625rem] text-muted-foreground">
                      {Math.round(dimension.weight * 100)}% of score
                    </span>
                  </Label>
                  <span className="num text-sm">
                    {values[dimension.key].toFixed(0)}
                    <span className="text-muted-foreground">/10</span>
                  </span>
                </div>
                <Slider
                  value={[values[dimension.key]]}
                  onValueChange={([next]) =>
                    setValues((prev) => ({
                      ...prev,
                      [dimension.key]: next ?? 0,
                    }))
                  }
                  min={0}
                  max={10}
                  step={1}
                  disabled={pending}
                  aria-label={dimension.label}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="label-sm text-muted-foreground">
                    {dimension.low}
                  </span>
                  <span className="hidden text-center text-[0.6875rem] text-muted-foreground sm:block">
                    {dimension.question}
                  </span>
                  <span className="label-sm text-muted-foreground">
                    {dimension.high}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assess-contributor" className="label">
                Scored by
              </Label>
              <Input
                id="assess-contributor"
                value={contributor}
                onChange={(event) => setContributor(event.target.value)}
                maxLength={60}
                placeholder="Name or agent handle"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label text-muted-foreground">Seat</span>
              <KindToggle value={kind} onChange={setKind} disabled={pending} />
            </div>
          </div>

          {existingSeat && (
            <p className="border-l-2 border-foreground/40 pl-3 text-xs leading-5 text-muted-foreground">
              {existingSeat.contributor} already has a seat on this idea. Submitting
              replaces that pass rather than adding a second one — the room only
              counts a voice once.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="assess-note" className="label">
              What the numbers rest on <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              id="assess-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Name the evidence, or the absence of it."
              maxLength={400}
              rows={2}
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
            <Button type="submit" disabled={pending || !contributor.trim()}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Record score
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
