import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalNode } from "lexical";
import type { PropsWithChildren } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { createDOMRange } from "./create-dom-range";
import { useSelection } from "./use-selection";

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

  return createPortal(
    <FloatingSelectionContainerImpl
      {...props}
      selection={info}
      container={document.body}
      ref={forwardedRef}
    />,
    document.body
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
  container: Element;
}

const FloatingSelectionContainerImpl = forwardRef<
  HTMLDivElement | null,
  PropsWithChildren<FloatingSelectionContainerImplProps>
>(function FloatingSelectionContainer(props, forwardedRef) {
  const {
    children,
    container,
    selection,
    sideOffset = 0,
    alignOffset = 0,
    collisionPadding = 0,
  } = props;

  const divRef = useRef<HTMLDivElement>(null);

  const [editor] = useLexicalComposerContext();

  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => divRef.current
  );

  const positionContent = useCallback(() => {
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

    // Get the bounding client rect of the DOM (selection) range
    const rect = range.getBoundingClientRect();

    let left = rect.left + container.scrollLeft;
    // Apply the align offset
    left += alignOffset;

    // Get the width of the content
    const width = content.getBoundingClientRect().width;
    left = left + rect.width / 2 - width / 2;

    // Ensure content does not overflow the container
    if (left <= collisionPadding) {
      left = collisionPadding;
    } else if (left + width >= container.clientWidth - collisionPadding) {
      left = container.clientWidth - width - collisionPadding;
    }

    let top = rect.bottom + container.scrollTop;
    // Apply the side offset
    top += sideOffset;

    const height = content.getBoundingClientRect().height;
    if (top + height >= container.clientHeight - collisionPadding) {
      top = rect.top - height - sideOffset;
    }

    content.style.left = `${left}px`;
    content.style.top = `${top}px`;
  }, [editor, selection, container, alignOffset, collisionPadding, sideOffset]);

  useEffect(() => {
    const editable = editor.getRootElement();
    if (editable === null) return;

    const observer = new ResizeObserver(positionContent);
    observer.observe(editable);
    return () => {
      observer.disconnect();
    };
  }, [editor, positionContent]);

  useEffect(() => {
    return editor.registerUpdateListener(positionContent);
  }, [editor, positionContent]);

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        zIndex: 1000,
      }}
    >
      {children}
    </div>
  );
});
