import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BandKey } from "@/convex/runscore";
import {
  MIGHT_STANCES,
  OUGHT_STANCES,
  mightMeta,
  oughtMeta,
  type MightStance,
  type OughtStance,
} from "@/convex/protocol";
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
import { Textarea } from "@/components/ui/textarea";
import { bandMeta } from "@/components/runscore-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export type PositionCounts = {
  seatCount: number;
  might: { unlikely: number; even: number; likely: number };
  ought: { should: number; shouldnt: number; undecided: number };
};

export type MyPosition = {
  might: MightStance;
  ought: OughtStance;
  note: string | null;
} | null;

export type RegisterTarget = {
  _id: Id<"ideas">;
  title: string;
  score: number | null;
  bandKey: BandKey | null;
  positions: PositionCounts;
  myPosition: MyPosition;
};

const MIGHT_ORDER = ["unlikely", "even", "likely"] as const;
const OUGHT_ORDER = ["should", "shouldnt", "undecided"] as const;

function leading<K extends string>(
  counts: Record<K, number>,
  order: readonly K[],
): { key: K | null; tie: boolean; total: number } {
  let best: K | null = null;
  let bestCount = 0;
  let tie = false;
  let total = 0;
  for (const key of order) {
    const count = counts[key] ?? 0;
    total += count;
    if (count > bestCount) {
      best = key;
      bestCount = count;
      tie = false;
    } else if (count === bestCount && count > 0) {
      tie = true;
    }
  }
  return { key: best, tie, total };
}

