"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type CommentsSidebarContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const CommentsSidebarContext =
  createContext<CommentsSidebarContextValue | null>(null);

export function CommentsSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommentsSidebarContext.Provider value={value}>
      {children}
    </CommentsSidebarContext.Provider>
  );
}

export function useCommentsSidebar(): CommentsSidebarContextValue {
  const ctx = useContext(CommentsSidebarContext);
  if (!ctx) {
    throw new Error(
      "useCommentsSidebar must be used within CommentsSidebarProvider",
    );
  }
  return ctx;
}
