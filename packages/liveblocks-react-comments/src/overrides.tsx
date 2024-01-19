"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import * as React from "react";

import { Emoji } from "./components/internal/Emoji";
import type { Direction } from "./types";

export interface LocalizationOverrides {
  locale: string;
  dir: Direction;
}

export interface GlobalOverrides {
  SELF: string;
  UNKNOWN_USER: string;
  LIST_REMAINING: (count: number) => string;
  EMOJI_PICKER_SEARCH_PLACEHOLDER: string;
  EMOJI_PICKER_EMPTY: ReactNode;
  EMOJI_PICKER_ERROR: (error: Error) => ReactNode;
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
  COMMENT_ADD_REACTION: string;
  COMMENT_REACTION_REMAINING: (others: number) => string;
  COMMENT_REACTION_TOOLTIP: (
    emoji: string,
    list: ReactNode,
    count: number
  ) => ReactNode;
  COMMENT_REACTION_DESCRIPTION: (emoji: string, count: number) => string;
}

export interface ComposerOverrides {
  COMPOSER_INSERT_MENTION: string;
  COMPOSER_INSERT_EMOJI: string;
  COMPOSER_PLACEHOLDER: string;
  COMPOSER_SEND: string;
}

export interface ThreadOverrides {
  THREAD_RESOLVE: string;
  THREAD_UNRESOLVE: string;
  THREAD_COMPOSER_PLACEHOLDER: string;
  THREAD_COMPOSER_SEND: string;
}

export type Overrides = LocalizationOverrides &
  GlobalOverrides &
  ComposerOverrides &
  CommentOverrides &
  ThreadOverrides;

type OverridesProviderProps = PropsWithChildren<{
  overrides?: Partial<Overrides>;
}>;

export const defaultOverrides: Overrides = {
  locale: "en",
  dir: "ltr",
  SELF: "you",
  UNKNOWN_USER: "Anonymous",
  LIST_REMAINING: (count) => `${count} more`,
  EMOJI_PICKER_SEARCH_PLACEHOLDER: "Search…",
  EMOJI_PICKER_EMPTY: "No emoji found.",
  EMOJI_PICKER_ERROR: () =>
    "There was an error while getting the list of emoji.",
  COMPOSER_INSERT_MENTION: "Mention someone",
  COMPOSER_INSERT_EMOJI: "Add emoji",
  COMPOSER_PLACEHOLDER: "Write a comment…",
  COMPOSER_SEND: "Send",
  COMMENT_EDITED: "(edited)",
  COMMENT_DELETED: "This comment has been deleted.",
  COMMENT_MORE: "More",
  COMMENT_EDIT: "Edit comment",
  COMMENT_EDIT_COMPOSER_PLACEHOLDER: "Edit comment…",
  COMMENT_EDIT_COMPOSER_CANCEL: "Cancel",
  COMMENT_EDIT_COMPOSER_SAVE: "Save",
  COMMENT_DELETE: "Delete comment",
  COMMENT_ADD_REACTION: "Add reaction",
  COMMENT_REACTION_TOOLTIP: (emoji, list) => (
    <>
      {list} reacted with <Emoji emoji={emoji} />
    </>
  ),
  COMMENT_REACTION_REMAINING: (others) =>
    `${others} other${others > 1 ? "s" : ""}`,
  COMMENT_REACTION_DESCRIPTION: (emoji, count) =>
    `${count} reaction${count > 1 ? "s" : ""}, react with ${emoji}`,
  THREAD_RESOLVE: "Resolve thread",
  THREAD_UNRESOLVE: "Re-open thread",
  THREAD_COMPOSER_PLACEHOLDER: "Reply to thread…",
  THREAD_COMPOSER_SEND: "Reply",
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
