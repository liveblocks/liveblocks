"use client";

import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import { getSlideText } from "./slide-doc";

// The code editor's undo/redo state and actions, mirroring exactly what the
// editor's own Mod-z/Mod-y keybindings do. Exposed so the header undo/redo
// buttons can drive the editor history while the Code tab is open.
export type EditorHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily:
      "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  ".cm-content": {
    padding: "16px 0",
  },
  ".cm-line": {
    padding: "0 16px",
  },
  ".cm-gutters": {
    backgroundColor: "#fafafa",
    borderRight: "1px solid rgba(15, 23, 42, 0.06)",
    color: "#94a3b8",
  },
});

export function CollaborativeEditor({
  slideId,
  onHistoryChange,
}: {
  slideId: string;
  onHistoryChange?: (history: EditorHistory | null) => void;
}) {
  const room = useRoom();
  const userInfo = useSelf((me) => me.info);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const onHistoryChangeRef = useRef(onHistoryChange);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
  }, [onHistoryChange]);

  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      return;
    }

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = getSlideText(ydoc, slideId);
    const undoManager = new Y.UndoManager(ytext);

    provider.awareness.setLocalStateField("user", {
      name: userInfo.name,
      color: userInfo.color,
      colorLight: `${userInfo.color}80`,
    });

    const notifyHistory = (view: EditorView) => {
      onHistoryChangeRef.current?.({
        undo: () => {
          undo(view);
          view.focus();
        },
        redo: () => {
          redo(view);
          view.focus();
        },
        canUndo: undoDepth(view.state) > 0,
        canRedo: redoDepth(view.state) > 0,
      });
    };

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        html(),
        EditorView.lineWrapping,
        editorTheme,
        yCollab(ytext, provider.awareness, { undoManager }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            notifyHistory(update.view);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: element,
    });
    notifyHistory(view);

    return () => {
      onHistoryChangeRef.current?.(null);
      undoManager.destroy();
      view.destroy();
    };
  }, [element, room, slideId, userInfo]);

  return <div ref={ref} className="h-full min-h-0 overflow-hidden" />;
}
