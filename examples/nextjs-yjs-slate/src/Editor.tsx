"use client";

import LiveblocksProvider from "@liveblocks/yjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor, Editor, Transforms } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import { withYjs, YjsEditor } from "@slate-yjs/core";
import * as Y from "yjs";
import { useRoom } from "@/liveblocks.config";
import { Loading } from "@/pages";
import styles from "./Editor.module.css";
import { Toolbar } from "@/src/Toolbar";
import { Leaf } from "@/src/Leaf";

export default function CollaborativeEditor() {
  const room = useRoom();
  const [connected, setConnected] = useState(false);

  const [provider, sharedType] = useMemo(() => {
    const yDoc = new Y.Doc();
    const provider = new LiveblocksProvider(room, yDoc);
    const sharedDoc = yDoc.get("slate", Y.XmlText) as Y.XmlText;
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

  return <SlateEditor sharedType={sharedType} />;
}

const emptyNode = {
  children: [{ text: "" }],
};

function SlateEditor({ sharedType }: { sharedType: Y.XmlText }) {
  const editor = useMemo(() => {
    const e = withReact(withYjs(createEditor(), sharedType));

    // Ensure editor always has at least 1 valid child
    const { normalizeNode } = e;
    e.normalizeNode = (entry) => {
      const [node] = entry;

      if (!Editor.isEditor(node) || node.children.length > 0) {
        return normalizeNode(entry);
      }

      Transforms.insertNodes(editor, emptyNode, { at: [0] });
    };

    return e;
  }, [sharedType]);

  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  return (
    <Slate editor={editor} initialValue={[emptyNode]}>
      <Toolbar />
      <Editable
        className={styles.editor}
        placeholder="Start typing here…"
        renderLeaf={renderLeaf}
      />
    </Slate>
  );
}
