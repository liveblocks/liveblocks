import type {
  CommentAttachment,
  CommentBody,
  MentionData,
} from "@liveblocks/core";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";
import type {
  RenderElementProps,
  RenderElementSpecificProps,
} from "slate-react";

import type {
  ComponentPropsWithSlot,
  ComposerBodyAutoLink,
  ComposerBodyCustomLink,
  ComposerBodyMark,
  ComposerBodyMention,
  Direction,
} from "../../types";
import type { MentionDraft } from "./slate/plugins/mentions";

export interface ComposerEditorMentionProps {
  /**
   * Whether the mention is selected.
   */
  isSelected: boolean;

  /**
   * The mention to display.
   */
  mention: MentionData;
}

export interface ComposerEditorLinkProps {
  /**
   * The link's absolute URL.
   *
   * @example "https://example.com"
   */
  href: string;

  /**
   * The link's content.
   *
   * @example "www.example.com", "a link", etc.
   */
  children: ReactNode;
}

export type ComposerEditorMentionSuggestionsProps = {
  /**
   * The list of mention suggestions.
   */
  mentions: MentionData[];

  /**
   * The currently selected mention's ID.
   */
  selectedMentionId?: string;
};

export type ComposerEditorFloatingToolbarProps = Record<string, never>;

export type ComposerMentionProps = ComponentPropsWithSlot<"span">;

export type ComposerLinkProps = ComponentPropsWithSlot<"a">;

export type ComposerFloatingToolbarProps = ComponentPropsWithSlot<"div">;

export type ComposerSuggestionsProps = ComponentPropsWithSlot<"div">;

export type ComposerSuggestionsListProps = ComponentPropsWithSlot<"ul">;

export interface ComposerSuggestionsListItemProps
  extends ComponentPropsWithSlot<"li"> {
  /**
   * The suggestion's value.
   */
  value: string;
}

export interface ComposerEditorComponents {
  /**
   * The component used to display mentions.
   */
  Mention: ComponentType<ComposerEditorMentionProps>;

  /**
   * The component used to display mention suggestions.
   */
  MentionSuggestions: ComponentType<ComposerEditorMentionSuggestionsProps>;

  /**
   * The component used to display links.
   */
  Link: ComponentType<ComposerEditorLinkProps>;

  /**
   * The component used to display a floating toolbar attached to the selection.
   */
  FloatingToolbar?: ComponentType<ComposerEditorFloatingToolbarProps>;
}

export interface ComposerEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "children"> {
  /**
   * The reading direction of the editor and related elements.
   */
  dir?: Direction;

  /**
   * The editor's initial value.
   */
  defaultValue?: CommentBody;

  /**
   * The text to display when the editor is empty.
   */
  placeholder?: string;

  /**
   * Whether the editor is disabled.
   */
  disabled?: boolean;

  /**
   * Whether to focus the editor on mount.
   */
  autoFocus?: boolean;

  /**
   * The components displayed within the editor.
   */
  components?: Partial<ComposerEditorComponents>;
}

export interface ComposerFormProps extends ComponentPropsWithSlot<"form"> {
  /**
   * The event handler called when the form is submitted.
   */
  onComposerSubmit?: (
    comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void> | void;

  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;

  /**
   * The composer's initial attachments.
   */
  defaultAttachments?: CommentAttachment[];

  /**
   * Whether to create attachments when pasting files into the editor.
   */
  pasteFilesAsAttachments?: boolean;

  /**
   * Whether to blur the editor when the form is submitted.
   */
  blurOnSubmit?: boolean;

  /**
   * When `preventUnsavedChanges` is set on your Liveblocks client (or set on
   * <LiveblocksProvider>), then closing a browser tab will be prevented when
   * there are unsaved changes.
   *
   * By default, that will include draft texts or attachments that are (being)
   * uploaded via this composer, but not submitted yet.
   *
   * If you want to prevent unsaved changes with Liveblocks, but not for this
   * composer, you can opt-out this composer instance by setting this prop to
   * `false`.
   */
  preventUnsavedChanges?: boolean;

  /**
   * @internal
   */
  roomId?: string;
}

export type ComposerSubmitProps = ComponentPropsWithSlot<"button">;

export type ComposerAttachFilesProps = ComponentPropsWithSlot<"button">;

export interface ComposerMarkToggleProps
  extends ComponentPropsWithSlot<"button"> {
  /**
   * The text mark to toggle.
   */
  mark: ComposerBodyMark;

  /**
   * The event handler called when the mark is toggled.
   */
  onValueChange?: (mark: ComposerBodyMark) => void;
}

export interface ComposerAttachmentsDropAreaProps
  extends ComponentPropsWithSlot<"div"> {
  disabled?: boolean;
}

export interface ComposerSubmitComment {
  /**
   * The submitted comment's body.
   */
  body: CommentBody;

  /**
   * The submitted comment's uploaded attachments.
   */
  attachments: CommentAttachment[];
}

export interface ComposerEditorElementProps extends RenderElementProps {
  Mention: ComponentType<ComposerEditorMentionProps>;
  Link: ComponentType<ComposerEditorLinkProps>;
}

export interface ComposerEditorMentionSuggestionsWrapperProps {
  dir?: ComposerEditorProps["dir"];
  id: string;
  itemId: (mentionId?: string) => string | undefined;
  mentionDraft?: MentionDraft;
  setMentionDraft: Dispatch<SetStateAction<MentionDraft | undefined>>;
  mentions?: MentionData[];
  selectedMentionId?: string;
  setSelectedMentionId: (mentionId: string) => void;
  MentionSuggestions: ComponentType<ComposerEditorMentionSuggestionsProps>;
  onItemSelect: (mentionId: string) => void;
  position?: FloatingPosition;
  inset?: number;
}

export interface ComposerEditorFloatingToolbarWrapperProps {
  dir?: ComposerEditorProps["dir"];
  id: string;
  position?: FloatingPosition;
  inset?: number;
  hasFloatingToolbarRange: boolean;
  setHasFloatingToolbarRange: Dispatch<SetStateAction<boolean>>;
  FloatingToolbar: ComponentType<ComposerEditorFloatingToolbarProps>;
}

export interface ComposerEditorMentionWrapperProps
  extends RenderElementSpecificProps<ComposerBodyMention> {
  Mention: ComponentType<ComposerEditorMentionProps>;
}

export interface ComposerEditorLinkWrapperProps
  extends RenderElementSpecificProps<
    ComposerBodyAutoLink | ComposerBodyCustomLink
  > {
  Link: ComponentType<ComposerEditorLinkProps>;
}

export type FloatingPosition = "top" | "bottom";

export type FloatingAlignment = "start" | "center" | "end";
