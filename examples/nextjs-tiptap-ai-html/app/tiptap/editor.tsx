"use client";

import NotificationsPopover from "../notifications-popover";
import { useEditor, EditorContent, Editor, EditorEvents } from "@tiptap/react";
import {
  FloatingThreads,
  AnchoredThreads,
  FloatingComposer,
  FloatingToolbar,
  Toolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import StarterKit from "@tiptap/starter-kit";
import { useThreads } from "@liveblocks/react";
import { useIsMobile } from "./use-is-mobile";
import VersionsDialog from "../version-history-dialog";
import { useEffect } from "react";
import { HtmlComponent } from "./html-component/extension";
import { SlashCommand } from "./slash-command/extension";

export default function TiptapEditor() {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: "outline-none flex-1 transition-all",
      },
    },
    enableContentCheck: true,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      HtmlComponent,
      SlashCommand,
      liveblocks,
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
          <div className="mb-8 max-w-3xl">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">
              Tiptap AI HTML editor
            </h1>
            <p className="text-muted-foreground">
              Type <kbd className="rounded border border-border px-1">/</kbd> to
              insert headings, quotes, code blocks, or an AI-generated HTML
              component.
            </p>
          </div>
          <EditorContent editor={editor} />
          <FloatingComposer editor={editor} className="w-[350px]" />
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
