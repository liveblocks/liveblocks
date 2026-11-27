"use client";

import { useRedo, useUndo } from "@liveblocks/react/suspense";
import { useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { EditorProvider, useEditor } from "./editor-context";
import { EpisodeHeader } from "./episode-header";
import { SidePanel } from "./side-panel";
import { Sidebar } from "./sidebar";
import { EpisodeTimeline } from "./timeline";
import { Transcript } from "./transcript";
import { Transport } from "./transport";

export function PodcastEditor() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}

/**
 * Sidebar on the left, the transcript with the transport and timeline in
 * the middle, and comments and chapters on the right (a slide-over on
 * narrower screens).
 */
function EditorLayout() {
  const { panelOpen, setPanelOpen } = useEditor();
  const panelDocked = useMediaQuery("(min-width: 1024px)");
  useKeyboardShortcuts();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-neutral-100 text-neutral-900">
      <Sidebar />

      <main className="flex min-w-0 flex-1 gap-3 p-2 sm:p-3 xl:pl-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-950/5">
          <EpisodeHeader panelDocked={panelDocked} />
          <Transcript />
          <Transport />
          <EpisodeTimeline />
        </div>

        {panelDocked ? <SidePanel className="w-[340px] shrink-0" /> : null}
      </main>

      {!panelDocked && panelOpen ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-neutral-950/20"
            onClick={() => setPanelOpen(false)}
          />
          <SidePanel
            className="sheet-animate absolute inset-y-2 right-2 w-[min(360px,calc(100%-16px))] shadow-xl"
            onClose={() => setPanelOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Space plays and pauses, Delete cuts (or restores) the selected words, and
 * ⌘Z / ⇧⌘Z undo and redo your own changes. Typing in inputs and comments is
 * left alone.
 */
function useKeyboardShortcuts() {
  const { engine, selection, setSelection, toggleCut, setDraft } = useEditor();
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable]"))
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod || event.altKey) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        engine.toggle();
        return;
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selection) {
        event.preventDefault();
        toggleCut(selection);
        document.getSelection()?.removeAllRanges();
        setSelection(null);
        return;
      }
      if (event.key === "Escape") {
        document.getSelection()?.removeAllRanges();
        setSelection(null);
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, selection, setSelection, toggleCut, setDraft, undo, redo]);
}
