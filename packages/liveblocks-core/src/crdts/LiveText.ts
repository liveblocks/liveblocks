import { nn } from "../lib/assert";
import { freeze } from "../lib/freeze";
import type { Json, ReadonlyJson } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import type {
  CreateOp,
  CreateTextOp,
  LiveTextDelta,
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
import type { LiveNode } from "./Lson";

export type LiveTextAttributes = TextAttributes;
export type LiveTextAttributesPatch = Readonly<Record<string, Json | null>>;
export type { LiveTextDelta, TextOperation as LiveTextOperation };

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

type Segment = {
  text: string;
  attributes?: TextAttributes;
};

function cloneAttributes(
  attributes: TextAttributes | undefined
): TextAttributes | undefined {
  return attributes === undefined ? undefined : freeze({ ...attributes });
}

function attributesEqual(
  left: TextAttributes | undefined,
  right: TextAttributes | undefined
): boolean {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function normalizeSegments(segments: readonly Segment[]): Segment[] {
  const normalized: Segment[] = [];
  for (const segment of segments) {
    if (segment.text.length === 0) {
      continue;
    }

    const last = normalized.at(-1);
    const attributes = cloneAttributes(segment.attributes);
    if (last !== undefined && attributesEqual(last.attributes, attributes)) {
      last.text += segment.text;
    } else {
      normalized.push({ text: segment.text, attributes });
    }
  }
  return normalized;
}

function deltaToSegments(delta: LiveTextDelta): Segment[] {
  return normalizeSegments(
    delta.map((item) => ({
      text: item.insert,
      attributes: item.attributes,
    }))
  );
}

function segmentsToDelta(segments: readonly Segment[]): LiveTextDelta {
  return segments.map((segment) =>
    segment.attributes === undefined
      ? { insert: segment.text }
      : { insert: segment.text, attributes: { ...segment.attributes } }
  );
}

function splitSegmentsAt(
  segments: readonly Segment[],
  index: number
): Segment[] {
  const result: Segment[] = [];
  let offset = 0;

  for (const segment of segments) {
    const end = offset + segment.text.length;
    if (index > offset && index < end) {
      const before = segment.text.slice(0, index - offset);
      const after = segment.text.slice(index - offset);
      result.push({ text: before, attributes: segment.attributes });
      result.push({ text: after, attributes: segment.attributes });
    } else {
      result.push({ text: segment.text, attributes: segment.attributes });
    }
    offset = end;
  }

  return result;
}

function clipRange(
  index: number,
  length: number,
  textLength: number
): { index: number; length: number } {
  const clippedIndex = Math.max(0, Math.min(index, textLength));
  const clippedEnd = Math.max(clippedIndex, Math.min(index + length, textLength));
  return { index: clippedIndex, length: clippedEnd - clippedIndex };
}

function applyInsert(
  segments: readonly Segment[],
  index: number,
  text: string,
  attributes?: TextAttributes
): Segment[] {
  if (text.length === 0) {
    return normalizeSegments(segments);
  }

  const split = splitSegmentsAt(segments, index);
  const result: Segment[] = [];
  let offset = 0;
  let inserted = false;

  for (const segment of split) {
    if (!inserted && offset === index) {
      result.push({ text, attributes });
      inserted = true;
    }
    result.push(segment);
    offset += segment.text.length;
  }

  if (!inserted) {
    result.push({ text, attributes });
  }

  return normalizeSegments(result);
}

function applyDelete(
  segments: readonly Segment[],
  index: number,
  length: number
): { segments: Segment[]; deletedText: string } {
  const split = splitSegmentsAt(splitSegmentsAt(segments, index), index + length);
  const result: Segment[] = [];
  let offset = 0;
  let deletedText = "";

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      deletedText += segment.text;
    } else {
      result.push(segment);
    }
    offset = end;
  }

  return { segments: normalizeSegments(result), deletedText };
}

function applyFormat(
  segments: readonly Segment[],
  index: number,
  length: number,
  attributes: LiveTextAttributesPatch
): Segment[] {
  const split = splitSegmentsAt(splitSegmentsAt(segments, index), index + length);
  const result: Segment[] = [];
  let offset = 0;

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      const nextAttributes: Record<string, Json> = {
        ...(segment.attributes ?? {}),
      };
      for (const [key, value] of Object.entries(attributes)) {
        if (value === null) {
          delete nextAttributes[key];
        } else {
          nextAttributes[key] = value;
        }
      }
      result.push({
        text: segment.text,
        attributes:
          Object.keys(nextAttributes).length === 0
            ? undefined
            : freeze(nextAttributes),
      });
    } else {
      result.push(segment);
    }
    offset = end;
  }

  return normalizeSegments(result);
}

function formatReverseOperations(
  segments: readonly Segment[],
  index: number,
  length: number,
  patch: LiveTextAttributesPatch
): TextOperation[] {
  const split = splitSegmentsAt(splitSegmentsAt(segments, index), index + length);
  const result: TextOperation[] = [];
  let offset = 0;

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      const attributes: Record<string, Json | null> = {};
      for (const key of Object.keys(patch)) {
        attributes[key] = segment.attributes?.[key] ?? null;
      }
      result.push({
        type: "format",
        index: offset,
        length: segment.text.length,
        attributes,
      });
    }
    offset = end;
  }

  return result;
}