function TallyBar({
  counts,
  order,
}: {
  counts: Record<string, number>;
  order: readonly string[];
}) {
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  if (total === 0) {
    return <div className="mt-2 h-1.5 border border-dashed border-border" />;
  }
  return (
    <div className="mt-2 flex h-1.5 gap-px bg-border">
      {order.map((key) =>
        counts[key] > 0 ? (
          <span
            key={key}
            className="bg-foreground"
            style={{ width: `${((counts[key] ?? 0) / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

/**
 * Three questions, one strip. Can is the runscore. Might and Ought are
 * positions: tallied, never averaged, and never folded into the number.
 */
export function Registers({
  idea,
  onOpen,
}: {
  idea: RegisterTarget;
  onOpen: () => void;
}) {
  const might = leading(idea.positions.might, MIGHT_ORDER);
  const ought = leading(idea.positions.ought, OUGHT_ORDER);
  const band = idea.bandKey ? bandMeta(idea.bandKey) : null;

  const mightLabel =
    might.total === 0
      ? "Unheard"
      : might.tie
        ? "Split"
        : mightMeta(might.key).label;
  const oughtLabel =
    ought.total === 0
      ? "Unheard"
      : ought.tie
        ? "Split"
        : oughtMeta(ought.key).label;

  const mightParts = MIGHT_ORDER.filter(
    (key) => idea.positions.might[key] > 0,
  ).map((key) => `${mightMeta(key).label} ${idea.positions.might[key]}`);
  const oughtParts = OUGHT_ORDER.filter(
    (key) => idea.positions.ought[key] > 0,
  ).map((key) => `${oughtMeta(key).label} ${idea.positions.ought[key]}`);

  return (
    <div className="border-t border-border">
      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="px-3 py-3 sm:px-5">
          <p className="label-sm text-muted-foreground">Can</p>
          <p className="num mt-1.5 text-base leading-none">
            {idea.score === null ? "——" : idea.score.toFixed(1)}
          </p>
          <p className="label-sm mt-1 text-muted-foreground">
            {band?.label ?? "unread"}
          </p>
        </div>

        <div className="px-3 py-3 sm:px-5">
          <p className="label-sm text-muted-foreground">Might</p>
          <p className="mt-1.5 text-[0.8125rem] font-medium leading-none">
            {mightLabel}
          </p>
          <p className="label-sm mt-1 truncate text-muted-foreground">
            {mightParts.length > 0 ? mightParts.join(" · ") : "no positions"}
          </p>
          <TallyBar counts={idea.positions.might} order={MIGHT_ORDER} />
        </div>

        <div className="px-3 py-3 sm:px-5">
          <p className="label-sm text-muted-foreground">Ought</p>
          <p className="mt-1.5 text-[0.8125rem] font-medium leading-none">
            {oughtLabel}
          </p>
          <p className="label-sm mt-1 truncate text-muted-foreground">
            {oughtParts.length > 0 ? oughtParts.join(" · ") : "no positions"}
          </p>
          <TallyBar counts={idea.positions.ought} order={OUGHT_ORDER} />
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 sm:px-5"
      >
        <span className="label-sm text-muted-foreground">
          {idea.myPosition ? "Your position is on the record" : "Take a position"}
        </span>
        <span className="label-sm inline-flex items-center gap-1.5 text-muted-foreground">
          Might + Ought
          <ArrowRight className="size-3" />
        </span>
      </button>
    </div>
  );
}

export function DeliberateDialog({
  open,
  onOpenChange,
  idea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: RegisterTarget | null;
}) {
  const setPosition = useMutation(api.deliberate.setPosition);
  const { user } = useAuth();
  const defaultSeat = user?.name ?? user?.email?.split("@")[0] ?? "";

  const [might, setMight] = useState<MightStance>("even");
  const [ought, setOught] = useState<OughtStance>("undecided");
  const [note, setNote] = useState("");
  const [contributor, setContributor] = useState(defaultSeat);
  const [kind, setKind] = useState<"human" | "agent">("human");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !idea) return;
    setMight(idea.myPosition?.might ?? "even");
    setOught(idea.myPosition?.ought ?? "undecided");
    setNote(idea.myPosition?.note ?? "");
    setContributor(defaultSeat);
    setKind("human");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idea?._id, defaultSeat]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idea) return;
    setPending(true);
    try {
      await setPosition({ ideaId: idea._id, might, ought, note, contributor, kind });
      toast("Position recorded", {
        description:
          "Might and Ought are separate questions. Neither answer moved the runscore.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The position was not recorded.",
      );
    } finally {
      setPending(false);
    }
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <p className="label text-muted-foreground">Three questions</p>
          <DialogTitle className="display text-3xl">{idea.title}</DialogTitle>
          <DialogDescription>
            The score answers <span className="text-foreground">Can</span>. You
            are answering the two it cannot:{" "}
            <span className="text-foreground">Might</span> this happen, and{" "}
            <span className="text-foreground">Ought</span> it exist. One seat, one
            pair.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label className="label">Might it happen?</Label>
              <span className="label-sm text-muted-foreground">a forecast</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {MIGHT_STANCES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={pending}
                  aria-pressed={might === option.key}
                  onClick={() => setMight(option.key)}
                  className={cn(
                    "flex flex-col gap-1 border px-3 py-2.5 text-left transition-colors",
                    might === option.key
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="label">{option.label}</span>
                  <span className="text-[0.6875rem] leading-4 text-muted-foreground">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label className="label">Ought it exist?</Label>
              <span className="label-sm text-muted-foreground">
                not arithmetic
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {OUGHT_STANCES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={pending}
                  aria-pressed={ought === option.key}
                  onClick={() => setOught(option.key)}
                  className={cn(
                    "flex flex-col gap-1 border px-3 py-2.5 text-left transition-colors",
                    ought === option.key
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="label">{option.label}</span>
                  <span className="text-[0.6875rem] leading-4 text-muted-foreground">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="position-note" className="label">
              What it rests on <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              id="position-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Name the condition, the cost, or the thing you can't get past."
              rows={2}
              maxLength={400}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="position-contributor" className="label">
                Signed by
              </Label>
              <Input
                id="position-contributor"
                value={contributor}
                onChange={(event) => setContributor(event.target.value)}
                maxLength={60}
                placeholder="Name or agent handle"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label text-muted-foreground">Seat</span>
              <div className="grid grid-cols-2 gap-2">
                {(["human", "agent"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={pending}
                    aria-pressed={kind === option}
                    onClick={() => setKind(option)}
                    className={cn(
                      "label border px-2 py-2.5 transition-colors",
                      kind === option
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {option === "human" ? "Human" : "Agent"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[0.6875rem] leading-5 text-muted-foreground">
            Submitting again revises your pair. The room sees the distribution,
            never a single blended verdict. Neither answer is folded into the
            runscore.
          </p>

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
              disabled={pending || !contributor.trim()}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Put it on the record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
