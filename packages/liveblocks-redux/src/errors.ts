export const ERROR_PREFIX = "Invalid @liveblocks/redux middleware config.";

export function missingClient(): Error {
  return new Error(`${ERROR_PREFIX} client is missing`);
}

export function mappingShouldBeAnObject(
  mappingType: "storageMapping" | "presenceMapping"
): Error {
  return new Error(
    `${ERROR_PREFIX} ${mappingType} should be an object where the values are boolean.`
  );
}

export function mappingValueShouldBeABoolean(
  mappingType: "storageMapping" | "presenceMapping",
  key: string
): Error {
  return new Error(
    `${ERROR_PREFIX} ${mappingType}.${key} value should be a boolean`
  );
}

export function mappingShouldNotHaveTheSameKeys(key: string): Error {
  return new Error(
    `${ERROR_PREFIX} "${key}" is mapped on presenceMapping and storageMapping. A key shouldn't exist on both mapping.`
  );
}

export function mappingToFunctionIsNotAllowed(key: string): Error {
  return new Error(
    `${ERROR_PREFIX} mapping.${key} is invalid. Mapping to a function is not allowed.`
  );
}
