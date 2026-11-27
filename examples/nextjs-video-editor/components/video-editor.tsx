"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useEffect, useRef, useState } from "react";
import { EditorUiProvider, useEditorUi } from "@/components/editor-context";
import { Header } from "@/components/header";
import { MediaLibrary } from "@/components/library/media-library";
import { SidePanel } from "@/components/side-panel";
import { Timeline } from "@/components/timeline/timeline";
import { Viewer } from "@/components/viewer/viewer";
import {
  useClips,
  useEditableSelection,
  useEditorActions,
  useSelection,
} from "@/hooks/use-editor";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePlayback } from "@/hooks/use-playback";
import { FPS } from "@/lib/project";
import { projectDuration } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const WIDE = "(min-width: 64rem)";

/**
 * The editor: the media library, the preview and the inspector side by side,
 * and the timeline below them. Everything in the edit is Liveblocks Storage;
 * playback is local, with each person's playhead shared through presence.
 */
export function VideoEditor() {
  const clips = useClips();
  const playback = usePlayback();
  const duration = projectDuration(clips);

  useEffect(() => {
    playback.setDuration(duration);
  }, [playback, duration]);

  usePlayheadPresence();
  useKeyboardShortcuts();

  // Below `lg` the side panels float over the preview and start closed.
  const [defaultOpen] = useState(() => window.matchMedia(WIDE).matches);

  return (
    <EditorUiProvider defaultSidePanelOpen={defaultOpen}>
      <EditorLayout defaultLibraryOpen={defaultOpen} />
    </EditorUiProvider>
  );
}

function EditorLayout({ defaultLibraryOpen }: { defaultLibraryOpen: boolean }) {
  const isWide = useMediaQuery(WIDE);
  const [libraryOpen, setLibraryOpen] = useState(defaultLibraryOpen);
  const { sidePanelOpen, setSidePanelOpen } = useEditorUi();
  const [timelineHeight, setTimelineHeight] = useState(300);

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-2 pb-2">
      <Header
        libraryOpen={libraryOpen}
        onLibraryOpenChange={setLibraryOpen}
        sidePanelOpen={sidePanelOpen}
        onSidePanelOpenChange={setSidePanelOpen}
      />

      <div className="relative flex min-h-0 flex-1 gap-2">
        {libraryOpen ? (
          <aside
            className={cn(
              "panel flex w-64 shrink-0 flex-col overflow-hidden xl:w-72",
              !isWide && "absolute inset-y-0 left-0 z-30 shadow-xl"
            )}
          >
            <MediaLibrary />
          </aside>
        ) : null}

        <section className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <Viewer />
        </section>

        {sidePanelOpen ? (
          <aside
            className={cn(
              "panel flex w-72 shrink-0 flex-col overflow-hidden xl:w-80",
              !isWide && "absolute inset-y-0 right-0 z-30 shadow-xl"
            )}
          >
            <SidePanel />
          </aside>
        ) : null}
      </div>

      <ResizeHandle
        height={timelineHeight}
        onHeightChange={setTimelineHeight}
      />

      <section
        className="panel flex shrink-0 flex-col overflow-hidden"
        style={{ height: timelineHeight }}
      >
        <Timeline />
      </section>
    </div>
  );
}

/** Drag to resize the timeline against the preview. */
function ResizeHandle({
  height,
  onHeightChange,
}: {
  height: number;
  onHeightChange: (height: number) => void;
}) {
  const drag = useRef<{ y: number; height: number } | null>(null);

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline"
      className="group flex h-2 shrink-0 cursor-row-resize touch-none items-center justify-center"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { y: event.clientY, height };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const next = drag.current.height - (event.clientY - drag.current.y);
        onHeightChange(
          Math.round(Math.min(window.innerHeight * 0.65, Math.max(200, next)))
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <span className="h-1 w-10 rounded-full bg-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100" />
    </div>
  );
}

/**
 * Shares the playhead through presence: right away when seeking or pausing,
 * and ten times a second while playing (other people's playheads glide
 * between updates).
 */
function usePlayheadPresence() {
  const playback = usePlayback();
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    let lastSentAt = 0;
    let lastPlaying = playback.playing;
    return playback.subscribe(() => {
      const now = performance.now();
      if (playback.playing && lastPlaying && now - lastSentAt < 100) {
        return;
      }
      lastSentAt = now;
      lastPlaying = playback.playing;
      updateMyPresence({ playhead: playback.time, playing: playback.playing });
    });
  }, [playback, updateMyPresence]);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

function useKeyboardShortcuts() {
  const playback = usePlayback();
  const [selection, setSelection] = useSelection();
  const editable = useEditableSelection();
  const { deleteClips, splitClips, duplicateClips } = useEditorActions();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          if (canRedo) redo();
        } else if (canUndo) {
          undo();
        }
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        if (canRedo) redo();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        if (editable.length > 0) {
          setSelection(duplicateClips(editable));
        }
        return;
      }
      if ((mod && key === "b") || (!mod && key === "s")) {
        event.preventDefault();
        splitClips(selection, playback.time);
        return;
      }
      if (mod || event.altKey) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          playback.toggle();
          break;
        case "ArrowLeft":
          event.preventDefault();
          playback.pause();
          playback.seek(playback.time - (event.shiftKey ? 1 : 1 / FPS));
          break;
        case "ArrowRight":
          event.preventDefault();
          playback.pause();
          playback.seek(playback.time + (event.shiftKey ? 1 : 1 / FPS));
          break;
        case "Home":
          event.preventDefault();
          playback.seek(0, { reveal: true });
          break;
        case "End":
          event.preventDefault();
          playback.seek(playback.duration, { reveal: true });
          break;
        case "Backspace":
        case "Delete":
          if (editable.length > 0) {
            event.preventDefault();
            deleteClips(editable);
            setSelection(selection.filter((id) => !editable.includes(id)));
          }
          break;
        case "Escape":
          setSelection([]);
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    playback,
    selection,
    editable,
    setSelection,
    deleteClips,
    splitClips,
    duplicateClips,
    undo,
    redo,
    canUndo,
    canRedo,
  ]);
}
