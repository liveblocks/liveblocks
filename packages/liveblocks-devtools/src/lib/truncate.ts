const MAX_LEN = 64;

export function truncate(s: string, len: number = MAX_LEN): string {
  return s.length > len + 3 ? s.substring(0, len) + "..." : s;
}
