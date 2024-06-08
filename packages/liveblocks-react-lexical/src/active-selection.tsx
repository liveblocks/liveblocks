import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalNode, RangeSelection } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import * as React from "react";
import { useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import { createDOMRange } from "./create-dom-range";
import { createRectsFromDOMRange } from "./create-rects-from-dom-range";

export function ActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const selection = useSelection();
  if (selection === null) return null;

  const info = editor.getEditorState().read(() => {
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
  });

  return createPortal(
    <SelectionRects selection={info} container={document.body} />,
    document.body
  );
}

function SelectionRects({
  selection,
  container,
}: {
  selection: SelectionInfo;
  container: HTMLElement;
}) {
  const [editor] = useLexicalComposerContext();
  const [elements, setElements] = useState<
    { top: number; left: number; width: number; height: number }[]
  >([]);

  useLayoutEffect(() => {
    function drawSelectionRects() {
      const range = createDOMRange(
        editor,
        selection.anchor.node,
        selection.anchor.offset,
        selection.focus.node,
        selection.focus.offset
      );

      if (range === null) return;
      const rects = createRectsFromDOMRange(editor, range);

      setElements(
        rects.map((rect) => ({
          top: rect.top - container.getBoundingClientRect().top,
          left: rect.left - container.getBoundingClientRect().left,
          width: rect.width,
          height: rect.height,
        }))
      );
    }

    // Observe resizes of the container element to redraw the selection
    const observer = new ResizeObserver(drawSelectionRects);

    observer.observe(container);

    // Listen to updates in the editor to redraw the selection
    const unsubscribeFromUpdates =
      editor.registerUpdateListener(drawSelectionRects);

    return () => {
      observer.disconnect();
      unsubscribeFromUpdates();
    };
  }, [selection, editor, container]);

  return (
    <>
      {elements.map((element) =>
        createPortal(
          <span
            style={{
              position: "absolute",
              top: `${element.top}px`,
              left: `${element.left}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              pointerEvents: "none",
            }}
            className="lb-root lb-portal lb-lexical-active-selection"
          />,
          container
        )
      )}
    </>
  );
}

type SelectionInfo = {
  anchor: {
    node: LexicalNode;
    offset: number;
  };
  focus: {
    node: LexicalNode;
    offset: number;
  };
};

function useSelection(): RangeSelection | null {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;

      if (selection.isCollapsed()) return null;

      return selection;
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
