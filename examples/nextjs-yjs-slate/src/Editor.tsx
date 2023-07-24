"use client";

import { useRoom } from "@/liveblocks.config";
import "@liveblocks/react";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import styles from "./Editor.module.css";
import {
  slateNodesToInsertDelta,
  withYjs,
  YjsEditor,
  toSharedType,
} from "@slate-yjs/core";
import { Editable, Slate, withReact } from "slate-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEditor,
  Descendant,
  Element,
  Node,
  Editor,
  Transforms,
} from "slate";
import { YXmlText } from "yjs/dist/src/types/YXmlText";

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
    return <div>Loading...</div>;
  }

  return <CollaborativeEditor sharedType={sharedType} />;
}

function CollaborativeEditor({ sharedType }: { sharedType: Y.XmlText }) {
  const editor = useMemo(
    () => withReact(withYjs(createEditor(), sharedType)),
    []
  );

  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  return (
    <div className={styles.container}>
      <div className={styles.editorContainer}>
        <Slate editor={editor} initialValue={initialValue}>
          <Editable className={styles.editor} />
        </Slate>
      </div>
    </div>
  );
}

export function CollaborativeEditorOLD() {
  const room = useRoom();
  const [connected, setConnected] = useState(true);

  const [provider, sharedType] = useMemo(() => {
    const yDoc = new Y.Doc();
    const provider = new LiveblocksProvider(room, yDoc);
    const sharedDoc = yDoc.get("slate", Y.XmlText) as YXmlText;

    // Load the initial value into the yjs document
    // sharedType.applyDelta(slateNodesToInsertDelta(initialValue));
    return [provider, sharedDoc];
  }, [room]);

  // Set up the binding
  const editor = useMemo(() => {
    const e = withReact(withYjs(createEditor(), sharedType));

    /*
    // Ensure editor always has at least 1 valid child
    const { normalizeNode } = e;
    e.normalizeNode = (entry) => {
      const [node] = entry;
      console.log(sharedType._length);

      if (
        !Editor.isEditor(node) ||
        node.children.length > 0 ||
        sharedType._length !== 0
      ) {
        return normalizeNode(entry);
      }

      console.log("adding line");

      Transforms.insertNodes(
        editor,
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
        { at: [0] }
      );
    };
     */

    return e;
  }, [connected, sharedType]);

  /*
  useEffect(() => {
    // Ensure editor always has at least 1 valid child
    const { normalizeNode } = editor;
    editor.normalizeNode = (entry) => {
      if (!connected) {
        return normalizeNode(entry);
      }

      const [node] = entry;
      console.log(sharedType._length);
      console.log(
        !connected,
        !Editor.isEditor(node),
        node?.children?.length > 0
      );

      if (!Editor.isEditor(node) || node.children.length > 0) {
        return normalizeNode(entry);
      }

      console.log("adding line");

      Transforms.insertNodes(
        editor,
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
        { at: [0] }
      );
    };
  }, [connected, sharedType, editor]);
  */

  /*
  // Connect provider and editor in useEffect to comply with concurrent mode requirements.
  useEffect(() => {
    function syncThing(isSynced: boolean) {
      if (isSynced) {
        if (editor.children.length === 0) {
          console.log("ADD", editor);
          Transforms.insertNodes(
            editor,
            {
              type: "paragraph",
              children: [{ text: "" }],
            },
            { at: [0] }
          );
        }
        setConnected(true);
      }
      return;
      console.log("SYNCHD", isSynced);

      // Ensure editor always has at least 1 valid child
      const { normalizeNode } = editor;
      editor.normalizeNode = (entry) => {
        const [node] = entry;
        console.log(sharedType._length);

        if (!Editor.isEditor(node) || node.children.length > 0) {
          return normalizeNode(entry);
        }

        console.log("adding line");

        Transforms.insertNodes(
          editor,
          {
            type: "paragraph",
            children: [{ text: "" }],
          },
          { at: [0] }
        );
      };



    }
    provider.on("sync", syncThing);

    provider.connect();
    setConnected(false);
    return () => {
      setConnected(true);
      provider.off("sync", syncThing);
    };
  }, [provider]);
*/

  // Connect provider and editor in useEffect to comply with concurrent mode requirements.
  useEffect(() => {
    provider.on("async", setConnected);
    provider.connect();
    return () => {
      provider.disconnect();
      provider.off("async", setConnected);
    };
  }, [provider]);

  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  if (!editor) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.editorContainer}>
        <Slate editor={editor} initialValue={initialValue}>
          <Editable className={styles.editor} />
        </Slate>
      </div>
    </div>
  );
}
