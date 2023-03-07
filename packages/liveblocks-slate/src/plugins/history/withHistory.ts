import { nn } from "@liveblocks/core";
import { Editor, Operation, Path, Point, Range, Transforms } from "slate";
import { LiveblocksEditor } from "../liveblocks/liveblocksEditor";
import { HistoryEditor } from "./historyEditor";
import { selectionFromUpdate } from "./selectionFromUpdate";
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
  editor: T
): T & HistoryEditor {
  const e = editor as T & HistoryEditor;

  e.undo = () => {
    const { history } = e.room;

    history.resume();
    HistoryEditor.asApplyingHistory(e, () => {
      history.undo();
    });
    history.pause();
  };

  e.redo = () => {
    const { history } = e.room;

    history.resume();
    HistoryEditor.asApplyingHistory(e, () => {
      history.redo();
    });
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

  const { handleRemoteChange } = e;
  e.handleRemoteChange = (updates) => {
    if (!HistoryEditor.isApplyingHistory(e)) {
      handleRemoteChange(updates);
      return;
    }

    let selection: Range | null = null;
    for (let i = updates.length - 1; i >= 0; i--) {
      selection = selectionFromUpdate(e, e.liveRoot, nn(updates[i]));
      if (selection) {
        break;
      }
    }

    const selectionRef = selection
      ? Editor.rangeRef(e, selection, { affinity: "forward" })
      : null;

    Editor.withoutNormalizing(e, () => {
      handleRemoteChange(updates);

      const newSelection = selectionRef?.unref();
      if (newSelection) {
        Transforms.select(e, newSelection);
      }
    });
  };

  return e;
}
