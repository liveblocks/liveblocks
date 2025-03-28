import { BlockNoteView } from "@blocknote/mantine";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { DocumentSpinner } from "@/primitives/Spinner";
import { NoteHeader } from "./NoteHeader";
import { NoteThreads } from "./NoteTheads";
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
      <NoteHeader editor={editor} />
      <div className={styles.editorWrapper}>
        <BlockNoteView editor={editor} />
        <ClientSideSuspense fallback={null}>
          <NoteThreads editor={editor} />
        </ClientSideSuspense>
      </div>
    </div>
  );
}
