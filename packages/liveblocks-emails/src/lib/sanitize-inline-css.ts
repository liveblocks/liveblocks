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

const PROPERTIES_WITH_URL = [
  "background-image",
  "background",
  "border-image-source",
  "list-style-image",
  "cursor",
  "content",
];

const DANGEROUS_CSS_VALUE_CHARACTERS = new RegExp(/[^a-zA-Z0-9\s#,.%()-]/, "g");

const URL_MATCH = new RegExp(/url\((.*?)\)/, "i");
const URL_PATTERN = new RegExp(/^https?:\/\/[^\s/$.?#].[^\s]*$/, "i");

const sanitizeURLValue = (value: string): string => {
  const urlMatch = value.match(URL_MATCH);
  if (urlMatch && urlMatch[1]) {
    // NOTE: removing quotes
    const url = urlMatch[1].replace(/['"]/g, "");
    if (URL_PATTERN.test(url)) {
      return `url('${url}')`;
    }
  }
  return "";
};

/**
 * Sanitize inline CSS and prevent any css injections
 */
export function sanitizeInlineCSS(inlineCSS: string): string {
  // NOTE: remove all unwanted and unnecessary white spaces
  const cleanInlineCSS = inlineCSS.replace(/\s*([:;])\s*/g, "$1").trim();

  const cssDeclarations = cleanInlineCSS.split(";").filter(Boolean);
  const sanitizedCSSDeclarations = cssDeclarations.map((cssDeclaration) => {
    const [prop, value] = cssDeclaration.split(":");
    if (!prop || !value) {
      return "";
    }

    const property = prop.trim();
    if (ALLOWED_PROPERTIES.includes(property)) {
      let sanitizedCSSValue = "";

      // NOTE: handling valid and secure URLS
      if (PROPERTIES_WITH_URL.includes(property)) {
        sanitizedCSSValue = sanitizeURLValue(value.trim());
      } else {
        sanitizedCSSValue = value
          .trim()
          .replace(DANGEROUS_CSS_VALUE_CHARACTERS, "");
      }

      if (sanitizedCSSValue) {
        return property + ":" + sanitizedCSSValue;
      }
    }

    return "";
  });

  const sanitizedInlineCSS =
    sanitizedCSSDeclarations.filter(Boolean).join(";") + ";";

  return sanitizedInlineCSS;
}
