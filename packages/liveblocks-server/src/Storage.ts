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
  Awaitable,
  SerializedChild,
  SerializedCrdt,
} from "@liveblocks/core";
import {
  asPos,
  assertNever,
  CrdtType,
  makePosition,
  OpCode,
} from "@liveblocks/core";

import type { IStorageDriver, IStorageDriverNodeAPI } from "~/interfaces";
import type { Logger } from "~/lib/Logger";
import type {
  ClientWireOp,
  CreateOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  FixOp,
  HasOpId,
  SetParentKeyOp,
  UpdateObjectOp,
} from "~/protocol";
import type { Pos } from "~/types";

type ApplyOpResult = OpAccepted | OpIgnored;

export type OpAccepted = {
  action: "accepted";
  op: ClientWireOp;
  fix?: FixOp;
};

export type OpIgnored = {
  action: "ignored";
  ignoredOpId?: string;
};

function accept(op: ClientWireOp, fix?: FixOp): OpAccepted {
  return { action: "accepted", op, fix };
}

function ignore(ignoredOp: ClientWireOp): OpIgnored {
  return { action: "ignored", ignoredOpId: ignoredOp.opId };
}

function nodeFromCreateChildOp(op: CreateOp): SerializedChild {
  switch (op.type) {
    case OpCode.CREATE_LIST:
      return {
        type: CrdtType.LIST,
        parentId: op.parentId,
        parentKey: op.parentKey,
      };

    case OpCode.CREATE_MAP:
      return {
        type: CrdtType.MAP,
        parentId: op.parentId,
        parentKey: op.parentKey,
      };

    case OpCode.CREATE_OBJECT:
      return {
        type: CrdtType.OBJECT,
        parentId: op.parentId,
        parentKey: op.parentKey,
        data: op.data,
      };

    case OpCode.CREATE_REGISTER:
      return {
        type: CrdtType.REGISTER,
        parentId: op.parentId,
        parentKey: op.parentKey,
        data: op.data,
      };

    // istanbul ignore next
    default:
      return assertNever(op, "Unknown op code");
  }
}

export class Storage {
  // The actual underlying storage API (could be backed by in-memory store,
  // SQLite, Redis, Postgres, Cloudflare Durable Object Storage, etc.)
  private readonly coreDriver: IStorageDriver;
  private _loadedDriver: IStorageDriverNodeAPI | undefined;

  constructor(coreDriver: IStorageDriver) {
    this.coreDriver = coreDriver;
  }

  // -------------------------------------------------------------------------
  // Public API (for Storage)
  // -------------------------------------------------------------------------

  get loadedDriver(): IStorageDriverNodeAPI {
    if (this._loadedDriver === undefined) {
      throw new Error("Cannot access tree before it's been loaded");
    }
    return this._loadedDriver;
  }

  // REFACTOR NOTE: Eventually raw_iter_nodes has to be removed here
  raw_iter_nodes(): Awaitable<Iterable<[string, SerializedCrdt]>> {
    return this.coreDriver.raw_iter_nodes();
  }

  /**
   * Load the room data from object storage into memory. Persisted room
   * data consists of the main node map, which represents the Liveblocks
   * Storage tree, and special keys where we store usage metrics, or room
   * metadata.
   */
  async load(logger: Logger): Promise<void> {
    this._loadedDriver = await this.coreDriver.load_nodes_api(logger);
  }

  unload(): void {
    this._loadedDriver = undefined;
  }

