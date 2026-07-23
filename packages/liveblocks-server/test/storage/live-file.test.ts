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

import { CrdtType } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import {
  createFileOp,
  createObjectOp,
} from "~test/plugins/_generateFullTestSuite";

import { rootObj, runWithStorage } from "./utils";

const FILE_DATA = {
  id: "fl_123",
  name: "brief.pdf",
  size: 42,
  mimeType: "application/pdf",
};

describe("LiveFile", () => {
  test("creates a file node under an object", () =>
    runWithStorage([rootObj()], ({ storage, driver }) => {
      const op = createFileOp("1:0", "root", "file", FILE_DATA);
      const [result] = storage.applyOps([op]);

      expect(result).toEqual({
        action: "accepted",
        op,
        fix: undefined,
      });
      expect(driver.get_node("1:0")).toEqual({
        type: CrdtType.FILE,
        parentId: "root",
        parentKey: "file",
        data: FILE_DATA,
      });
    }));

  test("ignores children created under a file node", () =>
    runWithStorage(
      [
        rootObj(),
        [
          "1:0",
          {
            type: CrdtType.FILE,
            parentId: "root",
            parentKey: "file",
            data: FILE_DATA,
          },
        ],
      ],
      ({ storage, driver }) => {
        const op = createObjectOp("2:0", "1:0", "child", {});
        const [result] = storage.applyOps([op]);

        expect(result).toEqual({
          action: "ignored",
          ignoredOpId: op.opId,
        });
        expect(driver.get_node("2:0")).toBeUndefined();
      }
    ));
});
