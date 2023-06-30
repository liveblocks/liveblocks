import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { useCallback, useEffect, useState } from "react";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom } from "@/liveblocks.config";
import styles from "./Editor.module.css";
import { USER_INFO } from "@/src/constants";

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
