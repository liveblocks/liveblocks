"use client";

import React, { ReactNode, createContext, useContext, useState } from "react";
import { useEditThreadMetadata } from "@liveblocks/react/suspense";
import { useMaxZIndex } from "../hooks";

type ActiveThreadProviderProps = {
  activeThreadId: string | null;
  setActiveThreadId: (activeThreadId: string | null) => void;
};

const ActiveThread = createContext<ActiveThreadProviderProps | undefined>(
  undefined
);

export function ActiveThreadProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  return (
    <ActiveThread.Provider value={{ activeThreadId, setActiveThreadId }}>
      {children}
    </ActiveThread.Provider>
  );
}

export function useActiveThread(threadId: string) {
  const context = useContext(ActiveThread);
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();

  if (!context) {
    throw new Error(
      "useActiveThread must be used within an ActiveThreadProvider"
    );
  }

  // Is current threadId open
  const open = context.activeThreadId === threadId;

  // Allow opening and closing current threadId
  const setOpen = (open: boolean) => {
    context.setActiveThreadId(open ? threadId : null);

    // Set this thread's z-index higher than others when it opens
    editThreadMetadata({
      threadId,
      metadata: { zIndex: maxZIndex + 1 },
    });
  };

  return { open, setOpen };
}
