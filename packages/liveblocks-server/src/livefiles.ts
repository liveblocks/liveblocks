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

import type { PlainLsonObject } from "@liveblocks/core";
import { ClientMsgCode, CrdtType, OpCode } from "@liveblocks/core";

import { plainLsonToNodeStream } from "~/formats/PlainLson";
import type { IStorageDriver } from "~/interfaces";
import type { Op } from "~/protocol";

/**
 * A LiveFile may only be referenced from Storage once its bytes have actually
 * been uploaded — otherwise clients would sync a node pointing at nothing, and
 * the server would have no way to know the file's real size.
 *
 * Both checks below are the same rule applied to the two shapes a new file can
 * arrive in: ops on the wire, and a whole document being installed at once.
 */

/**
 * The part of a client message this check reads. Deliberately structural:
 * callers hold different client-message unions (the Cloudflare worker's also
 * covers feed messages), and all this needs is "does it carry storage ops".
 */
type MessageWithMaybeOps = {
  readonly type: number;
  readonly ops?: readonly Op[];
};

/** True unless some CREATE_FILE op references a file that was never uploaded. */
export function hasUploadedLivefiles(
  driver: IStorageDriver,
  messages: readonly MessageWithMaybeOps[]
): boolean {
  for (const message of messages) {
    if (message.type !== ClientMsgCode.UPDATE_STORAGE) {
      continue;
    }

    for (const op of message.ops ?? []) {
      if (op.type !== OpCode.CREATE_FILE) {
        continue;
      }

      if (driver.get_livefile_upload_size(op.data.id) === undefined) {
        return false;
      }
    }
  }
  return true;
}

/** True unless the document contains a LiveFile that was never uploaded. */
export function hasUploadedLivefilesInPlainLson(
  driver: IStorageDriver,
  document: PlainLsonObject
): boolean {
  for (const [, node] of plainLsonToNodeStream(document)) {
    if (
      node.type === CrdtType.FILE &&
      driver.get_livefile_upload_size(node.data.id) === undefined
    ) {
      return false;
    }
  }
  return true;
}
