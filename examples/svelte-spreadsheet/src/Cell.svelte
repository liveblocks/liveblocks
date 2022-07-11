<script lang="ts">
	import { onDestroy } from 'svelte';

	import type { LiveSpreadsheet } from './common/spreadsheet';

	export let spreadsheet: LiveSpreadsheet;
	export let height: number;
	export let width: number;
	export let columnId: string;
	export let rowId: string;
	export let selectionColor: string | undefined;
	export let displayValue: string;

	let editingStr: string | null = null;

	function onDoubleClick() {
		editingStr = spreadsheet.getCellExpressionDisplay(columnId, rowId);
	}

	function onBlur(e: Event) {
		if (editingStr !== null) {
			const target = e.target as HTMLInputElement;
			spreadsheet.updateCellValue(columnId, rowId, target.value);
			editingStr = null;
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		const target = e.target as HTMLInputElement;

		switch (e.key) {
			case 'Enter': {
				if (editingStr === null) {
					target.focus();
					target.select();
					editingStr = spreadsheet.getCellExpressionDisplay(columnId, rowId);
				} else {
					spreadsheet.updateCellValue(columnId, rowId, target.value);
					editingStr = null;
				}
			}
		}
	}

	function isNumeric(str: any) {
		return !isNaN(str) && !isNaN(parseFloat(str));
	}

	$: value = editingStr == null ? displayValue : editingStr;
	$: isNumber = isNumeric(value);
</script>

<input
	style="text-align:{isNumber && editingStr === null
		? 'right'
		: 'left'};width:{width}px;height:{height}px;{selectionColor
		? `border:solid 2px ${selectionColor}`
		: ''}"
	readonly={editingStr === null}
	class="input"
	on:blur={onBlur}
	on:keydown={onKeyDown}
	on:dblclick={onDoubleClick}
	{value}
/>

<style>
	.input {
		padding: 7px 9px;
		border: none;
		outline-color: transparent;
		outline-style: solid;
		outline-offset: -2px;
		outline-width: 2px;
		box-sizing: border-box;
	}

	.input:focus {
		outline-color: blue;
	}
</style>
