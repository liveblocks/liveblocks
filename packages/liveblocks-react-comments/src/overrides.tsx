import { createContext, useContext, useMemo } from "react";
import * as React from "react";
import type { Direction } from "./types";

export interface LocalizationOverrides {
  locale: string;
  dir: Direction;
}

export interface CommentOverrides {
  COMMENT_EDITED: string;
  // COMMENT_DELETED: string;
  COMMENT_MORE: string;
  COMMENT_EDIT: string;
  COMMENT_EDIT_COMPOSER_PLACEHOLDER: string;
  COMMENT_EDIT_COMPOSER_CANCEL: string;
  COMMENT_EDIT_COMPOSER_SAVE: string;
  COMMENT_DELETE: string;
}

export interface ComposerOverrides {
  COMPOSER_INSERT_MENTION: string;
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
  ComposerOverrides &
  CommentOverrides &
  ThreadOverrides;

export const defaultOverrides: Overrides = {
  locale: "en",
  dir: "ltr",
  COMPOSER_INSERT_MENTION: "Mention someone",
  COMPOSER_PLACEHOLDER: "Write a comment…",
  COMPOSER_SEND: "Send",
  COMMENT_EDITED: "(edited)",
  // COMMENT_DELETED: "",
  COMMENT_MORE: "More",
  COMMENT_EDIT: "Edit comment",
  COMMENT_EDIT_COMPOSER_PLACEHOLDER: "Edit comment…",
  COMMENT_EDIT_COMPOSER_CANCEL: "Cancel",
  COMMENT_EDIT_COMPOSER_SAVE: "Save",
  COMMENT_DELETE: "Delete comment",
  THREAD_RESOLVE: "Resolve thread",
  THREAD_UNRESOLVE: "Re-open thread",
  THREAD_COMPOSER_PLACEHOLDER: "Reply to thread…",
  THREAD_COMPOSER_SEND: "Reply",
};

export const OverridesContext = createContext<Overrides>(defaultOverrides);

export function useOverrides(overrides?: Partial<Overrides>): Overrides {
  const contextOverrides = useContext(OverridesContext);

  return useMemo(
    () => ({
      ...contextOverrides,
      ...overrides,
    }),
    [contextOverrides, overrides]
  );
}

export function OverridesProvider({
  children,
  overrides: globalOverrides,
}: {
  children: React.ReactNode;
  overrides: Partial<Overrides>;
}) {
  const overrides = useMemo(
    () => ({
      ...defaultOverrides,
      ...globalOverrides,
    }),
    [globalOverrides]
  );

  return (
    <OverridesContext.Provider value={overrides}>
      {children}
    </OverridesContext.Provider>
  );
}
