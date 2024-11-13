/**
 * @internal
 * Emit a warning only once if a condition is met, in development only.
 */
export const createDevelopmentWarning = (
  condition: boolean | (() => boolean),
  ...args: Parameters<typeof console.warn>
) => {
  let hasWarned = false;

  if (process.env.NODE_ENV !== "production") {
    return () => {
      if (
        !hasWarned &&
        (typeof condition === "function" ? condition() : condition)
      ) {
        console.warn(...args);

        hasWarned = true;
      }
    };
  } else {
    return () => {};
  }
};
