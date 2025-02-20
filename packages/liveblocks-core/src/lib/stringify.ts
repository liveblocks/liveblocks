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
 * Like JSON.stringify(), but using stable (sorted) object key order, so that
 * it returns the same value for the same keys, no matter their order.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}
