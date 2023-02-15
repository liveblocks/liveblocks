import original_didyoumean from "didyoumean";

/**
 * Wrap didyoumean to avoid dealing with all these different possible return
 * values, and unify it to just outputting a single array.
 */
export function didyoumean(value: string, alternatives: string[]): string[] {
  const output = original_didyoumean(value, alternatives);
  if (!output) {
    return [];
  } else if (Array.isArray(output)) {
    return output;
  } else {
    return [output];
  }
}
