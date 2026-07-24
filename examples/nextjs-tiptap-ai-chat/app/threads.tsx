"use client";

import { AnchoredThreads, FloatingThreads } from "@liveblocks/react-tiptap";
import { useThreads } from "@liveblocks/react/suspense";
import type { Editor } from "@tiptap/react";

/**
 * Comment threads created from the editor toolbars. Anchored to the side on
 * large screens, floating next to the selection on small ones.
 */
export function Threads({ editor }: { editor: Editor | null }) {
  const { threads } = useThreads({ query: { resolved: false } });

  return (
    <>
      <div className="absolute right-3 top-0 hidden w-[280px] xl:block">
        <AnchoredThreads editor={editor} threads={threads} />
      </div>
      <FloatingThreads
        editor={editor}
        threads={threads}
        className="block w-[350px] xl:hidden"
      />
    </>
  );
}
