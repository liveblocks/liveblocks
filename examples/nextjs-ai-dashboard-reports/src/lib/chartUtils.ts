// Tremor Raw chartColors [v0.0.0]

export type ColorUtility = "bg" | "stroke" | "fill" | "text"

export const chartColors = {
  blue: {
    bg: "bg-blue-500 dark:bg-blue-500",
    stroke: "stroke-blue-500 dark:stroke-blue-500",
    fill: "fill-blue-500 dark:fill-blue-500",
    text: "text-blue-500 dark:text-blue-500",
  },
  emerald: {
    bg: "bg-emerald-500 dark:bg-emerald-400",
    stroke: "stroke-emerald-500 dark:stroke-emerald-400",
    fill: "fill-emerald-500 dark:fill-emerald-400",
    text: "text-emerald-500 dark:text-emerald-400",
  },
  violet: {
    bg: "bg-violet-500 dark:bg-violet-500",
    stroke: "stroke-violet-500 dark:stroke-violet-500",
    fill: "fill-violet-500 dark:fill-violet-500",
    text: "text-violet-500 dark:text-violet-500",
  },
  amber: {
    bg: "bg-amber-500 dark:bg-amber-500",
    stroke: "stroke-amber-500 dark:stroke-amber-500",
    fill: "fill-amber-500 dark:fill-amber-500",
    text: "text-amber-500 dark:text-amber-500",
  },
  gray: {
    bg: "bg-gray-400 dark:bg-gray-600",
    stroke: "stroke-gray-400 dark:stroke-gray-600",
    fill: "fill-gray-400 dark:fill-gray-600",
    text: "text-gray-400 dark:text-gray-600",
  },
  rose: {
    bg: "bg-rose-600 dark:bg-rose-500",
    stroke: "stroke-rose-600 dark:stroke-rose-500",
    fill: "fill-rose-600 dark:fill-rose-500",
    text: "text-rose-600 dark:text-rose-500",
  },
  sky: {
    bg: "bg-sky-500 dark:bg-sky-500",
    stroke: "stroke-sky-500 dark:stroke-sky-500",
    fill: "fill-sky-500 dark:fill-sky-500",
    text: "text-sky-500 dark:text-sky-500",
  },
  cyan: {
    bg: "bg-cyan-500 dark:bg-cyan-500",
    stroke: "stroke-cyan-500 dark:stroke-cyan-500",
    fill: "fill-cyan-500 dark:fill-cyan-500",
    text: "text-cyan-500 dark:text-cyan-500",
  },
  indigo: {
    bg: "bg-indigo-600 dark:bg-indigo-500",
    stroke: "stroke-indigo-600 dark:stroke-indigo-500",
    fill: "fill-indigo-600 dark:fill-indigo-500",
    text: "text-indigo-600 dark:text-indigo-500",
  },
  orange: {
    bg: "bg-orange-500 dark:bg-orange-400",
    stroke: "stroke-orange-500 dark:stroke-orange-400",
    fill: "fill-orange-500 dark:fill-orange-400",
    text: "text-orange-500 dark:text-orange-400",
  },
  pink: {
    bg: "bg-pink-500 dark:bg-pink-500",
    stroke: "stroke-pink-500 dark:stroke-pink-500",
    fill: "fill-pink-500 dark:fill-pink-500",
    text: "text-pink-500 dark:text-pink-500",
  },
  red: {
    bg: "bg-red-500 dark:bg-red-500",
    stroke: "stroke-red-500 dark:stroke-red-500",
    fill: "fill-red-500 dark:fill-red-500",
    text: "text-red-500 dark:text-red-500",
  },
  lightGray: {
    bg: "bg-gray-300 dark:bg-gray-700",
    stroke: "stroke-gray-300 dark:stroke-gray-700",
    fill: "fill-gray-300 dark:fill-gray-700",
    text: "text-gray-300 dark:text-gray-700",
  },
} as const satisfies {
  [color: string]: {
    [key in ColorUtility]: string
  }
}

export type AvailableChartColorsKeys = keyof typeof chartColors

export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
  chartColors,
) as Array<AvailableChartColorsKeys>

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length])
  })
  return categoryColors
}

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: ColorUtility,
): string => {
  const fallbackColor = {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  }
  return chartColors[color]?.[type] ?? fallbackColor[type]
}

// Tremor Raw getYAxisDomain [v0.0.0]

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0)
  const maxDomain = maxValue ?? "auto"
  return [minDomain, maxDomain]
}

// Tremor Raw hasOnlyOneValueForKey [v0.1.0]

export function hasOnlyOneValueForKey(
  array: any[],
  keyToCheck: string,
): boolean {
  const val: any[] = []

  for (const obj of array) {
    if (Object.prototype.hasOwnProperty.call(obj, keyToCheck)) {
      val.push(obj[keyToCheck])
      if (val.length > 1) {
        return false
      }
    }
  }

  return true
}
