import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CHAIRS, chairMeta, type Chair } from "@/convex/protocol";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export type ReadingRow = {
  _id: Id<"readings">;
  ideaId: Id<"ideas">;
  chair: string;
  body: string;
  contributor: string;
  kind: "human" | "agent";
  createdAt: number;
};

const chairOrder = (key: string) =>
  CHAIRS.findIndex((chair) => chair.key === key);

/**
 * The board is a set of lenses, not a panel of authorities. A reading is an
 * argument with a signature on it, and it never moves the runscore.
 */
export function BoardDialog({
  open,
  onOpenChange,
  idea,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: { _id: Id<"ideas">; title: string } | null;
  rows: ReadingRow[];
}) {
  const speak = useMutation(api.board.speak);
  const retract = useMutation(api.board.retract);
  const { user } = useAuth();

  const defaultSeat = user?.name ?? user?.email?.split("@")[0] ?? "";
  const [chair, setChair] = useState<Chair>("advocate");
  const [body, setBody] = useState("");
  const [contributor, setContributor] = useState(defaultSeat);
  const [kind, setKind] = useState<"human" | "agent">("human");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBody("");
    setContributor(defaultSeat);
  }, [open, idea?._id, defaultSeat]);

  const selected = chairMeta(chair);
  const sorted = [...rows].sort(
    (a, b) => chairOrder(a.chair) - chairOrder(b.chair) || a.createdAt - b.createdAt,
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idea) return;
    setPending(true);
    try {
      await speak({ ideaId: idea._id, chair, body, contributor, kind });
      toast("Reading entered", {
        description: `Signed from the ${selected.label} chair. The score did not move.`,
      });
      setBody("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The reading was not entered.",
      );
    } finally {
      setPending(false);
    }
  };

  const remove = async (readingId: Id<"readings">) => {
    try {
      await retract({ readingId });
      toast("Reading withdrawn");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "It could not be withdrawn.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <p className="label text-muted-foreground">The board</p>
          <DialogTitle className="display text-3xl">{idea?.title ?? "Board"}</DialogTitle>
          <DialogDescription>
            Six chairs, one question. Anyone can sit in a chair; every reading is
            signed. This is advice on the record — it never changes the runscore.
          </DialogDescription>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
            No one has sat down yet. A board is not a verdict; it is the argument
            made legible before a human decides.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((reading) => {
              const chairInfo = chairMeta(reading.chair);
              return (
                <div key={reading._id} className="border border-border bg-card px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                        {chairInfo.tag}
                      </span>
                      <span className="label text-foreground">{chairInfo.label}</span>
                      <span className="label-sm text-muted-foreground">
                        {reading.contributor}
                        {reading.kind === "agent" ? " · agent seat" : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(reading._id)}
                      aria-label="Withdraw this reading"
                      className="shrink-0 border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 text-[0.8125rem] leading-6 text-muted-foreground">
                    {reading.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 border-t border-border pt-4"
        >
          <div className="flex flex-col gap-2">
            <span className="label text-muted-foreground">Take a chair</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHAIRS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={pending}
                  aria-pressed={chair === option.key}
                  onClick={() => setChair(option.key)}
                  className={cn(
                    "flex flex-col gap-0.5 border px-3 py-2.5 text-left transition-colors",
                    chair === option.key
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="label">{option.label}</span>
                    <span className="label-sm text-muted-foreground">{option.tag}</span>
                  </span>
                  <span className="text-[0.6875rem] leading-4 text-muted-foreground">
                    {option.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reading-body" className="label">
              {selected.question}
            </Label>
            <Textarea
              id="reading-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Make the case, or name the failure. One reading, no speech."
              rows={3}
              maxLength={600}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reading-contributor" className="label">
                Signed by
              </Label>
              <Input
                id="reading-contributor"
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
            A seat holds one reading per chair. Submitting again revises it — the
            board does not count the same voice twice.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={pending || body.trim().length < 3 || !contributor.trim()}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Enter the reading
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
