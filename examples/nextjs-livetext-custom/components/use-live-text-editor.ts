import type {
  LiveTextAttributesPatch,
  LiveTextData,
} from "@liveblocks/client";
import {
  useMutation,
  useRedo,
  useRoom,
  useStorage,
  useStorageRoot,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  getAbsoluteOffset,
  getSelectionRange,
  setSelectionRange,
} from "./dom-selection";
import type { FormatKey, SelectionRange } from "./live-text-formatting";
import { attributesAt, isFormatActive } from "./live-text-formatting";

// Binds a contenteditable to the LiveText in Storage: edits become LiveText operations, the DOM is always rendered from Storage, and the selection is tracked and shared through presence
export function useLiveTextEditor(): {
  editorRef: RefObject<HTMLDivElement>;
  text: LiveTextData;
  selection: SelectionRange | null;
  historyBatchActive: boolean;
  endHistoryBatch: () => void;
  toggleFormat: (key: FormatKey) => void;
} {
  const text = useStorage((root) => root.text);
  const room = useRoom();
  const [root] = useStorageRoot();
  const undo = useUndo();
  const redo = useRedo();
  const updateMyPresence = useUpdateMyPresence();

  const editorRef = useRef<HTMLDivElement>(null);

  // The ref is the source of truth; the state mirrors it for toolbar re-renders
  const selectionRef = useRef<SelectionRange | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const historyBatchPausedRef = useRef(false);
  const historyIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const historyMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyBatchActive, setHistoryBatchActive] = useState(false);

  // Latest document snapshot, readable from native event handlers
  const textRef = useRef(text);
  textRef.current = text;

  const endHistoryBatch = useCallback(() => {
    if (historyIdleTimerRef.current !== null) {
      clearTimeout(historyIdleTimerRef.current);
      historyIdleTimerRef.current = null;
    }
    if (historyMaxTimerRef.current !== null) {
      clearTimeout(historyMaxTimerRef.current);
      historyMaxTimerRef.current = null;
    }
    if (historyBatchPausedRef.current) {
      room.history.resume();
      historyBatchPausedRef.current = false;
      setHistoryBatchActive(false);
    }
  }, [room]);

  const continueHistoryBatch = useCallback(() => {
    if (!historyBatchPausedRef.current) {
      room.history.pause();
      historyBatchPausedRef.current = true;
      setHistoryBatchActive(true);
      historyMaxTimerRef.current = setTimeout(endHistoryBatch, 2000);
    }

    if (historyIdleTimerRef.current !== null) {
      clearTimeout(historyIdleTimerRef.current);
    }
    historyIdleTimerRef.current = setTimeout(endHistoryBatch, 1000);
  }, [endHistoryBatch, room]);

  useEffect(() => endHistoryBatch, [endHistoryBatch]);

  const replaceText = useMutation(
    ({ storage }, index: number, length: number, newText: string) => {
      const liveText = storage.get("text");

      // Inherit the preceding character's formatting, so typing inside bold text stays bold
      const attributes =
        newText.length > 0
          ? attributesAt(liveText.toJSON(), index > 0 ? index - 1 : 0)
          : undefined;

      liveText.replace(index, length, newText, attributes);
    },
    []
  );

  const formatText = useMutation(
    (
      { storage },
      index: number,
      length: number,
      attributes: LiveTextAttributesPatch
    ) => {
      storage.get("text").format(index, length, attributes);
    },
    []
  );

  function updateSelection(range: SelectionRange | null) {
    const previous = selectionRef.current;
    if (
      previous !== null &&
      range !== null &&
      (previous.anchor !== range.anchor || previous.focus !== range.focus)
    ) {
      endHistoryBatch();
    }
    selectionRef.current = range;
    setSelection(range);
    updateMyPresence({ selection: range });
  }

  function toggleFormat(key: FormatKey) {
    endHistoryBatch();
    const data = textRef.current;
    const range = selectionRef.current;
    if (!range || range.anchor === range.focus) {
      return;
    }

    const start = Math.min(range.anchor, range.focus);
    const end = Math.max(range.anchor, range.focus);
    const active = isFormatActive(data, range, key);
    formatText(start, end - start, {
      [key]: active ? null : true,
    });
  }

  // Keep the selection offsets in sync with the DOM selection
  useEffect(() => {
    function handleSelectionChange() {
      const element = editorRef.current;
      if (!element) {
        return;
      }

      const range = getSelectionRange(element);
      if (range) {
        updateSelection(range);
      } else if (document.activeElement !== element) {
        // Selection left the editor: hide our caret for others, keep local offsets for refocus
        endHistoryBatch();
        updateMyPresence({ selection: null });
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Map the local selection through remote changes, so the caret stays in place
  useEffect(() => {
    if (root === null) {
      return;
    }

    const liveText = root.get("text");
    return room.subscribe(
      liveText,
      (updates) => {
        for (const update of updates) {
          if (update.type !== "LiveText") {
            continue;
          }

          const current = selectionRef.current;
          if (!current) {
            continue;
          }

          let { anchor, focus } = current;
          for (const change of update.updates) {
            if (change.type === "insert") {
              const length = change.text.length;
              if (change.index < anchor) anchor += length;
              if (change.index < focus) focus += length;
            } else if (change.type === "delete") {
              if (change.index < anchor) {
                anchor = Math.max(change.index, anchor - change.length);
              }
              if (change.index < focus) {
                focus = Math.max(change.index, focus - change.length);
              }
            }
          }
          selectionRef.current = { anchor, focus };
          updateMyPresence({ selection: { anchor, focus } });
        }
      },
      { isDeep: true }
    );
  }, [room, root, updateMyPresence]);

  // Intercept every edit in the contenteditable and turn it into a LiveText operation
  useEffect(() => {
    const element = editorRef.current;
    if (!element) {
      return;
    }

    function setCaret(index: number) {
      selectionRef.current = { anchor: index, focus: index };
      setSelection({ anchor: index, focus: index });
      updateMyPresence({ selection: { anchor: index, focus: index } });
    }

    function handleBeforeInput(event: InputEvent) {
      event.preventDefault();
      if (!element) {
        return;
      }

      // Prefer the range the browser was about to modify (e.g. for word-deletion)
      const targetRange = event.getTargetRanges?.()[0];
      const range = targetRange
        ? {
            anchor: getAbsoluteOffset(
              element,
              targetRange.startContainer,
              targetRange.startOffset
            ),
            focus: getAbsoluteOffset(
              element,
              targetRange.endContainer,
              targetRange.endOffset
            ),
          }
        : (getSelectionRange(element) ?? selectionRef.current);

      if (!range) {
        return;
      }

      const start = Math.min(range.anchor, range.focus);
      const end = Math.max(range.anchor, range.focus);
      const length = end - start;

      switch (event.inputType) {
        case "insertText":
        case "insertReplacementText": {
          const inserted =
            event.data ?? event.dataTransfer?.getData("text/plain") ?? "";
          if (inserted.length === 0 && length === 0) {
            return;
          }
          continueHistoryBatch();
          replaceText(start, length, inserted);
          setCaret(start + inserted.length);
          break;
        }

        case "insertFromPaste":
        case "insertFromDrop": {
          const inserted =
            event.data ?? event.dataTransfer?.getData("text/plain") ?? "";
          if (inserted.length === 0 && length === 0) {
            return;
          }
          endHistoryBatch();
          replaceText(start, length, inserted);
          setCaret(start + inserted.length);
          break;
        }

        case "insertParagraph":
        case "insertLineBreak": {
          endHistoryBatch();
          replaceText(start, length, "\n");
          setCaret(start + 1);
          break;
        }

        case "deleteContentBackward":
        case "deleteContentForward":
        case "deleteWordBackward":
        case "deleteWordForward":
        case "deleteSoftLineBackward":
        case "deleteHardLineBackward":
        case "deleteContent": {
          if (length === 0) {
            return;
          }
          continueHistoryBatch();
          replaceText(start, length, "");
          setCaret(start);
          break;
        }

        case "deleteByCut": {
          if (length === 0) {
            return;
          }
          endHistoryBatch();
          replaceText(start, length, "");
          setCaret(start);
          break;
        }

        case "formatBold":
          toggleFormat("bold");
          break;
        case "formatItalic":
          toggleFormat("italic");
          break;
        case "formatStrikeThrough":
          toggleFormat("strikethrough");
          break;

        case "historyUndo":
          endHistoryBatch();
          undo();
          break;
        case "historyRedo":
          endHistoryBatch();
          redo();
          break;

        default:
          // Other input types (e.g. IME composition) are not supported
          break;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        toggleFormat("bold");
      } else if (key === "i") {
        event.preventDefault();
        toggleFormat("italic");
      } else if (key === "x" && event.shiftKey) {
        event.preventDefault();
        toggleFormat("strikethrough");
      } else if (key === "z") {
        event.preventDefault();
        endHistoryBatch();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }

    element.addEventListener("beforeinput", handleBeforeInput);
    element.addEventListener("keydown", handleKeyDown);
    return () => {
      element.removeEventListener("beforeinput", handleBeforeInput);
      element.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    replaceText,
    formatText,
    undo,
    redo,
    updateMyPresence,
    continueHistoryBatch,
    endHistoryBatch,
  ]);

  // Re-rendering resets the DOM selection, so restore it after every document change
  useLayoutEffect(() => {
    const element = editorRef.current;
    if (!element || document.activeElement !== element) {
      return;
    }

    const range = selectionRef.current;
    if (range) {
      setSelectionRange(element, range);
    }
  }, [text]);

  return {
    editorRef,
    text,
    selection,
    historyBatchActive,
    endHistoryBatch,
    toggleFormat,
  };
}
