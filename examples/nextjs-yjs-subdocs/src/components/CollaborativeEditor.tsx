"use client";

import Quill from "quill";
import ReactQuill from "react-quill";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom, useSelf } from "@/liveblocks.config";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";

export type QuillEditorType = ReturnType<ReactQuill["getEditor"]>;
Quill.register("modules/cursors", QuillCursors);

// Collaborative text editor with simple rich text, live cursors, and live avatars

/**
 * can probably simplify this example by not having text in the root doc
 */
export function CollaborativeEditor() {
  const room = useRoom();
  const [rootDocText, setRootDocText] = useState<Y.Text>();
  const [provider, setProvider] = useState<any>();
  const [doc, setDoc] = useState<Y.Doc>();
  const [blocks, setBlocks] = useState<Y.Doc[]>([]);

  const addBlock = () => {
    if (!doc) {
      return;
    }
    const subdoc = new Y.Doc();
    const subText = subdoc.getText("quill");
    doc.getMap().set(subdoc.guid, subdoc);
  }
  // listen for subdoc changes
  useEffect(() => {
    const subdocHandler = ({ added, loaded }: { added: Set<Y.Doc>, loaded: Set<Y.Doc> }) => {
      console.log(added, loaded);
      if (added.size) {
        added.forEach(doc => doc.load());
        setBlocks([...blocks, ...added]);
      }
    };
    if (doc) {
      doc.on('subdocs', subdocHandler);
    }
    return () => {
      doc?.off('subdocs', subdocHandler);
    }
  }, [blocks, doc]);
  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText("quill");
    const yProvider = new LiveblocksProvider(room, yDoc);
    setDoc(yDoc);
    setRootDocText(yText);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!rootDocText || !provider) {
    return null;
  }

  const renderedBlocks = blocks.map((block) => {
    const text = block.getText('quill');
    return (<QuillEditor key={block.guid} yText={text} provider={provider} />);
  });

  return <>
    <QuillEditor yText={rootDocText} provider={provider} />
    <>{renderedBlocks}</>
    <button onClick={addBlock}>Add Block</button>
  </>;
}

type EditorProps = {
  yText: Y.Text;
  provider: any;
};

function QuillEditor({ yText, provider }: EditorProps) {
  // Add user info to cursors from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);
  useEffect(() => {
    const { name, color } = userInfo;
    provider.awareness.setLocalStateField("user", {
      name,
      color,
    });
  }, [userInfo]);

  const reactQuillRef = useRef<ReactQuill>(null);

  // Function to get the current Quill editor
  const getQuill = useCallback(() => {
    if (!reactQuillRef.current) {
      return null;
    }

    return reactQuillRef.current.getEditor();
  }, []);

  // Set up Yjs and Quill
  useEffect(() => {
    let quill: QuillEditorType;
    let binding: QuillBinding;

    if (!reactQuillRef.current) {
      return;
    }

    quill = reactQuillRef.current.getEditor();
    binding = new QuillBinding(yText, quill, provider.awareness);
    return () => {
      binding?.destroy?.();
    };
  }, [yText, provider]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Toolbar getQuill={getQuill} />
        <Avatars />
      </div>
      <div className={styles.editorContainer}>
        <ReactQuill
          className={styles.editor}
          placeholder="Start typing here…"
          ref={reactQuillRef}
          theme="snow"
          modules={{
            cursors: true,
            toolbar: false,
            history: {
              // Local undo shouldn't undo changes from remote users
              userOnly: true,
            },
          }}
        />
      </div>
    </div>
  );
}
