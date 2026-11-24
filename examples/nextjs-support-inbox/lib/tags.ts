// Tags are free-form labels on a conversation (`metadata.tags`). Agents can
// pick from these suggestions, from tags already used in the inbox, or type a
// new one.

export const SUGGESTED_TAGS = [
  "Bug",
  "Dashboard & Admin",
  "API",
  "Billing",
  "Onboarding",
  "Integrations",
  "Enterprise",
  "Churn risk",
  "Unknowns",
];

export const MAX_TAG_LENGTH = 32;

// Trims and collapses whitespace; returns "" when nothing usable is left.
export function normalizeTag(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
}

// Case-insensitive lookup so "api" reuses an existing "API" tag.
export function findTag(tags: string[], candidate: string) {
  const needle = candidate.toLowerCase();
  return tags.find((tag) => tag.toLowerCase() === needle);
}
