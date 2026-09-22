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

import { ClientMsgCode, OpCode } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { clientMsgDecoder } from "~/decoders";

describe("clientMsgDecoder", () => {
  test("accepts valid CREATE_FILE storage file ids", () => {
    expect(() =>
      clientMsgDecoder.verify({
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          {
            type: OpCode.CREATE_FILE,
            opId: "op-1",
            id: "1:0",
            parentId: "root",
            parentKey: "cover",
            data: {
              id: "fl_123456789012345678901",
              name: "cover.png",
              size: 123,
              mimeType: "image/png",
            },
          },
        ],
      })
    ).not.toThrow();
  });

  test("accepts a zero-byte CREATE_FILE", () => {
    expect(() =>
      clientMsgDecoder.verify({
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          {
            type: OpCode.CREATE_FILE,
            opId: "op-1",
            id: "1:0",
            parentId: "root",
            parentKey: "empty",
            data: {
              id: "fl_123456789012345678901",
              name: "empty.txt",
              size: 0,
              mimeType: "text/plain",
            },
          },
        ],
      })
    ).not.toThrow();
  });

  test("rejects invalid CREATE_FILE storage file ids", () => {
    expect(() =>
      clientMsgDecoder.verify({
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          {
            type: OpCode.CREATE_FILE,
            opId: "op-1",
            id: "1:0",
            parentId: "root",
            parentKey: "cover",
            data: {
              id: "file_123",
              name: "cover.png",
              size: 123,
              mimeType: "image/png",
            },
          },
        ],
      })
    ).toThrow();
  });

  test.each([-1, 1.5])("rejects invalid CREATE_FILE size %s", (size) => {
    expect(() =>
      clientMsgDecoder.verify({
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          {
            type: OpCode.CREATE_FILE,
            opId: "op-1",
            id: "1:0",
            parentId: "root",
            parentKey: "cover",
            data: {
              id: "fl_123456789012345678901",
              name: "cover.png",
              size,
              mimeType: "image/png",
            },
          },
        ],
      })
    ).toThrow();
  });
});
