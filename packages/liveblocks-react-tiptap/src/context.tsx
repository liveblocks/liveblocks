import { nn } from "@liveblocks/core";
import type { Editor } from "@tiptap/react";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const EditorContext = createContext<Editor | null>(null);

export function EditorProvider({
  editor,
  children,
}: PropsWithChildren<{ editor: Editor }>) {
  return (
    <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
  );
}

/**
 * @tiptap/react already offers a `useCurrentEditor` hook but our components might
 * not live under `EditorProvider` or `EditorContent` so we create our own to reduce
 * repetition within our own nested components.
 *
 * @example
 * <Toolbar editor={editor}> // `editor` is required here
 *   <ToolbarSectionInline /> // But it isn't there, because `Toolbar` uses our own `EditorProvider`
 * </Toolbar>
 */
export function useCurrentEditor(source: string, parent: string) {
  const currentEditor = useContext(EditorContext);

  return nn(currentEditor, `${source} can’t be used outside of ${parent}.`);
}
