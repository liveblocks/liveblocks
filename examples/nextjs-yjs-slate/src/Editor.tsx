"use client";

import { useRoom } from "@/liveblocks.config";
import "@liveblocks/react";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import styles from "./Editor.module.css";
import { withYjs, YjsEditor } from "@slate-yjs/core";
import { Editable, Slate, withReact } from "slate-react";
import { useEffect, useMemo, useState } from "react";
import { createEditor, Editor, Transforms } from "slate";
import { YXmlText } from "yjs/dist/src/types/YXmlText";
import { Loading } from "@/pages";

// <p className={styles.placeholder}>Start typing here…</p>

const initialValue = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export default function EditorWrapper() {
  const room = useRoom();
  const [connected, setConnected] = useState(false);

  const [provider, sharedType] = useMemo(() => {
    const yDoc = new Y.Doc();
    const provider = new LiveblocksProvider(room, yDoc);
    const sharedDoc = yDoc.get("slate", Y.XmlText) as YXmlText;
    return [provider, sharedDoc];
  }, [room]);

  useEffect(() => {
    provider.on("sync", setConnected);
    provider.connect();

    return () => {
      provider.disconnect();
      provider.off("sync", setConnected);
    };
  }, [provider]);

  if (!connected) {
    return <Loading />;
  }

  return <CollaborativeEditor sharedType={sharedType} />;
}

function CollaborativeEditor({ sharedType }: { sharedType: Y.XmlText }) {
  const editor = useMemo(() => {
    const e = withReact(withYjs(createEditor(), sharedType));

    // Ensure editor always has at least 1 valid child
    const { normalizeNode } = e;
    e.normalizeNode = (entry) => {
      const [node] = entry;

      if (!Editor.isEditor(node) || node.children.length > 0) {
        return normalizeNode(entry);
      }

      console.log("adding");

      Transforms.insertNodes(
        editor,
        {
          children: [{ text: "" }],
        },
        { at: [0] }
      );
    };

    return e;
  }, []);

  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable className={styles.editor} />
    </Slate>
  );
}
