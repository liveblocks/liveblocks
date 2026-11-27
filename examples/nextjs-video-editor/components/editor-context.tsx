"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { LibraryItem } from "@/hooks/use-editor";

export type SidePanelTab = "inspector" | "comments";

type EditorUi = {
  sidePanelOpen: boolean;
  setSidePanelOpen: Dispatch<SetStateAction<boolean>>;
  sidePanelTab: SidePanelTab;
  setSidePanelTab: Dispatch<SetStateAction<SidePanelTab>>;
  // Shows the side panel on `tab`, for links into it from elsewhere.
  openSidePanel: (tab: SidePanelTab) => void;
  // The comment thread last opened from the timeline, highlighted in the list.
  activeThreadId: string | null;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
  // What's being dragged from the library, so the timeline can preview the
  // drop (HTML drag events don't expose the payload until the drop itself).
  draggedItem: LibraryItem | null;
  setDraggedItem: Dispatch<SetStateAction<LibraryItem | null>>;
  snapping: boolean;
  setSnapping: Dispatch<SetStateAction<boolean>>;
};

const EditorUiContext = createContext<EditorUi | null>(null);

/** Local, per-user interface state shared by the editor's panels. */
export function EditorUiProvider({
  defaultSidePanelOpen,
  children,
}: {
  defaultSidePanelOpen: boolean;
  children: ReactNode;
}) {
  const [sidePanelOpen, setSidePanelOpen] = useState(defaultSidePanelOpen);
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>("inspector");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<LibraryItem | null>(null);
  const [snapping, setSnapping] = useState(true);

  const openSidePanel = useCallback((tab: SidePanelTab) => {
    setSidePanelTab(tab);
    setSidePanelOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      sidePanelOpen,
      setSidePanelOpen,
      sidePanelTab,
      setSidePanelTab,
      openSidePanel,
      activeThreadId,
      setActiveThreadId,
      draggedItem,
      setDraggedItem,
      snapping,
      setSnapping,
    }),
    [
      sidePanelOpen,
      sidePanelTab,
      openSidePanel,
      activeThreadId,
      draggedItem,
      snapping,
    ]
  );

  return (
    <EditorUiContext.Provider value={value}>
      {children}
    </EditorUiContext.Provider>
  );
}

export function useEditorUi() {
  const value = useContext(EditorUiContext);
  if (!value) {
    throw new Error("useEditorUi must be used inside EditorUiProvider");
  }
  return value;
}
