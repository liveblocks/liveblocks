/**
 * Use this symbol to brand an object property as internal.
 *
 * @example
 * Object.defineProperty(
 *   {
 *     public,
 *     [INTERNAL]: {
 *       private
 *     },
 *   },
 *   INTERNAL,
 *   {
 *     enumerable: false,
 *   }
 * );
 */
export const INTERNAL = Symbol("kInternal");
