import {
  BANDS,
  BAND_VAR,
  DIMENSIONS,
  type BandKey,
  type DimensionKey,
} from "@/convex/runscore";
import { cn } from "@/lib/utils";

export function bandMeta(bandKey: BandKey) {
  return BANDS.find((band) => band.key === bandKey) ?? BANDS[0];
}

/** Band chip: label + range, colored along the grey → acid ramp. */
export function BandChip({
  bandKey,
  showRange = false,
  className,
}: {
  bandKey: BandKey | null;
  showRange?: boolean;
  className?: string;
}) {
  if (!bandKey) {
    return (
      <span
        className={cn(
          "label inline-flex items-center gap-1.5 border border-dashed border-border px-2 py-1 text-muted-foreground",
          className,
        )}
      >
        Unscored
      </span>
    );
  }

  const band = bandMeta(bandKey);
  return (
    <span
      className={cn(
        "label inline-flex items-center gap-1.5 border px-2 py-1",
        className,
      )}
      style={{
        color: BAND_VAR[bandKey],
        borderColor: `color-mix(in oklch, ${BAND_VAR[bandKey]} 45%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${BAND_VAR[bandKey]} 10%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {band.label}
      {showRange && (
        <span className="num opacity-60">
          {band.min}–{band.max}
        </span>
      )}
    </span>
  );
}

export function RunscoreValue({
  score,
  bandKey,
  size = "lg",
  className,
}: {
  score: number | null;
  bandKey: BandKey | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num inline-flex items-baseline gap-1 font-medium",
        size === "lg" ? "text-5xl" : "text-2xl",
        className,
      )}
      style={bandKey ? { color: BAND_VAR[bandKey] } : undefined}
    >
      {score === null ? (
        <span className="text-muted-foreground">––</span>
      ) : (
        score.toFixed(1)
      )}
      <span
        className={cn(
          "font-mono text-muted-foreground",
          size === "lg" ? "text-xs" : "text-[0.625rem]",
        )}
      >
        /100
      </span>
    </span>
  );
}

/** 20-segment gauge, 5 points per block. Reads like an instrument, not a chart. */
export function ScoreMeter({
  score,
  bandKey,
  segments = 20,
  className,
}: {
  score: number | null;
  bandKey: BandKey | null;
  segments?: number;
  className?: string;
}) {
  const filled =
    score === null ? 0 : Math.round((Math.max(0, Math.min(100, score)) / 100) * segments);
  return (
    <div
      className={cn("flex gap-[3px]", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score ?? 0}
      aria-label="Future runscore"
    >
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-3 flex-1 border",
            index < filled ? "border-transparent" : "border-border bg-transparent",
          )}
          style={
            index < filled && bandKey
              ? { backgroundColor: BAND_VAR[bandKey] }
              : undefined
          }
        />
      ))}
    </div>
  );
}

/** One dimension as a ten-block form field. */
export function DimensionReadout({
  dimensionKey,
  value,
}: {
  dimensionKey: DimensionKey;
  value: number;
}) {
  const dimension = DIMENSIONS.find((d) => d.key === dimensionKey);
  if (!dimension) return null;
  const filled = Math.max(0, Math.min(10, Math.round(value)));

  return (
    <div className="flex items-center gap-3">
      <span className="label w-[5.5rem] shrink-0 text-muted-foreground">
        {dimension.label}
        <span className="ml-1 text-[0.5rem] opacity-60">
          {Math.round(dimension.weight * 100)}
        </span>
      </span>
      <div className="flex flex-1 gap-[3px]" aria-hidden>
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-2.5 flex-1",
              index < filled
                ? dimension.inverse
                  ? "bg-foreground/40"
                  : "bg-foreground"
                : "bg-border/70",
            )}
          />
        ))}
      </div>
      <span className="num w-7 shrink-0 text-right text-[0.6875rem] text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function BandLadder({
  counts,
  activeKey,
  className,
}: {
  counts?: Record<BandKey, number>;
  activeKey?: BandKey | null;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {BANDS.map((band) => {
        const active = activeKey === band.key;
        return (
          <li
            key={band.key}
            className={cn(
              "flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0",
              active && "bg-accent/60",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-2"
                style={{ backgroundColor: BAND_VAR[band.key] }}
                aria-hidden
              />
              <span
                className={cn(
                  "label",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {band.label}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="num text-[0.625rem] text-muted-foreground">
                {band.min}–{band.max}
              </span>
              {counts && (
                <span className="num w-4 text-right text-xs">
                  {counts[band.key]}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function KindTag({ kind }: { kind: "human" | "agent" }) {
  return (
    <span
      className={cn(
        "label-sm inline-flex items-center gap-1 border px-1.5 py-0.5",
        kind === "agent"
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border text-muted-foreground",
      )}
    >
      {kind === "agent" ? "Agent" : "Human"}
    </span>
  );
}
