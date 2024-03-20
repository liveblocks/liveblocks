/**
 * Use this symbol to brand an object property as internal.
 *
 * @example
 * Object.defineProperty(
 *   {
 *     public,
 *     [kInternal]: {
 *       private
 *     },
 *   },
 *   kInternal,
 *   {
 *     enumerable: false,
 *   }
 * );
 */
export const kInternal = Symbol();
