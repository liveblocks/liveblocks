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

import { OpCode } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { op } from "~/decoders/Op";

describe("LiveText op decoder", () => {
  test.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe CREATE_TEXT version %s",
    (version) => {
      expect(
        op.decode({
          type: OpCode.CREATE_TEXT,
          opId: "1:1",
          id: "1:1",
          parentId: "root",
          parentKey: "text",
          data: [["Hello"]],
          version,
        }).ok
      ).toBe(false);
    }
  );

  test.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe UPDATE_TEXT base version %s",
    (baseVersion) => {
      expect(
        op.decode({
          type: OpCode.UPDATE_TEXT,
          opId: "1:2",
          id: "1:1",
          baseVersion,
          ops: [{ type: "insert", index: 0, text: "Hello" }],
        }).ok
      ).toBe(false);
    }
  );

  test("rejects an unsafe authoritative UPDATE_TEXT version", () => {
    expect(
      op.decode({
        type: OpCode.UPDATE_TEXT,
        opId: "1:2",
        id: "1:1",
        baseVersion: 0,
        version: 0.5,
        ops: [{ type: "insert", index: 0, text: "Hello" }],
      }).ok
    ).toBe(false);
  });

  test("accepts non-negative safe LiveText versions", () => {
    expect(
      op.decode({
        type: OpCode.UPDATE_TEXT,
        opId: "1:2",
        id: "1:1",
        baseVersion: 0,
        version: Number.MAX_SAFE_INTEGER,
        ops: [{ type: "insert", index: 0, text: "Hello" }],
      }).ok
    ).toBe(true);
  });
});
