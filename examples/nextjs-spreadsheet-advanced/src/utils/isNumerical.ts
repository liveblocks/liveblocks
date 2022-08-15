export function isNumerical(value: any) {
  if (typeof value != "string") return false; // we only process strings!
  return (
    !Number.isNaN(value as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !Number.isNaN(Number.parseFloat(value))
  ); // ...and ensure strings of whitespace fail
}