  /**
   * Applies a batch of Ops.
   */
  async applyOps(ops: ClientWireOp[]): Promise<ApplyOpResult[]> {
    const results: ApplyOpResult[] = [];
    for (const op of ops) {
      results.push(await this.applyOp(op));
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Private APIs (for Storage)
  // -------------------------------------------------------------------------

  /**
   * Applies a single Op.
   */
  private async applyOp(op: ClientWireOp): Promise<ApplyOpResult> {
    switch (op.type) {
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER:
      case OpCode.CREATE_OBJECT:
        return await this.applyCreateOp(op);

      case OpCode.UPDATE_OBJECT:
        return await this.applyUpdateObjectOp(op);

      case OpCode.SET_PARENT_KEY:
        return await this.applySetParentKeyOp(op);

      case OpCode.DELETE_OBJECT_KEY:
        return await this.applyDeleteObjectKeyOp(op);

      case OpCode.DELETE_CRDT:
        return await this.applyDeleteCrdtOp(op);

      // istanbul ignore next
      default:
        if (process.env.NODE_ENV === "production") {
          return ignore(op);
        } else {
          return assertNever(op, "Invalid op");
        }
    }
  }

  private async applyCreateOp(op: CreateOp & HasOpId): Promise<ApplyOpResult> {
    if (this.loadedDriver.has_node(op.id)) {
      // Node already exists, the operation is ignored
      return ignore(op);
    }

    const node = nodeFromCreateChildOp(op);

    const parent = this.loadedDriver.get_node(node.parentId);
    if (parent === undefined) {
      // Parent does not exist because the op is invalid or because it was deleted in race condition.
      return ignore(op);
    }

    // How to create this node in the node map depends on the parent node's type
    switch (parent.type) {
      case CrdtType.OBJECT:
        // Register children under object nodes are forbidden. We'll simply
        // ignore these Ops. This matches the eventual storage behavior: if
        // we'd persist them, they would get ignored when re-loading the
        // persisted room data into memory the next time the room loads.
        if (op.type === OpCode.CREATE_REGISTER) {
          return ignore(op);
        }
      // fall through

      case CrdtType.MAP:
        // Children of maps and objects require no special needs
        await this.loadedDriver.set_child(op.id, node, true);
        return accept(op);

      case CrdtType.LIST:
        // List items need special handling around conflicting resolution,
        // which depends on the users intention
        return this.createChildAsListItem(op, node);

      case CrdtType.REGISTER:
        // It's illegal for registers to have children
        return ignore(op);

      // istanbul ignore next
      default:
        return assertNever(parent, "Unhandled CRDT type");
    }
  }

  private async createChildAsListItem(
    op: CreateOp & HasOpId,
    node: SerializedChild
  ): Promise<ApplyOpResult> {
    let fix: FixOp | undefined;

    // The default intent, when not explicitly provided, is to insert, not set,
    // into the list.
    const intent: "insert" | "set" = op.intent ?? "insert";

    // istanbul ignore else
    if (intent === "insert") {
      const insertedParentKey = await this.insertIntoList(op.id, node);

      // If the inserted parent key is different from the input, it means there
      // was a conflict and the node has been inserted in an alternative free
      // list position. We should broadcast a modified Op to all clients that
      // has the modified position, and send a "fix" op back to the originating
      // client.
      if (insertedParentKey !== node.parentKey) {
        op = { ...op, parentKey: insertedParentKey };
        fix = {
          type: OpCode.SET_PARENT_KEY,
          id: op.id,
          parentKey: insertedParentKey,
        };
        return accept(op, fix);
      }

      // No conflict, node got inserted as intended
      return accept(op);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (intent === "set") {
      // The intent here is to "set", not insert, into the list, replacing the
      // existing item that

      // Special handling required here. They will include a "deletedId" that
      // points to the object they expect to be replacing. If in the mean time,
      // that object disappeared there (because it was moved, for example), be
      // sure to delete it anyway.
      // We should not just trust the given value, because we're about to
      // delete a node. It's only safe to delete the node if it indeed is
      // a sibling of the current node.
      const deletedId =
        op.deletedId !== undefined &&
        op.deletedId !== op.id &&
        this.loadedDriver.get_node(op.deletedId)?.parentId === node.parentId
          ? op.deletedId
          : undefined;

      if (deletedId !== undefined) {
        await this.loadedDriver.delete_node(deletedId);
      }

      const prevItemId = this.loadedDriver.get_child_at(
        node.parentId,
        node.parentKey
      );
      if (prevItemId !== undefined && prevItemId !== deletedId) {
        // If this "set" operation indeed removed an item, but it wasn't the
        // expected `deletedId`, let the invoking client know that they'll
        // have to delete this object, too.
        fix = {
          type: OpCode.DELETE_CRDT,
          id: prevItemId,
        };
      }

      await this.loadedDriver.set_child(op.id, node, true);

      return accept(op, fix);
    } else {
      return assertNever(intent, "Invalid intent");
    }
  }

  private async applyDeleteObjectKeyOp(
    op: DeleteObjectKeyOp & HasOpId
  ): Promise<ApplyOpResult> {
    await this.loadedDriver.delete_child_key(op.id, op.key);
    return accept(op);
  }

  private async applyUpdateObjectOp(
    op: UpdateObjectOp & HasOpId
  ): Promise<ApplyOpResult> {
    await this.loadedDriver.set_object_data(op.id, op.data, true);
    return accept(op);
  }

  private async applyDeleteCrdtOp(
    op: DeleteCrdtOp & HasOpId
  ): Promise<ApplyOpResult> {
    await this.loadedDriver.delete_node(op.id);
    return accept(op);
  }

  private async applySetParentKeyOp(
    op: SetParentKeyOp & HasOpId
  ): Promise<ApplyOpResult> {
    const newPosition = await this.moveToPosInList(op.id, op.parentKey);
    if (newPosition === undefined) {
      // The operation got rejected because it didn't make sense, ignore it
      return ignore(op);
    }

    // If the inserted node is different from the input, it means there was
    // a conflict and the node has been inserted in a new, free, list position.
    // We should broadcast a modified Op to all clients that has the modified
    // position, and send a "fix" op back to the originating client.
    if (newPosition !== op.parentKey) {
      const modifiedOp = { ...op, parentKey: newPosition };
      const fix: FixOp = {
        type: OpCode.SET_PARENT_KEY,
        id: op.id,
        parentKey: newPosition,
      };
      return accept(modifiedOp, fix);
    } else {
      return accept(op);
    }
  }

  /**
   * Inserts a new node in the storage tree, under a list parent. If an
   * existing sibling node already exist under this key, however, it will look
   * for another free position under that parent and insert it under
   * a different parent key that is guaranteed to be available.
   *
   * Returns the key that was used for the insertion.
   */
  private async insertIntoList(
    id: string,
    node: SerializedChild
  ): Promise<string> {
    // First, compute the key to use to insert this node
    const key = this.findFreeListPosition(node.parentId, asPos(node.parentKey));
    if (key !== node.parentKey) {
      node = { ...node, parentKey: key };
    }
    await this.loadedDriver.set_child(id, node);
    return node.parentKey;
  }

  /**
   * Tries to move a node to the given position under the same parent. If
   * a conflicting sibling node already exist at this position, it will use
   * another free position instead, to avoid the conflict.
   *
   * Returns the position (parentKey) that the node was eventually placed at.
   * If the node could be inserted without conflict, it will return the same
   * parentKey position.
   *
   * Will return `undefined` if this action could not be interpreted. Will be
   * a no-op for non-list items.
   */
  private async moveToPosInList(
    id: string,
    targetKey: string
  ): Promise<string | undefined> {
    const node = this.loadedDriver.get_node(id);
    if (node?.parentId === undefined) {
      return; /* reject */
    }

    if (this.loadedDriver.get_node(node.parentId)?.type !== CrdtType.LIST) {
      // SetParentKeyOp is a no-op for all nodes, except list items
      return; /* reject */
    }

    if (node.parentKey === targetKey) {
      // Already there
      return targetKey; /* no-op */
    }

    // First, compute the key to use to insert this node
    const key = this.findFreeListPosition(node.parentId, asPos(targetKey));
    if (key !== node.parentKey) {
      await this.loadedDriver.move_sibling(id, key);
    }
    return key;
  }

  /**
   * Checks whether the given parentKey is a "free position" under the
   * parentId, i.e. there are no siblings that have the same key. If a sibling
   * exists under that key, it tries to generate new positions until it finds
   * a free slot, and returns that. The returned value is therefore always safe
   * to use as parentKey.
   */
  private findFreeListPosition(parentId: string, parentPos: Pos): Pos {
    if (!this.loadedDriver.has_child_at(parentId, parentPos)) {
      return parentPos;
    }

    const currPos = parentPos;
    const nextPos = this.loadedDriver.get_next_sibling(parentId, currPos);
    if (nextPos !== undefined) {
      return makePosition(currPos, nextPos); // Between current and next
    } else {
      return makePosition(currPos); // After current (fallback)
    }
  }
}
