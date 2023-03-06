import { Operation, Path, Point } from "slate";
import { LiveblocksEditor } from "../liveblocks/liveblocksEditor";
import { HistoryEditor } from "./historyEditor";
import { EDITOR_TO_LAST_TEXT_EDIT } from "./weakMaps";

function shouldMerge(editor: HistoryEditor, op: Operation) {
	const lastTextEdit = EDITOR_TO_LAST_TEXT_EDIT.get(editor);
	if (!lastTextEdit) {
		return false;
	}

	const {
		type,
		position: { path, offset },
	} = lastTextEdit;

	if (type !== op.type || !Path.equals(path, op.path)) {
		return false;
	}

	return (
		(op.type === "insert_text" && offset === op.offset) ||
		(op.type === "remove_text" && offset === op.offset + op.text.length)
	);
}

export function withHistory<T extends LiveblocksEditor>(
	editor: T,
): T & HistoryEditor {
	const e = editor as T & HistoryEditor;

	e.undo = () => {
		const { history } = e.room;
		history.resume();
		history.undo();
		history.pause();
	};

	e.redo = () => {
		const { history } = e.room;
		history.resume();
		history.redo();
		history.pause();
	};

	const { apply } = e;
	e.apply = (op) => {
		apply(op);

		if (LiveblocksEditor.isRemote(e)) {
			const lastInsertionPoint = EDITOR_TO_LAST_TEXT_EDIT.get(e);
			if (!lastInsertionPoint) {
				return;
			}

			const transformed = Point.transform(lastInsertionPoint.position, op, {
				affinity: "backward",
			});

			const transformedTextEdit = transformed
				? { ...lastInsertionPoint, position: transformed }
				: undefined;

			EDITOR_TO_LAST_TEXT_EDIT.set(e, transformedTextEdit);
			return;
		}

		if (op.type === "insert_text") {
			EDITOR_TO_LAST_TEXT_EDIT.set(e, {
				position: { path: op.path, offset: op.offset + op.text.length },
				type: op.type,
			});
			return;
		}

		if (op.type === "remove_text") {
			EDITOR_TO_LAST_TEXT_EDIT.set(e, {
				position: { path: op.path, offset: op.offset },
				type: op.type,
			});
		}
	};

	const { storeLocalChange } = e;
	e.storeLocalChange = (change) => {
		const merge =
			HistoryEditor.isMerging(e) ??
			(e.operations.length || shouldMerge(e, change.op));

		storeLocalChange({ ...change, merge });
	};

	const { connect } = e;
	e.connect = () => {
		connect();
		e.room.history.pause();
	};

	const { submitLocalChange } = e;
	e.submitLocalChange = (change) => {
		const { history } = e.room;
		if (!change.merge) {
			history.resume();
			history.pause();
		}

		submitLocalChange(change);
	};

	return e;
}
