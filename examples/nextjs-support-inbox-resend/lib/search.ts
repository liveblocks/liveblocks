/**
 * Typo-tolerant search for the conversation list.
 *
 * Every word in the query has to be found somewhere in the text, either as a
 * plain substring (so partial words like "dupl" still work) or as a word that
 * is within a small edit distance ("diplicate" finds "duplicate"). The
 * tolerance scales with the length of the query word so short words stay
 * strict: 1 typo from 4 letters, 2 from 7, 3 from 11.
 */
export function fuzzyMatches(text: string, query: string): boolean {
  const haystack = text.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  let words: string[] | null = null;
  return terms.every((term) => {
    if (haystack.includes(term)) return true;
    const tolerance = typoTolerance(term);
    if (tolerance === 0) return false;
    words ??= haystack.split(/[^\p{L}\p{N}@.]+/u).filter(Boolean);
    return words.some((word) => isClose(word, term, tolerance));
  });
}

function typoTolerance(term: string) {
  if (term.length >= 11) return 3;
  if (term.length >= 7) return 2;
  if (term.length >= 4) return 1;
  return 0;
}

// A word is close to the term if the whole word, or its prefix of the same
// length (so typos in a partially typed word count too), is within the edit
// distance.
function isClose(word: string, term: string, tolerance: number) {
  if (Math.abs(word.length - term.length) <= tolerance) {
    if (editDistance(word, term, tolerance) <= tolerance) return true;
  }
  if (word.length > term.length) {
    return editDistance(word.slice(0, term.length), term, tolerance) <= tolerance;
  }
  return false;
}

// Edit distance where swapping two adjacent letters ("invioce") counts as one
// typo, like insertions, deletions and substitutions. Gives up early once the
// distance can't stay within `max`.
function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let twoBack: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        value = Math.min(value, twoBack[j - 2] + 1);
      }
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    twoBack = previous;
    previous = current;
  }
  return previous[b.length];
}
