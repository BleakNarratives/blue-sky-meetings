import { Button } from "@/components/ui/button";
import {
  STAGES,
  nextStage,
  normaliseStage,
  previousStage,
  stageMeta,
  stageNumber,
  type Stage,
} from "@/convex/protocol";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export function StageChip({
  stage,
  className,
}: {
  stage: string | undefined | null;
  className?: string;
}) {
  const key = normaliseStage(stage);
  const meta = stageMeta(key);
  return (
    <span
      className={cn(
        "label inline-flex items-center gap-1.5 border px-2 py-1",
        key === "authorized"
          ? "border-foreground bg-highlight text-ink"
          : key === "assessment"
            ? "border-foreground/40 bg-secondary text-foreground"
            : "border-border text-muted-foreground",
        className,
      )}
    >
      <span className="num text-[0.5625rem] opacity-60">{meta.index}</span>
      {meta.label}
    </span>
  );
}

/**
 * The stage rail. Three steps, one at a time. Forward closes the floor and
 * then authorizes; backward reopens it for more hearing.
 */
export function StageRail({
  stage,
  pending,
  revealed,
  onSetStage,
}: {
  stage: string | undefined | null;
  pending?: boolean;
  revealed?: boolean;
  onSetStage: (stage: Stage) => void;
}) {
  const key = normaliseStage(stage);
  const current = stageNumber(key);
  const meta = stageMeta(key);
  // A reopened floor no longer seals what the room has already seen.
  const openAfterReveal = key === "open" && revealed === true;
  const next = nextStage(key);
  const previous = previousStage(key);

  return (
    <div className="border border-border bg-card">
      <div className="grid grid-cols-3 divide-x divide-border">
        {STAGES.map((entry, index) => {
          const done = index + 1 < current;
          const active = entry.key === key;
          return (
            <div
              key={entry.key}
              className={cn(
                "flex flex-col gap-1.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-2.5 sm:px-4",
                active && "bg-secondary",
              )}
            >
              <span className="flex items-center gap-1.5">
                {done ? (
                  <Check className="size-3 text-foreground/70" />
                ) : (
                  <span
                    className={cn(
                      "num text-[0.625rem]",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {entry.index}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "label leading-4",
                  active
                    ? "text-foreground"
                    : done
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="max-w-[38rem] text-[0.8125rem] leading-6 text-muted-foreground">
            {openAfterReveal
              ? "The pool has already been revealed. New additions land in the open, and nothing is graded until the floor closes again."
              : meta.blurb}
          </p>
          <p className="label-sm mt-2 text-muted-foreground/80">{meta.rule}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {previous && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onSetStage(previous)}
            >
              {previous === "open" ? "Reopen the floor" : "Back to assessment"}
            </Button>
          )}
          {next ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onSetStage(next)}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {meta.action}
            </Button>
          ) : (
            <span className="label border border-border px-2.5 py-2 text-muted-foreground">
              Authorized by you
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
