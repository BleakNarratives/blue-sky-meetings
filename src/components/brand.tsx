import type { ReactNode } from "react";
import { Asterisk } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** The mark: an asterisk on highlighter, i.e. "note taken". */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center border border-foreground/25 bg-highlight text-ink",
        className,
      )}
    >
      <Asterisk className="size-4" strokeWidth={2.6} />
    </span>
  );
}

export function Brand({
  to = "/",
  caption,
  className,
}: {
  to?: string;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Blue Sky Meetings home"
    >
      <Mark className="transition-transform duration-300 group-hover:rotate-90" />
      <span className="leading-none">
        <span className="block font-mono text-[0.72rem] font-medium uppercase tracking-[0.17em] text-foreground">
          Blue Sky
        </span>
        <span className="mt-1 block font-mono text-[0.72rem] uppercase tracking-[0.17em] text-muted-foreground">
          Meetings
        </span>
      </span>
    </Link>
  );
}

/** Rotated rubber stamp used on sealed things. */
export function Seal({
  children = "Sealed",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp inline-flex -rotate-2 items-center gap-1.5 text-muted-foreground",
        className,
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** A tiny mono bracket around metadata, e.g. [ 04 ideas ]. */
export function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="num inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
      <span aria-hidden className="text-border">
        [
      </span>
      {children}
      <span aria-hidden className="text-border">
        ]
      </span>
    </span>
  );
}
