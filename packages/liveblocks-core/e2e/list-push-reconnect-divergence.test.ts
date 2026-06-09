import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { withTimeout } from "../src/lib/utils";
import { prepareTestsConflicts, waitUntilStatus } from "./utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = 10_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting until ${description} (${timeoutMs}ms)`);
}

/**
 * Deterministic version of the offline.test.ts "client synchronizes offline
 * changes" scenario.
 *
 * The tricky case is an item that the server has already stored but that the
 * pushing client still considers pending (unacknowledged), because the client
 * never received the ack. On reconnect, the snapshot also carries a sibling
 * the other client appended in the meantime. The still-pending item must keep
 * its server position (before the sibling) on both clients, rather than being
 * optimistically bumped past it by its own re-sent push.
 */
test(
  "a pending push the server already stored keeps its server position after reconnect",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },
    async ({ root1, root2, room1, control }) => {
      const list1 = root1.get("list");
      const list2 = root2.get("list");

      // 1. Client A pushes P and flushes it to the server, but stalls its
      //    downlink first, so the server's ack/echo never reaches A before the
      //    connection drops: P is stored server-side (so B sees it) yet stays
      //    *pending* on A.
      list1.push("P");
      control.pauseIncomingA();
      control.flushSyncA();
      await waitUntil(
        () => [...list2].includes("P"),
        "Client B sees P (server stored it)"
      );

      // 2. A disconnects while P is still pending locally.
      room1.disconnect();

      // 3. B pushes Q; the server appends it after P.
      list2.push("Q");
      control.flushSyncB();
      await waitUntil(
        () => [...list2].join(",") === "P,Q",
        "Client B sees [P, Q]"
      );

      // 4. A reconnects. The snapshot carries both P and Q, and A re-sends its
      //    still-pending P. P is already stored server-side, so it must keep
      //    its server position (before Q) on both clients.
      room1.reconnect();

      await waitUntil(
        () => [...list1].length === 2 && [...list2].length === 2,
        "both clients have 2 items again"
      );

      // Let any acks settle.
      await sleep(500);

      // Both clients must agree on the server's order, [P, Q].
      expect(list1.toJSON()).toEqual(list2.toJSON());
      expect(list2.toJSON()).toEqual(["P", "Q"]);
    }
  )
);

/**
 * Same divergence, but reached *after* the snapshot reconcile, via a live op.
 *
 * After a reconnect, the snapshot reconcile itself adopts the server's
 * positions, but the re-sent pending push stays unacknowledged until the
 * server's ack lands. A remote sibling push arriving as a live op inside that
 * window triggers the optimistic tail-bump, which moves the pending push past
 * the sibling. The server already stored the push, so the re-send is acked
 * without a repositioning op, and the bump is never undone.
 *
 * In the wild this window is widened by large list items (their re-send is
 * slow to reach the server), which is why the bug shows up intermittently and
 * mostly with big payloads. The test simulates that slowness by stalling A's
 * uplink while the re-send sits on it.
 */
test(
  "a sibling pushed while a re-sent pending push awaits its ack keeps its server position",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },
    async ({ root1, root2, room1, control }) => {
      const list1 = root1.get("list");
      const list2 = root2.get("list");

      // 1. Client A pushes P and flushes it to the server, but stalls its
      //    downlink first, so the server's ack/echo never reaches A before the
      //    connection drops: P is stored server-side (so B sees it) yet stays
      //    *pending* on A.
      list1.push("P");
      control.pauseIncomingA();
      await control.flushA(); // Ensure client B sees P

      // 2. A reconnects, and we stall the fresh socket's uplink right after it
      //    connects: at that point its FETCH_STORAGE request is already out
      //    (sent synchronously on connect), but the snapshot needs a server
      //    round trip, so the reconcile hasn't run yet. The reconcile then
      //    puts the re-send of P on the stalled uplink instead of on the wire,
      //    keeping P pending. The reconcile signals completion through the
      //    storageDidLoad event.
      const reconciled$ = room1.events.storageDidLoad.waitUntil();
      room1.reconnect();
      await waitUntilStatus(room1, "connecting");
      await waitUntilStatus(room1, "connected");
      control.pauseA();
      await withTimeout(
        reconciled$,
        10_000,
        "Client A did not reconcile after reconnect within 10s"
      );

      // 3. B pushes Q. It reaches A as a live op while P is still pending.
      list2.push("Q");
      await control.flushB();

      // 4. Only now release P's re-send. P is already stored server-side, so
      //    it must keep its server position (before Q) on both clients.
      await control.flushA();

      // Let any acks settle. (flushA's beacon is confirmed by Client B, so it
      // says nothing about A having received its ack yet.)
      await sleep(500);

      // Both clients must agree on the server's order, [P, Q].
      expect(list2.toJSON()).toEqual(["P", "Q"]);
      expect(list1.toJSON()).toEqual(list2.toJSON());
    }
  )
);
