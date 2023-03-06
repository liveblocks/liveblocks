import type { Room, StorageUpdate } from "@liveblocks/client";
import { BaseEditor, Descendant, Editor } from "slate";
import { isLiveRoot, LiveRoot } from "../../types";
import type { PendingChange } from "./types";
import {
	EDITOR_TO_LOCAL,
	EDITOR_TO_PENDING_CHANGES,
	EDITOR_TO_REMOTE,
	EDITOR_TO_UNSUBSCRIBE,
} from "./weakMaps";

export type LiveblocksRequiredEditor = BaseEditor;
export type LiveblocksEditor<
	TRoom extends Room<{}, {}, {}, {}> = Room<{}, {}, {}, {}>,
> = LiveblocksRequiredEditor & {
	room: TRoom;
	liveRoot: LiveRoot;

	connect: () => void;
	disconnect: () => void;

	handleRemoteChange: (updates: StorageUpdate[]) => void;
	setChildren: (children: Descendant[]) => void;

	storeLocalChange: (change: PendingChange) => void;
	flushLocalChanges: () => void;
	submitLocalChange: (change: PendingChange) => void;
};

export const LiveblocksEditor = {
	isLiveblocksEditor(v: unknown): v is LiveblocksEditor {
		if (!Editor.isEditor(v)) {
			return false;
		}

		const maybeLiveblocksEditor = v as Partial<LiveblocksEditor>;
		return (
			typeof maybeLiveblocksEditor.room === "object" &&
			isLiveRoot(maybeLiveblocksEditor.liveRoot) &&
			typeof maybeLiveblocksEditor.connect === "function" &&
			typeof maybeLiveblocksEditor.disconnect === "function" &&
			typeof maybeLiveblocksEditor.handleRemoteChange === "function" &&
			typeof maybeLiveblocksEditor.storeLocalChange === "function" &&
			typeof maybeLiveblocksEditor.flushLocalChanges === "function"
		);
	},

	asRemote(editor: LiveblocksEditor, fn: () => void) {
		const wasRemote = LiveblocksEditor.isRemote(editor);
		EDITOR_TO_REMOTE.set(editor, true);
		fn();
		EDITOR_TO_REMOTE.set(editor, wasRemote);
	},

	isRemote(editor: LiveblocksEditor) {
		return EDITOR_TO_REMOTE.get(editor) ?? false;
	},

	asLocal(editor: LiveblocksEditor, fn: () => void) {
		const wasLocal = LiveblocksEditor.isLocal(editor);
		EDITOR_TO_LOCAL.set(editor, true);
		fn();
		EDITOR_TO_LOCAL.set(editor, wasLocal);
	},

	isLocal(editor: LiveblocksEditor) {
		return EDITOR_TO_LOCAL.get(editor) ?? false;
	},

	localChanges(editor: LiveblocksEditor) {
		return EDITOR_TO_PENDING_CHANGES.get(editor) ?? [];
	},

	isConnected(editor: LiveblocksEditor) {
		return EDITOR_TO_UNSUBSCRIBE.has(editor);
	},

	connect(editor: LiveblocksEditor) {
		editor.connect();
	},

	disconnect(editor: LiveblocksEditor) {
		editor.disconnect();
	},
};
