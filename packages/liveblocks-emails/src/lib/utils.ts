export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isMentionNodeAttributeId = (
  value: unknown
): value is `in_${string}` => {
  return isString(value) && value.startsWith("in_");
};

export const exists = <T>(input: null | undefined | T): input is T => {
  return input !== null && input !== undefined;
};
