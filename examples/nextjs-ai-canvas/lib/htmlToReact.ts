// Lightweight HTML -> React (JSX) conversion for the scope of a visual demo.
// This is intentionally simple: it converts attributes (class -> className, etc.),
// turns inline style strings into style objects, self-closes void elements, and
// wraps the markup in a single `Component` function.

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// HTML attribute name -> JSX attribute name (only the common ones).
const ATTRIBUTE_RENAMES: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  contenteditable: "contentEditable",
  spellcheck: "spellCheck",
  srcset: "srcSet",
};

function styleStringToObjectLiteral(style: string): string {
  const entries = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) {
        return null;
      }
      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (!property) {
        return null;
      }
      const camelProperty = property.startsWith("--")
        ? property
        : property.replace(/-([a-z])/g, (_, char: string) =>
            char.toUpperCase()
          );
      return `${JSON.stringify(camelProperty)}: ${JSON.stringify(value)}`;
    })
    .filter((entry): entry is string => entry !== null);

  return `{ ${entries.join(", ")} }`;
}

function convertAttributes(html: string): string {
  // style="..." / style='...' -> style={{ ... }}
  let result = html.replace(
    /style\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_match, _quoted, doubleQuoted, singleQuoted) => {
      const styleValue = doubleQuoted ?? singleQuoted ?? "";
      return `style={${styleStringToObjectLiteral(styleValue)}}`;
    }
  );

  // Rename known attributes when they appear as attributes (preceded by whitespace).
  for (const [htmlName, jsxName] of Object.entries(ATTRIBUTE_RENAMES)) {
    const pattern = new RegExp(`(\\s)${htmlName}(\\s*=)`, "gi");
    result = result.replace(pattern, `$1${jsxName}$2`);
  }

  return result;
}

function selfCloseVoidElements(html: string): string {
  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)\s*\/?>/g,
    (match, tagName: string, attributes: string) => {
      if (!VOID_ELEMENTS.has(tagName.toLowerCase())) {
        return match;
      }
      const trimmedAttributes = attributes.trim();
      return trimmedAttributes
        ? `<${tagName} ${trimmedAttributes} />`
        : `<${tagName} />`;
    }
  );
}

function convertComments(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, (_match, content: string) => {
    // `*/` would prematurely close the JSX block comment, so neutralize it.
    const safe = content.replace(/\*\//g, "* /").trim();
    return `{/* ${safe} */}`;
  });
}

function indentBlock(content: string, indent: string): string {
  return content
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `${indent}${line}` : line))
    .join("\n");
}

export function htmlToReactComponent(html: string): string {
  const withAttributes = convertAttributes(html);
  const withVoidElements = selfCloseVoidElements(withAttributes);
  const withComments = convertComments(withVoidElements);
  const jsx = withComments.trim();
  const indentedJsx = indentBlock(jsx, "      ");

  return `function Component() {
  return (
    <>
${indentedJsx}
    </>
  );
}`;
}
