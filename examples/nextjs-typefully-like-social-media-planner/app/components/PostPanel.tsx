"use client";

import {
  useLiveblocksExtension,
  FloatingComposer,
  AnchoredThreads,
} from "@liveblocks/react-tiptap";
import { useEditor, EditorContent, BubbleMenu, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { LengthenIcon } from "../icons/LengthenIcon";
import { CommentIcon } from "../icons/CommentIcon";
import { useThreads } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { usePostIds } from "../hooks/usePostIds";
import { PostUI } from "./PostUI";

export function PostPanel() {
  const { postIds } = usePostIds();

  return (
    <ClientSideSuspense fallback={<div>load</div>}>
      {postIds.map((id) => (
        <Post key={id} id={id} />
      ))}
    </ClientSideSuspense>
  );
}

function Post({ id }: { id: string }) {
  const liveblocks = useLiveblocksExtension({
    field: id,
    mentions: false,
    offlineSupport_experimental: true,
  });

  const editor = useEditor({
    extensions: [liveblocks, StarterKit],
    immediatelyRender: false,
  });

  const { insertPostAfter, removePost } = usePostIds();

  return (
    <>
      <PostUI
        user={{
          avatar: "https://github.com/ctnicholas.png",
          name: "Chris Nicholas",
          username: "@ctnicholasdev",
        }}
      >
        <>
          <EditorContent editor={editor} className="!outline-none" />
          <div
            className="absolute bottom-2 left-0 right-0 justify-end hidden group-hover:flex gap-1"
            style={{ display: !editor?.isFocused ? "hidden" : undefined }}
          >
            <button onClick={() => insertPostAfter(id)}>
              Add
              {/*<LengthenIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />*/}
            </button>
            <button onClick={() => removePost(id)}>Delete</button>
          </div>
        </>
      </PostUI>
      <>
        <BubbleMenu editor={editor}>
          <button onClick={() => editor?.chain().focus().addPendingComment()}>
            <CommentIcon />
          </button>
        </BubbleMenu>
        {editor ? (
          <ClientSideSuspense fallback={null}>
            <Threads editor={editor} />
          </ClientSideSuspense>
        ) : null}
        <FloatingComposer editor={editor} style={{ width: "350px" }} />
      </>
    </>
  );
}

function Threads({ editor }: { editor: Editor }) {
  const { threads } = useThreads();

  return (
    <div
      className="w-[300px]"
      style={{
        display:
          threads.length > 0 && threads.some((thread) => !thread.resolved)
            ? "block"
            : "none",
      }}
    >
      <AnchoredThreads threads={threads} editor={editor} />
    </div>
  );
}
