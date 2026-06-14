import { describe, expect, test } from "vitest";

import { kInternal } from "../../internal";
import { nn } from "../../lib/assert";
import { OpCode } from "../../protocol/Op";
import type { UpdateTextOp } from "../../protocol/Op";
import { createManagedPool } from "../AbstractCrdt";
import { LiveText } from "../LiveText";

/**
 * Helper: build a LiveText attached to a pool that captures the wire ops it
 * dispatches, so tests can fabricate matching acks via `_apply(_, false)`.
 */
function attachedLiveText(initial: string): {
  text: LiveText;
  dispatched: UpdateTextOp[];
} {
  const dispatched: UpdateTextOp[] = [];
  const pool = createManagedPool("room", {
    getCurrentConnectionId: () => 0,
    onDispatch: (ops) => {
      for (const op of ops) {
        if (op.type === OpCode.UPDATE_TEXT) {
          dispatched.push(op);
        }
      }
    },
  });
  const text = new LiveText(initial);
  text._attach("0:1", pool);
  return { text, dispatched };
}

/** Build the server-side ack matching the latest dispatched local op. */
function ackOp(dispatched: UpdateTextOp[], ackedVersion: number): UpdateTextOp {
  const last = nn(dispatched.at(-1), "Expected a dispatched local op");
  return {
    type: OpCode.UPDATE_TEXT,
    id: last.id,
    opId: nn(last.opId, "Local ops must carry an opId"),
    baseVersion: last.baseVersion,
    version: ackedVersion,
    ops: [...last.ops],
  };
}

// ============================================================================
// _encodeIndex
// ============================================================================

describe("LiveText[kInternal].encodeIndex", () => {
  test("returns the index unchanged at version 0 when there are no pending ops", () => {
    const text = new LiveText("Hello");
    expect(text[kInternal].encodeIndex(3)).toBe(3);
  });

  test("clamps the index into [0, length]", () => {
    const text = new LiveText("Hi");
    expect(text[kInternal].encodeIndex(-10)).toBe(0);
    expect(text[kInternal].encodeIndex(999)).toBe(2);
  });

  test("inverse-maps a cursor placed after an in-flight insert", () => {
    const { text } = attachedLiveText("Hello");
    text.insert(5, " world"); // in-flight: insert " world" at 5 (len 6)
    expect(text.toString()).toBe("Hello world");

    // CM cursor at offset 11 (end, just past " world") should encode to
    // offset 5 in #confirmed coords (just past "Hello").
    expect(text[kInternal].encodeIndex(11)).toBe(5);
  });

  test("a cursor positioned before an in-flight insert encodes unchanged", () => {
    const { text } = attachedLiveText("Hello");
    text.insert(5, " world");

    expect(text[kInternal].encodeIndex(3)).toBe(3);
  });

  test("a cursor inside an in-flight insert collapses to the insertion point", () => {
    const { text } = attachedLiveText("Hello");
    text.insert(2, "XYZ");
    // #segments = "HeXYZllo"; positions 2..5 are inside the insertion.
    expect(text[kInternal].encodeIndex(2)).toBe(2);
    expect(text[kInternal].encodeIndex(3)).toBe(2);
    expect(text[kInternal].encodeIndex(4)).toBe(2);
    expect(text[kInternal].encodeIndex(5)).toBe(2);
  });

  test("inverse-maps through both in-flight and queued ops", () => {
    const { text } = attachedLiveText("Hello");
    text.insert(5, "!"); // in-flight: insert "!" at 5
    text.insert(0, "X"); // queued: insert "X" at 0 (applied on top of "Hello!")
    expect(text.toString()).toBe("XHello!");

    // CM cursor at 7 ("XHello!|") should encode to 5 in #confirmed coords.
    // Undo queued first (insert "X" at 0): 7 → 6 (shift left by 1).
    // Undo in-flight (insert "!" at 5): 6 → max(5, 6-1) = 5.
    expect(text[kInternal].encodeIndex(7)).toBe(5);

    // CM cursor at 1 ("X|Hello!") should encode to 0 in #confirmed coords.
    // Undo queued first: 1 → max(0, 1-1) = 0. Undo in-flight: 0 ≤ 5 → 0.
    expect(text[kInternal].encodeIndex(1)).toBe(0);
  });

  test("does not change the reported version on the LiveText node", () => {
    const { text, dispatched } = attachedLiveText("Hello");
    text.insert(5, "!");
    text._apply(ackOp(dispatched, 1), false);

    expect(text.version).toBe(1);
    expect(text[kInternal].encodeIndex(6)).toBe(6);
  });
});

// ============================================================================
// _decodeIndex
// ============================================================================

