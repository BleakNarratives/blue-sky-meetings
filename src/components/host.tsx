import { Mark } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Syntax AI hosts the room. It records, seals, reads and flags. It advises;
 * it never votes, authorizes, or assigns.
 */
export function HostCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border border-foreground bg-foreground px-4 py-4 text-background",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-sm text-background/50">Host</p>
          <p className="display mt-1.5 text-2xl leading-none">Syntax AI</p>
        </div>
        <Mark className="size-7 border-0" />
      </div>
      <p className="mt-3 text-[0.75rem] leading-5 text-background/60">
        Keeps the record, seals the pool, reads every pass. It advises the room.
        It never votes, authorizes, or assigns.
      </p>
    </div>
  );
}

export function HostLine({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "label inline-flex items-center gap-2 text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 bg-highlight ring-1 ring-foreground/30" />
      Hosted by Syntax AI
    </span>
  );
}
