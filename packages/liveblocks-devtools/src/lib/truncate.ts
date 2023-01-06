const MAX_LENGTH = 64;

export function truncate(string: string, length: number = MAX_LENGTH): string {
  return string.length > length + 3
    ? string.substring(0, length) + "…"
    : string;
}
