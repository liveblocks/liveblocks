import { Suspense, useState, useEffect } from "react";
import { RoomProvider, useOthers, useRoom } from "./liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { MonacoBinding } from "y-monaco";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";

function Room() {
  const [editorRef, setEditorRef] = useState();
  const room = useRoom();
  useEffect(() => {
    let binding;
    let provider;
    let ydoc;
    if (editorRef) {
      ydoc = new Y.Doc();
      const type = ydoc.getText("monaco");
      provider = new LiveblocksProvider(room, ydoc);
      binding = new MonacoBinding(
        type,
        editorRef.getModel(),
        new Set([editorRef]),
        provider.awareness
      );
    }
    return () => {
      // it's important to cleanup docs/editors/bindings
      ydoc?.destroy();
      provider?.destroy();
      binding?.destroy();
    };
  }, [editorRef, room]);
  function handleEditorDidMount(e) {
    setEditorRef(e);
  }
  return (
    <div className="container">
      <Editor
        onMount={handleEditorDidMount}
        height="100vh"
        width="100hw"
        theme="vs-dark"
        defaultLanguage="javascript"
        defaultValue=""
      />
    </div>
  );
}

export default function App({ roomId }) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ isTyping: false }}
      initialStorage={{ todos: new LiveList() }}
    >
      <Suspense fallback={<Loading />}>
        <Room />
      </Suspense>
    </RoomProvider>
  );
}

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
