const seenWarnings = new Set<string>();

function warnOnce(message: string | undefined, key = message): void {
  if (key && !seenWarnings.has(key)) {
    seenWarnings.add(key);
    console.warn(`  ⚠ [Liveblocks] ${message ?? key}`);
  }
}

export function xwarn(resp: Response): void {
  const message = resp.headers.get("X-LB-Warn");
  if (message) {
    const key = resp.headers.get("X-LB-Warn-Key") ?? message;
    warnOnce(message, key);
  }
}
