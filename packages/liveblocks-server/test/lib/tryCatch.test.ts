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

import { describe, expect, test } from "vitest";

import { tryCatch } from "~/lib/tryCatch";

describe("tryCatch", () => {
  test("resolving promise", async () => {
    const [data, error] = await tryCatch(Promise.resolve(42));
    expect(data).toEqual(42);
    expect(error).toBeUndefined();
  });

  test("rejecting promise", async () => {
    const err = new Error("nope");
    const [data, error] = await tryCatch(Promise.reject(err));
    expect(data).toBeUndefined();
    expect(error).toBe(err);
  });

  test("async function that returns", async () => {
    const [data, error] = await tryCatch(() => Promise.resolve("hi"));
    expect(data).toEqual("hi");
    expect(error).toBeUndefined();
  });

  test("async function that throws", async () => {
    const err = new Error("nope");
    const [data, error] = await tryCatch(() => Promise.reject(err));
    expect(data).toBeUndefined();
    expect(error).toBe(err);
  });

  test("promise-likes (thenables) are treated as async, like real promises", async () => {
    const thenable: PromiseLike<number> = {
      then(onFulfilled) {
        return Promise.resolve(42).then(onFulfilled);
      },
    };
    const [data, error] = await tryCatch(() => thenable);
    expect(data).toEqual(42);
    expect(error).toBeUndefined();
  });

  test("rejecting promise-likes (thenables) are caught, like real promises", async () => {
    const err = new Error("nope");
    const thenable: PromiseLike<number> = {
      then(onFulfilled, onRejected) {
        return Promise.reject(err).then(onFulfilled, onRejected);
      },
    };
    const [data, error] = await tryCatch(() => thenable);
    expect(data).toBeUndefined();
    expect(error).toBe(err);
  });

  test("sync callback returns a sync tuple, not a promise", () => {
    const result = tryCatch(() => 42);
    expect(result).toEqual([42, undefined]);
  });

  test("throwing sync callback returns a sync tuple, not a promise", () => {
    const err = new Error("nope");
    const result = tryCatch((): number => {
      throw err;
    });
    expect(result).toEqual([undefined, err]);
  });

  test("function that throws synchronously, before creating a promise", async () => {
    const err = new Error("nope");
    // Caveat: tryCatch cannot know this callback was *supposed* to return
    // a promise, so the error tuple is returned synchronously here, despite
    // the Promise return type. Awaiting it (like all call sites do) works
    // either way.
    const [data, error] = await tryCatch((): Promise<number> => {
      throw err; // No promise is ever created
    });
    expect(data).toBeUndefined();
    expect(error).toBe(err);
  });

  test("non-Error throw values are captured as-is", () => {
    const [data, error] = tryCatch<number, string>((): number => {
      throw "a string, not an Error";
    });
    expect(data).toBeUndefined();
    expect(error).toEqual("a string, not an Error");
  });

  test("falsy resolved values are still successes", async () => {
    for (const value of [undefined, null, 0, "", false]) {
      const [data, error] = await tryCatch(Promise.resolve(value));
      expect(data).toBe(value);
      expect(error).toBeUndefined();
    }
  });
});
