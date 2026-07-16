import type { IServerWebSocket, SessionKey } from "@liveblocks/server";
import { Room } from "@liveblocks/server";
import type { WebSocket } from "ws";

/**
 * Collect async hook side-effects without blocking the main path.
 * Room APIs require a defer callback whenever hooks return promises.
 */
function defer(promise: Promise<void>): void {
  void promise.catch((err: unknown) => {
    console.error("[room] deferred side-effect failed", err);
  });
}

/**
 * Adapt a `ws` WebSocket to the Liveblocks server socket interface.
 */
function adaptSocket(ws: WebSocket): IServerWebSocket {
  return {
    send(msg: string | ArrayBuffer): number {
      if (ws.readyState !== ws.OPEN) return 0;
      try {
        ws.send(msg);
        return typeof msg === "string" ? msg.length : msg.byteLength;
      } catch {
        return 0;
      }
    },
    close(code: number, reason?: string): void {
      try {
        ws.close(code, reason);
      } catch {
        // ignore
      }
    },
  };
}

/** One in-memory room for the demo. */
const room = new Room("storage-demo", {
  // Verbose ROOM_STATE / op logging while wiring the demo
  enableDebugLogging: process.env.DEBUG_ROOM === "1",
});

const sessions = new Map<WebSocket, SessionKey>();

export function register(ws: WebSocket): void {
  const ticket = room.createTicket({
    // Full write access for the demo (default is already room:write)
    scopes: ["room:write"],
    info: { name: `user-${crypto.randomUUID().slice(0, 6)}` },
  });

  const socket = adaptSocket(ws);
  room.startBrowserSession(ticket, socket, undefined, defer);
  sessions.set(ws, ticket.sessionKey);

  console.log(
    `[room] session started actor=${ticket.actor} sessions=${room.numSessions}`
  );
}

export function unregister(ws: WebSocket): void {
  const key = sessions.get(ws);
  if (key === undefined) return;
  sessions.delete(ws);

  room.endBrowserSession(key, 1000, "client disconnected", undefined, defer);
  console.log(`[room] session ended sessions=${room.numSessions}`);
}

export async function handleMessage(
  ws: WebSocket,
  data: string
): Promise<void> {
  const key = sessions.get(ws);
  if (key === undefined) return;

  try {
    await room.handleData(key, data, undefined, defer);
  } catch (err) {
    console.error("[room] handleData error", err);
  }
}

/** Expose the room for debugging / later test hooks. */
export { room };
