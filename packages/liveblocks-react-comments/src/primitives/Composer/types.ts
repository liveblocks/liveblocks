import type { CommentBody } from "@liveblocks/core";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
  FormEvent,
  ReactNode,
} from "react";
import type {
  RenderElementProps,
  RenderElementSpecificProps,
} from "slate-react";

import type { MentionDraft } from "../../slate/plugins/mentions";
import type {
  ComponentPropsWithSlot,
  ComposerBodyAutoLink,
  ComposerBodyMention,
  Direction,
} from "../../types";

export interface ComposerEditorMentionProps {
  /**
   * Whether the mention is selected.
   */
  isSelected: boolean;

  /**
   * The mention's user ID.
   */
  userId: string;
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
   * The list of suggested user IDs.
   */
  userIds: string[];

  /**
   * The currently selected user ID.
   */
  selectedUserId?: string;
};

export type ComposerMentionProps = ComponentPropsWithSlot<"span">;

export type ComposerLinkProps = ComponentPropsWithSlot<"a">;

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
}

export interface ComposerEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> {
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
}

export type ComposerSubmitProps = ComponentPropsWithSlot<"button">;

export interface ComposerSubmitComment {
  /**
   * The submitted comment's body.
   */
  body: CommentBody;
}

export interface ComposerEditorElementProps extends RenderElementProps {
  Mention: ComponentType<ComposerEditorMentionProps>;
  Link: ComponentType<ComposerEditorLinkProps>;
}

export interface ComposerEditorMentionSuggestionsWrapperProps {
  dir?: ComposerEditorProps["dir"];
  id: string;
  itemId: (userId?: string) => string | undefined;
  mentionDraft: MentionDraft;
  userIds?: string[];
  selectedUserId?: string;
  setSelectedUserId: (userId: string) => void;
  MentionSuggestions: ComponentType<ComposerEditorMentionSuggestionsProps>;
  onItemSelect: (userId: string) => void;
  position?: SuggestionsPosition;
  inset?: number;
}

export interface ComposerEditorMentionWrapperProps
  extends RenderElementSpecificProps<ComposerBodyMention> {
  Mention: ComponentType<ComposerEditorMentionProps>;
}

export interface ComposerEditorLinkWrapperProps
  extends RenderElementSpecificProps<ComposerBodyAutoLink /* | ComposerBodyLink */> {
  Link: ComponentType<ComposerEditorLinkProps>;
}

export type SuggestionsPosition = "top" | "bottom";
