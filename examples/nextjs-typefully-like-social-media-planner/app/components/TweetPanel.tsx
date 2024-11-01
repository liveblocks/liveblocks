"use client";

import {
  useLiveblocksExtension,
  FloatingComposer,
} from "@liveblocks/react-tiptap";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { LengthenIcon } from "../icons/LengthenIcon";
export function TweetPanel() {
  return (
    <div>
      <Tweet />
      <Tweet />
      <Tweet />
    </div>
  );
}

function Tweet() {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex gap-2 group">
      <div className="flex flex-col items-center gap-1 pb-1">
        <div className="bg-gray-200 w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img
            className="h-full w-full"
            src="https://github.com/ctnicholas.png"
          />
        </div>
        <div className="w-[3px] bg-gray-200/80 h-full flex-grow group-last:hidden"></div>
      </div>
      <div className="flex-1">
        <div className="flex gap-1 whitespace-nowrap">
          <span className="font-semibold">Chris Nicholas</span>
          <span className="text-gray-500">@ctnicholasdev</span>
        </div>
        <div className="relative pb-6">
          <Editor focused={focused} setFocused={setFocused} />
          {focused ? (
            <div className="absolute bottom-0 left-0 right-0 flex justify-end">
              <button>
                <LengthenIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Editor({
  focused,
  setFocused,
}: {
  focused: boolean;
  setFocused: (isFocused: boolean) => void;
}) {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      liveblocks.configure({
        // ...
      }),
      StarterKit,
    ],
    immediatelyRender: false,
    onFocus({ editor, event }) {
      setFocused(true);
    },
    onBlur({ editor, event }) {
      setFocused(false);
    },
  });

  return (
    <div>
      <EditorContent editor={editor} className="!outline-none" />
      <div></div>
      <FloatingComposer editor={editor} style={{ width: "350px" }} />
    </div>
  );
}
