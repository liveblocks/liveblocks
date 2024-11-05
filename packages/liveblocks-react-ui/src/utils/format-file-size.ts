import { numberFormat } from "./intl";

const BASE = 1000;
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

  let value = bytes / BASE ** unit;
  let maximumDecimals = 1;

  if (unit === 1) {
    // Hide decimals for KB values above 10
    if (value >= 10) {
      maximumDecimals = 0;
    }

    // Allow 2 decimals instead of 1 for KB values below 0.1
    if (value < 0.1 && value > 0) {
      maximumDecimals = 2;
    }

    // Display tiny KB values as 0.01 KB instead of 0 KB
    if (value < 0.01) {
      value = 0.01;
    }
  }

  const formattedUnit = UNITS[unit];
  const formattedValue = numberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maximumDecimals,
  }).format(value);

  return `${formattedValue} ${formattedUnit}`;
}
