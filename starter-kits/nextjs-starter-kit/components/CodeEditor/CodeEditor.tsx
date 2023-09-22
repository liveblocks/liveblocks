"use client";

import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { ClientSideSuspense } from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import { EditorView, basicSetup } from "codemirror";
import { useCallback, useEffect, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import {
  TypedLiveblocksProvider,
  useRoom,
  useSelf,
  useUpdateMyPresence,
} from "../../liveblocks.config";
import { DocumentSpinner } from "../../primitives/Spinner";
import { SidePanel } from "./SidePanel";
import { Tabs } from "./Tabs";
import styles from "./CodeEditor.module.css";

export function CodeEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      {() => <Editor />}
    </ClientSideSuspense>
  );
}

// Collaborative text editor with simple rich text and live cursors
export function Editor() {
  const room = useRoom();

  // Get user info from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);

  const [yMap, setYMap] = useState<Y.Map<Y.Text>>();
  const [yProvider, setYProvider] = useState<TypedLiveblocksProvider>();

  // Set up Liveblocks Yjs provider and attach CodeMirror editor
  useEffect(() => {
    if (!room || !userInfo) {
      return;
    }

    // Create Yjs provider and document
    const ydoc = new Y.Doc();
    const provider = new LiveblocksProvider(room, ydoc);

    // Attach user info to Yjs
    provider.awareness.setLocalStateField("user", {
      name: userInfo.name,
      color: userInfo.color,
      colorLight: userInfo.color + "80", // 6-digit hex code at 50% opacity
    });

    const map = ydoc.getMap<Y.Text>("codemirror-files");

    setYMap(map);
    setYProvider(provider);

    return () => {
      ydoc?.destroy();
      provider?.destroy();
    };
  }, [room, userInfo]);

  if (!yProvider || !yMap) {
    return null;
  }

  return (
    <CodeMirrorEditor
      yMap={yMap}
      yProvider={yProvider}
      initialFile={"index.ts"}
    />
  );
}

type CodeMirrorProps = {
  yMap: Y.Map<Y.Text>;
  yProvider: TypedLiveblocksProvider;
  initialFile: string;
};

function CodeMirrorEditor({ yMap, yProvider, initialFile }: CodeMirrorProps) {
  const [element, setElement] = useState<HTMLElement>();
  const [yText, setYText] = useState<Y.Text>();
  const [yUndoManager, setYUndoManager] = useState<Y.UndoManager>();
  const [files, setFiles] = useState<Array<[string, Y.Text]>>([]);
  const [currentFile, setCurrentFile] = useState<string>("");
  const updateMyPresence = useUpdateMyPresence();

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    setElement(node);
  }, []);

  // Set up initial file and state
  useEffect(() => {
    function setInitial() {
      if (!yMap.has(initialFile)) {
        yMap.set(initialFile, new Y.Text());
      }

      setYText(yMap.get(initialFile));
      setCurrentFile(initialFile);
      setFiles([...yMap.entries()]);
      updateMyPresence({ currentFile: initialFile });
    }

    yProvider.on("synced", setInitial);
    return () => {
      yProvider.off("synced", setInitial);
    };
  }, [updateMyPresence, yProvider, yMap, initialFile]);

  // Set up CodeMirror editor
  useEffect(() => {
    if (!yText || !yProvider) {
      return;
    }

    const undoManager = new Y.UndoManager(yText);
    setYUndoManager(undoManager);

    // Set up CodeMirror and extensions
    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
        basicSetup,
        javascript(),
        yCollab(yText, yProvider.awareness, { undoManager }),
      ],
    });

    // Attach CodeMirror to element
    const view = new EditorView({
      state,
      parent: element,
    });

    return () => {
      view.destroy();
      undoManager?.destroy();
    };
  }, [yText, yProvider, element]);

  // Change to another file
  const changeFile = useCallback(
    (fileName: string) => {
      const text = yMap.get(fileName);

      if (text) {
        setYText(text);
        setCurrentFile(fileName);
        updateMyPresence({ currentFile: fileName });
      }
    },
    [yMap, updateMyPresence]
  );

  // Create a new file
  const createFile = useCallback(
    (fileName: string) => {
      const text = new Y.Text();
      yMap.set(fileName, text);

      setYText(text);
      setCurrentFile(fileName);
      setFiles([...yMap.entries()]);
      updateMyPresence({ currentFile: fileName });
    },
    [yMap, updateMyPresence]
  );

  // Delete a file
  const deleteFile = useCallback(
    (fileName: string) => {
      yMap.delete(fileName);

      const [anotherFileName, anotherText] = [...yMap.entries()][0];
      setYText(anotherText);
      setCurrentFile(anotherFileName);
      setFiles([...yMap.entries()]);
      updateMyPresence({ currentFile: anotherFileName });
    },
    [yMap, updateMyPresence]
  );

  return (
    <>
      <div className={styles.container}>
        <div className={styles.editorSidePanel}>
          {yUndoManager ? (
            <SidePanel
              yUndoManager={yUndoManager}
              currentFile={currentFile}
              files={files}
              onFileChange={changeFile}
              onCreateFile={createFile}
              onDeleteFile={deleteFile}
            />
          ) : null}
        </div>
        <div className={styles.editorMain}>
          <div className={styles.editorHeader}>
            {yUndoManager ? (
              <Tabs
                yUndoManager={yUndoManager}
                currentFile={currentFile}
                files={files}
                onFileChange={(fileName) => changeFile(fileName)}
              />
            ) : null}
          </div>
          <div className={styles.editorContainer} ref={ref}></div>
        </div>
      </div>
    </>
  );
}
