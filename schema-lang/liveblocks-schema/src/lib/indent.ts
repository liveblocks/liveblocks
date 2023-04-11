export function indent(n: number, text: string): string {
  return text
    .split("\n")
    .map((line) => " ".repeat(n) + line)
    .join("\n");
}

export function indentIfMultiLine(
  n: number,
  text: string,
  pre1 = "",
  suf1 = "",
  pren = "",
  sufn = ""
): string {
  return text.includes("\n")
    ? `${pren}${indent(n, text)}${sufn}`
    : `${pre1}${text}${suf1}`;
}
