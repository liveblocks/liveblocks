"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useLayoutEffect,
} from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  useLayoutEffect(() => {
    // Reset when going to dashboard
    localStorage.setItem("inboxOpen", "false");
  }, [pathname]);

  useLayoutEffect(() => {
    setIsOpen(localStorage.getItem("inboxOpen") === "true");
  }, []);

  const toggleInbox = () => {
    if (isOpen) {
      setIsOpen(false);
      localStorage.setItem("inboxOpen", "false");
      return;
    }

    setIsOpen(true);
    localStorage.setItem("inboxOpen", "true");
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
