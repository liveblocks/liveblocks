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

export default function TextEditor() {
  return (
    <div className="relative min-h-screen flex flex-col h-full">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
        <NotificationsPopover />
      </div>
      <div className="relative grid grid-cols-2 justify-between w-full h-full grow my-16">
        <Editor field="left" />
        <Editor field="right" />
      </div>
    </div>
  );
}

function Editor({ field }: { field: string }) {
  const editor = useCreateBlockNoteWithLiveblocks(
    {},
    {
      // offlineSupport_experimental: true,
      field,
      initialContent:
        field === "left" ? "Try dragging from one editor" : "To the other",
    }
  );
  const isEditorReady = useIsEditorReady();

  return (
    <>
      {isEditorReady ? <BlockNoteView editor={editor} /> : null}
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
