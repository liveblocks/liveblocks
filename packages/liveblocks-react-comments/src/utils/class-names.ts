export function classNames(
  ...args: (string | number | boolean | undefined | null)[]
) {
  return args
    .filter((arg) => typeof arg === "string" || typeof arg === "number")
    .join(" ");
}