function mapIndexThroughOperation(index: number, op: TextOperation): number {
  if (op.type === "insert") {
    return op.index <= index ? index + op.text.length : index;
  } else if (op.type === "delete") {
    if (op.index >= index) {
      return index;
    }
    return Math.max(op.index, index - op.length);
  } else {
    return index;
  }
}

export function mapTextIndexThroughOperations(
  index: number,
  ops: readonly TextOperation[]
): number {
  let mapped = index;
  for (const op of ops) {
    mapped = mapIndexThroughOperation(mapped, op);
  }
  return mapped;
}

export function rebaseTextOperations(
  ops: readonly TextOperation[],
  acceptedOps: readonly TextOperation[]
): TextOperation[] {
  return ops.map((op) => {
    if (op.type === "insert") {
      return {
        ...op,
        index: mapTextIndexThroughOperations(op.index, acceptedOps),
      };
    } else if (op.type === "delete" || op.type === "format") {
      const start = mapTextIndexThroughOperations(op.index, acceptedOps);
      const end = mapTextIndexThroughOperations(op.index + op.length, acceptedOps);
      return { ...op, index: start, length: Math.max(0, end - start) };
    } else {
      return op;
    }
  });
}

export class LiveText extends AbstractCrdt {
  #segments: Segment[];
  #version: number;
  #pendingOps: Map<string, readonly TextOperation[]>;

  constructor(textOrDelta: string | LiveTextDelta = "", version = 0) {
    super();
    this.#segments =
      typeof textOrDelta === "string"
        ? textOrDelta.length === 0
          ? []
          : [{ text: textOrDelta }]
        : deltaToSegments(textOrDelta);
    this.#version = version;
    this.#pendingOps = new Map();
  }

  get version(): number {
    return this.#version;
  }

  get length(): number {
    return this.toString().length;
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
        data: this.toDelta(),
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
      data: this.toDelta(),
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
      this.#pendingOps.set(nn(op.opId), op.ops);
      return this.#applyOperations(op.ops, op.version ?? this.#version);
    }

    if (op.opId !== undefined) {
      this.#pendingOps.delete(op.opId);
      this.#version = op.version ?? Math.max(this.#version, op.baseVersion + 1);
      return { modified: false };
    }

    const pending = Array.from(this.#pendingOps.values()).flat();
    const ops = pending.length > 0 ? rebaseTextOperations(op.ops, pending) : op.ops;
    return this.#applyOperations(ops, op.version ?? this.#version + 1);
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
    this.#dispatch([{ type: "delete", index: clipped.index, length: clipped.length }]);
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

  #dispatch(ops: readonly TextOperation[]): void {
    if (ops.length === 0) {
      return;
    }

    this._pool?.assertStorageIsWritable();
    const baseVersion = this.#version;
    const reverse =
      this._pool !== undefined && this._id !== undefined
        ? this.#invertOperations(ops)
        : [];
    const changes = this.#applyOperationsLocally(ops);

    if (this._pool !== undefined && this._id !== undefined) {
      const opId = this._pool.generateOpId();
      this.#pendingOps.set(opId, ops);
      this._pool.dispatch(
        [
          {
            type: OpCode.UPDATE_TEXT,
            id: this._id,
            opId,
            baseVersion,
            ops: [...ops],
          },
        ],
        reverse,
        new Map<string, LiveTextUpdates>([
          [
            this._id,
            {
              type: "LiveText",
              node: this,
              version: this.#version,
              updates: changes,
            },
          ],
        ])
      );
    }
  }

  #applyOperations(
    ops: readonly TextOperation[],
    version: number
  ): ApplyResult {
    const reverse = this.#invertOperations(ops);
    const changes = this.#applyOperationsLocally(ops);
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
    let shadow = this.#segments;
    const reverse: TextOperation[] = [];

    for (const op of ops) {
      if (op.type === "insert") {
        shadow = applyInsert(shadow, op.index, op.text, op.attributes);
        reverse.unshift({
          type: "delete",
          index: op.index,
          length: op.text.length,
        });
      } else if (op.type === "delete") {
        const deleted = shadow
          .map((segment) => segment.text)
          .join("")
          .slice(op.index, op.index + op.length);
        const result = applyDelete(shadow, op.index, op.length);
        shadow = result.segments;
        reverse.unshift({ type: "insert", index: op.index, text: deleted });
      } else {
        const inverse = formatReverseOperations(
          shadow,
          op.index,
          op.length,
          op.attributes
        );
        shadow = applyFormat(shadow, op.index, op.length, op.attributes);
        reverse.unshift(...inverse.reverse());
      }
    }

    return [
      {
        type: OpCode.UPDATE_TEXT,
        id: nn(this._id),
        baseVersion: this.#version,
        ops: reverse,
      },
    ];
  }

  toString(): string {
    return this.#segments.map((segment) => segment.text).join("");
  }

  toDelta(): LiveTextDelta {
    return segmentsToDelta(this.#segments);
  }

  toJSON(): LiveTextDelta {
    return super.toJSON() as LiveTextDelta;
  }

  /** @internal */
  _toJSON(): ReadonlyJson {
    return this.toDelta() as ReadonlyJson;
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
    return new LiveText(this.toDelta(), this.#version);
  }
}
