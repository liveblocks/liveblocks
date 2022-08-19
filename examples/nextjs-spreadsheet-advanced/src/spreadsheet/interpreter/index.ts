import { isNumerical } from "../../utils/isNumerical";
import parser, { NodeKind } from "./parser";
import type {
  BinaryExpression,
  Expression,
  Node,
  NumberLiteral,
  Ref,
} from "./parser";
import tokenizer from "./tokenizer";

interface NumberExpressionResult {
  value: number;
}

function evaluateAst(
  ast: Node,
  getCellValue: (key: string) => number
): NumberExpressionResult {
  function visit(node: Expression): NumberExpressionResult {
    switch (node.kind) {
      case NodeKind.UnaryPlus:
        return visit(node.expression);
      case NodeKind.UnaryMinus: {
        const result = visit(node.expression);
        return {
          value: -result.value,
        };
      }
      case NodeKind.Addition:
        return visitAdditiveBinaryExpression(node, (l, r) => l + r);
      case NodeKind.Substraction:
        return visitAdditiveBinaryExpression(node, (l, r) => l - r);
      case NodeKind.Multiplication:
        return visitSimpleBinaryExpression(node, (l, r) => l * r);
      case NodeKind.Division:
        return visitSimpleBinaryExpression(node, (l, r) => l / r);
      case NodeKind.Modulo:
        return visitSimpleBinaryExpression(node, (l, r) => l % r);
      case NodeKind.Exponent:
        return visitSimpleBinaryExpression(node, Math.pow);
      case NodeKind.NumberLiteral:
        return visitNumberLiteral(node);
      case NodeKind.Ref:
        return visitCellRef(node);
      default:
        throw new Error(`Unexpected node kind: ${node}`);
    }
  }

  function visitAdditiveBinaryExpression(
    node: BinaryExpression,
    operation: (left: number, right: number) => number
  ): NumberExpressionResult {
    const left = visit(node.left);
    const right = visit(node.right);

    return {
      value: operation(left.value, right.value),
    };
  }

  function visitSimpleBinaryExpression(
    node: BinaryExpression,
    operation: (left: number, right: number) => number
  ): NumberExpressionResult {
    const left = visit(node.left);
    const right = visit(node.right);

    return {
      value: operation(left.value, right.value),
    };
  }

  function visitNumberLiteral(node: NumberLiteral): NumberExpressionResult {
    return {
      value: node.value,
    };
  }

  function visitCellRef(node: Ref) {
    return {
      value: getCellValue(node.ref),
    };
  }

  return visit(ast);
}

export type ExpressionResult =
  | {
      type: "error";
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "string";
      value: string;
    };

export default function (
  input: string,
  getCellValue: (key: string) => number
): ExpressionResult {
  if (input.length === 0) {
    return { type: "string", value: "" };
  }

  if (input[0] !== "=") {
    return isNumerical(input)
      ? { type: "number", value: Number.parseFloat(input) }
      : { type: "string", value: input };
  }

  try {
    const tokens = tokenizer(input.slice(1));
    const ast = parser(tokens);
    const result = evaluateAst(ast, getCellValue);
    return {
      type: "number",
      value: result.value,
    };
  } catch {
    return { type: "error" };
  }
}
