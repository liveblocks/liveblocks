import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import type { JsonObject } from "../../lib/Json";
import type {
  LiveTextData,
  TextOperation,
  UpdateTextOp,
} from "../../protocol/Op";
import { OpCode } from "../../protocol/Op";
import { createManagedPool } from "../AbstractCrdt";
import { LiveText } from "../LiveText";
import {
  applyLiveTextOperations,
  dataToSegments,
  segmentsToData,
  textLength,
  transformTextOperations,
  transformTextOperationsX,
} from "../liveTextOps";

// -----------------------------------------------------------------------------
// Arbitraries
// -----------------------------------------------------------------------------

const ALPHABET = "abcdefgh";

const textArb = fc
  .array(fc.integer({ min: 0, max: ALPHABET.length - 1 }), {
    minLength: 1,
    maxLength: 4,
  })
  .map((indexes) => indexes.map((i) => ALPHABET[i]).join(""));

const attributesArb: fc.Arbitrary<JsonObject> = fc.oneof(
  fc.constant<JsonObject>({ bold: true }),
  fc.constant<JsonObject>({ bold: null }),
  fc.constant<JsonObject>({ italic: 1 }),
  fc.constant<JsonObject>({ bold: true, italic: null }),
  fc.constant<JsonObject>({ color: "red" })
);

/** Seeds that get concretized against the current document length. */
type EditSeed =
  | { type: "insert"; at: number; text: string; attrs: boolean }
  | { type: "delete"; at: number; len: number }
  | { type: "format"; at: number; len: number; attrs: JsonObject };

const editSeedArb: fc.Arbitrary<EditSeed> = fc.oneof(
  fc.record({
    type: fc.constant("insert" as const),
    at: fc.nat(1000),
    text: textArb,
    attrs: fc.boolean(),
  }),
  fc.record({
    type: fc.constant("delete" as const),
    at: fc.nat(1000),
    len: fc.integer({ min: 1, max: 4 }),
  }),
  fc.record({
    type: fc.constant("format" as const),
    at: fc.nat(1000),
    len: fc.integer({ min: 1, max: 4 }),
    attrs: attributesArb,
  })
);

function concretize(seed: EditSeed, length: number): TextOperation | undefined {
  if (seed.type === "insert") {
    return {
      type: "insert",
      index: seed.at % (length + 1),
      text: seed.text,
      ...(seed.attrs ? { attributes: { bold: true } } : {}),
    };
  }
  if (length === 0) {
    return undefined;
  }
  const index = seed.at % length;
  const len = Math.min(seed.len, length - index);
  if (len <= 0) {
    return undefined;
  }
  if (seed.type === "delete") {
    return { type: "delete", index, length: len };
  }
  return { type: "format", index, length: len, attributes: seed.attrs };
}

/** Generate a sequential op list valid against a doc of the given length. */
function concretizeSequence(
  seeds: readonly EditSeed[],
  initialLength: number
): TextOperation[] {
  const ops: TextOperation[] = [];
  let length = initialLength;
  for (const seed of seeds) {
    const op = concretize(seed, length);
    if (op === undefined) {
      continue;
    }
    ops.push(op);
    if (op.type === "insert") {
      length += op.text.length;
    } else if (op.type === "delete") {
      length -= op.length;
    }
  }
  return ops;
}

const docArb: fc.Arbitrary<LiveTextData> = fc
  .array(
    fc.record({
      text: textArb,
      attrs: fc.option(attributesArb, { nil: undefined }),
    }),
    { minLength: 0, maxLength: 3 }
  )
  .map((segments) =>
    segments.map(({ text, attrs }) =>
      attrs === undefined ? [text] : ([text, attrs] as const)
    )
  ) as fc.Arbitrary<LiveTextData>;

// -----------------------------------------------------------------------------
// TP1: transform correctness for concurrent op sequences
// -----------------------------------------------------------------------------

