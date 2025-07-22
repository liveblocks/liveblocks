"use client";

import { assertNever } from "@liveblocks/core";
import type { PropsWithChildren, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import { Emoji } from "./components/internal/Emoji";
import type { ComposerBodyMark, Direction } from "./types";
import { pluralize } from "./utils/pluralize";

export interface LocalizationOverrides {
  locale: string;
  dir: Direction;
}

export interface GlobalOverrides {
  USER_SELF: string;
  USER_UNKNOWN: string;
  LIST_REMAINING: (count: number) => string;
  LIST_REMAINING_USERS: (count: number) => string;
  LIST_REMAINING_COMMENTS: (count: number) => string;
  GROUP_MEMBERS_DESCRIPTION: (count: number) => string;
  EMOJI_PICKER_SEARCH_PLACEHOLDER: string;
  EMOJI_PICKER_EMPTY: ReactNode;
  EMOJI_PICKER_ERROR: (error: Error) => ReactNode;
  EMOJI_PICKER_CHANGE_SKIN_TONE: string;
  ATTACHMENT_TOO_LARGE: (maxSize?: string) => string;
  ATTACHMENT_ERROR: (error: Error) => string;
  COPY_TO_CLIPBOARD: string;
}

export interface CommentOverrides {
  COMMENT_EDITED: ReactNode;
  COMMENT_DELETED: ReactNode;
  COMMENT_MORE: string;
  COMMENT_EDIT: string;
  COMMENT_EDIT_COMPOSER_PLACEHOLDER: string;
  COMMENT_EDIT_COMPOSER_CANCEL: string;
  COMMENT_EDIT_COMPOSER_SAVE: string;
  COMMENT_DELETE: string;
  COMMENT_DELETE_ATTACHMENT: string;
  COMMENT_ADD_REACTION: string;
  COMMENT_REACTION_LIST: (
    list: ReactNode,
    emoji: string,
    count: number
  ) => ReactNode;
  COMMENT_REACTION_DESCRIPTION: (emoji: string, count: number) => string;
}

export interface ComposerOverrides {
  COMPOSER_INSERT_MENTION: string;
  COMPOSER_INSERT_EMOJI: string;
  COMPOSER_ATTACH_FILES: string;
  COMPOSER_REMOVE_ATTACHMENT: string;
  COMPOSER_PLACEHOLDER: string;
  COMPOSER_SEND: string;
  COMPOSER_TOGGLE_MARK: (mark: ComposerBodyMark) => string;
}

export interface AiToolConfirmationOverrides {
  AI_TOOL_CONFIRMATION_CONFIRM: string;
  AI_TOOL_CONFIRMATION_CANCEL: string;
}

export interface AiComposerOverrides {
  AI_COMPOSER_PLACEHOLDER: string;
  AI_COMPOSER_SEND: string;
  AI_COMPOSER_ABORT: string;
}

export interface AiChatMessageOverrides {
  AI_CHAT_MESSAGE_DELETED: string;
  AI_CHAT_MESSAGE_THINKING: string;
  AI_CHAT_MESSAGE_REASONING: (isStreaming: boolean) => string;
}

export interface AiChatOverrides {
  AI_CHAT_MESSAGES_ERROR: (error: Error) => ReactNode;
}

export interface ThreadOverrides {
  THREAD_RESOLVE: string;
  THREAD_UNRESOLVE: string;
  THREAD_SUBSCRIBE: string;
  THREAD_UNSUBSCRIBE: string;
  THREAD_NEW_INDICATOR: string;
  THREAD_NEW_INDICATOR_DESCRIPTION: string;
  THREAD_SHOW_MORE_COMMENTS: (count: number) => string;
  THREAD_COMPOSER_PLACEHOLDER: string;
  THREAD_COMPOSER_SEND: string;
}

export interface InboxNotificationOverrides {
  INBOX_NOTIFICATION_MORE: string;
  INBOX_NOTIFICATION_MARK_AS_READ: string;
  INBOX_NOTIFICATION_DELETE: string;
  INBOX_NOTIFICATION_THREAD_COMMENTS_LIST: (
    list: ReactNode,
    room: ReactNode | undefined,
    count: number
  ) => ReactNode;
  INBOX_NOTIFICATION_THREAD_MENTION: (
    user: ReactNode,
    room: ReactNode | undefined
  ) => ReactNode;
  INBOX_NOTIFICATION_TEXT_MENTION: (
    user: ReactNode,
    room: ReactNode | undefined
  ) => ReactNode;
}

export interface HistoryVersionPreviewOverrides {
  HISTORY_VERSION_PREVIEW_AUTHORS_LIST: (list: ReactNode) => ReactNode;
  HISTORY_VERSION_PREVIEW_RESTORE: string;
  HISTORY_VERSION_PREVIEW_EMPTY: ReactNode;
  HISTORY_VERSION_PREVIEW_ERROR: (error: Error) => ReactNode;
}

export type Overrides = LocalizationOverrides &
  GlobalOverrides &
  ComposerOverrides &
  CommentOverrides &
  ThreadOverrides &
  InboxNotificationOverrides &
  HistoryVersionPreviewOverrides &
  AiComposerOverrides &
  AiChatMessageOverrides &
  AiChatOverrides &
  AiToolConfirmationOverrides;

type OverridesProviderProps = PropsWithChildren<{
  overrides?: Partial<Overrides>;
}>;

export const defaultOverrides: Overrides = {
  locale: "en",
  dir: "ltr",
  USER_SELF: "you",
  USER_UNKNOWN: "Anonymous",
  COPY_TO_CLIPBOARD: "Copy",
  LIST_REMAINING: (count) => `${count} more`,
  LIST_REMAINING_USERS: (count) => `${count} ${pluralize(count, "other")}`,
  LIST_REMAINING_COMMENTS: (count) =>
    `${count} more ${pluralize(count, "comment")}`,
  GROUP_MEMBERS_DESCRIPTION: (count: number) =>
    `${count} ${pluralize(count, "member")}`,
  EMOJI_PICKER_SEARCH_PLACEHOLDER: "Search…",
  EMOJI_PICKER_EMPTY: "No emoji found.",
  EMOJI_PICKER_ERROR: () =>
    "There was an error while getting the list of emoji.",
  EMOJI_PICKER_CHANGE_SKIN_TONE: "Change skin tone",
  ATTACHMENT_TOO_LARGE: (maxSize) =>
    maxSize ? `The file is larger than ${maxSize}` : "The file is too large",
  ATTACHMENT_ERROR: () => "The file couldn’t be uploaded.",
  COMPOSER_INSERT_MENTION: "Mention someone",
  COMPOSER_INSERT_EMOJI: "Add emoji",
  COMPOSER_ATTACH_FILES: "Attach files",
  COMPOSER_REMOVE_ATTACHMENT: "Remove attachment",
  COMPOSER_PLACEHOLDER: "Write a comment…",
  COMPOSER_SEND: "Send",
  COMPOSER_TOGGLE_MARK: (format) => {
    switch (format) {
      case "bold":
        return "Bold";
      case "italic":
        return "Italic";
      case "strikethrough":
        return "Strikethrough";
      case "code":
        return "Inline code";
      default:
        return assertNever(format, "Unexpected mark");
    }
  },
  COMMENT_EDITED: "(edited)",
  COMMENT_DELETED: "This comment has been deleted.",
  COMMENT_MORE: "More",
  COMMENT_EDIT: "Edit comment",
  COMMENT_EDIT_COMPOSER_PLACEHOLDER: "Edit comment…",
  COMMENT_EDIT_COMPOSER_CANCEL: "Cancel",
  COMMENT_EDIT_COMPOSER_SAVE: "Save",
  COMMENT_DELETE: "Delete comment",
  COMMENT_DELETE_ATTACHMENT: "Delete attachment",
  COMMENT_ADD_REACTION: "Add reaction",
  COMMENT_REACTION_LIST: (list, emoji) => (
    <>
      {list} reacted with <Emoji emoji={emoji} />
    </>
  ),
  COMMENT_REACTION_DESCRIPTION: (emoji, count) =>
    `${count} ${pluralize(count, "reaction")}, react with ${emoji}`,
  THREAD_RESOLVE: "Resolve thread",
  THREAD_UNRESOLVE: "Re-open thread",
  THREAD_SUBSCRIBE: "Subscribe to thread",
  THREAD_UNSUBSCRIBE: "Unsubscribe from thread",
  THREAD_NEW_INDICATOR: "New",
  THREAD_NEW_INDICATOR_DESCRIPTION: "New comments",
  THREAD_SHOW_MORE_COMMENTS: (count) =>
    `Show ${count} more ${pluralize(count, "reply", "replies")}`,
  THREAD_COMPOSER_PLACEHOLDER: "Reply to thread…",
  THREAD_COMPOSER_SEND: "Reply",
  INBOX_NOTIFICATION_MORE: "More",
  INBOX_NOTIFICATION_MARK_AS_READ: "Mark as read",
  INBOX_NOTIFICATION_DELETE: "Delete notification",
  INBOX_NOTIFICATION_THREAD_COMMENTS_LIST: (
    list: ReactNode,
    room: ReactNode
  ) => (
    <>
      {list} commented
      {room ? <> in {room}</> : <> in a thread</>}
    </>
  ),
  INBOX_NOTIFICATION_THREAD_MENTION: (user: ReactNode, room: ReactNode) => (
    <>
      {user} mentioned you{room ? <> in {room}</> : null}
    </>
  ),
  INBOX_NOTIFICATION_TEXT_MENTION: (user: ReactNode, room: ReactNode) => (
    <>
      {user} mentioned you{room ? <> in {room}</> : null}
    </>
  ),
  HISTORY_VERSION_PREVIEW_AUTHORS_LIST: (list: ReactNode) => (
    <>Edits from {list}</>
  ),
  HISTORY_VERSION_PREVIEW_RESTORE: "Restore",
  HISTORY_VERSION_PREVIEW_EMPTY: "No content.",
  HISTORY_VERSION_PREVIEW_ERROR: () =>
    "There was an error while getting this version.",
  AI_COMPOSER_PLACEHOLDER: "Ask anything…",
  AI_COMPOSER_SEND: "Send",
  AI_COMPOSER_ABORT: "Abort response",
  AI_CHAT_MESSAGE_DELETED: "This message has been deleted.",
  AI_CHAT_MESSAGE_THINKING: "Thinking…",
  AI_CHAT_MESSAGE_REASONING: (isStreaming) =>
    isStreaming ? "Reasoning…" : "Reasoning",
  AI_CHAT_MESSAGES_ERROR: () =>
    "There was an error while getting the messages.",
  AI_TOOL_CONFIRMATION_CONFIRM: "Confirm",
  AI_TOOL_CONFIRMATION_CANCEL: "Cancel",
};

export const OverridesContext = createContext<Overrides | undefined>(undefined);

export function useOverrides(overrides?: Partial<Overrides>): Overrides {
  const contextOverrides = useContext(OverridesContext);

  return useMemo(
    () => ({
      ...defaultOverrides,
      ...contextOverrides,
      ...overrides,
    }),
    [contextOverrides, overrides]
  );
}

export function OverridesProvider({
  children,
  overrides: providerOverrides,
}: OverridesProviderProps) {
  const contextOverrides = useContext(OverridesContext);
  const overrides = useMemo(
    () => ({
      ...defaultOverrides,
      ...contextOverrides,
      ...providerOverrides,
    }),
    [contextOverrides, providerOverrides]
  );

  return (
    <OverridesContext.Provider value={overrides}>
      {children}
    </OverridesContext.Provider>
  );
}
