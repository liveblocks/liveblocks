import { nn } from "@liveblocks/core";
import { createContext, useContext } from "react";
import type {
  Descendant as SlateDescendant,
  Editor as SlateEditor,
} from "slate";

export type AiComposerContext = {
  /**
   * Whether the composer is currently disabled.
   */
  isDisabled: boolean;

  /**
   * Whether the composer can currently be submitted.
   */
  canSubmit: boolean;

  /**
   * Whether the editor is currently empty.
   */
  isEmpty: boolean;

  /**
   * Submit the composer programmatically.
   */
  submit: () => void;

  /**
   * Clear the composer programmatically.
   */
  clear: () => void;
};

export type AiComposerEditorContext = {
  onEditorValueChange: (value: SlateDescendant[]) => void;
  editor: SlateEditor;
};

export const AiComposerContext = createContext<AiComposerContext | null>(null);
export const AiComposerEditorContext =
  createContext<AiComposerEditorContext | null>(null);

export function useAiComposerEditorContext() {
  const composerEditorContext = useContext(AiComposerEditorContext);

  return nn(
    composerEditorContext,
    "AiComposer.Form is missing from the React tree."
  );
}

export function useAiComposer(): AiComposerContext {
  const composerContext = useContext(AiComposerContext);

  return nn(composerContext, "AiComposer.Form is missing from the React tree.");
}
