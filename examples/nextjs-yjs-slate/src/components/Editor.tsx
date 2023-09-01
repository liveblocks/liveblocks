"use client";

import LiveblocksProvider from "@liveblocks/yjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor, Editor, Transforms } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import { withCursors, withYjs, YjsEditor } from "@slate-yjs/core";
import * as Y from "yjs";
import { LiveblocksProviderType, useRoom, useSelf } from "@/liveblocks.config";
import { Loading } from "@/components/Loading";
import styles from "./Editor.module.css";
import { Toolbar } from "@/components/Toolbar";
import { Leaf } from "@/components/Leaf";
import { Cursors } from "@/components/Cursors";
import { Avatars } from "./Avatars";

// Collaborative text editor with simple rich text, live cursors, and live avatars
export default function CollaborativeEditor() {
  const room = useRoom();
  const [connected, setConnected] = useState(false);
  const [sharedType, setSharedType] = useState<Y.XmlText>();
  const [provider, setProvider] = useState<LiveblocksProviderType>();

  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksProvider(room, yDoc);
    const sharedDoc = yDoc.get("slate", Y.XmlText) as Y.XmlText;
    yProvider.on("sync", setConnected);

    setSharedType(sharedDoc);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.off("sync", setConnected);
      yProvider?.destroy();
    };
  }, [room]);

  if (!connected || !sharedType || !provider) {
    return <Loading />;
  }

  return <SlateEditor provider={provider} sharedType={sharedType} />;
}

const emptyNode = {
  children: [{ text: "" }],
};

function SlateEditor({
  sharedType,
  provider,
}: {
  sharedType: Y.XmlText;
  provider: LiveblocksProviderType;
}) {
  // Get user info from Liveblocks authentication endpoint
  const userInfo = useSelf((self) => self.info);

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useMemo(() => {
    const e = withReact(
      withCursors(
        withYjs(createEditor(), sharedType),
        provider.awareness as any,
        {
          data: userInfo,
        }
      )
    );

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
  }, [sharedType, provider.awareness, userInfo]);

  // Set up Leaf components
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  // Connect Slate-yjs to the Slate editor
  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  return (
    <Slate editor={editor} initialValue={[emptyNode]}>
      <Cursors>
        <div className={styles.editorHeader}>
          <Toolbar />
          <Avatars />
        </div>
        <Editable
          className={styles.editor}
          placeholder="Start typing here…"
          renderLeaf={renderLeaf}
        />
      </Cursors>
    </Slate>
  );
}
