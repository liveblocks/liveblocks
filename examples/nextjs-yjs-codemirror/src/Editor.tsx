import * as Y from "yjs";
// @ts-ignore
import { yCollab } from "y-codemirror.next";

import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";

import * as random from "lib0/random";
import { useCallback, useEffect, useState } from "react";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom } from "@/liveblocks.config";
import styles from "./Editor.module.css";
import { USER_INFO } from "@/src/constants";

export const usercolors = [
  { color: "#30bced", light: "#30bced33" },
  { color: "#6eeb83", light: "#6eeb8333" },
  { color: "#ffbc42", light: "#ffbc4233" },
  { color: "#ecd444", light: "#ecd44433" },
  { color: "#ee6352", light: "#ee635233" },
  { color: "#9ac2c9", light: "#9ac2c933" },
  { color: "#8acb88", light: "#8acb8833" },
  { color: "#1be7ff", light: "#1be7ff33" },
];

// select a random color for this user
export const userColor = usercolors[random.uint32() % usercolors.length];

export default function Editor() {
  const [element, setElement] = useState<HTMLElement>();
  const room = useRoom();

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    setElement(node);
  }, []);

  useEffect(() => {
    let provider: LiveblocksProvider<any, any, any, any>;
    let ydoc: Y.Doc;
    let view: EditorView;

    if (!element || !room) {
      return;
    }

    ydoc = new Y.Doc();
    provider = new LiveblocksProvider(room as any, ydoc);

    const ytext = ydoc.getText("codemirror");
    const undoManager = new Y.UndoManager(ytext);

    const user = USER_INFO[Math.floor(Math.random() * USER_INFO.length)];
    provider.awareness.setLocalStateField("user", {
      name: user.name,
      color: user.color,
      colorLight: user.color,
    });

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        javascript(),
        yCollab(ytext, provider.awareness, { undoManager }),
      ],
    });

    view = new EditorView({
      state,
      parent: element,
    });

    return () => {
      ydoc?.destroy();
      provider?.destroy();
      view?.destroy();
    };
  }, [element, room]);

  return <div ref={ref} className={styles.editor} />;
}
