const WORDS_REGEX =
  /\p{Lu}\p{Ll}+|\p{Lu}+(?=\p{Ll}\p{Lu})|\p{Lu}+|\p{Ll}+|\p{N}+/gu;

export function words(str: string): string[] {
  return str.match(WORDS_REGEX) ?? [];
}

export function ucFirst(str: string): string {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

export { singular } from "pluralize";
