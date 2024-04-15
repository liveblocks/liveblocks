import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import React, { useLayoutEffect, useRef } from "react";

import { useLastActiveSelection } from "./CommentPluginProvider";

export function LastActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const selection = useLastActiveSelection();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let markerContainer = container.parentNode?.querySelector(".lb-marker-container") as HTMLDivElement | undefined;
    if (!markerContainer) {
      // Look for contentEditable, then use its parent
      const editorRef = Array.from(container.parentNode?.querySelectorAll("[contenteditable=true]") as NodeList)
        .find((div) => !(div as HTMLElement).className.includes("lb-composer-editor"))
      if (editorRef) {
        markerContainer = document.createElement("div");
        markerContainer.style.position = "absolute";
        markerContainer.style.height = "100%";
        markerContainer.style.width = "100%";
        markerContainer.style.top = "0";
        markerContainer.style.left = "0";
        markerContainer.style.pointerEvents = "none";
        markerContainer.className = "lb-marker-container";
        editorRef.parentNode?.appendChild(markerContainer);
      }
    }

    // If we weren't able to find the editor ref (this shouldn't really happen...) then use our own container
    if (!markerContainer) {
      markerContainer = container;
    }

    // Remove all existing children of the container
    while (markerContainer.firstChild) {
      markerContainer.removeChild(markerContainer.firstChild);
    }

    if (selection === null) return;

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
      div.style.top = `${rect.top - markerContainer.getBoundingClientRect().top}px`;
      div.style.left = `${rect.left - markerContainer.getBoundingClientRect().left
        }px`;
      div.style.width = `${rect.width}px`;
      div.style.height = `${rect.height}px`;
      div.style.backgroundColor = "rgb(255, 212, 0)";
      div.style.opacity = "0.5";
      div.style.pointerEvents = "none";
      markerContainer.appendChild(div);
    }
  }, [editor, selection]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    />
  );
}