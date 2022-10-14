/**
 * Freezes the given argument, but only in development builds. In production
 * builds, this is a no-op for performance reasons.
 */
export const freeze: typeof Object.freeze =
  process.env.NODE_ENV === "production"
    ? (((x: unknown) => x) as typeof Object.freeze)
    : Object.freeze;
