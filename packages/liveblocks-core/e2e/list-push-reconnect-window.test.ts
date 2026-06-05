import { expect, test } from "vitest";
import WebSocket from "ws";

import { nanoid } from "../src";
import { createClient } from "../src/client";
import { LiveList } from "../src/crdts/LiveList";
import { withTimeout } from "../src/lib/utils";
import type { Room } from "../src/room";

const BASE_URL = `http://localhost:${process.env.LIVEBLOCKS_DEV_SERVER_PORT ?? 1154}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UPDATE_STORAGE = 201; // ClientMsgCode.UPDATE_STORAGE

type S = { list: LiveList<string> };

async function waitUntil(pred: () => boolean, what: string, ms = 20_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return;
    await sleep(20);
  }
  throw new Error(`timeout: ${what}`);
}

function isUpdateStorage(data: string): boolean {
  try {
    const msgs = JSON.parse(data);
    return Array.isArray(msgs) && msgs.some((m) => m?.type === UPDATE_STORAGE);
  } catch {
    return false;
  }
}

/**
 * A client whose socket can drop all incoming frames (to keep an op pending)
 * and hold its outgoing UPDATE_STORAGE frames (to delay a re-sent op's ack).
 */
function makeActor(roomId: string, isInitiator: boolean) {
  let holding = false;
  let latest: Ctl | null = null;
  const held: { socket: WebSocket; data: string }[] = [];

  // `dropping` is per-socket so a reconnect gets a fresh socket that receives
  // again, while the disconnected socket keeps swallowing P's ack.
  class Ctl extends WebSocket {
    dropping = false;
    constructor(address: string | URL) {
      super(address);
      latest = this; // eslint-disable-line @typescript-eslint/no-this-alias
    }
    send(data: string) {
      if (holding && isUpdateStorage(data)) held.push({ socket: this, data });
      else super.send(data);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string | symbol, ...args: any[]): boolean {
      if (this.dropping && event === "message") return false;
      return super.emit(event, ...args);
    }
  }

  const client = createClient({
    __DANGEROUSLY_disableThrottling: true,
    publicApiKey: "pk_localdev",
    polyfills: { WebSocket: Ctl },
    baseUrl: BASE_URL,
  });
  const { room, leave } = client.enterRoom<Record<string, never>, S, never>(
    roomId,
    {
      initialPresence: {},
      initialStorage: (isInitiator ? { list: new LiveList<string>([]) } : {}) as S,
    } as never
  );
  return {
    room: room as unknown as Room<Record<string, never>, S>,
    leave,
    /** Swallow every frame the server sends on the current socket. */
    dropIncoming() {
      if (latest) latest.dropping = true;
    },
    /** Start buffering outgoing UPDATE_STORAGE frames instead of sending them. */
    holdUpdates() {
      holding = true;
    },
    /** Send everything buffered by holdUpdates(), and stop buffering. */
    releaseUpdates() {
      holding = false;
      for (const { socket, data } of held.splice(0)) {
        WebSocket.prototype.send.call(socket, data);
      }
    },
  };
}

async function connected(room: Room<Record<string, never>, S>) {
  if (room.getStatus() === "connected") return;
  await withTimeout(
    room.events.status.waitUntil((s) => s === "connected"),
    20_000,
    "connect"
  );
}

// A pushes P, then loses connection before the ack (P stays pending, but the
// server stored it). On reconnect, P is re-sent. If a sibling push Q arrives as
// a *live* op before P's re-send is acked, A's optimistic tail-bump moves P
// after Q — and the server's bare-ack of the re-sent P never undoes it. The two
// clients then disagree on the order forever.
//
// This is the same failure as list-push-reconnect-divergence, but reached
// *after* the snapshot reconcile (a live op), so the `fromSnapshot` guard added
// in #3490 does not cover it.
test(
  "a sibling pushed during the post-reconnect window must not permanently reorder a re-sent push",
  { timeout: 120_000 },
  async () => {
    const roomId = "e2e-reconnect-window-" + nanoid();
    const A = makeActor(roomId, true);
    const B = makeActor(roomId, false);
    await Promise.all([connected(A.room), connected(B.room)]);
    const listA = (await A.room.getStorage()).root.get("list");
    const listB = (await B.room.getStorage()).root.get("list");
    await sleep(250);

    // 1. A pushes P but drops its incoming, so the ack never lands: P stays
    //    pending on A while the server stores it (B sees it).
    A.dropIncoming();
    listA.push("P");
    await waitUntil(() => listB.length === 1, "B sees P");

    // 2. A reconnects, holding its outgoing re-send so P's bare-ack can't arrive
    //    yet. The snapshot reconcile runs first (no bump — guarded by #3490).
    A.holdUpdates();
    A.room.reconnect();
    await connected(A.room);
    await sleep(200); // let applyAndSendOfflineOps run (its re-send is held)

    // 3. B pushes Q. It reaches A as a live op while P is still pending, so A's
    //    bump moves P behind Q.
    listB.push("Q");
    await waitUntil(() => listA.length === 2, "A receives Q live");

    // 4. Release P's re-send -> the server bare-acks it -> the bump is not undone.
    A.releaseUpdates();
    await waitUntil(() => listB.length === 2, "B has 2 items");
    await sleep(1200);

    const a = [...listA];
    const b = [...listB];
    A.leave();
    B.leave();

    expect(a, `A=[${a}] B=[${b}]`).toEqual(b);
  }
);
