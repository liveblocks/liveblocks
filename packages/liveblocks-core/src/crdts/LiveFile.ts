import type { LiveNode } from "../crdts/Lson";
import { nn } from "../lib/assert";
import { nanoid } from "../lib/nanoid";
import type { ReadonlyJsonObject } from "../lib/Json";
import type { CreateFileOp, CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type {
  FileStorageNode,
  LiveFileData,
  SerializedFile,
} from "../protocol/StorageNode";
import { CrdtType } from "../protocol/StorageNode";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";

/**
 * A LiveFile is an immutable Storage leaf that references file bytes stored
 * outside the realtime Storage tree.
 */
export class LiveFile extends AbstractCrdt {
  readonly #data: Readonly<LiveFileData>;

  constructor(data: LiveFileData) {
    super();
    this.#data = Object.freeze({ ...data });
  }

  get data(): Readonly<LiveFileData> {
    return this.#data;
  }

  get id(): string {
    return this.#data.id;
  }

  get name(): string {
    return this.#data.name;
  }

  get size(): number {
    return this.#data.size;
  }

  get mimeType(): string {
    return this.#data.mimeType;
  }

  /** @internal */
  static _deserialize(
    [id, item]: FileStorageNode,
    _parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveFile {
    const file = new LiveFile(item.data);
    file._attach(id, pool);
    return file;
  }

  /** @internal */
  _toOps(parentId: string, parentKey: string): CreateFileOp[] {
    if (this._id === undefined) {
      throw new Error("Cannot serialize LiveFile if parent is missing");
    }

    return [
      {
        type: OpCode.CREATE_FILE,
        id: this._id,
        parentId,
        parentKey,
        data: this.#data,
      },
    ];
  }

  /** @internal */
  _serialize(): SerializedFile {
    if (this.parent.type !== "HasParent") {
      throw new Error("Cannot serialize LiveFile if parent is missing");
    }

    return {
      type: CrdtType.FILE,
      parentId: nn(this.parent.node._id, "Parent node expected to have ID"),
      parentKey: this.parent.key,
      data: this.#data,
    };
  }

  /** @internal */
  _attachChild(_op: CreateOp): ApplyResult {
    throw new Error("Method not implemented.");
  }

  /** @internal */
  _detachChild(_crdt: LiveNode): ApplyResult {
    throw new Error("Method not implemented.");
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    return {
      type: "Json",
      id: this._id ?? nanoid(),
      key,
      payload: this.#data,
    };
  }

  /** @internal */
  _toJSON(): ReadonlyJsonObject {
    return this.#data;
  }

  clone(): LiveFile {
    return new LiveFile(this.#data);
  }
}