describe("transformTextOperations TP1 property", () => {
  test("doc ⊕ A ⊕ B' === doc ⊕ B ⊕ A' for concurrent sequences", () => {
    fc.assert(
      fc.property(
        docArb,
        fc.array(editSeedArb, { minLength: 1, maxLength: 3 }),
        fc.array(editSeedArb, { minLength: 1, maxLength: 3 }),
        fc.constantFrom("before" as const, "after" as const),
        (doc, seedsA, seedsB, order) => {
          const length = textLength(dataToSegments(doc));
          const a = concretizeSequence(seedsA, length);
          const b = concretizeSequence(seedsB, length);

          const [a1, b1] = transformTextOperationsX(a, b, order);

          // Path 1: apply A, then B-transformed-over-A
          const path1 = applyLiveTextOperations(
            applyLiveTextOperations(doc, a),
            b1
          );
          // Path 2: apply B, then A-transformed-over-B
          const path2 = applyLiveTextOperations(
            applyLiveTextOperations(doc, b),
            a1
          );

          expect(path1).toEqual(path2);
        }
      ),
      { numRuns: 2000 }
    );
  });

  test("delete spanning a concurrent insert preserves the inserted text", () => {
    // doc "abcdef": A deletes [1, 5), B inserts "XY" at 3 (inside the range)
    const a: TextOperation[] = [{ type: "delete", index: 1, length: 4 }];
    const b: TextOperation[] = [{ type: "insert", index: 3, text: "XY" }];

    const [a1, b1] = transformTextOperationsX(a, b, "after");

    const path1 = applyLiveTextOperations(
      applyLiveTextOperations([["abcdef"]], a),
      b1
    );
    const path2 = applyLiveTextOperations(
      applyLiveTextOperations([["abcdef"]], b),
      a1
    );

    expect(path1).toEqual(path2);
    // The concurrent insert must survive the delete.
    expect(path1).toEqual([["aXYf"]]);
  });

  test("same-index inserts: earlier op stays left under both orders", () => {
    const a: TextOperation[] = [{ type: "insert", index: 0, text: "A" }];
    const b: TextOperation[] = [{ type: "insert", index: 0, text: "B" }];

    // A ordered before B
    const aBeforeB_b1 = transformTextOperations(b, a, "after");
    const aBeforeB_a1 = transformTextOperations(a, b, "before");

    const path1 = applyLiveTextOperations(
      applyLiveTextOperations([["x"]], a),
      aBeforeB_b1
    );
    const path2 = applyLiveTextOperations(
      applyLiveTextOperations([["x"]], b),
      aBeforeB_a1
    );

    expect(path1).toEqual([["ABx"]]);
    expect(path2).toEqual([["ABx"]]);
  });

  test("overlapping concurrent formats: later op wins conflicting keys", () => {
    const a: TextOperation[] = [
      { type: "format", index: 0, length: 4, attributes: { bold: true } },
    ];
    const b: TextOperation[] = [
      { type: "format", index: 2, length: 4, attributes: { bold: null } },
    ];

    // A ordered before B in the final timeline
    const [a1, b1] = transformTextOperationsX(a, b, "before");

    const path1 = applyLiveTextOperations(
      applyLiveTextOperations([["abcdef"]], a),
      b1
    );
    const path2 = applyLiveTextOperations(
      applyLiveTextOperations([["abcdef"]], b),
      a1
    );

    expect(path1).toEqual(path2);
    expect(path1).toEqual([["ab", { bold: true }], ["cdef"]]);
  });
});

// -----------------------------------------------------------------------------
// Multi-client convergence simulation
// -----------------------------------------------------------------------------

type ServerHistoryEntry = {
  version: number;
  opId: string;
  ops: TextOperation[];
};

type ServerResult = {
  /** Echo back to the sender (with opId), or undefined if ignored. */
  ack?: UpdateTextOp;
  /** Forward to all other clients (no opId), or undefined. */
  forward?: UpdateTextOp;
};

/**
 * Minimal re-implementation of the server-side `applyUpdateTextOp` semantics
 * (see liveblocks-server Storage.ts), using the same shared transform.
 */
class MiniServer {
  data: LiveTextData;
  version = 0;
  history: ServerHistoryEntry[] = [];

  constructor(data: LiveTextData) {
    this.data = data;
  }

