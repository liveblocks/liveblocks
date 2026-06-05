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

/**
 * Given a promise or promise factory, returns a 2-tuple of success or failure.
 * This pattern avoids having to build deeply nested try / catch clauses, where
 * success variables need to be defined as a `let` outside of the `try` block.
 *
 * Turns:
 *
 *   let result;
 *   try {
 *     result = await doSomething();
 *   } catch (error) {
 *     // do something with error
 *   }
 *
 *   doAnotherThing(result);
 *
 * Into:
 *
 *   const [result, error] = await tryCatch(doSomething());
 *   if (error) {
 *     // do something with error
 *   }
 *   doAnotherThing(result);
 *
 * When given a sync callback, the tuple is returned synchronously (no await
 * needed):
 *
 *   const [result, error] = tryCatch(() => doSomethingSync());
 *
 */
function isThenable<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function tryCatch<T, E = Error>(
  promise: PromiseLike<T> | (() => PromiseLike<T>)
): Promise<[T, undefined] | [undefined, E]>;
export function tryCatch<T, E = Error>(
  fn: () => T
): [T, undefined] | [undefined, E];
export function tryCatch<T, E = Error>(
  promise: PromiseLike<T> | (() => PromiseLike<T>) | (() => T)
): Promise<[T, undefined] | [undefined, E]> | [T, undefined] | [undefined, E] {
  try {
    const result = typeof promise === "function" ? promise() : promise;
    if (isThenable(result)) {
      return Promise.resolve(result).then(
        (data: T): [T, undefined] => [data, undefined],
        (error: unknown): [undefined, E] => [undefined, error as E]
      );
    }
    return [result, undefined];
  } catch (error) {
    return [undefined, error as E];
  }
}
