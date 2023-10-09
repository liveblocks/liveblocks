import type { Placement } from "@floating-ui/react-dom";
import { nn } from "@liveblocks/core";
import type { Direction } from "@radix-ui/react-dropdown-menu";
import type { Dispatch, Ref, SetStateAction } from "react";
import { createContext, useContext } from "react";
import type { Editor as SlateEditor, Element as SlateElement } from "slate";

export type ComposerContext = {
  /**
   * Whether the editor is currently focused.
   */
  isFocused: boolean;

  /**
   * Whether the editor is currently empty.
   */
  isEmpty: boolean;

  /**
   * Submit the composer programmatically.
   */
  submit: () => void;

  /**
   * Clear the editor programmatically.
   */
  clear: () => void;

  /**
   * Focus the editor programmatically.
   */
  focus: () => void;

  /**
   * Blur the editor programmatically.
   */
  blur: () => void;

  /**
   * Start creating a mention at the current selection.
   */
  createMention: () => void;

  /**
   * Insert text at the current selection.
   */
  insertText: (text: string) => void;
};

export type ComposerEditorContext = {
  validate: (value: SlateElement[]) => void;
  editor: SlateEditor;
  setFocused: Dispatch<SetStateAction<boolean>>;
};

export type ComposerSuggestionsContext = {
  dir?: Direction;
  id: string;
  itemId: (value?: string) => string | undefined;
  placement: Placement;
  selectedValue?: string;
  setSelectedValue: (value: string) => void;
  onItemSelect: (value: string) => void;
  ref: Ref<HTMLDivElement>;
};

export const ComposerContext = createContext<ComposerContext | null>(null);
export const ComposerEditorContext =
  createContext<ComposerEditorContext | null>(null);
export const ComposerSuggestionsContext =
  createContext<ComposerSuggestionsContext | null>(null);

export function useComposerEditorContext() {
  const composerEditorContext = useContext(ComposerEditorContext);

  return nn(
    composerEditorContext,
    "Composer.Form is missing from the React tree."
  );
}

export function useComposer(): ComposerContext {
  const composerContext = useContext(ComposerContext);

  return nn(composerContext, "Composer.Form is missing from the React tree.");
}

export function useComposerSuggestionsContext(
  source = "useComposerSuggestionsContext"
) {
  const composerSuggestionsContext = useContext(ComposerSuggestionsContext);

  return nn(
    composerSuggestionsContext,
    `${source} can’t be used outside of Composer.Editor.`
  );
}
