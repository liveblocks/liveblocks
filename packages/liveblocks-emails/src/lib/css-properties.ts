import type { Properties } from "csstype";

/**
 * CSS properties object.
 * Type alias for DX purposes.
 *
 */
export type CSSProperties = Properties;

/**
 * Vendors
 */
const VENDORS_PREFIXES = new RegExp(/^(webkit|moz|ms|o)-/);

/**
 * CSS properties which accept numbers but are not in units of "px".
 * Based on: https://github.com/facebook/react/blob/bfe91fbecf183f85fc1c4f909e12a6833a247319/packages/react-dom-bindings/src/shared/isUnitlessNumber.js
 */
const UNITLESS_PROPERTIES = [
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "gridArea",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "fontWeight",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "MozAnimationIterationCount",
  "MozBoxFlex",
  "MozBoxFlexGroup",
  "MozLineClamp",
  "msAnimationIterationCount",
  "msFlex",
  "msZoom",
  "msFlexPositive",
  "msGridColumns",
  "msGridRows",
  "WebkitAnimationIterationCount",
  "WebkitBoxFlex",
  "WebKitBoxFlexGroup",
  "WebkitBoxOrdinalGroup",
  "WebkitColumnCount",
  "WebkitColumns",
  "WebkitFlex",
  "WebkitFlexGrow",
  "WebkitFlexPositive",
  "WebkitFlexShrink",
  "WebkitLineClamp",
];

/**
 * Convert a `CSSProperties` style object into a inline CSS string.
 */
export function toInlineCSSString(styles: CSSProperties): string {
  const entries = Object.entries(styles);
  const inline = entries
    .map(([key, value]): string | null => {
      // Return an empty string if `value` is not acceptable
      if (
        value === null ||
        typeof value === "boolean" ||
        value === "" ||
        typeof value === "undefined"
      ) {
        return "";
      }

      // Convert key from camelCase to kebab-case
      let property = key.replace(/([A-Z])/g, "-$1").toLowerCase();

      // Manage vendors prefixes
      if (VENDORS_PREFIXES.test(property)) {
        property = `-${property}`;
      }

      // Add `px` if needed for properties which aren't unitless
      if (typeof value === "number" && !UNITLESS_PROPERTIES.includes(key)) {
        return `${property}:${value}px;`;
      }

      return `${property}:${String(value).trim()};`;
    })
    .filter(Boolean)
    .join("");

  return inline;
}
