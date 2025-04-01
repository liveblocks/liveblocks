"use client";

import NotificationsPopover from "../notifications-popover";
import { BlockNoteView } from "@blocknote/mantine";
import type { BlockNoteEditor } from "@blocknote/core";
import {
  useCreateBlockNoteWithLiveblocks,
  FloatingComposer,
  FloatingThreads,
  useIsEditorReady,
} from "@liveblocks/react-blocknote";
import { useThreads } from "@liveblocks/react";
import { useCreateBlockNote } from "@blocknote/react";

export default function TextEditor() {
  return (
    <div className="relative min-h-screen flex flex-col h-full">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
        <NotificationsPopover />
      </div>
      <div className="relative grid grid-cols-2 justify-between w-full h-full grow gap-20 divide-x">
        <div className="py-16">
          <OfflineEditor
            initialContent={[
              {
                type: "heading",
                content: "Here's a heading",
                props: {
                  level: 2,
                },
              },
              {
                type: "paragraph",
                content: "This is a block in the first editor",
              },
              {
                type: "paragraph",
              },
            ]}
          />
          {/* <Editor field="left" /> */}
        </div>
        <div className="py-16">
          <OfflineEditor
            initialContent={[
              {
                type: "heading",
                content: "Here's a heading",
              },
              {
                type: "paragraph",
                content: "This is a block in the first editor",
              },
              {
                type: "paragraph",
              },
            ]}
          />
          {/* <Editor field="right" /> */}
        </div>
      </div>
    </div>
  );
}

function OfflineEditor({ initialContent }: { initialContent: any }) {
  const editor = useCreateBlockNote({
    sideMenuDetection: "editor",
    initialContent,
  });

  return <BlockNoteView editor={editor} />;
}

function Editor({ field }: { field: string }) {
  const editor = useCreateBlockNoteWithLiveblocks(
    { sideMenuDetection: "editor" },
    {
      // offlineSupport_experimental: true,

      field,
      // initialContent:
      //   field === "left" ? "Try dragging from one editor" : "To the other",
    }
  );
  const isEditorReady = useIsEditorReady();

  return (
    <>
      {isEditorReady ? <BlockNoteView id={field} editor={editor} /> : null}
      <FloatingComposer editor={editor} className="w-[350px]" />
      <Threads editor={editor} />
    </>
  );
}

function Threads({ editor }: { editor: BlockNoteEditor | null }) {
  const { threads } = useThreads();

  if (!threads || !editor) {
    return null;
  }

  return (
    <FloatingThreads
      threads={threads}
      editor={editor}
      onFocus={console.log}
      onToggle={() => console.log("toggle")}
    />
  );
}
