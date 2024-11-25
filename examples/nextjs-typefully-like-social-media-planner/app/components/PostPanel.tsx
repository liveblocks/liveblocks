"use client";

import {
  useLiveblocksExtension,
  FloatingComposer,
  AnchoredThreads,
} from "@liveblocks/react-tiptap";
import { useEditor, EditorContent, BubbleMenu, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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

    // TODO add mentions from social media
    // https://tiptap.dev/docs/examples/advanced/mentions
    // https://tiptap.dev/docs/editor/extensions/nodes/mention
  });

  const { insertPostAfter, removePost, postIds } = usePostIds();

  return (
    <>
      <PostUI
        user={{
          avatar: "/avatar.jpg",
          name: "Chris Nicholas",
          username: "@ctnicholasdev",
        }}
      >
        <>
          <EditorContent
            editor={editor}
            className="!outline-none *:group-last:pb-16 *:group-last:-mb-16"
          />
          <div
            className="absolute bottom-2 left-0 right-0 justify-end hidden group-hover:flex gap-1.5 transition-opacity pointer-events-none"
            // style={{ opacity: !editor?.isFocused ? "0" : undefined }}
          >
            <button
              className="pointer-events-auto"
              onClick={() => insertPostAfter(id)}
            >
              <span className="sr-only">Add new post</span>
              <SquarePlusIcon className="w-5 h-5 text-gray-400 hover:text-gray-700 transition-colors" />
            </button>
            {postIds.length > 1 ? (
              <button
                className="pointer-events-auto"
                onClick={() => removePost(id)}
              >
                <span className="sr-only">Delete post</span>
                <DeletePostIcon className="w-5 h-5 text-red-400 hover:text-red-700 transition-colors" />
              </button>
            ) : null}
          </div>
        </>
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
      </PostUI>
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

function SquarePlusIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-list-plus"
      {...props}
    >
      <path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6" />
    </svg>
  );
}

function DeletePostIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-trash-2"
      {...props}
    >
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11L10 17" />
      <path d="M14 11L14 17" />
    </svg>
  );
}