  receive(op: UpdateTextOp & { opId: string }): ServerResult {
    const duplicate = this.history.find((entry) => entry.opId === op.opId);
    if (duplicate !== undefined) {
      return {
        ack: {
          ...op,
          baseVersion: duplicate.version - 1,
          version: duplicate.version,
          ops: [...duplicate.ops],
        },
      };
    }

    if (op.ops.length === 0) {
      // Empty update: pure ack vehicle, ignored.
      return {};
    }

    if (op.baseVersion > this.version) {
      throw new Error("Client base version ahead of server");
    }

    const acceptedOps = this.history
      .filter((entry) => entry.version > op.baseVersion)
      .flatMap((entry) => entry.ops);
    const ops =
      acceptedOps.length > 0
        ? transformTextOperations(op.ops, acceptedOps, "after")
        : [...op.ops];

    const baseVersion = this.version;
    const version = this.version + 1;
    this.data = applyLiveTextOperations(this.data, ops);
    this.version = version;
    this.history.push({ version, opId: op.opId, ops });

    return {
      ack: { ...op, baseVersion, version, ops: [...ops] },
      forward: {
        type: OpCode.UPDATE_TEXT,
        id: op.id,
        baseVersion,
        version,
        ops: [...ops],
      },
    };
  }
}

type SimEvent =
  | { kind: "edit"; client: number; seed: EditSeed }
  | { kind: "undo"; client: number }
  | { kind: "toServer"; client: number }
  | { kind: "toClient"; client: number };

function simEventArb(numClients: number): fc.Arbitrary<SimEvent> {
  const client = fc.nat(numClients - 1);
  return fc.oneof(
    {
      weight: 4,
      arbitrary: fc.record({
        kind: fc.constant("edit" as const),
        client,
        seed: editSeedArb,
      }),
    },
    {
      weight: 1,
      arbitrary: fc.record({ kind: fc.constant("undo" as const), client }),
    },
    {
      weight: 3,
      arbitrary: fc.record({ kind: fc.constant("toServer" as const), client }),
    },
    {
      weight: 3,
      arbitrary: fc.record({ kind: fc.constant("toClient" as const), client }),
    }
  );
}

class SimClient {
  text: LiveText;
  outbox: (UpdateTextOp & { opId: string })[] = [];
  inbox: UpdateTextOp[] = [];
  undoStack: UpdateTextOp[][] = [];
  #opClock = 0;
  readonly id: number;

  constructor(id: number, data: LiveTextData, version: number) {
    this.id = id;
    this.text = new LiveText(data, version);
    const pool = createManagedPool("room", {
      getCurrentConnectionId: () => id,
      onDispatch: (ops, reverse) => {
        for (const op of ops) {
          if (op.type === OpCode.UPDATE_TEXT) {
            this.outbox.push(op);
          }
        }
        const reverseTextOps = reverse.filter(
          (op): op is UpdateTextOp => op.type === OpCode.UPDATE_TEXT
        );
        if (reverseTextOps.length > 0) {
          this.undoStack.push(reverseTextOps);
        }
      },
    });
    this.text._attach("0:1", pool);
  }

  edit(seed: EditSeed): void {
    const op = concretize(seed, this.text.length);
    if (op === undefined) {
      return;
    }
    if (op.type === "insert") {
      this.text.insert(op.index, op.text, op.attributes);
    } else if (op.type === "delete") {
      this.text.delete(op.index, op.length);
    } else {
      this.text.format(op.index, op.length, op.attributes);
    }
  }

  undo(): void {
    const frame = this.undoStack.pop();
    if (frame === undefined) {
      return;
    }
    // Mimic room.applyLocalOps(): assign opIds, apply locally, send.
    for (const op of frame) {
      const wireOp = { ...op, opId: `${this.id}:u${this.#opClock++}` };
      this.text._apply(wireOp, true);
      this.outbox.push(wireOp);
    }
  }

  receive(): void {
    const message = this.inbox.shift();
    if (message === undefined) {
      return;
    }
    this.text._apply(message, false);
  }
}

