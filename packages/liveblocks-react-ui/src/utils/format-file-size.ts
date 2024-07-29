import { numberFormat } from "./intl";

const BASE = 1024;
const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number, locale?: string) {
  if (bytes === 0) {
    return `0 ${UNITS[1]}`;
  }

  let unit: number;

  if (bytes === 0) {
    unit = 1;
  } else {
    unit = Math.max(
      1,
      Math.min(
        Math.floor(Math.log(Math.abs(bytes)) / Math.log(BASE)),
        UNITS.length - 1
      )
    );
  }

  const value = bytes / BASE ** unit;
  // Hide decimals for KB values above 10
  const hideDecimals = unit === 1 ? value >= 10 : false;

  const formattedUnit = UNITS[unit];
  const formattedValue = numberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: hideDecimals ? 0 : 1,
  }).format(value);

  return `${formattedValue} ${formattedUnit}`;
}
