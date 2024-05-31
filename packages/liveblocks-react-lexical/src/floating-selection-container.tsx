import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  RangeSelection,
  $getSelection,
  $isRangeSelection,
  LexicalNode,
} from "lexical";
import React, {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";
import { createPortal } from "react-dom";
import { createDOMRange } from "@lexical/selection";

export interface FloatingSelectionContainerProps {
  sideOffset?: number;
  alignOffset?: number;
}

export const FloatingSelectionContainer = forwardRef<
  HTMLDivElement | null,
  PropsWithChildren<FloatingSelectionContainerProps>
>(function FloatingSelectionContainer(props, forwardedRef) {
  const [editor] = useLexicalComposerContext();
  const selection = useSelection();

  if (selection === null) return null;

  if (selection.isCollapsed()) return null;

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
  if (rootContainer === null) return null;

  return createPortal(
    <FloatingSelectionContainerImpl
      {...props}
      selection={info}
      ref={forwardedRef}
    />,
    rootContainer
  );
});

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

interface FloatingSelectionContainerImplProps
  extends FloatingSelectionContainerProps {
  selection: SelectionInfo;
}

const FloatingSelectionContainerImpl = forwardRef<
  HTMLDivElement | null,
  PropsWithChildren<FloatingSelectionContainerImplProps>
>(function FloatingSelectionContainer(props, forwardedRef) {
  const { children, selection, sideOffset = 0, alignOffset = 0 } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const [editor] = useLexicalComposerContext();

  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => divRef.current
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const content = divRef.current;
    if (content === null) return;

    // Create a DOM range from the selection
    const range = createDOMRange(
      editor,
      selection.anchor.node,
      selection.anchor.offset,
      selection.focus.node,
      selection.focus.offset
    );

    if (range === null) return;

    // Get the bounding client rect of the DOM range
    const rect = range.getBoundingClientRect();

    let left = rect.left - container.getBoundingClientRect().left;
    let top = rect.bottom - container.getBoundingClientRect().top;

    // Get the width of the content`
    const width = content.getBoundingClientRect().width;

    // Align content to the center of the selection
    left = left + rect.width / 2 - width / 2;

    // Ensure content does not overflow the container
    if (left + width > container.getBoundingClientRect().width) {
      left = container.clientWidth - width;
      left -= sideOffset;
    }

    if (left < 0) {
      left = 0;
      left += sideOffset;
    }

    if (top + content.clientHeight > container.clientHeight) {
      top = container.clientHeight - content.clientHeight;
    }

    if (top < 0) {
      top = 0;
    }

    top += alignOffset;

    content.style.left = `${left}px`;
    content.style.top = `${top}px`;
  }, [selection, editor]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <div
        ref={divRef}
        style={{
          position: "absolute",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
});

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

      return selection;
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
