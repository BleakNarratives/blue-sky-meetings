import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CircleAlert, Hand, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Stance = "nod" | "push";

/**
 * Company, not consensus. A nod and a pushback are shown at the same weight,
 * one per seat, and neither touches the runscore or the order of the table.
 */
export function Reactions({
  ideaId,
  nodCount,
  pushCount,
  myStance,
}: {
  ideaId: Id<"ideas">;
  nodCount: number;
  pushCount: number;
  myStance: Stance | null;
}) {
  const react = useMutation(api.ideas.react);
  const [pending, setPending] = useState<Stance | null>(null);

  const act = async (stance: Stance) => {
    setPending(stance);
    try {
      await react({ ideaId, stance });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That didn't land.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={myStance === "nod"}
        aria-label={`Nod at this idea (${nodCount})`}
        disabled={pending !== null}
        onClick={() => act("nod")}
        className={cn(
          "h-7 gap-1.5 border px-2 text-[0.65rem] tracking-[0.08em]",
          myStance === "nod"
            ? "border-foreground bg-highlight text-ink hover:bg-highlight/90"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {pending === "nod" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Hand className="size-3" />
        )}
        Nod
        <span className="num text-[0.625rem] opacity-70">{nodCount}</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={myStance === "push"}
        aria-label={`Push back on this idea (${pushCount})`}
        disabled={pending !== null}
        onClick={() => act("push")}
        className={cn(
          "h-7 gap-1.5 border px-2 text-[0.65rem] tracking-[0.08em]",
          myStance === "push"
            ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {pending === "push" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CircleAlert className="size-3" />
        )}
        Push
        <span className="num text-[0.625rem] opacity-70">{pushCount}</span>
      </Button>
    </div>
  );
}
