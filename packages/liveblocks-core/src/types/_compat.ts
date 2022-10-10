/**
 * In TypeScript 4.6, VisibilityState got renamed to
 * DocumentVisibilityState. There's no good way to conditionally
 * (based on the TypeScript version our users are using) read one
 * or the other, so we're defining the type locally ourselves
 * here.
 */

export type DocumentVisibilityState = "hidden" | "visible";
