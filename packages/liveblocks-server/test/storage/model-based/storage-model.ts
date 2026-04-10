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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { NodeStream, SerializedCrdt } from "@liveblocks/core";
import { assertNever, CrdtType, OpCode } from "@liveblocks/core";
import * as fc from "fast-check";

import type { ClientWireOp } from "~/protocol";
import { ProtocolVersion } from "~/protocol";
import type { Storage as RealStorage } from "~/Storage";
import {
  generateArbitraries,
  selfCheck,
} from "~test/plugins/_generateFullTestSuite";

const arb = generateArbitraries();

function wsApiVersion(): fc.Arbitrary<ProtocolVersion> {
  return fc.oneof(
    fc.constant(ProtocolVersion.V7),
    fc.constant(ProtocolVersion.V8)
  );
}

export class Model {
  availableParentNodeIds: Set<string>;
  availableObjectNodeIds: Set<string>;

  constructor(nodeStream: NodeStream) {
    const nodeMap = new Map<string, SerializedCrdt>(nodeStream);
    const allIds = nodeMap.keys();
    const objIds = Array.from(nodeMap.entries())
      .filter(([_, node]) => node.type === CrdtType.OBJECT)
      .map(([id]) => id);

    this.availableParentNodeIds = new Set(allIds);
    this.availableObjectNodeIds = new Set(objIds);
  }
}

class ApplyOpCommand implements fc.AsyncCommand<Model, RealStorage> {
  constructor(
    readonly op: ClientWireOp,
    readonly version: ProtocolVersion
  ) {}

  /**
   * Returns whether this command is a valid command to execute, given the
   * current state of the model. If this returns `false`, the command will not
   * be generated. Creations can always happen. For deletions, updates, etc, we
   * enforce that the node it's operating on actually exists.
   */
  check(model: Model): boolean {
    switch (this.op.type) {
      case OpCode.CREATE_OBJECT:
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER:
        return model.availableParentNodeIds.has(this.op.parentId);

      case OpCode.DELETE_CRDT:
      case OpCode.SET_PARENT_KEY:
        return model.availableParentNodeIds.has(this.op.id);

      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_OBJECT_KEY:
        return model.availableObjectNodeIds.has(this.op.id);

      default:
        return assertNever(this.op, "Unhandled case");
    }
  }

  /**
   * Run the real thing against the model. In this case, there is no real model
   * we want to mimic, as we're only interested in ensuring the system is
   * internally consistent (defined by .selfCheck()).
   *
   * However, we keep track of the list of node IDs, so "useless" commands like
   * deleting nodes that don't exist are much less likely to be produced. (See
   * the `check` method above.)
   */
  async run(model: Model, real: RealStorage): Promise<void> {
    await real.applyOps([this.op]);

    switch (this.op.type) {
      case OpCode.CREATE_OBJECT:
        model.availableObjectNodeIds.add(this.op.id);
        model.availableParentNodeIds.add(this.op.id);
        break;

      case OpCode.CREATE_REGISTER:
        // Don't register the register as a potential parent ID
        break;

      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
        model.availableParentNodeIds.add(this.op.id);
        break;

      case OpCode.DELETE_CRDT:
        //
        // NOTE: Technically we could remove the ID from the model here, but we
        // don't strictly have to. We can allow some degree of "meaningless"
        // commands for nodes that no longer exist, but for which we know they
        // _have_ existed in the past.
        //
        // model.everSeenObjIds.delete(this.op.id);
        // model.everSeenNodeIds.delete(this.op.id);
        break;

      case OpCode.SET_PARENT_KEY:
      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_OBJECT_KEY:
        break;

      default:
        return assertNever(this.op, "Unhandled case");
    }

    await selfCheck(real);
  }

  /**
   * Used to format the command, to format the counter example in error
   * reports.
   */
  toString(): string {
    function opName(op: ClientWireOp): string {
      switch (op.type) {
        case OpCode.CREATE_OBJECT:
          return "CreateObjectOp";
        case OpCode.DELETE_CRDT:
          return "DeleteCrdtOp";
        case OpCode.CREATE_LIST:
          return "CreateListOp";
        case OpCode.CREATE_MAP:
          return "CreateMapOp";
        case OpCode.CREATE_REGISTER:
          return "CreateRegisterOp";
        case OpCode.SET_PARENT_KEY:
          return "SetParentKeyOp";
        case OpCode.UPDATE_OBJECT:
          return "UpdateObjectOp";
        case OpCode.DELETE_OBJECT_KEY:
          return "DeleteObjectKeyOp";
        default:
          return assertNever(op, "Unhandled case");
      }
    }

    return `\n\n/* ${opName(this.op)} */\n${JSON.stringify(this.op)}`;
  }
}

export function commands(options?: {
  size?: fc.SizeForArbitrary;
  replayPath?: string;
}) {
  return fc.commands(
    [
      fc
        .tuple(arb.clientWireOp(), wsApiVersion())
        .map(([op, version]) => new ApplyOpCommand(op, version)),
    ],
    options
  );
}
