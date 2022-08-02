export function isNumeric(string: any) {
  return !Number.isNaN(string) && !Number.isNaN(Number.parseFloat(string));
}
