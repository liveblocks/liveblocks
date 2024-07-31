"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type InboxContextType = {
  isOpen: boolean;
  toggleInbox: () => void;
};

const InboxContext = createContext<InboxContextType | undefined>(undefined);

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleInbox = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  return (
    <InboxContext.Provider value={{ isOpen, toggleInbox }}>
      {children}
    </InboxContext.Provider>
  );
}

export function DisplayWhenInboxOpen({ children }: { children: ReactNode }) {
  const { isOpen } = useInbox();

  if (!isOpen) {
    return null;
  }

  return children;
}
