"use client";

import NotificationsPopover from "../notifications-popover";
import { BlockNoteView } from "@blocknote/mantine";
import type { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNoteWithLiveblocks, FloatingComposer, AnchoredThreads, FloatingThreads } from "@liveblocks/react-blocknote";
import { useThreads } from "@liveblocks/react";
import { useIsMobile } from "./use-is-mobile";

export default function TiptapEditor() {

  const editor = useCreateBlockNoteWithLiveblocks({});

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">

        <NotificationsPopover />
      </div>
      <div className="border-b border-border/80 bg-background">
      </div>
      <div className="relative flex flex-row justify-between w-full py-16 xl:pl-[250px] pl-[100px] gap-[50px]">
        <div className="relative flex flex-1 flex-col gap-2">
          <BlockNoteView editor={editor} />
          <FloatingComposer editor={editor} className="w-[350px]" />
        </div>

        <div className="xl:[&:not(:has(.lb-tiptap-anchored-threads))]:pr-[200px] [&:not(:has(.lb-tiptap-anchored-threads))]:pr-[50px]">
          <Threads editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Threads({ editor }: { editor: BlockNoteEditor | null }) {
  const { threads } = useThreads();
  const isMobile = useIsMobile();

  if (!threads || !editor) {
    return null;
  }

  return isMobile ? (
    <FloatingThreads threads={threads} editor={editor} />
  ) : (
    <AnchoredThreads
      threads={threads}
      editor={editor}
      className="w-[350px] xl:mr-[100px] mr-[50px]"
    />
  );
}
