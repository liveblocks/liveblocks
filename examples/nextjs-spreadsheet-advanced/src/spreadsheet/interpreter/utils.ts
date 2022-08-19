import type { ExpressionResult } from ".";

export const EXPRESSION_ERROR = "ERROR";

export function convertNumberToLetter(index: number) {
  return String.fromCodePoint(index + 65);
}

export function convertLetterToNumber(letter: string) {
  return (letter.codePointAt(0) ?? 0) - 65;
}

export function getHeaderLabel(index: number, type: "column" | "row") {
  return type === "column" ? convertNumberToLetter(index) : index + 1;
}

export function formatExpressionResult(expressionResult: ExpressionResult) {
  if (expressionResult.type === "string") {
    return expressionResult.value;
  } else if (expressionResult.type === "number") {
    return roundTo2Decimals(expressionResult.value);
  } else {
    return EXPRESSION_ERROR;
  }
}

function roundTo2Decimals(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}
