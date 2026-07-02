// Preset one-tap remixes / feedback chips surfaced in the UI.
export const FEEDBACK_PRESETS = [
  {
    key: "bitter",
    label: "Too bitter",
    feedback: "The last brew was too bitter / harsh.",
  },
  {
    key: "sour",
    label: "Too sour",
    feedback: "The last brew was too sour / sharp.",
  },
  {
    key: "weak",
    label: "Too weak",
    feedback: "The last brew was too weak / watery.",
  },
  {
    key: "strong",
    label: "Too strong",
    feedback: "The last brew was too strong / intense.",
  },
  {
    key: "brighter",
    label: "Brighter",
    feedback: "Make a brighter version with more acidity and clarity.",
  },
  {
    key: "sweeter",
    label: "Sweeter",
    feedback: "Make a sweeter, rounder version with more body.",
  },
] as const;
