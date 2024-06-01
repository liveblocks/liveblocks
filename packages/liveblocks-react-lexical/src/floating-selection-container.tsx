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
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";
import { createPortal } from "react-dom";
import { createDOMRange } from "@lexical/selection";
import { useHideFloatingComposer } from "./comments/comment-plugin-provider";

export interface FloatingSelectionContainerProps {
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
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
  const {
    children,
    selection,
    sideOffset = 0,
    alignOffset = 0,
    collisionPadding = 0,
  } = props;

  const hideFloatingComposer = useHideFloatingComposer();

  const containerRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const [editor] = useLexicalComposerContext();

  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => divRef.current
  );

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection updates related to collaboration
      if (tags.has("collaboration")) return;
      state.read(() => hideFloatingComposer());
    });
  }, [editor, hideFloatingComposer]);

  useLayoutEffect(() => {
    const content = divRef.current;
    if (content === null) return;

    const parent = containerRef.current;
    if (parent === null) return;

    function positionContent() {
      const content = divRef.current;
      if (content === null) return;

      const parent = content.parentElement;
      if (parent === null) return;

      // Create a DOM range from the selection
      const range = createDOMRange(
        editor,
        selection.anchor.node,
        selection.anchor.offset,
        selection.focus.node,
        selection.focus.offset
      );

      if (range === null) return;

      // Get the bounding client rect of the DOM (selection) range
      const rect = range.getBoundingClientRect();

      // Set the position of the floating container
      let left = rect.left - parent.getBoundingClientRect().left;
      let top = rect.bottom - parent.getBoundingClientRect().top;

      // Apply the align offset
      left += alignOffset;

      // Get the width and height of the content
      const width = content.getBoundingClientRect().width;
      left = left + rect.width / 2 - width / 2;

      // Ensure content does not overflow the container
      if (left < collisionPadding) {
        left = collisionPadding;
      } else if (
        left + width >
        parent.getBoundingClientRect().right -
          parent.getBoundingClientRect().left -
          collisionPadding
      ) {
        left =
          parent.getBoundingClientRect().right -
          parent.getBoundingClientRect().left -
          width -
          collisionPadding;
      }

      // Apply the side offset
      top += sideOffset;

      const height = content.getBoundingClientRect().height;

      if (
        top + height >
        parent.getBoundingClientRect().height -
          parent.getBoundingClientRect().top +
          collisionPadding
      ) {
        top = rect.top - parent.getBoundingClientRect().top - height;
        top -= sideOffset;
      }

      content.style.left = `${left}px`;
      content.style.top = `${top}px`;
    }

    // Observe resizes of the container element to redraw the selection
    const observer = new ResizeObserver(positionContent);
    observer.observe(parent);

    // Listen to updates in the editor to redraw the selection
    const unsubscribeFromUpdates =
      editor.registerUpdateListener(positionContent);

    return () => {
      observer.disconnect();
      unsubscribeFromUpdates();
    };
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