describe("LiveText[kInternal].decodeIndex", () => {
  test("returns the index unchanged when fromVersion equals current and no pending", () => {
    const text = new LiveText("Hello");
    expect(text[kInternal].decodeIndex(3, 0)).toBe(3);
  });

  test("returns null when fromVersion is ahead of the current version", () => {
    const text = new LiveText("Hello");
    expect(text[kInternal].decodeIndex(3, 5)).toBeNull();
  });

  test("returns null when fromVersion is older than retained accepted-ops history", () => {
    const { text } = attachedLiveText("Hello");
    // Apply two remote ops to advance the version to 2.
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 5, text: "!" }],
      },
      false
    );
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 6, text: "?" }],
      },
      false
    );
    expect(text.version).toBe(2);
    // fromVersion = 5 is in the future → null (covered by the ahead branch).
    expect(text[kInternal].decodeIndex(0, 5)).toBeNull();
    // fromVersion = 0 should still be reachable: oldest entry is at version 1
    // which is ≤ fromVersion + 1.
    expect(text[kInternal].decodeIndex(0, 0)).not.toBeNull();
  });

  test("clamps the result into [0, length]", () => {
    const text = new LiveText("Hi");
    expect(text[kInternal].decodeIndex(-5, 0)).toBe(0);
    expect(text[kInternal].decodeIndex(999, 0)).toBe(2);
  });

  test("forwards an index from an older confirmed version through accepted ops", () => {
    const { text } = attachedLiveText("Hello");
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "Z" }],
      },
      false
    );
    // A peer broadcast at version 0 with index 3 ("Hel|lo"). After our
    // accepted insert of "Z" at 0, the same logical position is at offset 4
    // in "ZHello".
    expect(text[kInternal].decodeIndex(3, 0)).toBe(4);
  });

  test("forwards an index through local pending ops on top of the cross-version pass", () => {
    const { text, dispatched } = attachedLiveText("Hello");
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "Z" }],
      },
      false
    );
    expect(text.toString()).toBe("ZHello");

    text.insert(0, "Q"); // in-flight: "QZHello"
    text.insert(7, "!"); // queued: "QZHello!"
    expect(text.toString()).toBe("QZHello!");

    // Peer broadcast at version 0, index 3 ("Hel|lo").
    // - Cross-version pass (accepted insert Z at 0): 3 → 4.
    // - Local in-flight (insert Q at 0): 4 → 5.
    // - Local queued (insert ! at 7): 5 (5 < 7, unchanged).
    expect(text[kInternal].decodeIndex(3, 0)).toBe(5);

    // Acknowledge the in-flight Q insert and verify decoding behaviour is
    // stable across the ack (Q moved from in-flight into #confirmed; the
    // queued ! becomes the next in-flight).
    text._apply(ackOp(dispatched, 2), false);
    expect(text.version).toBe(2);
    // Now: cross-version (versions 1 and 2): version 1 has insert Z at 0 → 3
    // becomes 4. Version 2 records the local Q ack as empty ops (own ack), so
    // no shift there. Then local pending = [insert ! at 7] → 4 stays at 4.
    expect(text[kInternal].decodeIndex(3, 0)).toBe(4);
  });

  test("own acks are recorded as empty ops and do not shift decoded positions", () => {
    const { text, dispatched } = attachedLiveText("Hello");
    text.insert(0, "A");
    text._apply(ackOp(dispatched, 1), false);

    expect(text.version).toBe(1);
    // A peer at version 0 broadcasts index 3 ("Hel|lo"). On our side, the
    // local insert of "A" was acked as a server-ordered op with no remote
    // ops happening — #acceptedOps records empty ops for this ack. The peer
    // simply hasn't seen our edit yet, so their index is in the old
    // confirmed coords; we should NOT shift it. (When the peer eventually
    // receives our edit, their CM transaction will do the local mapping.)
    expect(text[kInternal].decodeIndex(3, 0)).toBe(3);
  });

  test("decoding the peer's broadcast version returns the result through local pending only", () => {
    const { text } = attachedLiveText("Hello");
    text.insert(2, "_");
    expect(text.toString()).toBe("He_llo");

    // Peer at the same version 0 broadcasts index 4 ("Hell|o"). We have an
    // in-flight insert of "_" at 2, which shifts everything past 2 to the
    // right by one in our local view.
    expect(text[kInternal].decodeIndex(4, 0)).toBe(5);
  });
});

// ============================================================================
// Round-trip + end-to-end
// ============================================================================

