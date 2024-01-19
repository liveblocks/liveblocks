/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

type OmitFirstTupleElement<T extends any[]> = T extends [any, ...infer R]
  ? R
  : never;

export function stringify(
  object: Parameters<typeof JSON.stringify>[0],
  ...args: OmitFirstTupleElement<Parameters<typeof JSON.stringify>>
): string {
  if (typeof object !== "object" || object === null || Array.isArray(object)) {
    return JSON.stringify(object, ...args);
  }

  const sortedObject = Object.keys(object)
    .sort()
    .reduce(
      (sortedObject, key) => {
        sortedObject[key] = object[key];

        return sortedObject;
      },
      {} as Record<string, any>
    );

  return JSON.stringify(sortedObject, ...args);
}
