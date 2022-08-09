export function isNumerical(value: any) {
  return !Number.isNaN(value) && !Number.isNaN(Number.parseFloat(value));
}
