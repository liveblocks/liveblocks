"use client";

import { html } from "@codemirror/lang-html";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import { STARTER_SLIDE_HTML } from "./slide-html";

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

export function CollaborativeEditor() {
  const room = useRoom();
  const userInfo = useSelf((me) => me.info);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const seeded = useRef(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      return;
    }

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = ydoc.getText("codemirror");
    const undoManager = new Y.UndoManager(ytext);

    provider.awareness.setLocalStateField("user", {
      name: userInfo.name,
      color: userInfo.color,
      colorLight: `${userInfo.color}80`,
    });

    const seedAfterSync = (isSynced: boolean) => {
      if (!isSynced || seeded.current) {
        return;
      }

      seeded.current = true;
      if (ytext.length === 0) {
        ytext.insert(0, STARTER_SLIDE_HTML);
      }
    };

    provider.on("sync", seedAfterSync);
    // The provider is cached per room, so it may already be synced by the
    // time this effect runs (e.g. after a remount) and "sync" won't re-fire.
    seedAfterSync(provider.synced);

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
      provider.off("sync", seedAfterSync);
      undoManager.destroy();
      view.destroy();
    };
  }, [element, room, userInfo]);

  return <div ref={ref} className="h-full min-h-0 overflow-hidden" />;
}
