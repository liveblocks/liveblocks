/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

function replacer(_key: string, value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          // @ts-expect-error this is fine
          sorted[key] = value[key];
          return sorted;
        }, {})
    : value;
}

/**
 * Like JSON.stringify(), but returns the same value no matter how keys in any
 * nested objects are ordered.
 */
export function stringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}
