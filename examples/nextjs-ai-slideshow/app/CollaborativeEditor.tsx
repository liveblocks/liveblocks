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
    fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
  // y-codemirror.next's default remote caret is an inline span with 1px left
  // and right borders offset by -1px margins, containing U+2060 word-joiner
  // characters. That box participates in text layout: the borders/margins
  // are prone to rounding, and in fonts where U+2060 isn't zero-width the
  // span gains real width — both shift the characters after the caret to the
  // right. Force the span to occupy zero width no matter the font metrics,
  // and paint the caret bar with an absolutely-positioned pseudo-element
  // instead (the widget sets the user's color as inline `background-color`,
  // which the pseudo-element inherits).
  ".cm-ySelectionCaret": {
    display: "inline-block",
    width: "0",
    border: "none",
    margin: "0",
    padding: "0",
    verticalAlign: "text-bottom",
  },
  // Hovering the bar still reveals the name label: pseudo-elements hit-test
  // as part of their originating element.
  ".cm-ySelectionCaret::after": {
    content: '""',
    position: "absolute",
    top: "0",
    bottom: "0",
    left: "-1px",
    width: "2px",
    backgroundColor: "inherit",
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
