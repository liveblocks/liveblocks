"use client";

import NotificationsPopover from "../notifications-popover";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";

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
        </div>

        <div className="xl:[&:not(:has(.lb-tiptap-anchored-threads))]:pr-[200px] [&:not(:has(.lb-tiptap-anchored-threads))]:pr-[50px]">

        </div>
      </div>
    </div>
  );
}

