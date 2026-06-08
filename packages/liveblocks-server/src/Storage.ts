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

import type { SerializedChild, SerializedCrdt } from "@liveblocks/core";
import {
  asPos,
  assertNever,
  CrdtType,
  makePosition,
  OpCode,
} from "@liveblocks/core";

import type { IStorageDriver } from "~/interfaces";
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

/**
 * The three possible outcomes of applying a client op. They differ along
 * when the op (first) changed storage state, who hears about it, and what
 * gets sent back to the originating client:
 *
 * |             | state change | fan out to others | reply to sender  |
 * |-------------|--------------|-------------------|------------------|
 * | OpAccepted  | now          | yes               | ack echo (+ fix) |
 * | OpRectified | in the past  | no                | ack echo + fix   |
 * | OpIgnored   | never        | no                | bare (H)Ack      |
 */
type ApplyOpResult = OpAccepted | OpIgnored | OpRectified;

export type OpAccepted = {
  action: "accepted";
  op: ClientWireOp;
  fix?: FixOp;
};

export type OpIgnored = {
  action: "ignored";
  ignoredOpId?: string;
};

export type OpRectified = {
  action: "rectified";
  /**
   * Echo of the client's op, with the stored, authoritative parentKey. Sent
   * back to the originating client as the acknowledgement, instead of the
   * bare (H)Ack. Used for re-sent CREATE ops whose node the server already
   * stored: the echo carries the authoritative position, so the client can
   * correct any optimistic local position it may have predicted while the op
   * was pending. Never fanned out to others: they already received the op
   * when it was originally accepted.
   */
  ackOp: CreateOp & HasOpId;
  /**
   * A corrective op to send back to the originating client, stating that
   * same authoritative position (see ackOp).
   */
  fix: FixOp;
};

function accept(op: ClientWireOp, fix?: FixOp): OpAccepted {
  return { action: "accepted", op, fix };
}

function ignore(ignoredOp: ClientWireOp): OpIgnored {
  return { action: "ignored", ignoredOpId: ignoredOp.opId };
}

