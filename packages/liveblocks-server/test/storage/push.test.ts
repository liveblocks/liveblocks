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

import { makePosition, OpCode } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { createRegisterOp } from "~test/plugins/_generateFullTestSuite";

import { list, register, rootObj, runWithStorage } from "./utils";

const FIRST = makePosition();
const SECOND = makePosition(FIRST);
const THIRD = makePosition(SECOND);

// Server-authoritative append for push-tagged CREATE ops. The server
// ignores the client-guessed parentKey and places the node after the current
// last sibling, sending a SET_PARENT_KEY fix when that differs from the guess.
describe("push intent — server-authoritative append", () => {
  test("keeps the guessed position when it already sorts after the tail (no fix)", () =>
    runWithStorage(
      [rootObj(), list("0:1", "root", "list")],
      ({ storage, driver }) => {
        // Empty list; the client guessed THIRD. It already sorts after every
        // existing sibling (there are none), so the server keeps it as-is
        // rather than pointlessly relocating it to the canonical first slot.
        const [res] = storage.applyOps([
          createRegisterOp("1:0", "0:1", THIRD, "a", "push"),
        ]);

        expect(driver.get_child_at("0:1", THIRD)).toBe("1:0");
        if (!res || res.action !== "accepted") {
          throw new Error("expected the push op to be accepted");
        }
        expect(res.fix).toBeUndefined();
      }
    ));

  test("does not send a fix when the guessed position already matches the tail", () =>
    runWithStorage(
      [
        rootObj(),
        list("0:1", "root", "list"),
        register("0:2", "0:1", FIRST, "a"),
      ],
      ({ storage, driver }) => {
        // Client knows about "a" and guesses SECOND, which is also where the
        // server appends — no correction needed.
        const [res] = storage.applyOps([
          createRegisterOp("1:0", "0:1", SECOND, "b", "push"),
        ]);

        expect(driver.get_child_at("0:1", SECOND)).toBe("1:0");
        if (!res || res.action !== "accepted") {
          throw new Error("expected the push op to be accepted");
        }
        expect(res.fix).toBeUndefined();
      }
    ));

  test("a push guessing the head appends after the last sibling, never between", () =>
    runWithStorage(
      [
        rootObj(),
        list("0:1", "root", "list"),
        register("0:2", "0:1", FIRST, "a"),
        register("0:3", "0:1", SECOND, "b"),
      ],
      ({ storage, driver }) => {
        // Stale guess of the head position; the server appends after "b".
        const [res] = storage.applyOps([
          createRegisterOp("1:0", "0:1", FIRST, "c", "push"),
        ]);

        expect(driver.get_child_at("0:1", THIRD)).toBe("1:0");
        if (!res || res.action !== "accepted") {
          throw new Error("expected the push op to be accepted");
        }
        expect(res.fix).toEqual({
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: THIRD,
        });
      }
    ));

  test("concurrent pushes all guessing the head settle in arrival order", () =>
    runWithStorage(
      [rootObj(), list("0:1", "root", "list")],
      ({ storage, driver }) => {
        // Three independent clients each guess the head position. Applied
        // serially (as the room mutex guarantees), each appends after the
        // previous one — strictly increasing keys, no wedge.
        storage.applyOps([
          createRegisterOp("1:0", "0:1", FIRST, "a", "push"),
          createRegisterOp("2:0", "0:1", FIRST, "b", "push"),
          createRegisterOp("3:0", "0:1", FIRST, "c", "push"),
        ]);

        expect(driver.get_child_at("0:1", FIRST)).toBe("1:0");
        expect(driver.get_child_at("0:1", SECOND)).toBe("2:0");
        expect(driver.get_child_at("0:1", THIRD)).toBe("3:0");
      }
    ));
});
