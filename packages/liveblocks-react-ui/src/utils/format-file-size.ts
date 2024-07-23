import { numberFormat } from "./intl";

const base = 1024;
const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];

export function formatFileSize(bytes: number, locale?: string) {
  const unitIndex = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1)
  );
  const value = bytes / base ** unitIndex;
  const fractionDigits = value < 10 ? 1 : 0;

  return numberFormat(locale, {
    style: "unit",
    unit: units[unitIndex],
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
