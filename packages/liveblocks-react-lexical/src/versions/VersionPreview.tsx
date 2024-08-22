import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import type { Binding, Provider } from "@lexical/yjs";
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from "@lexical/yjs";
import { type HistoryVersion, kInternal } from "@liveblocks/core";
import { useRoom, useVersionData } from "@liveblocks/react";
import type { LexicalEditor } from "lexical";
import React, { useCallback, useEffect, useRef } from "react";
import type { Transaction, YEvent } from "yjs";
import { applyUpdate, Doc } from "yjs";

import { liveblocksConfig } from "../liveblocks-config";

function createNoOpProvider(): Provider {
  const emptyFunction = () => { };

  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: emptyFunction,
      on: emptyFunction,
      setLocalState: emptyFunction,
    },
    connect: emptyFunction,
    disconnect: emptyFunction,
    off: emptyFunction,
    on: emptyFunction,
  };
}

function registerCollaborationListeners(
  editor: LexicalEditor,
  provider: Provider,
  binding: Binding,
): () => void {
  const unsubscribeUpdateListener = editor.registerUpdateListener(
    ({
      dirtyElements,
      dirtyLeaves,
      editorState,
      normalizedNodes,
      prevEditorState,
      tags,
    }) => {
      if (tags.has("skip-collab") === false) {
        syncLexicalUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        );
      }
    },
  );

  const observer = (events: Array<YEvent<any>>, transaction: Transaction) => {
    if (transaction.origin !== binding) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      syncYjsChangesToLexical(binding, provider, events, false);
    }
  };

  binding.root.getSharedType().observeDeep(observer);

  return () => {
    unsubscribeUpdateListener();
    binding.root.getSharedType().unobserveDeep(observer);
  };
}

export function VersionPreview({ version, onRestore }: { version: HistoryVersion, onRestore?: () => void }) {
  const [parentEditor, parentContext] = useLexicalComposerContext();
  const room = useRoom();
  const nodes = Array.from(parentEditor._nodes.values()).map((n) => n.klass);
  const editor = useRef<LexicalEditor>();
  const { isLoading, version: versionData } = useVersionData(version.id);

  const initialConfig = liveblocksConfig({
    namespace: "VersionViewer",
    theme: parentContext.getTheme() || {},
    nodes,
    editable: false,
    onError: (err) => console.error(err),
  });

  useEffect(() => {

  }, [])

  useEffect(() => {
    if (isLoading || !versionData || !editor.current) {
      return;
    }
    const doc = new Doc();
    const docMap = new Map([[version.id, doc]]);
    const provider = createNoOpProvider();
    const binding = createBinding(editor.current, provider, version.id, doc, docMap);
    const unsubscribe = registerCollaborationListeners(editor.current, provider, binding);

    applyUpdate(doc, versionData);

    return unsubscribe;
  }, [versionData, version.id, isLoading])

  const restore = useCallback(() => {
    if (!editor.current || !parentEditor) {
      return;
    }
    parentEditor.setEditorState(editor.current.getEditorState());
    // create a new version after restoring
    // TODO: this should be done from a command that waits for synchronization
    void room[kInternal].createTextVersion();
    if (onRestore) {
      onRestore();
    }
  }, [parentEditor, onRestore, room]);

  return (
    <>
      {isLoading ? <div>Loading...</div> :
        <>
          <button onClick={restore} style={{
            padding: "8px 16px",
            textTransform: "capitalize",
            border: "1px solid #d3d3d3",
            borderRadius: "4px"
          }}>
            restore
          </button>

          <div style={{ padding: "12px" }}>
            <LexicalComposer initialConfig={initialConfig}>
              <EditorRefPlugin editorRef={editor} />
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={<div>Empty Version History</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
            </LexicalComposer>
          </div>
        </>
      }
    </>
  )
}