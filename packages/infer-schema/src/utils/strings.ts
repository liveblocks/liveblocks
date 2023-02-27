// Matches all "words" in a string, excluding whitespace and punctuation.
// Word boundaries are determined either the presence of punctuation (= non letter/number character),
// a change in case, or a number. For example, "fooBar" and "foo_bar" are both considered
// two words.
// \p{Lu} = Uppercase letter, \p{Ll} = Lowercase letter, \p{N} = Number
const WORDS_REGEX =
  /\p{Lu}\p{Ll}+|\p{Lu}+(?=\p{Ll}\p{Lu})|\p{Lu}+|\p{Ll}+|\p{N}+/gu;

export function words(str: string): string[] {
  return str.match(WORDS_REGEX) ?? [];
}

// Changes the casing of a work to be upper case in a unicode aware way.
// Definitely not perfect, but would work for most languages.
export function ucFirst(str: string): string {
  return (
    str
      .toLocaleLowerCase()
      // \p{CWU} = Changes when uppercased
      .replace(/^\p{CWU}/u, (char) => char.toLocaleUpperCase())
  );
}

export { singular } from "pluralize";

export function naiveQuote(str: string): string {
  // Purposefully not escaping quotes inside the string here to match typescripts behavior
  // and to make it easier to read.
  return `'${str}'`;
}

export function escapeNewlines(str: string): string {
  return str.replace(/\n/g, "\\n");
}
