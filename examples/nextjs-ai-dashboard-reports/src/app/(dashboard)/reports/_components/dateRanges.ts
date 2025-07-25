export const DATE_RANGES = {
  "7": { days: 7, label: "Last 7 days" },
  "30": { days: 30, label: "Last 30 days" },
  "60": { days: 60, label: "Last 60 days" },
  "90": { days: 90, label: "Last 90 days" },
  "180": { days: 180, label: "Last 180 days" },
  "365": { days: 365, label: "Last 365 days" },
} as const

export type RangeKey = keyof typeof DATE_RANGES

export const DEFAULT_RANGE: RangeKey = "60"

export const RANGE_DAYS: { [K in RangeKey]: number } = Object.fromEntries(
  Object.entries(DATE_RANGES).map(([key, { days }]) => [key, days]),
) as { [K in RangeKey]: number }

export const RANGE_LABELS: { [K in RangeKey]: string } = Object.fromEntries(
  Object.entries(DATE_RANGES).map(([key, { label }]) => [key, label]),
) as { [K in RangeKey]: string }
