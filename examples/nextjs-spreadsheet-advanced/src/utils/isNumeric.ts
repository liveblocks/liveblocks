export function isNumeric(string: any) {
  return !isNaN(string) && !isNaN(parseFloat(string));
}
