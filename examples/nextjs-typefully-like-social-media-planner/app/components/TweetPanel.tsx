"use client";

import {
  useLiveblocksExtension,
  FloatingComposer,
} from "@liveblocks/react-tiptap";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function TweetPanel() {
  return (
    <div>
      hey
      <Tweet />
    </div>
  );
}

function Tweet() {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      liveblocks.configure({
        // ...
      }),
      StarterKit,
    ],
    immediatelyRender: false,
  });

  return (
    <div>
      <EditorContent editor={editor} />
      <FloatingComposer editor={editor} style={{ width: "350px" }} />
    </div>
  );
}
