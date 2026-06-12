import { nn } from "../lib/assert";
import * as console from "../lib/fancy-console";
import type { JsonObject, ReadonlyJson } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import { stableStringify } from "../lib/stringify";
import type {
  CreateOp,
  CreateTextOp,
  LiveTextData,
  Op,
  TextAttributes,
  TextOperation,
  UpdateTextOp,
} from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { SerializedText, TextStorageNode } from "../protocol/StorageNode";
import { CrdtType } from "../protocol/StorageNode";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";
import {
  applyDelete,
  applyFormat,
  applyInsert,
  applyTextOperationsToSegments,
  clipRange,
  dataToSegments,
  invertTextOperations,
  segmentsToData,
  textLength,
  textOperationsEqual,
  type TextSegment,
  transformTextOperations,
  transformTextOperationsX,
} from "./liveTextOps";
import type { LiveNode } from "./Lson";
import type { StorageUpdate } from "./StorageUpdates";

export type LiveTextAttributes = TextAttributes;
export type LiveTextAttributesPatch = JsonObject;
export type {
  LiveTextData,
  TextOperation as LiveTextOperation,
  LiveTextSegment,
} from "../protocol/Op";

export type LiveTextChange =
  | {
      readonly type: "insert";
      readonly index: number;
      readonly text: string;
      readonly attributes?: TextAttributes;
    }
  | {
      readonly type: "delete";
      readonly index: number;
      readonly length: number;
      readonly deletedText: string;
    }
  | {
      readonly type: "format";
      readonly index: number;
      readonly length: number;
      readonly attributes: LiveTextAttributesPatch;
    };

export type LiveTextUpdates = {
  type: "LiveText";
  node: LiveText;
  version: number;
  updates: LiveTextChange[];
};

/**
 * An accepted (server-ordered) update, recorded in *locally-applied* form:
 * the ops as they were actually applied to this client's document (i.e.
 * after transformation over the local pending ops). Acknowledgements of our
 * own ops apply nothing locally, so they are recorded with empty ops. This
 * makes the entries directly usable for bringing replayed (undo/redo) ops
 * up to date: chaining transforms through these entries moves an op from
 * the local document state at `baseVersion` to the current local state.
 */
type AcceptedTextOperations = {
  version: number;
  opId?: string;
  ops: readonly TextOperation[];
};

const ACCEPTED_OPS_HISTORY_LIMIT = 1000;

export {
  applyLiveTextOperations,
  mapTextIndexThroughOperations,
  transformTextOperations,
} from "./liveTextOps";

/**
 * LiveText is a collaborative rich-text primitive built on server-ordered
 * operational transformation.
 *
 * Outbound model (one-in-flight): at most one UpdateTextOp per node is
 * awaiting server acknowledgement at any time. Local edits made while an op
 * is in flight are queued and sent (composed into a single op) once the ack
 * arrives. This guarantees every wire op is expressed against server-state
 * coordinates, so the server can transform it over exactly the (foreign)
 * ops the client hadn't seen — never over the client's own pending ops.
 *
 * Inbound model: accepted remote ops are transformed over the local pending
 * ops before being applied ("before" order: the accepted op wins ties), and
 * the pending ops are re-expressed over the remote op in turn ("after"
 * order), keeping them in server coordinates at all times.
 */
export class LiveText extends AbstractCrdt {
  /** The local document: #confirmed ⊕ #inFlightOps ⊕ #queuedOps. */
  #segments: TextSegment[];
  /** The server-confirmed document (only authoritative ops applied). */
  #confirmed: TextSegment[];
  #version: number;

  /** The op currently awaiting server acknowledgement (at most one). */
  #inFlightOpId?: string;
  /** Its ops, continuously re-expressed against current server state. */
  #inFlightOps: TextOperation[] = [];
  /** Local edits made while an op is in flight; sent after the ack. */
  #queuedOps: TextOperation[] = [];

  #acceptedOps: AcceptedTextOperations[] = [];

