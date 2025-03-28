import { BlockNoteEditor } from "@blocknote/core";
import { useThreads } from "@liveblocks/react/suspense";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
} from "@liveblocks/react-blocknote";
import { useSyncExternalStore } from "react";
import styles from "./NoteThreads.module.css";

// Render threads in a sidebar on large monitors, or floating below highlights on smaller monitors
export function NoteThreads({ editor }: { editor: BlockNoteEditor | null }) {
  const { threads } = useThreads();
  const displayAnchoredThreads = useDisplayAnchoredThreads();

  if (!editor) {
    return null;
  }

  return (
    <>
      {displayAnchoredThreads ? (
        <FloatingThreads editor={editor} threads={threads} />
      ) : (
        <AnchoredThreads
          className={styles.anchoredThreads}
          editor={editor}
          threads={threads}
        />
      )}
      <FloatingComposer editor={editor} />
    </>
  );
}

// Only show sidebar threads at this width or above
const ANCHORED_THREADS_BOUNDARY = 1600;

function useDisplayAnchoredThreads() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(callback: () => void) {
  const query = window.matchMedia(
    `(max-width: ${ANCHORED_THREADS_BOUNDARY}px)`
  );

  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  const query = window.matchMedia(
    `(max-width: ${ANCHORED_THREADS_BOUNDARY}px)`
  );
  return query.matches;
}
