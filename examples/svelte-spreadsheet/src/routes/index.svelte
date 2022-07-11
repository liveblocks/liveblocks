<script lang="ts">
	import Spreadsheet from '../Spreadsheet.svelte';

	import { nanoid } from 'nanoid';
	import type { LiveSpreadsheet } from '../common/spreadsheet';
	import { createSpreadsheet } from '../common/spreadsheet';
	import {
		createClient,
		LiveObject,
		LiveMap,
		LiveList,
		type BaseUserMeta
	} from '@liveblocks/client';
	import type { CellData, Column, Presence, Row, Storage } from '../types';

	let promise = init();

	async function init(): Promise<LiveSpreadsheet> {
		const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

		console.log(publicApiKey);

		if (!publicApiKey) {
			debugger;
			throw new Error('Public key is missing');
		}

		const client = createClient({
			publicApiKey
		});

		const room = client.enter<Presence, Storage, BaseUserMeta, never>('svelte-spreadsheet', {
			initialStorage: {
				spreadsheet: new LiveObject({
					cells: new LiveMap<string, LiveObject<CellData>>(),
					rows: new LiveList<LiveObject<Row>>([new LiveObject({ id: nanoid(), height: 30 })]),
					columns: new LiveList<LiveObject<Column>>([new LiveObject({ id: nanoid(), width: 100 })])
				})
			},
			DO_NOT_USE_withoutConnecting: typeof window === 'undefined'
		} as any);

		return await createSpreadsheet(room);
	}
</script>

{#await promise}
	<div>Loading...</div>
{:then spreadsheet}
	<Spreadsheet {spreadsheet} />
{:catch}
	<div>error</div>
{/await}
