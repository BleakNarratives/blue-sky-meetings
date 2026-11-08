/**
 * The protocol of a Blue Sky Meeting.
 *
 * Three stages, in order. The floor opens before anything is graded, and
 * nothing is assigned until a human authorizes it. Stages move one step at
 * a time, in either direction — they are increments, not a scoreboard.
 */

export const STAGES = [
  {
    key: "open",
    index: "01",
    label: "Open floor",
    short: "Open",
    blurb:
      "Everyone gets a turn before anything is judged. Fragments, problems, jokes, ridiculous proposals — all of it goes down.",
    rule: "Nothing is scored yet.",
    action: "Close the floor",
  },
  {
    key: "assessment",
    index: "02",
    label: "Assessment",
    short: "Assessing",
    blurb:
      "The floor is closed. Every contribution gets the same reading: same four dimensions, same weights, same chance to be taken seriously.",
    rule: "Scoring is open. No assignments yet.",
    action: "Authorize",
  },
  {
    key: "authorized",
    index: "03",
    label: "Authorized",
    short: "Authorized",
    blurb:
      "You have decided what deserves resources. Work can now be assigned — by demonstrated ability, not by who spoke first.",
    rule: "Assignment and execution are allowed.",
    action: null,
  },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

const STAGE_KEYS = STAGES.map((stage) => stage.key);

export function normaliseStage(stage: string | undefined | null): Stage {
  return STAGE_KEYS.includes(stage as Stage) ? (stage as Stage) : "open";
}

export function stageMeta(stage: string | undefined | null) {
  const key = normaliseStage(stage);
  return STAGES.find((entry) => entry.key === key) ?? STAGES[0];
}

export function stageNumber(stage: string | undefined | null): number {
  return STAGE_KEYS.indexOf(normaliseStage(stage)) + 1;
}

export type Capability = "contribute" | "score" | "assign" | "authorize";

/** Is a given move allowed at this point in the meeting? */
export function allows(stage: string | undefined | null, capability: Capability) {
  const key = normaliseStage(stage);
  switch (capability) {
    case "contribute":
      return key === "open";
    case "score":
      return key === "assessment" || key === "authorized";
    case "assign":
      return key === "authorized";
    case "authorize":
      return key === "assessment";
  }
}

export function nextStage(stage: string | undefined | null): Stage | null {
  const index = STAGE_KEYS.indexOf(normaliseStage(stage));
  return index >= 0 && index < STAGE_KEYS.length - 1 ? STAGE_KEYS[index + 1] : null;
}

export function previousStage(stage: string | undefined | null): Stage | null {
  const index = STAGE_KEYS.indexOf(normaliseStage(stage));
  return index > 0 ? STAGE_KEYS[index - 1] : null;
}

/**
 * What kind of thing is on the table. Kept deliberately broad: the room is
 * for whatever someone walked in carrying, including a name or a slogan.
 */
export const TRACKS = [
  {
    key: "concept",
    label: "Concept",
    hint: "An idea, a system, or a way of doing something.",
  },
  {
    key: "brand",
    label: "Brand",
    hint: "A name, a slogan, a tone, a visual direction.",
  },
  {
    key: "market",
    label: "Market",
    hint: "A response, an offer, a way in.",
  },
  {
    key: "wild",
    label: "Wildcard",
    hint: "It might be ridiculous. Ridiculous is allowed.",
  },
] as const;

export type Track = (typeof TRACKS)[number]["key"];

export function trackMeta(track: string | undefined | null) {
  return TRACKS.find((entry) => entry.key === track) ?? TRACKS[0];
}
