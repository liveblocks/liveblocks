"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useLayoutEffect,
  Suspense,
} from "react";
import { usePathname } from "next/navigation";

type InboxContextType = {
  isOpen: boolean;
  toggleInbox: () => void;
  openInbox: () => void;
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
    <InboxContext.Provider
      value={{ isOpen, toggleInbox, openInbox: () => setIsOpen(true) }}
    >
      <Suspense fallback={null}>
        <ResetInboxOnDashboard />
      </Suspense>
      {children}
    </InboxContext.Provider>
  );
}

// Reset when changing to dashboard
function ResetInboxOnDashboard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname === "/") {
      localStorage.setItem("inboxOpen", "false");
    }
  }, [pathname]);

  return null;
}

export function DisplayWhenInboxOpen({ children }: { children: ReactNode }) {
  const { isOpen } = useInbox();

  if (!isOpen) {
    return null;
  }

  return children;
}
