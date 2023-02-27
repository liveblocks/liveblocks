import type { ChildContext } from "./inference";
import { singular, ucFirst, words } from "./utils/strings";

export type ScoredNames = Record<string, number>;

// Name to use if a key only contains punctuation or whitespace
const FALLBACK_NAME = "Value";

// Base name assigned to field name that cannot be represented inside a schema definition
const INVALID_FIELD_NAME = "_____";

export function mergeScoredNames(a: ScoredNames, b: ScoredNames): ScoredNames {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const mergedEntries = Array.from(keys.values(), (key) => [
    key,
    (a[key] ?? 0) + (b[key] ?? 0),
  ]);
  return Object.fromEntries(mergedEntries);
}

// "gameFields" -> "GameField", "__TEST_DATA__" -> "TestData" etc.
function fieldToTypeName(fieldName: string): string {
  return (
    words(fieldName)
      .map((word) => singular(ucFirst(word)))
      .join("") || FALLBACK_NAME
  );
}

export function generateNames({ field, parent }: ChildContext): ScoredNames {
  const typeName = fieldToTypeName(field);

  const aliasEntries = Object.entries(parent.names)
    .map(
      ([name, score]) =>
        [
          // Data -> ScoreData, ScoreData -> GameScoreData etc.
          `${name}${typeName}`,
          score * 0.5,
        ] as const
    )
    // Only keep aliases with a score of at least 0.25 (= a depth of at most 3)
    // to avoid overly long names
    .filter(([, score]) => score >= 0.25);

  return mergeScoredNames({ [typeName]: 1 }, Object.fromEntries(aliasEntries));
}

export function invalidFieldName(n: number): string {
  if (n === 0) {
    return INVALID_FIELD_NAME;
  }

  // _____2, _____3, _____4 etc.
  return `${INVALID_FIELD_NAME}${n + 1}`;
}
