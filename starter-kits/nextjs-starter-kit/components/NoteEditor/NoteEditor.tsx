import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import {
  FloatingComposer,
  FloatingThreads,
  useCreateBlockNoteWithLiveblocks,
} from "@liveblocks/react-blocknote";
import { DocumentSpinner } from "@/primitives/Spinner";
import { NoteHeader } from "./NoteHeader";
import styles from "./NoteEditor.module.css";

export function NoteEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <BlockTextEditor />
    </ClientSideSuspense>
  );
}

function BlockTextEditor() {
  const editor = useCreateBlockNoteWithLiveblocks(
    {},
    { offlineSupport_experimental: true }
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.editorHeader}>
        <NoteHeader editor={editor} />
      </div>
      <div className={styles.editorWrapper}>
        <BlockNoteView editor={editor} />
        <ClientSideSuspense fallback={null}>
          <Threads editor={editor} />
        </ClientSideSuspense>
      </div>
    </div>
  );
}

function Threads({ editor }: { editor: BlockNoteEditor | null }) {
  const { threads } = useThreads();

  if (!editor) {
    return null;
  }

  return (
    <>
      <FloatingThreads editor={editor} threads={threads} />
      <FloatingComposer editor={editor} />
    </>
  );
}
