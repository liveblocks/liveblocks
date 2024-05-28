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
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import type { Transaction, YEvent } from "yjs";
import { applyUpdate, Doc } from "yjs";

export function headlessConvertYDocStateToLexicalJSON(
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  yDocState: Uint8Array
): SerializedEditorState<SerializedLexicalNode> {
  return withHeadlessCollaborationEditor(nodes, (editor, binding) => {
    applyUpdate(binding.doc, yDocState, { isUpdateRemote: true });
    editor.update(() => {}, { discrete: true });

    return editor.getEditorState().toJSON();
  });
}
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

function registerCollaborationListeners(
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

function createNoOpProvider(): Provider {
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