describe("LiveText encode/decode pair", () => {
  test("encode then decode on the same instance round-trips outside pending insertion boundaries", () => {
    const { text } = attachedLiveText("Hello world");
    text.insert(5, "!");
    // CM doc is "Hello! world" (length 12). The insert occupies CM range
    // [5, 6]; positions inside or exactly on either edge are subject to the
    // OT assoc ambiguity (encode collapses leftward, decode shifts rightward).
    // Positions strictly outside [5, 6] round-trip exactly.
    for (const index of [0, 1, 4, 7, 8, 11, 12]) {
      const encoded = text[kInternal].encodeIndex(index);
      const decoded = text[kInternal].decodeIndex(encoded, text.version);
      expect(decoded).toBe(index);
    }
  });

  test("encoded position lands at the same logical location on a peer with identical state", () => {
    // Two LiveTexts at the same version with no pending: any encoded index
    // should decode to itself on the peer.
    const sender = new LiveText("Hello world");
    const receiver = new LiveText("Hello world");
    const encoded = sender[kInternal].encodeIndex(6);
    expect(receiver[kInternal].decodeIndex(encoded, sender.version)).toBe(6);
  });

  test("end-to-end convergence: sender's pending insert + receiver's pending insert", () => {
    // Both clients start synced. Each types something locally before any ack.
    // The sender broadcasts an encoded cursor positioned after their typing;
    // the receiver decodes through their own pending state. Then both ops
    // ack in some server order. After both clients have integrated each
    // other's ops, the receiver's stored cursor for the sender (after
    // running through subsequent local mappings) should match where the
    // sender's CM cursor logically is.

    const { text: sender, dispatched: senderDispatched } =
      attachedLiveText("ABCDE");
    const { text: receiver, dispatched: receiverDispatched } =
      attachedLiveText("ABCDE");

    // Sender types "1" at position 0; their cursor sits at position 4
    // (between C and D) in "1ABCDE".
    sender.insert(0, "1");
    expect(sender.toString()).toBe("1ABCDE");
    const senderCursorCm = 4;

    // Receiver types "9" at position 5; their cursor sits at 0.
    receiver.insert(5, "9");
    expect(receiver.toString()).toBe("ABCDE9");

    // Sender encodes and broadcasts.
    const broadcastIndex = sender[kInternal].encodeIndex(senderCursorCm);
    const broadcastVersion = sender.version;
    expect(broadcastIndex).toBe(3);
    expect(broadcastVersion).toBe(0);

    // Receiver decodes against their current state (pending insert of "9").
    // index 3 is below 5, so the receiver's pending insert of "9" at 5
    // leaves it unchanged.
    const decodedNow = receiver[kInternal].decodeIndex(
      broadcastIndex,
      broadcastVersion
    );
    expect(decodedNow).toBe(3);
    // Position 3 in "ABCDE9" is between C and D — matches the sender's
    // logical position.

    // Now sync ops. Server orders sender's first (version 1), then
    // receiver's (version 2, server-rebased to insert "9" at position 6 in
    // the version-1 doc "1ABCDE").
    receiver._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "1" }],
      },
      false
    );
    expect(receiver.toString()).toBe("1ABCDE9");
    // The server delivers the receiver's own ack in server-rebased form:
    // their original insert "9" at 5 was shifted to "9" at 6 after the
    // server applied the sender's insert "1" at 0 first.
    receiver._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        opId: nn(receiverDispatched.at(-1)?.opId),
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 6, text: "9" }],
      },
      false
    );
    expect(receiver.toString()).toBe("1ABCDE9");
    expect(receiver.version).toBe(2);

    // The receiver now decodes the same broadcast (still anchored at
    // version 0). The decode should put the sender's cursor at position 4
    // in "1ABCDE9" — between C and D. That's the same logical place.
    const decodedAfterSync = receiver[kInternal].decodeIndex(
      broadcastIndex,
      broadcastVersion
    );
    expect(decodedAfterSync).toBe(4);

    // Sender acks their own op and applies the receiver's accepted op.
    sender._apply(ackOp(senderDispatched, 1), false);
    sender._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 1,
        version: 2,
        ops: [{ type: "insert", index: 6, text: "9" }],
      },
      false
    );
    expect(sender.toString()).toBe("1ABCDE9");
    expect(sender.version).toBe(2);

    // Sender re-encodes their (unchanged) CM cursor: still between C and D
    // in "1ABCDE9", which is position 4.
    const senderCursorAfterSync = 4;
    const reBroadcastIndex = sender[kInternal].encodeIndex(
      senderCursorAfterSync
    );
    expect(reBroadcastIndex).toBe(4);
    expect(sender.version).toBe(2);

    // Receiver decodes the fresh broadcast → position 4.
    expect(
      receiver[kInternal].decodeIndex(reBroadcastIndex, sender.version)
    ).toBe(4);
  });

  test("peer ahead of us: decode returns null and succeeds after we catch up", () => {
    // The peer is one ack ahead of us. They broadcast a cursor at their
    // version. We can't rebase it yet.
    const { text } = attachedLiveText("Hello");
    expect(text[kInternal].decodeIndex(3, 1)).toBeNull();

    // Once we receive the catching-up accepted op, decode works.
    text._apply(
      {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 0,
        version: 1,
        ops: [{ type: "insert", index: 0, text: "Z" }],
      },
      false
    );
    expect(text.version).toBe(1);
    expect(text[kInternal].decodeIndex(3, 1)).toBe(3);
  });
});