function runSimulation(
  initialData: LiveTextData,
  events: readonly SimEvent[],
  numClients: number
): { server: MiniServer; clients: SimClient[] } {
  const server = new MiniServer(initialData);
  const clients = Array.from(
    { length: numClients },
    (_, i) => new SimClient(i, initialData, 0)
  );

  const pumpToServer = (client: SimClient) => {
    const op = client.outbox.shift();
    if (op === undefined) {
      return;
    }
    const { ack, forward } = server.receive(op);
    if (ack !== undefined) {
      client.inbox.push(ack);
    }
    if (forward !== undefined) {
      for (const other of clients) {
        if (other !== client) {
          other.inbox.push(forward);
        }
      }
    }
  };

  for (const event of events) {
    const client =
      clients[
        event.kind === "edit" ||
        event.kind === "undo" ||
        event.kind === "toServer" ||
        event.kind === "toClient"
          ? event.client
          : 0
      ];
    switch (event.kind) {
      case "edit":
        client.edit(event.seed);
        break;
      case "undo":
        client.undo();
        break;
      case "toServer":
        pumpToServer(client);
        break;
      case "toClient":
        client.receive();
        break;
    }
  }

  // Drain: deliver everything until the system is quiescent. Acks can cause
  // clients to flush queued ops, so keep pumping.
  for (let i = 0; i < 10_000; i++) {
    const busy = clients.some((c) => c.outbox.length > 0 || c.inbox.length > 0);
    if (!busy) {
      break;
    }
    for (const client of clients) {
      while (client.outbox.length > 0) {
        pumpToServer(client);
      }
    }
    for (const client of clients) {
      while (client.inbox.length > 0) {
        client.receive();
      }
    }
  }

  for (const client of clients) {
    if (client.outbox.length > 0 || client.inbox.length > 0) {
      throw new Error("Simulation did not quiesce");
    }
  }

  return { server, clients };
}

describe("LiveText multi-client convergence (fuzz)", () => {
  test("all clients converge to the server document", () => {
    fc.assert(
      fc.property(
        docArb,
        fc.array(simEventArb(3), { minLength: 1, maxLength: 60 }),
        (doc, events) => {
          const { server, clients } = runSimulation(doc, events, 3);

          const serverText = dataToSegments(server.data)
            .map((s) => s.text)
            .join("");

          for (const client of clients) {
            expect(client.text.toString()).toBe(serverText);
            expect(client.text.toJSON()).toEqual(
              segmentsToData(dataToSegments(server.data))
            );
            expect(client.text.version).toBe(server.version);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  test("regression: same-index concurrent inserts converge", () => {
    const events: SimEvent[] = [
      {
        kind: "edit",
        client: 0,
        seed: { type: "insert", at: 0, text: "aa", attrs: false },
      },
      {
        kind: "edit",
        client: 1,
        seed: { type: "insert", at: 0, text: "bb", attrs: false },
      },
      // Client 0's op reaches the server first
      { kind: "toServer", client: 0 },
      { kind: "toServer", client: 1 },
    ];

    const { server, clients } = runSimulation([["x"]], events, 2);
    const serverText = dataToSegments(server.data)
      .map((s) => s.text)
      .join("");

    expect(serverText).toBe("aabbx");
    for (const client of clients) {
      expect(client.text.toString()).toBe(serverText);
    }
  });

  test("regression: delete spanning a concurrent insert keeps the insert", () => {
    const events: SimEvent[] = [
      // Client 0 deletes "bcde" out of "abcdef"
      { kind: "edit", client: 0, seed: { type: "delete", at: 1, len: 4 } },
      // Client 1 types "ZZ" in the middle of that range
      {
        kind: "edit",
        client: 1,
        seed: { type: "insert", at: 3, text: "zz", attrs: false },
      },
      { kind: "toServer", client: 1 },
      { kind: "toServer", client: 0 },
    ];

    const { server, clients } = runSimulation([["abcdef"]], events, 2);
    const serverText = dataToSegments(server.data)
      .map((s) => s.text)
      .join("");

    // The concurrently inserted text must survive
    expect(serverText).toContain("zz");
    for (const client of clients) {
      expect(client.text.toString()).toBe(serverText);
    }
  });

  test("regression: sequential local edits are not double-transformed by the server", () => {
    const events: SimEvent[] = [
      // Client 0, on "AB": insert "x" at 1 ("AxB"), then delete "B" (now at index 2)
      {
        kind: "edit",
        client: 0,
        seed: { type: "insert", at: 1, text: "x", attrs: false },
      },
      { kind: "edit", client: 0, seed: { type: "delete", at: 2, len: 1 } },
    ];

    const { server, clients } = runSimulation([["AB"]], events, 1);
    const serverText = dataToSegments(server.data)
      .map((s) => s.text)
      .join("");

    expect(serverText).toBe("Ax");
    expect(clients[0].text.toString()).toBe("Ax");
  });
});
