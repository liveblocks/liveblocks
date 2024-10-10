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
const VENDORS_PREFIXES = new RegExp(/^(Webkit|Moz|ms|O)([A-Z])/);

/**
 * CSS properties which accept numbers but are not in units of "px".
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
  "msFlexGrow",
  "msFlexNegative",
  "msFlexOrder",
  "msFlexPositive",
  "msFlexShrink",
  "msGridColumn",
  "msGridColumnSpan",
  "msGridRow",
  "msGridRowSpan",
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
      if (value === null || typeof value === "boolean" || value === "") {
        return "";
      }

      // Convert css property to camelCase and manage
      // vendors prefixes
      const property = key
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(
          VENDORS_PREFIXES,
          (_substring: string, prefix: string, letter: string) =>
            `-${prefix.toLowerCase()}-${letter.toLowerCase()}`
        );

      // Add `px` if needed for properties which aren't unitless
      if (typeof value === "number" && !UNITLESS_PROPERTIES.includes(key)) {
        return `${property}:${value}px`;
      }

      return `${property}:${String(value).trim()};`;
    })
    .filter(Boolean)
    .join("");

  return inline;
}
