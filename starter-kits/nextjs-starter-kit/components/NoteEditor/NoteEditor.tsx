import { BlockNoteView } from "@blocknote/mantine";
import { useSelf } from "@liveblocks/react";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { DocumentSpinner } from "@/primitives/Spinner";
import { NoteHeader } from "./NoteHeader";
import styles from "./NoteEditor.module.css";

// Uncomment and it works
// import { useCreateBlockNote } from "@blocknote/react";

export function NoteEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <BlockTextEditor />
    </ClientSideSuspense>
  );
}

function BlockTextEditor() {
  const canWrite = useSelf((me) => me.canWrite);

  const editor = useCreateBlockNoteWithLiveblocks(
    {},
    { offlineSupport_experimental: true }
  );

  // Uncomment and it works
  // const editor = useCreateBlockNote();

  return (
    <div className={styles.wrapper}>
      <NoteHeader editor={editor} />
      <div className={styles.editorWrapper}>
        <BlockNoteView editor={editor} editable={canWrite ?? false} />
        {/* <ClientSideSuspense fallback={null}>
          <NoteThreads editor={editor} />
        </ClientSideSuspense> */}
      </div>
    </div>
  );
}
