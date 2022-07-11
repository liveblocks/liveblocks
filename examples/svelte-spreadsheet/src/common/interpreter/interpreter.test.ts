import interpreter, { type ExpressionResult } from '.';

function t(expression: string, expected: ExpressionResult, cells: Record<string, number> = {}) {
	test(`${expression} => ${expected}`, () => {
		const result = interpreter(expression, (key) => cells[key]);
		expect(result).toEqual(expected);
	});
}

t('2', { type: 'number', value: 2 });
t('=1+1', { type: 'number', value: 2 });
t('=2(1+1)*3', { type: 'number', value: 12 });
t('=5/2', { type: 'number', value: 2.5 });
t('=5%2', { type: 'number', value: 1 });
t('=2^3', { type: 'number', value: 8 });
t('=REF(A1)+1', { type: 'number', value: 2 }, { A1: 1 });
t('=SUM(1)', { type: 'number', value: 1 });
t('=SUM(REF(A1))', { type: 'number', value: 1 }, { A1: 1 });
// t('=SUM(REF(A1):REF(A2))', { type: 'number', value: 3 }, { A1: 1, A2: 2 });