  constructor(textOrData: string | LiveTextData = "", version = 0) {
    super();
    this.#segments =
      typeof textOrData === "string"
        ? textOrData.length === 0
          ? []
          : [{ text: textOrData }]
        : dataToSegments(textOrData);
    this.#confirmed = [...this.#segments];
    this.#version = version;
  }

  get version(): number {
    return this.#version;
  }

  get length(): number {
    return textLength(this.#segments);
  }

  /** @internal */
  static _deserialize(
    [id, item]: TextStorageNode,
    _parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveText {
    const text = new LiveText(item.data, item.version);
    text._attach(id, pool);
    return text;
  }

  /** @internal */
  _toOps(parentId: string, parentKey: string): CreateTextOp[] {
    if (this._id === undefined) {
      throw new Error("Cannot serialize LiveText if it is not attached");
    }

    return [
      {
        type: OpCode.CREATE_TEXT,
        id: this._id,
        parentId,
        parentKey,
        data: this.toJSON(),
        version: this.#version,
      },
    ];
  }

  /** @internal */
  _serialize(): SerializedText {
    if (this.parent.type !== "HasParent") {
      throw new Error("Cannot serialize LiveText if parent is missing");
    }

    return {
      type: CrdtType.TEXT,
      parentId: nn(this.parent.node._id, "Parent node expected to have ID"),
      parentKey: this.parent.key,
      data: this.toJSON(),
      version: this.#version,
    };
  }

  /** @internal */
  _attachChild(_op: CreateOp): ApplyResult {
    throw new Error("LiveText cannot contain child nodes");
  }

  /** @internal */
  _detachChild(_crdt: LiveNode): ApplyResult {
    throw new Error("LiveText cannot contain child nodes");
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    if (op.type !== OpCode.UPDATE_TEXT) {
      return super._apply(op, isLocal);
    }

    if (isLocal) {
      return this.#applyLocal(op);
    }

    if (op.opId !== undefined && op.opId === this.#inFlightOpId) {
      return this.#applyAck(op);
    }

    if (
      op.opId !== undefined &&
      this.#acceptedOps.some((entry) => entry.opId === op.opId)
    ) {
      // Duplicate acknowledgement of an op we already integrated.
      this.#version = Math.max(this.#version, op.version ?? op.baseVersion + 1);
      return { modified: false };
    }

    return this.#applyRemote(op);
  }

  insert(index: number, text: string, attributes?: TextAttributes): void {
    const clippedIndex = Math.max(0, Math.min(index, this.length));
    this.#dispatch([{ type: "insert", index: clippedIndex, text, attributes }]);
  }

  delete(index: number, length: number): void {
    const clipped = clipRange(index, length, this.length);
    if (clipped.length === 0) {
      return;
    }
    this.#dispatch([
      { type: "delete", index: clipped.index, length: clipped.length },
    ]);
  }

  replace(
    index: number,
    length: number,
    text: string,
    attributes?: TextAttributes
  ): void {
    const clipped = clipRange(index, length, this.length);
    const ops: TextOperation[] = [];
    if (clipped.length > 0) {
      ops.push({
        type: "delete",
        index: clipped.index,
        length: clipped.length,
      });
    }
    if (text.length > 0) {
      ops.push({ type: "insert", index: clipped.index, text, attributes });
    }
    this.#dispatch(ops);
  }

