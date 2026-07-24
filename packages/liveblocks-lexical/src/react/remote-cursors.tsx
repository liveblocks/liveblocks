import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import { useOthers } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  $getNodeByKey,
  $isLineBreakNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { useCallback, useEffect, useState, useContext } from "react";

import type { DecodedLexicalSelection } from "../manager";
import type { LiveLexicalSelection } from "../types";
import { LiveblocksCollaborationContext } from "./liveblocks-collaboration-plugin";

type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Collapsed caret vs non-collapsed selection highlight. */
  kind: "caret" | "selection";
};

type RemoteOverlay = {
  connectionId: number;
  color: string;
  selections: OverlayRect[];
};

export function RemoteCursorsPlugin() {
  const collaboration = useContext(LiveblocksCollaborationContext);
  if (collaboration === null) {
    throw new Error(
      "'RemoteCursorsPlugin' must be used within a 'LiveblocksCollaborationPlugin'"
    );
  }
  const manager = collaboration.manager;
  const root = collaboration.root;
  const room = collaboration.room;

  const [editor] = useLexicalComposerContext();
  const others = useOthers();
  const [overlays, setOverlays] = useState<RemoteOverlay[]>([]);

  const updateOverlays = useCallback(() => {
    if (manager.binding.reverse.size === 0) {
      setOverlays([]);
      return;
    }

    const container = editor.getRootElement()?.parentElement;
    if (container === null || container === undefined) {
      setOverlays([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextOverlays: RemoteOverlay[] = [];

    // Do not use `editor.read()` — in Lexical 0.45 it always force-commits
    // pending updates. This plugin also refreshes from a Storage deep-
    // subscribe, and `room.history.undo()` notifies that subscriber
    // synchronously inside the UNDO_COMMAND update. Force-committing there
    // freezes the in-flight selection and crashes later transforms
    // (`_cachedNodes` is read-only). Read the committed state instead.
    editor.getEditorState().read(
      () => {
        for (const user of others) {
          const selection = user.presence.selection as
            | LiveLexicalSelection
            | null
            | undefined;
          if (selection === null || selection === undefined) {
            continue;
          }

          const decoded = manager.$decodeSelection(selection);
          if (decoded === null) {
            continue;
          }

          const rects = $getRemoteOverlayRects(editor, decoded, containerRect);
          if (rects === null) {
            continue;
          }

          nextOverlays.push({
            connectionId: user.connectionId,
            color:
              typeof user.info?.color === "string"
                ? user.info.color
                : "#888888",
            selections: rects,
          });
        }
      },
      { editor }
    );

    setOverlays(nextOverlays);
  }, [editor, manager, others]);

  useLayoutEffect(() => {
    updateOverlays();
  }, [updateOverlays]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      updateOverlays();
    });
  }, [editor, updateOverlays]);

  useEffect(() => {
    const container = editor.getRootElement()?.parentElement;
    if (container === null || container === undefined) {
      return;
    }

    const handleLayoutChange = () => {
      updateOverlays();
    };

    container.addEventListener("scroll", handleLayoutChange, { passive: true });
    window.addEventListener("resize", handleLayoutChange, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleLayoutChange);
      window.removeEventListener("resize", handleLayoutChange);
    };
  }, [editor, updateOverlays]);

  useEffect(() => {
    return room.subscribe(
      root,
      () => {
        updateOverlays();
      },
      { isDeep: true }
    );
  }, [room, root, updateOverlays]);

  return (
    <div aria-hidden className="lb-root lb-lexical-cursors">
      {overlays.flatMap((overlay) => {
        return overlay.selections.map((rect, index) => (
          <div
            key={`${overlay.connectionId}-${rect.kind}-${index}`}
            className={
              rect.kind === "caret"
                ? "lb-lexical-cursor-caret"
                : "lb-lexical-cursor-selection"
            }
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              ["--lb-lexical-cursor-color" as string]: overlay.color,
            }}
          />
        ));
      })}
    </div>
  );
}

function $getRemoteOverlayRects(
  editor: LexicalEditor,
  decoded: DecodedLexicalSelection,
  containerRect: DOMRect
): OverlayRect[] | null {
  const anchorNode = $getNodeByKey(decoded.anchor.key);
  const focusNode = $getNodeByKey(decoded.focus.key);
  if (anchorNode === null || focusNode === null) {
    return null;
  }

  const range = createDOMRange(
    editor,
    anchorNode,
    decoded.anchor.offset,
    focusNode,
    decoded.focus.offset
  );
  if (range === null) {
    return null;
  }

  if (range.collapsed) {
    return $getCollapsedCaretRect(editor, range, focusNode, containerRect);
  }

  if (anchorNode === focusNode && $isLineBreakNode(anchorNode)) {
    const brElement = editor.getElementByKey(decoded.anchor.key);
    if (brElement === null) {
      return null;
    }

    const brRect = brElement.getBoundingClientRect();

    return [
      {
        left: brRect.left - containerRect.left,
        top: brRect.top - containerRect.top,
        width: brRect.width,
        height: brRect.height,
        kind: "selection",
      },
    ];
  }

  const selections = createRectsFromDOMRange(editor, range).map((rect) => {
    return {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      kind: "selection" as const,
    };
  });

  if (selections.length === 0) {
    return null;
  }

  return selections;
}

function $getCollapsedCaretRect(
  editor: LexicalEditor,
  range: Range,
  focusNode: LexicalNode,
  containerRect: DOMRect
): OverlayRect[] | null {
  let caretRect = range.getBoundingClientRect();

  if (
    (caretRect.height === 0 || caretRect.width === 0) &&
    $isLineBreakNode(focusNode)
  ) {
    const brElement = editor.getElementByKey(focusNode.getKey());
    if (brElement === null) {
      return null;
    }
    caretRect = brElement.getBoundingClientRect();
  }

  if (caretRect.height === 0) {
    return null;
  }

  return [
    {
      left: caretRect.left - containerRect.left,
      top: caretRect.top - containerRect.top,
      width: 0,
      height: caretRect.height,
      kind: "caret",
    },
  ];
}
