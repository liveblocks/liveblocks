<script lang="ts">
	import Cell from './Cell.svelte';
	import { onDestroy } from 'svelte';
	import type { Column, Row } from './types';
	import type { LiveSpreadsheet } from './common/spreadsheet';

	export let spreadsheet: LiveSpreadsheet;

	const ROW_HEADER_WIDTH = 40;

	const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777'];

	let columns: Column[] = [];
	let rows: Row[] = [];
	let selectionMap: Record<string, string> = {};
	let cells: Record<string, string> = {};

	const unsubscribeRows = spreadsheet.onRowsChange((newRows) => (rows = newRows));
	const unsubscribeColumns = spreadsheet.onColumnsChange((newColumns) => (columns = newColumns));
	const unsubscribeCells = spreadsheet.onCellsChange((newCells) => (cells = newCells));
	const unsubscribeOthers = spreadsheet.onOthersChange((others) => {
		selectionMap = others.reduce<Record<string, string>>((prev, current) => {
			if (current.presence?.selectedCell) {
				prev[current.presence.selectedCell] = COLORS[current.connectionId % COLORS.length];
				return prev;
			} else {
				return prev;
			}
		}, {});
	});

	function onCellClick(coordinates: { columnId: string; rowId: string }) {
		spreadsheet.selectedCell(coordinates);
	}

	onDestroy(() => {
		unsubscribeRows();
		unsubscribeColumns();
		unsubscribeOthers();
		unsubscribeCells();
	});
</script>

<div class="sheet_container">
	<table class="sheet" on:blur={() => spreadsheet.selectedCell(null)}>
		<colgroup>
			<col span="1" style="width: {ROW_HEADER_WIDTH}px;" />
			{#each columns as column, x}
				<col span="1" style="width: {column.width}px;" />
			{/each}
		</colgroup>
		<tbody>
			<tr>
				<th style="width:{ROW_HEADER_WIDTH}px;height:24px" />
				{#each columns as column, x}
					<th style="width:${column.width}px">
						<div class="column_header hidden">
							{#if x > 0}
								<button class="move_left" on:click={() => spreadsheet.moveColumn(x, x - 1)}
									>←</button
								>
							{/if}

							<button class="delete_column" on:click={() => spreadsheet.deleteColumn(x)}>×</button>

							{#if x < columns.length - 1}
								<button class="move_right" on:click={() => spreadsheet.moveColumn(x, x + 1)}
									>→</button
								>
							{/if}
						</div>
					</th>
				{/each}
			</tr>
			{#each rows as row, y}
				<tr style="height:{row.height}px">
					<th>
						<button class="hidden delete_row" on:click={() => spreadsheet.deleteRow(y)}>×</button>
					</th>
					{#each columns as column, x}
						{@const key = column.id + row.id}
						<td
							class="cell"
							style="width:{column.width}px;height:{row.height}px;"
							on:click={() => onCellClick({ columnId: column.id, rowId: row.id })}
						>
							<Cell
								{spreadsheet}
								displayValue={cells[column.id + row.id]}
								width={column.width}
								height={row.height}
								columnId={column.id}
								rowId={row.id}
								selectionColor={selectionMap[key]}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	<button class="add_column hidden" on:click={() => spreadsheet.insertColumn(columns.length, 100)}
		>+</button
	>
	<button class="add_row hidden" on:click={() => spreadsheet.insertRow(rows.length, 30)}>+</button>
</div>

<style>
	.sheet_container {
		position: relative;
		float: left;
	}

	.sheet {
		border-collapse: collapse;
		border-spacing: 0;
		margin: 8px 18px 18px 8px;
	}

	.hidden {
		opacity: 0;
		transition: opacity 150ms ease 50ms;
		border: none;
		padding: 0;
	}

	.hidden:hover {
		opacity: 1;
	}

	.add_column {
		position: absolute;
		border: none;
		right: 0;
		top: 0;
		bottom: 0;
		margin: 32px 0 18px 0;
		width: 16px;
	}

	.delete_column {
		position: relative;
		width: 100%;
		margin: 0;
		border: none;
	}

	.add_row {
		position: absolute;
		border: none;
		left: 0;
		right: 0;
		bottom: 0;
		margin: 0 18px 0 48px;
		height: 16px;
	}

	.delete_row {
		position: relative;
		width: 100%;
		height: 30px;
		margin: 0;
	}

	.cell {
		position: relative;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		border: 1px solid rgb(233, 233, 231);
		border-collapse: collapse;
	}

	.column_header {
		display: flex;
	}

	.move_left {
		margin-right: 2px;
		border: none;
	}

	.move_right {
		border: none;
		margin-left: 2px;
	}
</style>
