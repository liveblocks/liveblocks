import { BlockNoteEditor } from "@blocknote/core";
import { useMutation, useSelf, useStorage } from "@liveblocks/react";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { renameDocument } from "@/lib/actions";
import { useInitialDocument } from "@/lib/hooks";
import styles from "./Title.module.css";

// Use Liveblocks Storage to set/read real-time title
export function Title({ editor }: { editor: BlockNoteEditor | null }) {
  const initialDocument = useInitialDocument();
  const title = useStorage((root) => root.title);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);
  const canWrite = useSelf((me) => me.canWrite);

  // Update title and update page links 0.4s after final change
  const handleChange = useMutation(
    ({ storage }, e: ChangeEvent<HTMLTextAreaElement>) => {
      storage.set("title", e.target.value);

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        renameDocument({
          documentId: initialDocument.id,
          name: e.target.value,
        });
      }, 400);
    },
    [initialDocument.id]
  );

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Prevent multi-line with enter
      if (e.key === "Enter") {
        e.preventDefault();
      }

      // Go to editor when down arrow or enter pressed
      if (editor && (e.key === "ArrowDown" || e.key === "Enter")) {
        editor._tiptapEditor.commands.focus("start");
      }
    },
    [editor]
  );

  return (
    <TextareaAutosize
      className={styles.title}
      placeholder="Untitled"
      value={title ?? initialDocument.name}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={!canWrite}
    />
  );
}
