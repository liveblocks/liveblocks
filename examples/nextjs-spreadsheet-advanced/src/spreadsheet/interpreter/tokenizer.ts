export enum SyntaxKind {
  NumberLiteral,
  EOF,
  OpenParenthesis,
  CloseParenthesis,
  PlusToken,
  MinusToken,
  AsteriskToken,
  SlashToken,
  CaretToken,
  ModToken,
  ColonToken,
  EqualToken,
  CellToken,
  RefToken,
  FunctionToken,
}

export type Token =
  | NumberToken
  | CellToken
  | RefToken
  | SimpleCharToken
  | EOFToken;

export type NumberToken = {
  kind: SyntaxKind.NumberLiteral;
  value: string;
};

export type CellToken = {
  kind: SyntaxKind.CellToken;
  cell: string;
};

export type RefToken = {
  kind: SyntaxKind.RefToken;
  ref: string;
};

export type EOFToken = {
  kind: SyntaxKind.EOF;
};

type SimpleCharToken = {
  kind:
    | SyntaxKind.PlusToken
    | SyntaxKind.MinusToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.SlashToken
    | SyntaxKind.EqualToken
    | SyntaxKind.ModToken
    | SyntaxKind.CaretToken
    | SyntaxKind.CloseParenthesis
    | SyntaxKind.OpenParenthesis
    | SyntaxKind.ColonToken;
};

const simpleCharToSyntaxKindMap: Map<string, SyntaxKind> = new Map([
  ["+", SyntaxKind.PlusToken],
  ["-", SyntaxKind.MinusToken],
  ["*", SyntaxKind.AsteriskToken],
  ["/", SyntaxKind.SlashToken],
  ["=", SyntaxKind.EqualToken],
  ["(", SyntaxKind.OpenParenthesis],
  [")", SyntaxKind.CloseParenthesis],
  ["^", SyntaxKind.CaretToken],
  ["%", SyntaxKind.ModToken],
  [":", SyntaxKind.ColonToken],
]);

const syntaxKindToChar = new Map(
  Array.from(simpleCharToSyntaxKindMap.entries()).map((entry) => [
    entry[1],
    entry[0],
  ])
);

function isDigit(char: string) {
  const NUMBERS = /[0-9]/;
  return NUMBERS.test(char);
}

function isCapLetter(char: string) {
  const CAP_LETTERS = /[A-Z]/;
  return CAP_LETTERS.test(char);
}

function extractNumber(input: string, current: number): string {
  let value = "";
  let hasDecimals = false;

  while (input[current]) {
    if (isDigit(input[current])) {
      value += input[current];
    } else if (input[current] === "." && !hasDecimals) {
      value += ".";
      hasDecimals = true;
    } else {
      break;
    }
    current++;
  }
  return value;
}

function extractWord(input: string, current: number): string {
  let word = "";

  while (isCapLetter(input[current])) {
    word += input[current];
    current++;
  }

  return word;
}

function extractCell(input: string, current: number): string {
  if (!isCapLetter(input[current])) {
    throw new Error("Expected cap letter but got " + input[current]);
  }

  if (!isDigit(input[current + 1])) {
    throw new Error(
      "Expected digit but got " + input[current + 1] + " " + input
    );
  }

  return `${input[current]}${input[current + 1]}`;
}

function extractCellRef(input: string, current: number): string {
  let result = "";

  current += 4;
  while (input[current] !== ")") {
    result += input[current];
    current++;
  }

  return result;
}

export default function tokenizer(input: string): Token[] {
  let current = 0;

  const tokens: Token[] = [];

  while (current < input.length) {
    let char = input[current];

    let syntaxKind = simpleCharToSyntaxKindMap.get(char);
    if (syntaxKind !== undefined) {
      tokens.push({
        kind: syntaxKind,
      } as SimpleCharToken);
      current++;
    } else if (isDigit(char)) {
      var numberAsString = extractNumber(input, current);
      current += numberAsString.length;
      tokens.push({
        kind: SyntaxKind.NumberLiteral,
        value: numberAsString,
      });
    } else if (isCapLetter(char)) {
      const word = extractWord(input, current);

      if (word === "REF") {
        const ref = extractCellRef(input, current);
        current += ref.length + 5;
        tokens.push({
          kind: SyntaxKind.RefToken,
          ref,
        });
      } else {
        const cell = extractCell(input, current);
        current += cell.length;
        tokens.push({
          kind: SyntaxKind.CellToken,
          cell,
        });
      }
    } else {
      throw new Error("Unknown character: " + char);
    }
  }

  tokens.push({ kind: SyntaxKind.EOF });
  return tokens;
}

export function tokenToString(token: Token): string {
  switch (token.kind) {
    case SyntaxKind.AsteriskToken:
    case SyntaxKind.CaretToken:
    case SyntaxKind.CloseParenthesis:
    case SyntaxKind.EqualToken:
    case SyntaxKind.MinusToken:
    case SyntaxKind.ModToken:
    case SyntaxKind.OpenParenthesis:
    case SyntaxKind.PlusToken:
    case SyntaxKind.SlashToken:
    case SyntaxKind.ColonToken:
      return syntaxKindToChar.get(token.kind)!;
    case SyntaxKind.CellToken:
      return token.cell;
    case SyntaxKind.EOF:
      return "";
    case SyntaxKind.NumberLiteral:
      return token.value.toString();
    case SyntaxKind.RefToken:
      return "REF(" + token.ref + ")";
  }
}
