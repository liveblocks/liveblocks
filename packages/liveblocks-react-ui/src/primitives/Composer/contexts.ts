import type { Placement } from "@floating-ui/react-dom";
import type { CommentMixedAttachment, EventSource } from "@liveblocks/core";
import { nn } from "@liveblocks/core";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import type { Dispatch, Ref, SetStateAction } from "react";
import { createContext, useContext } from "react";
import type { Editor as SlateEditor, Element as SlateElement } from "slate";

import type { ComposerBodyMark, ComposerBodyMarks } from "../../types";

export type ComposerContext = {
  /**
   * Whether the composer is currently disabled.
   */
  isDisabled: boolean;

  /**
   * Whether the composer can currently be submitted.
   */
  canSubmit: boolean;

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
   * Clear the composer programmatically.
   */
  clear: () => void;

  /**
   * Select the editor programmatically.
   */
  select: () => void;

  /**
   * Focus the editor programmatically.
   */
  focus: () => void;

  /**
   * Blur the editor programmatically.
   */
  blur: () => void;

  /**
   * Which text marks are currently active and which aren't.
   */
  marks: ComposerBodyMarks;

  /**
   * Toggle a specific text mark.
   */
  toggleMark: (mark: ComposerBodyMark) => void;

  /**
   * Start creating a mention at the current selection.
   */
  createMention: () => void;

  /**
   * Insert text at the current selection.
   */
  insertText: (text: string) => void;

  /**
   * Open a file picker programmatically to create attachments.
   */
  attachFiles: () => void;

  /**
   * The composer's current attachments.
   */
  attachments: CommentMixedAttachment[];

  /**
   * Remove an attachment by its ID.
   */
  removeAttachment: (attachmentId: string) => void;
};

export type ComposerEditorContext = {
  validate: (value: SlateElement[]) => void;
  editor: SlateEditor;
  setFocused: Dispatch<SetStateAction<boolean>>;
  onEditorChange: EventSource<void>;
  roomId: string;
};

export type ComposerAttachmentsContext = {
  hasMaxAttachments: boolean;
  createAttachments: (files: File[]) => void;
  isUploadingAttachments: boolean;
  maxAttachments: number;
  maxAttachmentSize: number;
};

export type ComposerSuggestionsContext = {
  dir?: DropdownMenuProps["dir"];
  id: string;
  itemId: (value?: string) => string | undefined;
  placement: Placement;
  selectedValue?: string;
  setSelectedValue: (value: string) => void;
  onItemSelect: (value: string) => void;
  ref: Ref<HTMLDivElement>;
};

export type ComposerFloatingToolbarContext = {
  dir?: DropdownMenuProps["dir"];
  id: string;
  placement: Placement;
  ref: Ref<HTMLDivElement>;
};

export const ComposerContext = createContext<ComposerContext | null>(null);
export const ComposerEditorContext =
  createContext<ComposerEditorContext | null>(null);
export const ComposerAttachmentsContext =
  createContext<ComposerAttachmentsContext | null>(null);
export const ComposerSuggestionsContext =
  createContext<ComposerSuggestionsContext | null>(null);
export const ComposerFloatingToolbarContext =
  createContext<ComposerFloatingToolbarContext | null>(null);

export function useComposerEditorContext() {
  const composerEditorContext = useContext(ComposerEditorContext);

  return nn(
    composerEditorContext,
    "Composer.Form is missing from the React tree."
  );
}

export function useComposerAttachmentsContextOrNull() {
  return useContext(ComposerAttachmentsContext);
}

export function useComposerAttachmentsContext() {
  const composerAttachmentsContext = useComposerAttachmentsContextOrNull();

  return nn(
    composerAttachmentsContext,
    "Composer.Form is missing from the React tree."
  );
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

export function useComposerFloatingToolbarContext(
  source = "useComposerFloatingToolbarContext"
) {
  const composerFloatingToolbarContext = useContext(
    ComposerFloatingToolbarContext
  );

  return nn(
    composerFloatingToolbarContext,
    `${source} can’t be used outside of Composer.Editor.`
  );
}

export function useComposer(): ComposerContext {
  const composerContext = useContext(ComposerContext);

  return nn(composerContext, "Composer.Form is missing from the React tree.");
}
