import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BandKey } from "@/convex/runscore";
import { BESTIARY_REVIEWS, trackMeta } from "@/convex/protocol";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bandMeta } from "@/components/runscore-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Archive, Loader2, RotateCcw } from "lucide-react";

export type BestiaryEntry = {
  _id: Id<"ideas">;
  title: string;
  thesis: string;
  contributor: string;
  track: string;
  score: number | null;
  bandKey: BandKey | null;
  note: string | null;
  by: string | null;
  reviewAt: number | null;
  keptAt: number | null;
};

function formatDate(timestamp: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Keeping an idea is not killing it. The shelf is how a room refuses to build
 * something without pretending it never came up.
 */
export function KeepDialog({
  open,
  onOpenChange,
  idea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: { _id: Id<"ideas">; title: string } | null;
}) {
  const keep = useMutation(api.deliberate.keep);
  const [note, setNote] = useState("");
  const [reviewDays, setReviewDays] = useState<0 | 90 | 365>(90);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setReviewDays(90);
  }, [open, idea?._id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idea) return;
    setPending(true);
    try {
      await keep({ ideaId: idea._id, note, reviewDays });
      toast("Kept in the bestiary", {
        description:
          "Off the table, still on the record. Nothing was deleted.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "It was not shelved.",
      );
    } finally {
      setPending(false);
    }
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="label text-muted-foreground">The bestiary</p>
          <DialogTitle className="display text-3xl">
            Keep it. Don&rsquo;t build it.
          </DialogTitle>
          <DialogDescription>
            {idea.title} leaves the table and goes on the shelf. It stays
            readable, dated, and attributed. Deleting a dangerous idea does not
            make it safer; it makes it unrecognizable next time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="keep-reason" className="label">
              Why is it being kept?
            </Label>
            <Textarea
              id="keep-reason"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What is wrong with it, or what would have to change before it gets another hearing."
              rows={3}
              maxLength={400}
              required
              autoFocus
            />
            <p className="text-[0.6875rem] leading-5 text-muted-foreground">
              Name the objection, not just the mood. The next room inherits this
              note before it inherits the idea.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label text-muted-foreground">Look again</span>
            <div className="grid grid-cols-3 gap-2">
              {BESTIARY_REVIEWS.map((option) => {
                const value = option.days as 0 | 90 | 365;
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={pending}
                    aria-pressed={reviewDays === value}
                    onClick={() => setReviewDays(value)}
                    className={cn(
                      "label border px-2 py-2.5 transition-colors",
                      reviewDays === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[0.6875rem] leading-5 text-muted-foreground">
              A date is a promise to revisit, not a schedule to rebuild.
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
            <Button
              type="submit"
              disabled={pending || note.trim().length < 6}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              <Archive className="size-3.5" />
              Keep it
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BestiarySection({ entries }: { entries: BestiaryEntry[] }) {
  const restore = useMutation(api.deliberate.restore);
  const [pendingId, setPendingId] = useState<Id<"ideas"> | null>(null);

  const putBack = async (ideaId: Id<"ideas">) => {
    setPendingId(ideaId);
    try {
      await restore({ ideaId });
      toast("Back on the table", {
        description: "The note stays in the record. The shelf is not a verdict.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "It could not be restored.",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mt-10 border border-border bg-secondary/40">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <p className="label text-muted-foreground">The bestiary</p>
          <h2 className="display mt-2 text-2xl">Kept, not carried.</h2>
          <p className="label-sm mt-2 max-w-[36rem] text-muted-foreground">
            Ideas that must not be built, and must not be forgotten. Nothing here
            is deleted; it is labeled, dated, and held at the edge of the room.
          </p>
        </div>
        <span className="label-sm text-muted-foreground">
          {entries.length} kept
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-[0.78rem] leading-6 text-muted-foreground sm:px-5">
          Nothing on the shelf. The first thing kept will arrive with a reason
          and a date, not a redaction.
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry) => {
            const band = entry.bandKey ? bandMeta(entry.bandKey) : null;
            const review = formatDate(entry.reviewAt);
            const kept = formatDate(entry.keptAt);
            return (
              <article
                key={entry._id}
                className="border-t border-border px-4 py-4 first:border-t-0 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                        {trackMeta(entry.track).label}
                      </span>
                      <span className="label-sm text-muted-foreground">
                        {entry.contributor}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[0.95rem] font-semibold leading-snug tracking-tight">
                      {entry.title}
                    </h3>
                    {entry.note && (
                      <p className="mt-1.5 max-w-[40rem] text-[0.78rem] leading-6 text-muted-foreground">
                        {entry.note}
                      </p>
                    )}
                    <p className="label-sm mt-2 text-muted-foreground">
                      Kept by {entry.by ?? "a seat"}
                      {kept ? ` · ${kept}` : ""}
                      {review ? ` · look again ${review}` : " · no review date"}
                      {entry.score !== null
                        ? ` · last reading ${entry.score.toFixed(1)}${band ? ` (${band.label})` : ""}`
                        : ""}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => putBack(entry._id)}
                    disabled={pendingId === entry._id}
                  >
                    {pendingId === entry._id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    Return to the table
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
