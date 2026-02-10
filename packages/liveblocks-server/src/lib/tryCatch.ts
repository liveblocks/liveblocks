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
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T> | (() => Promise<T>) | (() => T)
): Promise<[T, undefined] | [undefined, E]> {
  try {
    const data = await (typeof promise === "function" ? promise() : promise);
    return [data, undefined];
  } catch (error) {
    return [undefined, error as E];
  }
}
