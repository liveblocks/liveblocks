"use client";

import { FloatingThreads } from "@liveblocks/react-tiptap";
import { useThreads } from "@liveblocks/react/suspense";
import type { Editor } from "@tiptap/react";

/**
 * Comment threads created from the editor toolbars. Anchored to the side on
 * large screens, floating next to the selection on small ones.
 */
export function Threads({ editor }: { editor: Editor | null }) {
  const { threads } = useThreads({ query: { resolved: false } });

  return (
    <FloatingThreads editor={editor} threads={threads} className="block w-88" />
  );
}
