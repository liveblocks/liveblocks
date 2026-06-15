"use client";

import type { EditorView } from "@codemirror/view";
import type { LiveObject } from "@liveblocks/client";
import { useCreateThread } from "@liveblocks/react";
import { Composer, type ComposerSubmitComment } from "@liveblocks/react-ui";
import type { LiveText } from "@liveblocks/core";
import type { FormEvent } from "react";
import { useCallback, useLayoutEffect, useState } from "react";

import {
  attachThreadToSelection,
  closePendingComment,
  getCommentPluginState,
} from "./comments-plugin";

type FloatingComposerPosition = {
  left: number;
  top: number;
  width: number;
};

export function CodeMirrorFloatingComposer({
  view,
  root,
  onClose,
}: {
  view: EditorView;
  root: LiveObject<{ document: LiveText }>;
  onClose: () => void;
}) {
  const createThread = useCreateThread();
  const [position, setPosition] = useState<FloatingComposerPosition | null>(
    null
  );

  const updatePosition = useCallback(() => {
    const pendingRange = getCommentPluginState(view)?.pendingRange;
    const selection = view.state.selection.main;
    const to =
      pendingRange?.to ?? Math.max(selection.anchor, selection.head);
    const coords = view.coordsAtPos(to);

    if (coords === null) {
      setPosition(null);
      return;
    }

    const margin = 16;
    const gap = 8;
    const width = Math.min(448, window.innerWidth - margin * 2);
    const estimatedHeight = 320;
    const top =
      coords.bottom + gap + estimatedHeight <= window.innerHeight
        ? coords.bottom + gap
        : Math.max(margin, coords.top - estimatedHeight - gap);

    setPosition({
      left: clamp(coords.left - width / 2, {
        min: margin,
        max: window.innerWidth - width - margin,
      }),
      top: clamp(top, {
        min: margin,
        max: window.innerHeight - margin,
      }),
      width,
    });
  }, [view]);

  useLayoutEffect(() => {
    updatePosition();

    const scroller = view.scrollDOM;
    window.addEventListener("resize", updatePosition);
    scroller.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      scroller.removeEventListener("scroll", updatePosition);
    };
  }, [updatePosition, view]);

  const handleClose = useCallback(() => {
    closePendingComment(view);
    onClose();
    view.focus();
  }, [onClose, view]);

  const handleComposerSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const thread = createThread({
        body: comment.body,
        attachments: comment.attachments,
      });

      attachThreadToSelection(view, root, thread.id);
      handleClose();
    },
    [createThread, handleClose, root, view]
  );

  if (position === null) {
    return null;
  }

  return (
    <div
      className="lb-cm-floating-composer"
      style={{ left: position.left, top: position.top, width: position.width }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      }}
    >
      <Composer
        autoFocus
        onComposerSubmit={handleComposerSubmit}
        showAttachments={false}
      />
    </div>
  );
}

function clamp(
  value: number,
  { min, max }: { min: number; max: number }
): number {
  return Math.max(min, Math.min(value, max));
}
