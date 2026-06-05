import { nn } from "../lib/assert";
import type { JsonObject, ReadonlyJson } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
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
  rebaseTextOperations,
  segmentsToData,
  type TextSegment,
} from "./liveTextOps";
import type { LiveNode } from "./Lson";

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

export {
  applyLiveTextOperations,
  mapTextIndexThroughOperations,
  rebaseTextOperations,
} from "./liveTextOps";

export class LiveText extends AbstractCrdt {
  #segments: TextSegment[];
  #version: number;
  #pendingOps: Map<string, readonly TextOperation[]>;

  constructor(textOrData: string | LiveTextData = "", version = 0) {
    super();
    this.#segments =
      typeof textOrData === "string"
        ? textOrData.length === 0
          ? []
          : [{ text: textOrData }]
        : dataToSegments(textOrData);
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
      this.#pendingOps.set(nn(op.opId), op.ops);
      return this.#applyOperations(op.ops, op.version ?? this.#version);
    }

    if (op.opId !== undefined) {
      const pending = this.#pendingOps.get(op.opId);
      this.#pendingOps.delete(op.opId);

      const otherPending = Array.from(this.#pendingOps.values()).flat();
      if (pending !== undefined && otherPending.length > 0) {
        this.#segments = applyTextOperationsToSegments(
          this.#segments,
          invertTextOperations(this.#segments, pending)
        );
        const ops = rebaseTextOperations(op.ops, otherPending);
        return this.#applyOperations(
          ops,
          op.version ?? Math.max(this.#version, op.baseVersion + 1)
        );
      }

      this.#version = op.version ?? Math.max(this.#version, op.baseVersion + 1);
      return { modified: false };
    }

    const pending = Array.from(this.#pendingOps.values()).flat();
    const ops =
      pending.length > 0 ? rebaseTextOperations(op.ops, pending) : op.ops;
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
