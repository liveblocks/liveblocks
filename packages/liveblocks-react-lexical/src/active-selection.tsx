import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import type { LexicalNode, RangeSelection } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import * as React from "react";
import { useCallback, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

interface ActiveSelectionProps {
  styles?: Partial<CSSStyleDeclaration>;
}

export function ActiveSelection({ styles }: ActiveSelectionProps) {
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

  const root = editor.getRootElement();
  if (root === null) return null;

  const rootContainer = root.parentElement;
  if (rootContainer === null) return;

  return createPortal(
    <SelectionRects selection={info} styles={styles} />,
    rootContainer
  );
}

function SelectionRects({
  selection,
  styles = {},
}: {
  selection: SelectionInfo;
  styles?: Partial<CSSStyleDeclaration>;
}) {
  const [editor] = useLexicalComposerContext();

  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = divRef.current;
    if (container === null) return;

    function drawSelectionRects() {
      if (container === null) return;

      // Remove all existing children of the container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

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

        Object.assign(div.style, {
          backgroundColor: "rgba(255, 212, 0, 0.14)",
          ...styles,
          position: "absolute",
          top: `${rect.top - container.getBoundingClientRect().top}px`,
          left: `${rect.left - container.getBoundingClientRect().left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          pointerEvents: "none",
        });

        container.appendChild(div);
      }
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
  }, [selection, editor, styles]);

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
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
