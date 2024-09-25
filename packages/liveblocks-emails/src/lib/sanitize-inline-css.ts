const ALLOWED_PROPERTIES = [
  "font-size",
  "color",
  "background-color",
  "margin",
  "padding",
  "border",
  "width",
  "height",
  "font-family",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "display",
  "vertical-align",
  "background",
  "background-image",
  "background-repeat",
  "background-position",
  "background-size",
  "border-radius",
  "border-width",
  "border-style",
  "border-color",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "max-width",
  "min-width",
  "max-height",
  "min-height",
  "overflow",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "opacity",
  "visibility",
  "white-space",
];

const PROPERTIES_WITH_POTENTIAL_URL = [
  "background-image",
  "background",
  "border-image-source",
  "list-style-image",
  "cursor",
  "content",
];

const DANGEROUS_CSS_VALUE_CHARACTERS = new RegExp(/[^a-zA-Z0-9\s#,.%()-]/, "g");

const URL_MATCH = new RegExp(/url\(['"]?(.*?)['"]?\)/, "i");
const URL_PATTERN = new RegExp(/^https?:\/\/[^\s/$.?#].[^\s]*$/, "i");

const sanitizeValue = (value: string): string =>
  value.replace(DANGEROUS_CSS_VALUE_CHARACTERS, "");

const sanitizeValueWithPotentialURL = (value: string): string => {
  const urlMatch = value.match(URL_MATCH);
  if (urlMatch && urlMatch[1]) {
    // NOTE: removing quotes
    const sanitizedUrl = urlMatch[1].replace(/['"]/g, "");
    if (URL_PATTERN.test(sanitizedUrl)) {
      return value.replace(urlMatch[0], `url('${sanitizedUrl}')`);
    }
    return "";
  }
  return sanitizeValue(value);
};

/**
 * Sanitize inline CSS and prevent any css injections
 */
export function sanitizeInlineCSS(inlineCSS: string): string {
  // NOTE: remove all unwanted and unnecessary white spaces
  const cleanInlineCSS = inlineCSS.replace(/\s*([:;])\s*/g, "$1").trim();

  const cssDeclarations = cleanInlineCSS.split(";").filter(Boolean);
  const sanitizedCSSDeclarations = cssDeclarations.map((cssDeclaration) => {
    const firstColonIndex = cssDeclaration.indexOf(":");
    if (firstColonIndex === -1) {
      return "";
    }

    const property = (cssDeclaration.slice(0, firstColonIndex) ?? "").trim();
    const value = (cssDeclaration.slice(firstColonIndex + 1) ?? "").trim();

    if (!property || !value) {
      return "";
    }

    if (ALLOWED_PROPERTIES.includes(property)) {
      let sanitizedCSSValue = "";

      // NOTE: handling valid and secure URLs if there are any
      if (PROPERTIES_WITH_POTENTIAL_URL.includes(property)) {
        sanitizedCSSValue = sanitizeValueWithPotentialURL(value);
      } else {
        sanitizedCSSValue = sanitizeValue(value);
      }

      if (sanitizedCSSValue) {
        return property + ":" + sanitizedCSSValue;
      }
    }

    return "";
  });

  const sanitizedInlineCSS = sanitizedCSSDeclarations.filter(Boolean).join(";");

  return sanitizedInlineCSS ? sanitizedInlineCSS + ";" : "";
}
