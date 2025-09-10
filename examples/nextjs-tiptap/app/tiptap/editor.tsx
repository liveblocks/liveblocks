"use client";

import NotificationsPopover from "../notifications-popover";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import {
  useLiveblocksExtension,
  FloatingComposer,
  FloatingThreads,
  AnchoredThreads,
  Toolbar,
  FloatingToolbar,
} from "@liveblocks/react-tiptap";
import type { ComposerSubmitComment } from "@liveblocks/react-ui";
import StarterKit from "@tiptap/starter-kit";
import { useCreateThread, useSelf, useThreads } from "@liveblocks/react";
import { useIsMobile } from "./use-is-mobile";
import VersionsDialog from "../version-history-dialog";
import { ThreadData } from "@liveblocks/core";
import { FormEvent, useCallback, useEffect, useState } from "react";

const useActiveThreads = () => {
  const { threads = [], isLoading } = useThreads({ scrollOnLoad: false });
  const filteredThreads = threads.filter((thread) => thread.comments[0] && !thread.comments[0].deletedAt);
  return { threads: filteredThreads, isLoading };
};

const filterMyThreads = (threads: ThreadData[], myUserId: string | null) => {
  if (!myUserId) {
    return [];
  }
  return threads.filter((thread) => thread.comments[0] && thread.comments[0].userId === myUserId).filter((t) => t.comments.length === 1);;
};

export default function TiptapEditor() {
  const { threads } = useActiveThreads();
  const myUserId = useSelf((me) => me.id);
  const myFilteredThreads = filterMyThreads(threads, myUserId);
  const createThread = useCreateThread();
  const liveblocks = useLiveblocksExtension({
    mentions: false,
    threads_experimental: myFilteredThreads,
  });
  const [createdThreadId, setCreatedThreadId] = useState<string | null>(null);

  const editor = useEditor({
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: "outline-none flex-1 transition-all",
      },
    },
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      liveblocks,
    ],
  });


  const handleComposerSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>): void => {
      if (!editor) return;

      event.preventDefault();

      const thread = createThread({
        body: comment.body,
      });

      editor.commands.addComment(thread.id);
      setCreatedThreadId(thread.id);
    },
    [editor, createThread]
  );


  // After a thread is created, select it using useEffect
  // so that editor will see the thread on re-render
  useEffect(() => {
    console.log('weeee createdThreadId', createdThreadId);
    if (!createdThreadId) return;
    console.log('weeee selecting thread it createdThreadId', createdThreadId);
    editor?.commands.selectThread(createdThreadId);
  }, [editor, createdThreadId]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
        <VersionsDialog editor={editor} />
        <NotificationsPopover />
      </div>
      <div className="border-b border-border/80 bg-background">
        <Toolbar editor={editor} className="w-full" />
      </div>
      <div className="relative flex flex-row justify-between w-full py-16 xl:pl-[250px] pl-[100px] gap-[50px]">
        <div className="relative flex flex-1 flex-col gap-2">
          <EditorContent editor={editor} />
          <FloatingComposer onComposerSubmit={handleComposerSubmit} editor={editor} className="w-[350px]" />
          <FloatingToolbar editor={editor} />
        </div>

        <div className="xl:[&:not(:has(.lb-tiptap-anchored-threads))]:pr-[200px] [&:not(:has(.lb-tiptap-anchored-threads))]:pr-[50px]">
          <Threads editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Threads({ editor }: { editor: Editor | null }) {
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
