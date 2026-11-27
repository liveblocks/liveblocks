/**
 * The plan is stored in centimeters; these format lengths and areas for
 * display in the units each person picked. Units are a local preference, so
 * two people can look at the same plan in meters and in feet.
 */

export type Unit = "metric" | "imperial";

const CM_PER_INCH = 2.54;
const CM2_PER_FT2 = 929.0304;

/** A wall or room dimension: `3.60 m` or `11′ 10″`. */
export function formatLength(cm: number, unit: Unit) {
  if (unit === "metric") {
    return `${(cm / 100).toFixed(2)} m`;
  }
  const inches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return rest === 0 ? `${feet}′` : `${feet}′ ${rest}″`;
}

/** A furniture-scale dimension: `220 cm` or `87″`. */
export function formatSize(cm: number, unit: Unit) {
  return unit === "metric"
    ? `${Math.round(cm)} cm`
    : `${Math.round(cm / CM_PER_INCH)}″`;
}

/** A floor area: `24.5 m²` or `264 ft²`. */
export function formatArea(cm2: number, unit: Unit) {
  return unit === "metric"
    ? `${(cm2 / 10_000).toFixed(1)} m²`
    : `${Math.round(cm2 / CM2_PER_FT2)} ft²`;
}

/** Converts centimeters to the number shown in a size field. */
export function toDisplaySize(cm: number, unit: Unit) {
  return unit === "metric"
    ? Math.round(cm)
    : Math.round((cm / CM_PER_INCH) * 10) / 10;
}

/** Converts a number typed in a size field back to centimeters. */
export function fromDisplaySize(value: number, unit: Unit) {
  return unit === "metric" ? value : value * CM_PER_INCH;
}

export function sizeSuffix(unit: Unit) {
  return unit === "metric" ? "cm" : "in";
}

/**
 * A round length for the scale bar that's at least `minPixels` wide at the
 * current zoom (pixels per centimeter).
 */
export function scaleBarLength(zoom: number, unit: Unit, minPixels = 64) {
  const steps =
    unit === "metric"
      ? [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
      : [1, 2, 5, 10, 20, 50, 100, 200].map((feet) => feet * 12 * CM_PER_INCH);
  const cm = steps.find((step) => step * zoom >= minPixels) ?? steps.at(-1)!;
  const label =
    unit === "metric"
      ? cm >= 100
        ? `${cm / 100} m`
        : `${cm} cm`
      : `${Math.round(cm / (12 * CM_PER_INCH))} ft`;
  return { cm, label };
}
