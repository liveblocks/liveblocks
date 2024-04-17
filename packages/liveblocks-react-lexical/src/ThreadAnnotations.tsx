import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRoomContextBundle } from "@liveblocks/react";
import React, { useLayoutEffect, useRef } from "react";
import {
  createAbsolutePositionFromRelativePosition,
  RelativePosition,
} from "yjs";
import { getCollabNodeAndOffset, useBinding } from "./CollaborationPlugin";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";

export function ThreadAnnotations() {
  const [editor] = useLexicalComposerContext();
  const { useThreads } = useRoomContextBundle();
  const { threads } = useThreads();
  const binding = useBinding();

  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function createThreadAnnotations() {
      const container = containerRef.current;
      if (container === null) return;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      if (threads === undefined) return;

      threads
        .map((thread) => thread.metadata)
        .map((metadata) => {
          return {
            anchor: JSON.parse(metadata.anchor),
            focus: JSON.parse(metadata.focus),
          } as { anchor: RelativePosition; focus: RelativePosition };
        })
        .forEach((selection) => {
          const anchorAbsolutePosition =
            createAbsolutePositionFromRelativePosition(
              selection.anchor,
              binding.doc
            );
          const focusAbsolutePosition =
            createAbsolutePositionFromRelativePosition(
              selection.focus,
              binding.doc
            );

          if (anchorAbsolutePosition === null || focusAbsolutePosition === null)
            return;

          const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(
            anchorAbsolutePosition.type,
            anchorAbsolutePosition.index
          );

          const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(
            focusAbsolutePosition.type,
            focusAbsolutePosition.index
          );

          if (anchorCollabNode === null || focusCollabNode === null) return;

          const anchorKey = anchorCollabNode.getKey();
          const focusKey = focusCollabNode.getKey();

          const nodeMap = editor._editorState._nodeMap;
          const anchorNode = nodeMap.get(anchorKey);
          const focusNode = nodeMap.get(focusKey);

          if (anchorNode === undefined || focusNode === undefined) return;

          const range = createDOMRange(
            editor,
            anchorNode,
            anchorOffset,
            focusNode,
            focusOffset
          );

          if (range === null) return;
          const rects = createRectsFromDOMRange(editor, range);

          for (const rect of rects) {
            const div = document.createElement("div");
            div.style.position = "absolute";
            div.style.top = `${
              rect.top - container.getBoundingClientRect().top
            }px`;
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
        });
    }

    createThreadAnnotations();

    return editor.registerUpdateListener(({ editorState: state }) => {
      state.read(createThreadAnnotations);
    });
  }, [editor, threads]);

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
