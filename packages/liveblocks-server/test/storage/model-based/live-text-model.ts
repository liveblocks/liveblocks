/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type {
  JsonObject,
  LiveTextData,
  NodeStream,
  SerializedCrdt,
  TextOperation,
} from "@liveblocks/core";
import {
  applyLiveTextOperations,
  CrdtType,
  OpCode,
  transformTextOperations,
} from "@liveblocks/core";
import * as fc from "fast-check";
import { expect } from "vitest";

import type { ClientWireOp } from "~/protocol";
import type { Storage as RealStorage } from "~/Storage";
import { selfCheck } from "~test/plugins/_generateFullTestSuite";

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

/**
 * Seeds that get concretized against the document length at the op's base
 * version, at command run time. Commands cannot carry concrete TextOperations,
 * because the document they will apply to is only known once all preceding
 * commands in the sequence have run.
 */
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

/** Arbitrary initial LiveText document (0–3 segments). */
export const docArb: fc.Arbitrary<LiveTextData> = fc
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

function dataLength(data: LiveTextData): number {
  let total = 0;
  for (const segment of data) {
    total += segment[0].length;
  }
  return total;
}

// -----------------------------------------------------------------------------
// Reference model
// -----------------------------------------------------------------------------

type AcceptedEntry = {
  opId: string;
  baseVersion: number;
  version: number;
  ops: TextOperation[];
};

class TextNodeModel {
  /** Expected document contents (kept in sync via the server's authoritative ops). */
  data: LiveTextData;
  /** Expected node version. */
  version: number;
  /**
   * The lowest baseVersion the server can still rebase against. Initial nodes
   * are seeded without history, so this is the node's initial version: ops
   * based on anything older must be rejected as "older than retained history".
   * (LIVE_TEXT_HISTORY_LIMIT never kicks in here, since model runs are far
   * shorter than 1000 commands.)
   */
  minBaseVersion: number;
  /** Document length at each version >= minBaseVersion, to concretize stale ops. */
  lengthAt: Map<number, number>;
  /** Accepted history entries, used to replay duplicates. */
  history: AcceptedEntry[];

  constructor(data: LiveTextData, version: number) {
    // Deep-copy, so the model never aliases the driver's node data
    this.data = JSON.parse(JSON.stringify(data)) as LiveTextData;
    this.version = version;
    this.minBaseVersion = version;
    this.lengthAt = new Map([[version, dataLength(this.data)]]);
    this.history = [];
  }
}

export class Model {
  texts: Map<string, TextNodeModel>;
  nextOpId: number;

  constructor(nodeStream: NodeStream) {
    this.texts = new Map();
    this.nextOpId = 1;
    for (const [id, node] of nodeStream as Iterable<[string, SerializedCrdt]>) {
      if (node.type === CrdtType.TEXT) {
        this.texts.set(id, new TextNodeModel(node.data, node.version));
      }
    }
  }

  pickTextNode(seed: number): [string, TextNodeModel] {
    const entries = Array.from(this.texts.entries());
    const picked = entries[seed % entries.length];
    /* istanbul ignore next */
    if (picked === undefined) {
      throw new Error("No text nodes available (check() should prevent this)");
    }
    return picked;
  }
}

// -----------------------------------------------------------------------------
// Assertion helpers
// -----------------------------------------------------------------------------

function expectNodeMatchesModel(
  real: RealStorage,
  nodeId: string,
  expected: TextNodeModel
): void {
  const node = real.driver.get_node(nodeId);
  expect(node?.type).toBe(CrdtType.TEXT);
  if (node?.type !== CrdtType.TEXT) {
    return; // unreachable; narrows the type
  }
  expect(node.version).toBe(expected.version);
  expect(node.data).toEqual(expected.data);
}

