import tokenizer, { Function } from './tokenizer';
import parser, { NodeKind, type CallExpression } from './parser';
import type { NumberLiteral, BinaryExpression, Node, Expression, Ref } from './parser';

type NumberExpressionResult = {
	value: number;
};

function evaluateAst(ast: Node, getCellValue: (key: string) => number): NumberExpressionResult {
	function visit(node: Expression): NumberExpressionResult {
		switch (node.kind) {
			case NodeKind.UnaryPlus:
				return visit(node.expression);
			case NodeKind.UnaryMinus: {
				const result = visit(node.expression);
				return {
					value: -result.value
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
			case NodeKind.CallExpression:
				return visitCallExpression(node);
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
			value: operation(left.value, right.value)
		};
	}

	function visitSimpleBinaryExpression(
		node: BinaryExpression,
		operation: (left: number, right: number) => number
	): NumberExpressionResult {
		const left = visit(node.left);
		const right = visit(node.right);

		return {
			value: operation(left.value, right.value)
		};
	}

	function visitNumberLiteral(node: NumberLiteral): NumberExpressionResult {
		return {
			value: node.value
		};
	}

	function visitCellRef(node: Ref) {
		return {
			value: getCellValue(node.ref)
		};
	}

	function visitCallExpression(node: CallExpression): NumberExpressionResult {
		switch (node.fn) {
			case Function.Sum: {
				let result = 0;
				for (const expression of node.params.map(visit)) {
					result += expression.value;
				}
				return {
					value: result
				};
			}
		}
	}

	return visit(ast);
}

export type ExpressionResult =
	| {
			type: 'string';
			value: string;
	  }
	| {
			type: 'number';
			value: number;
	  }
	| {
			type: 'error';
	  };

export default function (input: string, getCellValue: (key: string) => number): ExpressionResult {
	if (input.length === 0) {
		return { type: 'string', value: '' };
	}

	if (input[0] !== '=') {
		const number = Number.parseFloat(input);
		if (Number.isNaN(number)) {
			return { type: 'string', value: input };
		} else {
			return { type: 'number', value: number };
		}
	}

	try {
		const tokens = tokenizer(input.substring(1));
		const ast = parser(tokens);
		const result = evaluateAst(ast, getCellValue);
		return {
			type: 'number',
			value: result.value
		};
	} catch (er) {
		console.log(er);
		return { type: 'error' };
	}
}
