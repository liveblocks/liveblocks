export function dedent(strings: TemplateStringsArray, ...values: any[]): string;
export function dedent(string: string): string;
export function dedent(
  stringOrTemplate: TemplateStringsArray | string,
  ...values: any[]
): string {
  let string: string;

  if (Array.isArray(stringOrTemplate) && "raw" in stringOrTemplate) {
    string = stringOrTemplate.reduce(
      (result, string, index) => result + string + (values[index] || ""),
      ""
    );
  } else {
    string = stringOrTemplate as string;
  }

  let lines = string.split("\n");

  const firstNonEmptyLine = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyLine === -1) {
    return "";
  }

  const lastNonEmptyLine = [...lines]
    .reverse()
    .findIndex((line) => line.trim().length > 0);

  lines = lines.slice(firstNonEmptyLine, lines.length - lastNonEmptyLine);

  let minIndent = Infinity;

  for (const line of lines) {
    const lineIndent = line.search(/\S/);

    if (lineIndent !== -1) {
      minIndent = Math.min(minIndent, lineIndent);
    }
  }

  if (minIndent === Infinity) {
    minIndent = 0;
  }

  return lines
    .map((line) => {
      if (line.trim().length === 0) {
        return "";
      }

      if (line.length < minIndent) {
        return line;
      }

      return line.substring(minIndent);
    })
    .join("\n");
}