  format(
    index: number,
    length: number,
    attributes: LiveTextAttributesPatch
  ): void {
    const clipped = clipRange(index, length, this.length);
    if (clipped.length === 0) {
      return;
    }
    this.#dispatch([
      {
        type: "format",
        index: clipped.index,
        length: clipped.length,
        attributes,
      },
    ]);
  }

  /** Local edits made through the public API. */
  #dispatch(ops: readonly TextOperation[]): void {
    if (ops.length === 0) {
      return;
    }

    this._pool?.assertStorageIsWritable();
    const attached = this._pool !== undefined && this._id !== undefined;
    const reverse = attached ? this.#invertOperations(ops) : [];
    const changes = this.#applyOperationsLocally(ops);

    if (!attached) {
      return;
    }

    const pool = nn(this._pool);
    const id = nn(this._id);
    const updates = new Map<string, StorageUpdate>([
      [
        id,
        {
          type: "LiveText",
          node: this,
          version: this.#version,
          updates: changes,
        },
      ],
    ]);

    if (this.#inFlightOpId === undefined) {
      const opId = pool.generateOpId();
      this.#inFlightOpId = opId;
      this.#inFlightOps = [...ops];
      pool.dispatch(
        [
          {
            type: OpCode.UPDATE_TEXT,
            id,
            opId,
            baseVersion: this.#version,
            ops: [...ops],
          },
        ],
        reverse,
        updates
      );
    } else {
      // An op is awaiting acknowledgement: queue these edits. They will be
      // sent (as a single composed op) when the ack arrives. The dispatch
      // still needs to register the reverse ops and clear the redo stack,
      // like any fresh local mutation.
      this.#queuedOps.push(...ops);
      pool.dispatch([], reverse, updates, { clearRedoStack: true });
    }
  }

  /**
   * A local replay of an existing wire op: an undo/redo frame, or an
   * unacknowledged op re-sent after a reconnect.
   */
  #applyLocal(op: UpdateTextOp): ApplyResult {
    const mutableOp = op as { baseVersion: number; ops: TextOperation[] };

    // Re-sent offline op (reconnect): its content is already applied
    // locally. Compose any queued ops into it and refresh its authoritative
    // fields so the server sees current server-state coordinates.
    if (op.opId !== undefined && op.opId === this.#inFlightOpId) {
      this.#inFlightOps = [...this.#inFlightOps, ...this.#queuedOps];
      this.#queuedOps = [];
      mutableOp.baseVersion = this.#version;
      mutableOp.ops = [...this.#inFlightOps];
      return { modified: false };
    }

    // Replayed undo/redo frame: transform it over everything accepted since
    // it was created. Accepted entries are recorded in locally-applied form,
    // so this moves the op into current local-document coordinates. (Our own
    // acknowledgements record empty ops — applying nothing locally — so the
    // frame is never transformed over the very op it inverts.)
    let ops: readonly TextOperation[] = op.ops;
    for (const entry of this.#acceptedOps) {
      if (entry.version > op.baseVersion && entry.ops.length > 0) {
        ops = transformTextOperations(ops, entry.ops, "after");
      }
    }

    const reverse = this.#invertOperations(ops);
    const changes = this.#applyOperationsLocally(ops);

    if (this.#inFlightOpId === undefined && ops.length > 0) {
      this.#inFlightOpId = nn(op.opId, "Local ops must have an opId");
      this.#inFlightOps = [...ops];
      mutableOp.baseVersion = this.#version;
      mutableOp.ops = [...ops];
    } else {
      // Another op is in flight (or the ops transformed away entirely):
      // queue the content and turn the wire op into an empty vehicle. The
      // server ignores empty updates (acks without applying), and the
      // queued content rides along after the in-flight ack.
      this.#queuedOps.push(...ops);
      mutableOp.baseVersion = this.#version;
      mutableOp.ops = [];
    }

    if (changes.length === 0) {
      return { modified: false };
    }

    return {
      reverse,
      modified: {
        type: "LiveText",
        node: this,
        version: this.#version,
        updates: changes,
      },
    };
  }

  /** Server acknowledgement of our in-flight op. */
  #applyAck(op: UpdateTextOp): ApplyResult {
    const ackedVersion =
      op.version ?? Math.max(this.#version, op.baseVersion + 1);
    const predicted = this.#inFlightOps;
    const opId = this.#inFlightOpId;

    this.#confirmed = applyTextOperationsToSegments(this.#confirmed, op.ops);
    this.#inFlightOpId = undefined;
    this.#inFlightOps = [];

    let appliedOps: TextOperation[] = [];
    let result: ApplyResult = { modified: false };

    if (!textOperationsEqual(op.ops, predicted)) {
      // The authoritative ops differ from our continuously re-expressed
      // prediction. This should not happen as long as client and server run
      // the same transform; recover by rebuilding the local document from
      // the confirmed state.
      console.error(
        "LiveText: acknowledgement did not match the local prediction; resynchronizing"
      );
      const rebuilt = this.#rebuildLocalFromConfirmed();
      appliedOps = rebuilt.appliedOps;
      if (rebuilt.changes.length > 0) {
        result = {
          reverse: [],
          modified: {
            type: "LiveText",
            node: this,
            version: ackedVersion,
            updates: rebuilt.changes,
          },
        };
      }
    }

    this.#version = Math.max(this.#version, ackedVersion);
    this.#recordAccepted(ackedVersion, appliedOps, opId);
    this.#flushQueued();
    return result;
  }

  /** An accepted op from another client (or a server-fabricated fix op). */
  #applyRemote(op: UpdateTextOp): ApplyResult {
    const version = op.version ?? this.#version + 1;

    // Advance the confirmed state with the authoritative ops as-is.
    this.#confirmed = applyTextOperationsToSegments(this.#confirmed, op.ops);

    // Transform the remote op over our pending ops (the remote op is ordered
    // before them), and re-express the pending ops over the remote op.
    const [overInFlight, inFlight] = transformTextOperationsX(
      op.ops,
      this.#inFlightOps,
      "before"
    );
    const [applied, queued] = transformTextOperationsX(
      overInFlight,
      this.#queuedOps,
      "before"
    );
    this.#inFlightOps = inFlight;
    this.#queuedOps = queued;

    this.#recordAccepted(version, applied, op.opId);

    if (applied.length === 0) {
      this.#version = Math.max(this.#version, version);
      return { modified: false };
    }

    const reverse = this.#invertOperations(applied);
    const changes = this.#applyOperationsLocally(applied);
    this.#version = Math.max(this.#version, version);

    return {
      reverse,
      modified: {
        type: "LiveText",
        node: this,
        version: this.#version,
        updates: changes,
      },
    };
  }

  /** Send the queued ops as the next in-flight op (after an ack). */
  #flushQueued(): void {
    if (
      this.#queuedOps.length === 0 ||
      this._pool === undefined ||
      this._id === undefined
    ) {
      return;
    }

    const opId = this._pool.generateOpId();
    this.#inFlightOpId = opId;
    this.#inFlightOps = this.#queuedOps;
    this.#queuedOps = [];
    this._pool.dispatch(
      [
        {
          type: OpCode.UPDATE_TEXT,
          id: this._id,
          opId,
          baseVersion: this.#version,
          ops: [...this.#inFlightOps],
        },
      ],
      [],
      new Map(),
      // The local content was already applied (and made undoable) when the
      // edits happened; this is purely an outbound flush.
      { clearRedoStack: false }
    );
  }

  /**
   * Rebuild the local document as confirmed ⊕ queued ops, returning the
   * coarse delta that was applied. Only used by defensive recovery paths.
   */
  #rebuildLocalFromConfirmed(): {
    appliedOps: TextOperation[];
    changes: LiveTextChange[];
  } {
    const before = this.#segments;
    const after = applyTextOperationsToSegments(this.#confirmed, [
      ...this.#inFlightOps,
      ...this.#queuedOps,
    ]);

    if (
      stableStringify(segmentsToData(before)) ===
      stableStringify(segmentsToData(after))
    ) {
      this.#segments = after;
      return { appliedOps: [], changes: [] };
    }

    const beforeText = before.map((segment) => segment.text).join("");
    this.#segments = after;
    this.invalidate();

    const appliedOps: TextOperation[] = [];
    const changes: LiveTextChange[] = [];
    if (beforeText.length > 0) {
      appliedOps.push({ type: "delete", index: 0, length: beforeText.length });
      changes.push({
        type: "delete",
        index: 0,
        length: beforeText.length,
        deletedText: beforeText,
      });
    }
    let index = 0;
    for (const segment of after) {
      appliedOps.push({
        type: "insert",
        index,
        text: segment.text,
        attributes: segment.attributes,
      });
      changes.push({
        type: "insert",
        index,
        text: segment.text,
        attributes: segment.attributes,
      });
      index += segment.text.length;
    }
    return { appliedOps, changes };
  }

  /**
   * Reconcile this node against an authoritative storage snapshot (e.g.
   * after a reconnect). The confirmed state and version are replaced by the
   * snapshot's; pending (in-flight + queued) ops are preserved on top and
   * will be re-sent by the offline-ops replay.
   *
   * @internal
   */
  _resyncText(
    data: LiveTextData,
    version: number
  ): LiveTextUpdates | undefined {
    this.#confirmed = dataToSegments(data);
    this.#version = version;
    // Accepted-op history is expressed against the pre-snapshot timeline and
    // is no longer meaningful.
    this.#acceptedOps = [];

    const rebuilt = this.#rebuildLocalFromConfirmed();
    if (rebuilt.changes.length === 0) {
      return undefined;
    }

    return {
      type: "LiveText",
      node: this,
      version: this.#version,
      updates: rebuilt.changes,
    };
  }

  /**
   * Called when the server rejected one of our ops. Drops all pending state
   * for this node (edits queued behind a rejected op cannot be trusted
   * either); the room follows up with a storage resync.
   *
   * @internal
   */
  _rejectPendingOp(opId: string): void {
    if (opId !== this.#inFlightOpId) {
      return;
    }
    this.#inFlightOpId = undefined;
    this.#inFlightOps = [];
    this.#queuedOps = [];
  }

  #recordAccepted(
    version: number,
    ops: readonly TextOperation[],
    opId: string | undefined
  ): void {
    if (this.#acceptedOps.some((entry) => entry.version === version)) {
      return;
    }

    this.#acceptedOps.push({ version, opId, ops: [...ops] });
    this.#acceptedOps.sort((left, right) => left.version - right.version);
    if (this.#acceptedOps.length > ACCEPTED_OPS_HISTORY_LIMIT) {
      this.#acceptedOps.splice(
        0,
        this.#acceptedOps.length - ACCEPTED_OPS_HISTORY_LIMIT
      );
    }
  }

  #applyOperationsLocally(ops: readonly TextOperation[]): LiveTextChange[] {
    const changes: LiveTextChange[] = [];
    for (const op of ops) {
      if (op.type === "insert") {
        this.#segments = applyInsert(
          this.#segments,
          op.index,
          op.text,
          op.attributes
        );
        changes.push({
          type: "insert",
          index: op.index,
          text: op.text,
          attributes: op.attributes,
        });
      } else if (op.type === "delete") {
        const result = applyDelete(this.#segments, op.index, op.length);
        this.#segments = result.segments;
        changes.push({
          type: "delete",
          index: op.index,
          length: op.length,
          deletedText: result.deletedText,
        });
      } else {
        this.#segments = applyFormat(
          this.#segments,
          op.index,
          op.length,
          op.attributes
        );
        changes.push({
          type: "format",
          index: op.index,
          length: op.length,
          attributes: op.attributes,
        });
      }
    }
    this.invalidate();
    return changes;
  }

  #invertOperations(ops: readonly TextOperation[]): UpdateTextOp[] {
    return [
      {
        type: OpCode.UPDATE_TEXT,
        id: nn(this._id),
        baseVersion: this.#version,
        ops: invertTextOperations(this.#segments, ops),
      },
    ];
  }

  toString(): string {
    return this.#segments.map((segment) => segment.text).join("");
  }

  toJSON(): LiveTextData {
    return super.toJSON() as LiveTextData;
  }

  /** @internal */
  _toJSON(): ReadonlyJson {
    return segmentsToData(this.#segments) as ReadonlyJson;
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    return {
      type: "LiveText",
      id: this._id ?? nanoid(),
      key,
      payload: [
        {
          type: "Json",
          id: `${this._id ?? nanoid()}:text`,
          key: "text",
          payload: this.toString(),
        },
      ],
    };
  }

  clone(): LiveText {
    return new LiveText(this.toJSON(), this.#version);
  }
}
