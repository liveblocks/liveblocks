export function xwarn(resp: Response, method: string, path: string): void {
  const message = resp.headers.get("X-LB-Warn");
  if (message) {
    const msg = `  ⚠ [Liveblocks] ${message} (${method} ${path})`;
    if (resp.ok) {
      console.warn(msg);
    } else {
      console.error(msg);
    }
  }
}
