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
import type { LexicalEditor } from "lexical";
import React, { useCallback, useContext, useEffect, useRef } from "react";
import type { Transaction, YEvent } from "yjs";
import { applyUpdate, Doc } from "yjs";

import { liveblocksConfig } from "../liveblocks-config";
import { VersionContext } from "./VersionContext";

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




export function Version() {
  const [parentEditor, parentContext] = useLexicalComposerContext();
  const nodes = Array.from(parentEditor._nodes.values()).map((n) => n.klass);
  const editor = useRef<LexicalEditor>();

  const { version } = useContext(VersionContext);

  const initialConfig = liveblocksConfig({
    namespace: "VersionViewer",
    theme: parentContext.getTheme() || {},
    nodes,
    editable: false,
    onError: (err) => console.error(err),
  });

  useEffect(() => {
    if (!version || !editor.current) {
      return;
    }
    const id = version.id;
    const doc = new Doc();
    const docMap = new Map([[id, doc]]);
    const provider = createNoOpProvider();
    const binding = createBinding(editor.current, provider, id, doc, docMap);

    const unsubscribe = registerCollaborationListeners(editor.current, provider, binding);

    applyUpdate(doc, version.data);

    return unsubscribe;
  }, [version])

  const restore = useCallback(() => {
    if (!editor.current || !parentEditor) {
      return;
    }
    parentEditor.setEditorState(editor.current.getEditorState());
  }, [parentEditor]);


  return (
    <>
      {version &&
        <>
          <button onClick={restore}>restore</button>
          <LexicalComposer initialConfig={initialConfig}>
            <EditorRefPlugin editorRef={editor} />
            <RichTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={<div>Empty Version History</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </LexicalComposer>
        </>
      }
    </>)

}
