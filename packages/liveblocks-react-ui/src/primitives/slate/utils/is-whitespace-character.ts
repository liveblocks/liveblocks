const WHITESPACE_REGEX = /\s/;

export function isWhitespaceCharacter(character?: string): boolean {
  return character ? WHITESPACE_REGEX.test(character) : false;
}
