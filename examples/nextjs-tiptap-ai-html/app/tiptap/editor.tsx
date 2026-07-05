"use client";

import {
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, EditorEvents, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Avatars } from "./avatars";
import { HtmlBlock } from "./html-block/html-block";
import { SlashCommand } from "./slash-menu/slash-command";

export default function TiptapEditor() {
  // Comments are disabled because this example doesn't render any thread UI,
  // which would otherwise leave a dangling "Comment" button in the toolbar
  const liveblocks = useLiveblocksExtension({ comments: false });

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap px-6 py-8",
      },
    },
    enableContentCheck: true,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: 'Type "/" to insert blocks...',
      }),
      liveblocks,
      HtmlBlock,
      SlashCommand,
    ],
  });

  useEffect(() => {
    const onContentError = (event: EditorEvents["contentError"]) => {
      console.warn(event);
    };

    editor?.on("contentError", onContentError);

    return () => {
      editor?.off("contentError", onContentError);
    };
  }, [editor]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/80 bg-background px-5">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            Tiptap AI HTML blocks
          </h1>
          <p className="text-xs text-muted-foreground">
            Type "/" and choose HTML component
          </p>
        </div>
        <Avatars />
      </header>

      <div className="mx-auto w-full max-w-[750px] flex-1 py-10">
        <EditorContent editor={editor} />
        <FloatingToolbar editor={editor} />
      </div>
    </div>
  );
}
