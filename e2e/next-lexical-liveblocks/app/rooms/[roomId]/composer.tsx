import { createEditor, CreateEditorArgs, LexicalEditor } from "lexical";
import {
  createContext,
  HTMLAttributes,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { registerDragonSupport } from "@lexical/dragon";
import { $canShowPlaceholder } from "@lexical/text";
import { mergeRegister } from "@lexical/utils";
import { registerRichText } from "@lexical/rich-text";

const ComposerContext = createContext<LexicalEditor | null>(null);

interface ComposerProps {
  config: Readonly<CreateEditorArgs>;
  children: ReactNode;
}

export function Composer(props: ComposerProps) {
  const { children, config } = props;

  const editor = useRef<LexicalEditor | null>(null);
  if (editor.current === null) {
    editor.current = createEditor(config);
  }

  return (
    <ComposerContext.Provider value={editor.current}>
      {children}
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  const editor = use(ComposerContext);
  if (editor === null) {
    throw new Error("useLexicalComposerContext: Cannot find Composer");
  }
  return editor;
}

interface ContentEditableProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "contentEditable"
> {}

export function ContentEditable(props: ContentEditableProps) {
  const editor = useComposer();
  const container = useRef<HTMLDivElement>(null);
  const isEditable = useIsEditable();

  useEffect(() => {
    if (container.current === null) return;

    if (container.current.ownerDocument === null) return;

    if (container.current.ownerDocument.defaultView === null) return;

    editor.setRootElement(container.current);
    return () => {
      editor.setRootElement(null);
    };
  }, [editor]);

  return <div ref={container} {...props} contentEditable={isEditable} />;
}

function useIsEditable(): boolean {
  const editor = useComposer();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerEditableListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.isEditable();
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function RichTextPlugin() {
  const editor = useComposer();

  useEffect(() => {
    return registerRichText(editor);
  }, [editor]);

  useEffect(() => {
    return registerDragonSupport(editor);
  }, [editor]);

  return null;
}

export function Placeholder({ children }: { children: ReactNode }) {
  const editor = useComposer();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return mergeRegister(
        editor.registerUpdateListener(onStoreChange),
        editor.registerEditableListener(onStoreChange)
      );
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor
      .getEditorState()
      .read(() => $canShowPlaceholder(editor.isComposing()));
  }, [editor]);

  const canShowPlaceholder = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  if (!canShowPlaceholder) return null;

  return children;
}