function makeUpdateTextOp(
  opId: string,
  id: string,
  baseVersion: number,
  ops: TextOperation[]
): ClientWireOp {
  return { opId, id, type: OpCode.UPDATE_TEXT, baseVersion, ops };
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

/**
 * The bread-and-butter command: sends an UpdateTextOp with 1–3 text
 * operations, based at a (possibly stale, possibly too-old) base version.
 *
 * - baseVersion === current version  → plain accept
 * - minBaseVersion <= baseVersion < version → accept, rebased over history
 * - baseVersion < minBaseVersion → rejected ("older than retained history")
 * - concretized ops turn out empty → ignored
 *
 * The oracle: the model tracks the authoritative ops accepted at every
 * version, and independently computes the expected rebased ops with
 * transformTextOperations over that history. The server's echoed ops must
 * match exactly, and so must the persisted node data after applying them to
 * the reference document. (Correctness of the transform primitives themselves
 * is covered by the TP1 fuzz tests in @liveblocks/core; this test verifies
 * that Storage feeds them the right history, in the right order.)
 */
class EditTextCommand implements fc.Command<Model, RealStorage> {
  constructor(
    readonly nodeSeed: number,
    readonly lagSeed: number,
    readonly seeds: readonly EditSeed[]
  ) {}

  check(model: Model): boolean {
    return model.texts.size > 0;
  }

  run(model: Model, real: RealStorage): void {
    const [nodeId, text] = model.pickTextNode(this.nodeSeed);

    // Pick a baseVersion in [max(0, minBaseVersion - 2), version], so we
    // occasionally dip below the retained history floor (when the node was
    // seeded with version > 0) and trigger a rejection.
    const lowest = Math.max(0, text.minBaseVersion - 2);
    const span = text.version - lowest;
    const baseVersion = text.version - (this.lagSeed % (span + 1));

    // Concretize against the document length at the base version, like a real
    // client editing an older snapshot would.
    const lengthAtBase =
      text.lengthAt.get(Math.max(baseVersion, text.minBaseVersion)) ?? 0;
    const ops = concretizeSequence(this.seeds, lengthAtBase);

    const opId = `op:${model.nextOpId++}`;
    const result = real.applyOps([
      makeUpdateTextOp(opId, nodeId, baseVersion, ops),
    ])[0];

    if (ops.length === 0) {
      expect(result).toMatchObject({ action: "ignored" });
    } else if (baseVersion < text.minBaseVersion) {
      expect(result).toMatchObject({
        action: "rejected",
        opIds: [opId],
        reason: "LiveText operation is older than retained history",
      });
    } else {
      expect(result?.action).toBe("accepted");
      if (result?.action !== "accepted") {
        return; // unreachable; narrows the type
      }
      expect(result.op.type).toBe(OpCode.UPDATE_TEXT);
      if (result.op.type !== OpCode.UPDATE_TEXT) {
        return; // unreachable; narrows the type
      }

      // The server echoes the op with authoritative fields
      expect(result.op.opId).toBe(opId);
      expect(result.op.baseVersion).toBe(text.version);
      expect(result.op.version).toBe(text.version + 1);

      // Independently rebase the ops over the accepted history since
      // baseVersion: the server must produce exactly these
      const opsSinceBase = text.history
        .filter((entry) => entry.version > baseVersion)
        .flatMap((entry) => entry.ops);
      const authoritativeOps =
        opsSinceBase.length > 0
          ? transformTextOperations(ops, opsSinceBase, "after")
          : ops;
      expect(result.op.ops).toEqual(authoritativeOps);

      // Applying the authoritative (rebased) ops to the reference document
      // must yield exactly the persisted node data
      text.data = applyLiveTextOperations(text.data, authoritativeOps);
      text.version += 1;
      text.lengthAt.set(text.version, dataLength(text.data));
      text.history.push({
        opId,
        baseVersion: text.version - 1,
        version: text.version,
        ops: authoritativeOps.map((op) => ({ ...op })),
      });
    }

    // In all cases (accepted or not), the persisted node must match the model
    expectNodeMatchesModel(real, nodeId, text);
    selfCheck(real);
  }

  toString(): string {
    return `\n\n/* EditTextCommand */\n${JSON.stringify({
      nodeSeed: this.nodeSeed,
      lagSeed: this.lagSeed,
      seeds: this.seeds,
    })}`;
  }
}

/**
 * Re-sends a previously accepted op (same opId). The server must answer with
 * a "rectified" ack carrying the originally stored authoritative fields, and
 * must not apply the op twice.
 */
class DuplicateOpCommand implements fc.Command<Model, RealStorage> {
  constructor(
    readonly nodeSeed: number,
    readonly pickSeed: number
  ) {}

  check(model: Model): boolean {
    return Array.from(model.texts.values()).some(
      (text) => text.history.length > 0
    );
  }

  run(model: Model, real: RealStorage): void {
    const candidates = Array.from(model.texts.entries()).filter(
      ([, text]) => text.history.length > 0
    );
    const [nodeId, text] = candidates[this.nodeSeed % candidates.length]!;
    const entry = text.history[this.pickSeed % text.history.length]!;

    const result = real.applyOps([
      makeUpdateTextOp(entry.opId, nodeId, entry.baseVersion, entry.ops),
    ])[0];

    expect(result).toMatchObject({
      action: "rectified",
      ackOp: {
        opId: entry.opId,
        id: nodeId,
        baseVersion: entry.baseVersion,
        version: entry.version,
        ops: entry.ops,
      },
    });

    // Nothing must have been applied twice
    expectNodeMatchesModel(real, nodeId, text);
    selfCheck(real);
  }

  toString(): string {
    return `\n\n/* DuplicateOpCommand */\n${JSON.stringify({
      nodeSeed: this.nodeSeed,
      pickSeed: this.pickSeed,
    })}`;
  }
}

/**
 * Sends an op with an empty ops list. The server must acknowledge it as
 * "ignored" without bumping the version or appending history.
 */
class EmptyOpsCommand implements fc.Command<Model, RealStorage> {
  constructor(readonly nodeSeed: number) {}

  check(model: Model): boolean {
    return model.texts.size > 0;
  }

  run(model: Model, real: RealStorage): void {
    const [nodeId, text] = model.pickTextNode(this.nodeSeed);

    const opId = `op:${model.nextOpId++}`;
    const result = real.applyOps([
      makeUpdateTextOp(opId, nodeId, text.version, []),
    ])[0];

    expect(result).toMatchObject({ action: "ignored", ignoredOpId: opId });
    expectNodeMatchesModel(real, nodeId, text);
    selfCheck(real);
  }

  toString(): string {
    return `\n\n/* EmptyOpsCommand */\n${JSON.stringify({
      nodeSeed: this.nodeSeed,
    })}`;
  }
}

/**
 * Sends an op whose baseVersion is ahead of the server's version. The server
 * must reject it and leave the node untouched.
 */
class FutureBaseVersionCommand implements fc.Command<Model, RealStorage> {
  constructor(
    readonly nodeSeed: number,
    readonly ahead: number,
    readonly text: string
  ) {}

  check(model: Model): boolean {
    return model.texts.size > 0;
  }

  run(model: Model, real: RealStorage): void {
    const [nodeId, text] = model.pickTextNode(this.nodeSeed);

    const opId = `op:${model.nextOpId++}`;
    const result = real.applyOps([
      makeUpdateTextOp(opId, nodeId, text.version + this.ahead, [
        { type: "insert", index: 0, text: this.text },
      ]),
    ])[0];

    expect(result).toMatchObject({
      action: "rejected",
      opIds: [opId],
      reason: "LiveText operation base version is ahead of storage",
    });
    expectNodeMatchesModel(real, nodeId, text);
    selfCheck(real);
  }

  toString(): string {
    return `\n\n/* FutureBaseVersionCommand */\n${JSON.stringify({
      nodeSeed: this.nodeSeed,
      ahead: this.ahead,
      text: this.text,
    })}`;
  }
}

// -----------------------------------------------------------------------------
// Command sequence generator
// -----------------------------------------------------------------------------

export function commands(options?: {
  size?: fc.SizeForArbitrary;
  replayPath?: string;
}) {
  return fc.commands(
    [
      // Normal/stale/too-old edits make up the bulk of the traffic
      ...Array.from({ length: 8 }, () =>
        fc
          .tuple(
            fc.nat(1000),
            fc.nat(1000),
            fc.array(editSeedArb, { minLength: 1, maxLength: 3 })
          )
          .map(
            ([nodeSeed, lagSeed, seeds]) =>
              new EditTextCommand(nodeSeed, lagSeed, seeds)
          )
      ),
      fc
        .tuple(fc.nat(1000), fc.nat(1000))
        .map(
          ([nodeSeed, pickSeed]) => new DuplicateOpCommand(nodeSeed, pickSeed)
        ),
      fc.nat(1000).map((nodeSeed) => new EmptyOpsCommand(nodeSeed)),
      fc
        .tuple(fc.nat(1000), fc.integer({ min: 1, max: 5 }), textArb)
        .map(
          ([nodeSeed, ahead, text]) =>
            new FutureBaseVersionCommand(nodeSeed, ahead, text)
        ),
    ],
    options
  );
}
