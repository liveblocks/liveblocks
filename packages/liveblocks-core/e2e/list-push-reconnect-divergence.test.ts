import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

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
 * Deterministic reproduction of the offline.test.ts "client synchronizes
 * offline changes" divergence.
 *
 * The trigger is an item that the server has already stored but that the
 * pushing client still considers pending (unacknowledged), because the client
 * never received the ack. On reconnect, the client's optimistic tail-bump
 * moves that pending push past a sibling the other client added, re-sends it at
 * its original key, and the server bare-acks it (already stored, no
 * reposition), so the bump is never undone. The two clients then disagree on
 * the order.
 */
test(
  "a pending push the server already stored keeps its server position after reconnect",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },
    async ({ root1, root2, room1, control }) => {
      const list1 = root1.get("list");
      const list2 = root2.get("list");

      // 1. Client A pushes P and flushes it to the server, but drops every
      //    incoming message first, so the server's ack/echo never reaches A: P
      //    is stored server-side (so B sees it) yet stays *pending* on A.
      list1.push("P");
      control.dropIncomingA();
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

      // 4. A reconnects. The snapshot carries both P and Q; A's tail-bump moves
      //    its still-pending P past Q, then re-sends P at its original key. The
      //    server bare-acks (P already there), so A's bump is never undone.
      room1.reconnect();

      await waitUntil(
        () => [...list1].length === 2 && [...list2].length === 2,
        "both clients have 2 items again"
      );

      // Let any acks settle.
      await sleep(500);

      // Both clients must agree on the server's order, [P, Q].
      expect([...list1]).toEqual([...list2]);
      expect([...list2]).toEqual(["P", "Q"]);
    }
  )
);
