"use client";

import { html } from "@codemirror/lang-html";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useCallback, useEffect, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import { getSlideText } from "./slide-doc";

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

export function CollaborativeEditor({ slideId }: { slideId: string }) {
  const room = useRoom();
  const userInfo = useSelf((me) => me.info);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

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

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        html(),
        EditorView.lineWrapping,
        editorTheme,
        yCollab(ytext, provider.awareness, { undoManager }),
      ],
    });

    const view = new EditorView({
      state,
      parent: element,
    });

    return () => {
      undoManager.destroy();
      view.destroy();
    };
  }, [element, room, slideId, userInfo]);

  return <div ref={ref} className="h-full min-h-0 overflow-hidden" />;
}
