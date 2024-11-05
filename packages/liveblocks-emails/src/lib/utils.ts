export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const assertMentionNodeAttributeId = (
  value: unknown
): value is `in_${string}` => {
  return isString(value) && value.startsWith("in_");
};
