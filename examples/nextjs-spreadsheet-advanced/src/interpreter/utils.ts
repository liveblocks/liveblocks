import type { ExpressionResult } from '.';

export function formatExpressionResult(expressionResult: ExpressionResult) {
	if (expressionResult.type === 'string') {
		return expressionResult.value;
	} else if (expressionResult.type === 'number') {
		return roundTo2Decimals(expressionResult.value);
	} else {
		return 'ERROR';
	}
}

function roundTo2Decimals(value: number): string {
	return (Math.round(value * 100) / 100).toString();
}
