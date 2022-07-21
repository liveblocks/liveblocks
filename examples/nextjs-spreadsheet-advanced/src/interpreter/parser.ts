import { Function, SyntaxKind } from "./tokenizer";
import type { Token, NumberToken, RefToken } from "./tokenizer";

export type Node = Expression;

export enum NodeKind {
  Ref,
  CellRange,
  NumberLiteral,
  Addition,
  Substraction,
  Multiplication,
  Division,
  Modulo,
  Exponent,
  UnaryPlus,
  UnaryMinus,
  CallExpression,
}

export type Expression =
  | Ref
  | NumberLiteral
  | UnaryMinus
  | UnaryPlus
  | Addition
  | Substraction
  | Multiplication
  | Division
  | Modulo
  | Exponent
  | CallExpression
  | CellRange;

export interface BinaryExpression {
  left: Expression;
  right: Expression;
}

export type NumberLiteral = {
  kind: NodeKind.NumberLiteral;
  value: number;
};

export type Ref = {
  kind: NodeKind.Ref;
  ref: string;
};

export type UnaryPlus = {
  kind: NodeKind.UnaryPlus;
  expression: Expression;
};

export type UnaryMinus = {
  kind: NodeKind.UnaryMinus;
  expression: Expression;
};

export interface Addition extends BinaryExpression {
  kind: NodeKind.Addition;
}

export interface Substraction extends BinaryExpression {
  kind: NodeKind.Substraction;
}

export interface Multiplication extends BinaryExpression {
  kind: NodeKind.Multiplication;
}

export interface Modulo extends BinaryExpression {
  kind: NodeKind.Modulo;
}

export interface Division extends BinaryExpression {
  kind: NodeKind.Division;
}

export interface Exponent extends BinaryExpression {
  kind: NodeKind.Exponent;
}

export interface CellRange extends BinaryExpression {
  kind: NodeKind.CellRange;
}

export interface CallExpression {
  kind: NodeKind.CallExpression;
  fn: Function;
  params: Expression[];
}

export default function parser(tokens: Token[]): Node {
  let i = 0;

  function currentToken(): Token {
    return tokens[i];
  }

  function testAndConsume(kind: SyntaxKind): boolean {
    const token = currentToken();
    if (token.kind === kind) {
      i++;
      return true;
    }
    return false;
  }

  function consumeToken(kind: SyntaxKind): Token {
    const token = tokens[i];
    if (token.kind !== kind) {
      throw new Error(`Unexpected token: ${token}`);
    }
    i++;
    return token;
  }

  function makeNumberLiteral(token: NumberToken): NumberLiteral {
    return {
      kind: NodeKind.NumberLiteral,
      value: parseFloat(token.value),
    };
  }

  function makeRef(token: RefToken): Ref {
    return {
      kind: NodeKind.Ref,
      ref: token.ref,
    };
  }

  function factor(): Expression {
    let token = currentToken();
    if (testAndConsume(SyntaxKind.PlusToken)) {
      return { kind: NodeKind.UnaryPlus, expression: factor() };
    } else if (testAndConsume(SyntaxKind.MinusToken)) {
      return { kind: NodeKind.UnaryMinus, expression: factor() };
    } else if (token.kind === SyntaxKind.NumberLiteral) {
      return makeNumberLiteral(
        consumeToken(SyntaxKind.NumberLiteral) as NumberToken
      );
    } else if (token.kind === SyntaxKind.RefToken) {
      const ref = makeRef(consumeToken(SyntaxKind.RefToken) as RefToken);
      if (currentToken().kind === SyntaxKind.ColonToken) {
        consumeToken(SyntaxKind.ColonToken);
        const rightRef = makeRef(consumeToken(SyntaxKind.RefToken) as RefToken);
        return {
          kind: NodeKind.CellRange,
          left: ref,
          right: rightRef,
        };
      }
      return ref;
    } else if (token.kind === SyntaxKind.FunctionToken) {
      consumeToken(SyntaxKind.FunctionToken);
      consumeToken(SyntaxKind.OpenParenthesis);
      const callExpression: CallExpression = {
        kind: NodeKind.CallExpression,
        fn: token.fn,
        params: [expr()],
      };
      consumeToken(SyntaxKind.CloseParenthesis);
      return callExpression;
    }
    throw Error(`Unexpected token : ${token.kind}`);
  }

  function exponent(): Expression {
    let node: Expression = factor();

    while (testAndConsume(SyntaxKind.CaretToken)) {
      node = { kind: NodeKind.Exponent, left: node, right: factor() };
    }

    return node;
  }

  function term(): Expression {
    let node: Expression = exponent();

    while (true) {
      if (testAndConsume(SyntaxKind.AsteriskToken)) {
        node = { kind: NodeKind.Multiplication, left: node, right: exponent() };
      } else if (testAndConsume(SyntaxKind.SlashToken)) {
        node = { kind: NodeKind.Division, left: node, right: exponent() };
      } else if (testAndConsume(SyntaxKind.ModToken)) {
        node = { kind: NodeKind.Modulo, left: node, right: exponent() };
      } else if (testAndConsume(SyntaxKind.OpenParenthesis)) {
        let ex = expr();
        consumeToken(SyntaxKind.CloseParenthesis);
        node = { kind: NodeKind.Multiplication, left: node, right: ex };
      } else {
        break;
      }
    }

    return node;
  }

  function additive(): Expression {
    let node: Expression = term();

    while (true) {
      if (testAndConsume(SyntaxKind.PlusToken)) {
        node = { kind: NodeKind.Addition, left: node, right: term() };
      } else if (testAndConsume(SyntaxKind.MinusToken)) {
        node = { kind: NodeKind.Substraction, left: node, right: term() };
      } else {
        break;
      }
    }

    return node;
  }

  function expr(): Expression {
    let node: Expression = additive();
    return node;
  }

  return expr();
}
