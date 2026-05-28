/**
 * A drop-in WebSocket that records every frame it sends and receives into a
 * bounded in-page ring buffer (`window.__lbTrace`). The e2e tests dump this
 * buffer when a (often flaky, timing-related) assertion fails, so CI logs show
 * the exact client/server protocol exchange that led to the failure — without
 * needing to reproduce it.
 *
 * Only used by the e2e sandbox app; never shipped.
 */

export type TraceEntry = {
  /** ms since the page loaded */
  t: number;
  dir: "open" | "send" | "recv" | "close";
  raw: string;
};

const TRACE_MAX = 2000; // keep at most this many frames (ring buffer)
const RAW_MAX = 4000; // truncate each frame to this many chars

function record(dir: TraceEntry["dir"], raw: string): void {
  const w = globalThis as unknown as { __lbTrace?: TraceEntry[] };
  const buf = (w.__lbTrace ??= []);
  buf.push({
    t: Math.round(performance.now()),
    dir,
    raw: raw.length > RAW_MAX ? raw.slice(0, RAW_MAX) + "…(truncated)" : raw,
  });
  if (buf.length > TRACE_MAX) {
    buf.shift();
  }
}

// `class extends WebSocket` would throw during SSR where WebSocket is
// undefined, so only define it in the browser. createClient falls back to the
// platform WebSocket when this is undefined.
export const RecordingWebSocket =
  typeof WebSocket === "undefined"
    ? undefined
    : class RecordingWebSocket extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          record("open", String(url));
          this.addEventListener("message", (e: MessageEvent) => {
            record("recv", typeof e.data === "string" ? e.data : "<binary>");
          });
          this.addEventListener("close", (e: CloseEvent) => {
            record("close", `code=${e.code}${e.reason ? ` ${e.reason}` : ""}`);
          });
        }

        send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
          record("send", typeof data === "string" ? data : "<binary>");
          super.send(data);
        }
      };
