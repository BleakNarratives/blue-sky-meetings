/**
 * The Future Runscore.
 *
 * A single 0–100 reading of whether an unannounced idea could survive being
 * run in the future. Four dimensions, fixed weights, no hidden tuning.
 *
 *   Novelty  25% — has this been said before?
 *   Warrant  35% — what stands behind the claim?
 *   Reach    20% — can it touch anything that already exists?
 *   Drag     20% — what does it cost to move? (inverse: high drag is bad)
 *
 * Assessments are scored 0–10 per dimension. A runscore is the mean of every
 * assessment attached to the idea, so a single confident voice cannot
 * manufacture a high number.
 */

export const RUNSCORE_WEIGHTS = {
  novelty: 0.25,
  warrant: 0.35,
  reach: 0.2,
  drag: 0.2,
} as const;

export type DimensionKey = keyof typeof RUNSCORE_WEIGHTS;

export type Dimensions = {
  novelty: number;
  warrant: number;
  reach: number;
  drag: number;
};

export const DIMENSIONS: ReadonlyArray<{
  key: DimensionKey;
  label: string;
  weight: number;
  question: string;
  low: string;
  high: string;
  inverse: boolean;
  hint: string;
}> = [
  {
    key: "novelty",
    label: "Novelty",
    weight: RUNSCORE_WEIGHTS.novelty,
    question: "Has this been said before?",
    low: "Heard it",
    high: "Unclaimed",
    inverse: false,
    hint: "Room talk is pre-announcement. If the idea already exists in public, it is not new here.",
  },
  {
    key: "warrant",
    label: "Warrant",
    weight: RUNSCORE_WEIGHTS.warrant,
    question: "What stands behind the claim?",
    low: "Assertion",
    high: "Evidence",
    inverse: false,
    hint: "Warrant is the heaviest dimension on purpose. Confidence is not evidence.",
  },
  {
    key: "reach",
    label: "Reach",
    weight: RUNSCORE_WEIGHTS.reach,
    question: "Can it touch anything that already exists?",
    low: "Isolated",
    high: "Connected",
    inverse: false,
    hint: "An idea with no contact surface with the ecosystem is a thought, not a run.",
  },
  {
    key: "drag",
    label: "Drag",
    weight: RUNSCORE_WEIGHTS.drag,
    question: "What does it cost to move?",
    low: "Light",
    high: "Immovable",
    inverse: true,
    hint: "Scored as resistance: rewrite everything = high drag. The runscore subtracts it.",
  },
];

export type BandKey = "dormant" | "provisional" | "viable" | "runaway";

export const BANDS: ReadonlyArray<{
  key: BandKey;
  label: string;
  min: number;
  max: number;
  blurb: string;
}> = [
  {
    key: "dormant",
    label: "Dormant",
    min: 0,
    max: 39,
    blurb: "In the room. No case made yet.",
  },
  {
    key: "provisional",
    label: "Provisional",
    min: 40,
    max: 64,
    blurb: "A case exists. Untested.",
  },
  {
    key: "viable",
    label: "Viable",
    min: 65,
    max: 84,
    blurb: "Worth a build attempt.",
  },
  {
    key: "runaway",
    label: "Runaway",
    min: 85,
    max: 100,
    blurb: "Would survive contact.",
  },
];

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, Math.round(value)));
}

/** Weighted 0–100 runscore from one or more sets of dimensions. */
export function computeRunscore(dimensions: Dimensions): number {
  const raw =
    dimensions.novelty * RUNSCORE_WEIGHTS.novelty +
    dimensions.warrant * RUNSCORE_WEIGHTS.warrant +
    dimensions.reach * RUNSCORE_WEIGHTS.reach +
    (10 - dimensions.drag) * RUNSCORE_WEIGHTS.drag;

  return Math.round(raw * 10 * 10) / 10;
}

export function bandFor(score: number): (typeof BANDS)[number] {
  // Threshold lookup, not range matching: scores are rounded to one decimal,
  // so a range test would leave 84.5 homeless between bands.
  const clamped = Math.max(0, Math.min(100, score));
  const found = [...BANDS].reverse().find((band) => clamped >= band.min);
  return found ?? BANDS[0];
}

export function averageDimensions(list: Dimensions[]): Dimensions | null {
  if (list.length === 0) return null;
  const total = list.reduce(
    (acc, item) => ({
      novelty: acc.novelty + item.novelty,
      warrant: acc.warrant + item.warrant,
      reach: acc.reach + item.reach,
      drag: acc.drag + item.drag,
    }),
    { novelty: 0, warrant: 0, reach: 0, drag: 0 },
  );
  const n = list.length;
  return {
    novelty: total.novelty / n,
    warrant: total.warrant / n,
    reach: total.reach / n,
    drag: total.drag / n,
  };
}

/** Mean runscore across every assessment, or null when nothing is scored. */
export function aggregateRunscore(
  list: Dimensions[],
): { score: number; band: (typeof BANDS)[number]; dimensions: Dimensions } | null {
  const dimensions = averageDimensions(list);
  if (!dimensions) return null;
  const score = computeRunscore(dimensions);
  return { score, band: bandFor(score), dimensions };
}

export const BAND_VAR: Record<BandKey, string> = {
  dormant: "var(--band-dormant)",
  provisional: "var(--band-provisional)",
  viable: "var(--band-viable)",
  runaway: "var(--band-runaway)",
};
