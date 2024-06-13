import { createHeadlessEditor } from "@lexical/headless";
import type { Binding, Provider } from "@lexical/yjs";
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from "@lexical/yjs";
import type {
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from "lexical";
import type { Transaction, YEvent } from "yjs";
import { Doc } from "yjs";

export function withHeadlessCollaborationEditor<T>(
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  callback: (editor: LexicalEditor, binding: Binding, provider: Provider) => T
): T {
  const editor = createHeadlessEditor({
    nodes,
  });

  const id = "root";
  const doc = new Doc();
  const docMap = new Map([[id, doc]]);
  const provider = createNoOpProvider();
  const binding = createBinding(editor, provider, id, doc, docMap);

  const unsubscribe = registerCollaborationListeners(editor, provider, binding);

  const res = callback(editor, binding, provider);

  unsubscribe();

  return res;
}

export function registerCollaborationListeners(
  editor: LexicalEditor,
  provider: Provider,
  binding: Binding
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
          tags
        );
      }
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function createNoOpProvider(): Provider {
  const emptyFunction = () => {};

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
