import type { CommentBody } from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ComponentType, FormEvent } from "react";
import type {
  RenderElementProps,
  RenderElementSpecificProps,
} from "slate-react";

import type { MentionDraft } from "../../slate/mentions";
import type {
  ComponentPropsWithSlot,
  ComposerBodyMention,
  Direction,
} from "../../types";

export interface ComposerRenderMentionProps {
  /**
   * Whether the mention is selected.
   */
  isSelected: boolean;

  /**
   * The mention's user ID.
   */
  userId: string;
}

export type ComposerMentionProps = ComponentPropsWithSlot<"span">;

export type ComposerRenderMentionSuggestionsProps = {
  /**
   * The list of suggested user IDs.
   */
  userIds: string[];

  /**
   * The currently selected user ID.
   */
  selectedUserId?: string;
};

export type ComposerSuggestionsProps = ComponentPropsWithSlot<"div">;

export type ComposerSuggestionsListProps = ComponentPropsWithSlot<"ul">;

export interface ComposerSuggestionsListItemProps
  extends ComponentPropsWithSlot<"li"> {
  /**
   * The suggestion's value.
   */
  value: string;
}

export interface ComposerEditorProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The reading direction of the editor and related elements.
   */
  dir?: Direction;

  /**
   * The editor's initial value.
   */
  initialValue?: CommentBody;

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
   * The component used to render mentions.
   */
  renderMention?: ComponentType<ComposerRenderMentionProps>;

  /**
   * The component used to render mention suggestions.
   */
  renderMentionSuggestions?: ComponentType<ComposerRenderMentionSuggestionsProps>;
}

export interface ComposerFormProps extends ComponentPropsWithSlot<"form"> {
  /**
   * The event handler called when the form is submitted.
   */
  onCommentSubmit?: (
    comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void> | void;
}

export type ComposerSubmitProps = ComponentPropsWithSlot<"button">;

export interface ComposerSubmitComment {
  /**
   * The submitted comment's body.
   */
  body: CommentBody;
}

export interface ComposerMentionSuggestionsWrapperProps {
  dir?: ComposerEditorProps["dir"];
  id: string;
  itemId: (userId?: string) => string | undefined;
  mentionDraft: MentionDraft;
  userIds?: string[];
  selectedUserId?: string;
  setSelectedUserId: (userId: string) => void;
  children?: ComposerEditorProps["renderMentionSuggestions"];
  onItemSelect: (userId: string) => void;
  position?: SuggestionsPosition;
  inset?: number;
}

export interface ComposerEditorElementProps extends RenderElementProps {
  renderMention: ComposerEditorProps["renderMention"];
}

export interface ComposerMentionWrapperProps
  extends RenderElementSpecificProps<ComposerBodyMention> {
  renderMention: ComposerEditorProps["renderMention"];
}

export type SuggestionsPosition = "top" | "bottom";
