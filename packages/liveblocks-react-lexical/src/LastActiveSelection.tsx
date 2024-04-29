import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import type { LexicalNode } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { ShowComposerContext } from "./CommentPluginProvider";

const SELECTION_CONTAINER_DATA_ATTR = "data-lb-selection-container-attr";

type RangeSelectionInfo = {
  anchor: {
    node: LexicalNode;
    offset: number;
  };
  focus: {
    node: LexicalNode;
    offset: number;
  };
};

function $getSelectionInfo(): RangeSelectionInfo | undefined {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) return undefined;

  return {
    anchor: {
      node: selection.anchor.getNode(),
      offset: selection.anchor.offset,
    },
    focus: {
      node: selection.focus.getNode(),
      offset: selection.focus.offset,
    },
  };
}

function useRangeSelectionInfo(): RangeSelectionInfo | undefined {
  const [editor] = useLexicalComposerContext();
  const selectionInfo = useRef<RangeSelectionInfo | undefined>(undefined);

  if (selectionInfo.current === undefined) {
    const state = editor.getEditorState();
    const selection = state.read(() => $getSelectionInfo());
    selectionInfo.current = selection;
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsub = editor.registerUpdateListener(() => {
        const state = editor.getEditorState();
        const selection = state.read(() => $getSelectionInfo());
        selectionInfo.current = selection;
        onStoreChange();
      });
      return () => {
        unsub();
      };
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return selectionInfo.current;
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const showComposer = useContext(ShowComposerContext);
  const selection = useRangeSelectionInfo();

  useEffect(() => {
    const root = editor.getRootElement();
    if (root === null) return;

    const rootContainer = root.parentNode;
    if (rootContainer === null) return;

    let container = rootContainer.querySelector(
      `[${SELECTION_CONTAINER_DATA_ATTR}]`
    );

    if (container === null) {
      container = document.createElement("div");
      container.setAttribute(SELECTION_CONTAINER_DATA_ATTR, "");
      container.setAttribute(
        "style",
        "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"
      );
      rootContainer.appendChild(container);
    }

    function drawSelectionRects(container: Element) {
      // Remove all existing children of the container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // If the composer is not shown, we do not render the selection
      if (showComposer === false) return;

      if (selection === undefined) return;

      const range = createDOMRange(
        editor,
        selection.anchor.node,
        selection.anchor.offset,
        selection.focus.node,
        selection.focus.offset
      );

      if (range === null) return;
      const rects = createRectsFromDOMRange(editor, range);

      for (const rect of rects) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.top = `${rect.top - container.getBoundingClientRect().top}px`;
        div.style.left = `${
          rect.left - container.getBoundingClientRect().left
        }px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.backgroundColor = "rgb(255, 212, 0)";
        div.style.opacity = "0.5";
        div.style.pointerEvents = "none";
        container.appendChild(div);
      }
    }

    // Observe resizes of the container element to redraw the selection
    const observer = new ResizeObserver(() => drawSelectionRects(container));
    observer.observe(container);

    // Listen to updates in the editor to redraw the selection
    const unsubUpdateHandler = editor.registerUpdateListener(() =>
      drawSelectionRects(container)
    );

    return () => {
      observer.disconnect();
      unsubUpdateHandler();
    };
  }, [showComposer, selection]);
}

export function LastActiveSelection() {
  useActiveSelection();
  return null;
}