function rectify(op: CreateOp & HasOpId, parentKey: string): OpRectified {
  return {
    action: "rectified",
    ackOp: { ...op, parentKey },
    fix: { type: OpCode.SET_PARENT_KEY, id: op.id, parentKey },
  };
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
  // SQLite, Postgres, etc.)
  public readonly driver: IStorageDriver;

  constructor(driver: IStorageDriver) {
    this.driver = driver;
  }

  // -------------------------------------------------------------------------
  // Public API (for Storage)
  // -------------------------------------------------------------------------

  // REFACTOR NOTE: Eventually raw_iter_nodes has to be removed here
  raw_iter_nodes(): Iterable<[string, SerializedCrdt]> {
    return this.driver.raw_iter_nodes();
  }

  /**
   * Applies a batch of Ops.
   */
  applyOps(ops: ClientWireOp[]): ApplyOpResult[] {
    const results: ApplyOpResult[] = [];
    for (const op of ops) {
      results.push(this.applyOp(op));
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Private APIs (for Storage)
  // -------------------------------------------------------------------------

  /**
   * Applies a single Op.
   */
  private applyOp(op: ClientWireOp): ApplyOpResult {
    switch (op.type) {
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER:
      case OpCode.CREATE_OBJECT:
        return this.applyCreateOp(op);

      case OpCode.UPDATE_OBJECT:
        return this.applyUpdateObjectOp(op);

      case OpCode.SET_PARENT_KEY:
        return this.applySetParentKeyOp(op);

      case OpCode.DELETE_OBJECT_KEY:
        return this.applyDeleteObjectKeyOp(op);

      case OpCode.DELETE_CRDT:
        return this.applyDeleteCrdtOp(op);

      // istanbul ignore next
      default:
        if (process.env.NODE_ENV === "production") {
          return ignore(op);
        } else {
          return assertNever(op, "Invalid op");
        }
    }
  }

  private applyCreateOp(op: CreateOp & HasOpId): ApplyOpResult {
    if (this.driver.has_node(op.id)) {
      // Node already exists, meaning this op was already applied earlier
      // (e.g. it was re-sent after a reconnect because its original ack
      // never arrived), so it won't get applied again. For pushed list
      // items, rectify: send the stored, authoritative position back to the
      // originating client, because a bare ack would leave any optimistic
      // local position prediction on that client uncorrected. Only pushes
      // need this: they're the only ops the client locally repositions while
      // pending. Note that unlike acceptAndFix, rectifying happens even when
      // the stored key equals the op's key: the client's *local* key may
      // have drifted from both, and the server cannot see that.
      if (op.intent === "push") {
        const stored = this.driver.get_node(op.id);
        if (
          stored?.parentId !== undefined &&
          this.driver.get_node(stored.parentId)?.type === CrdtType.LIST
        ) {
          return rectify(op, stored.parentKey);
        }
      }
      return ignore(op);
    }

    const node = nodeFromCreateChildOp(op);

    const parent = this.driver.get_node(node.parentId);
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
        this.driver.set_child(op.id, node, true);
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

  private createChildAsListItem(
    op: CreateOp & HasOpId,
    node: SerializedChild
  ): ApplyOpResult {
    // The default intent, when not explicitly provided, is to insert, not set,
    // into the list.
    const intent: "insert" | "set" | "push" = op.intent ?? "insert";

    // istanbul ignore else
    if (intent === "insert") {
      // Insert at the client's preferred position, resolving any collision to a
      // nearby free slot.
      return this.acceptAndFix(op, node, this.insertIntoList(op.id, node));
    } else if (intent === "push") {
      // Server-authoritative append: place the node after the authoritative
      // end of the list (see `appendToList`), regardless of the client's preference.
      return this.acceptAndFix(op, node, this.appendToList(op.id, node));
    } else if (intent === "set") {
      let fix: FixOp | undefined;

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
        this.driver.get_node(op.deletedId)?.parentId === node.parentId
          ? op.deletedId
          : undefined;

      if (deletedId !== undefined) {
        this.driver.delete_node(deletedId);
      }

      const prevItemId = this.driver.get_child_at(
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

      this.driver.set_child(op.id, node, true);

      return accept(op, fix);
    } else {
      return assertNever(intent, "Invalid intent");
    }
  }

  /**
   * Accept a freshly placed list item. If the server chose a different
   * position in the end (conflict resolution), broadcast only the corrected Op
   * to all clients and send a "fix" op back to the originating client.
   */
  private acceptAndFix(
    op: CreateOp & HasOpId,
    node: SerializedChild,
    finalKey: string
  ): ApplyOpResult {
    if (finalKey !== node.parentKey) {
      return accept(
        { ...op, parentKey: finalKey },
        { type: OpCode.SET_PARENT_KEY, id: op.id, parentKey: finalKey }
      );
    }
    return accept(op);
  }

  private applyDeleteObjectKeyOp(
    op: DeleteObjectKeyOp & HasOpId
  ): ApplyOpResult {
    this.driver.delete_child_key(op.id, op.key);
    return accept(op);
  }

  private applyUpdateObjectOp(op: UpdateObjectOp & HasOpId): ApplyOpResult {
    this.driver.set_object_data(op.id, op.data, true);
    return accept(op);
  }

  private applyDeleteCrdtOp(op: DeleteCrdtOp & HasOpId): ApplyOpResult {
    this.driver.delete_node(op.id);
    return accept(op);
  }

  private applySetParentKeyOp(op: SetParentKeyOp & HasOpId): ApplyOpResult {
    const newPosition = this.moveToPosInList(op.id, op.parentKey);
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
  private insertIntoList(id: string, node: SerializedChild): string {
    // First, compute the key to use to insert this node
    const key = this.findFreeListPosition(node.parentId, asPos(node.parentKey));
    if (key !== node.parentKey) {
      node = { ...node, parentKey: key };
    }
    this.driver.set_child(id, node);
    return node.parentKey;
  }

  /**
   * Server-authoritative append: places the node strictly after every existing
   * sibling under its list parent. If the client's preferred key already sorts
   * after the current last sibling it's kept as-is (guaranteed free, since
   * it's beyond the max); otherwise the node is placed right after the last
   * sibling. Because Ops are processed serially, the chosen key is always
   * free, so concurrent pushes never collide.
   *
   * Returns the final key that was used for the insertion.
   */
  private appendToList(id: string, node: SerializedChild): string {
    const lastPos = this.driver.get_last_sibling(node.parentId);
    const preferredPos = asPos(node.parentKey);
    const finalKey =
      lastPos === undefined || preferredPos > lastPos
        ? preferredPos
        : makePosition(lastPos);
    this.driver.set_child(
      id,
      finalKey !== node.parentKey ? { ...node, parentKey: finalKey } : node
    );
    return finalKey;
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
  private moveToPosInList(id: string, targetKey: string): string | undefined {
    const node = this.driver.get_node(id);
    if (node?.parentId === undefined) {
      return; /* reject */
    }

    if (this.driver.get_node(node.parentId)?.type !== CrdtType.LIST) {
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
      this.driver.move_sibling(id, key);
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
    if (!this.driver.has_child_at(parentId, parentPos)) {
      return parentPos;
    }

    const currPos = parentPos;
    const nextPos = this.driver.get_next_sibling(parentId, currPos);
    if (nextPos !== undefined) {
      return makePosition(currPos, nextPos); // Between current and next
    } else {
      return makePosition(currPos); // After current (fallback)
    }
  }
}
