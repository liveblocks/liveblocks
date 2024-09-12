// XXX Move to generic guards lib
export const assertFilterIsStartsWithOperator = (
  filter: boolean | string | number | undefined | { startsWith: string }
): filter is { startsWith: string } => {
  if (typeof filter === "object" && typeof filter.startsWith === "string") {
    return true;
  } else {
    return false;
  }
};

// XXX Move to generic guards lib
// XXX Rename to isString
export const assertMetadataValueIsString = (
  value: unknown
): value is string => {
  return typeof value === "string";
};
